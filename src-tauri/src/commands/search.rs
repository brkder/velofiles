//! Streaming recursive search with two speed layers:
//!
//! 1. **Parallel level-synchronized BFS** — every directory level is scanned
//!    across all CPU cores with rayon, so a cold search of a large tree is
//!    several times faster than a single-threaded walk. Matches stream to the
//!    UI every ~50 ms while the scan is still running.
//! 2. **In-memory index cache** — the first full scan of a folder also builds
//!    a flat index (pre-folded names). While the cache is fresh, every next
//!    keystroke is answered entirely from RAM in milliseconds: no disk I/O.
//!
//! The cache is keyed by root path, expires after a short TTL (so external
//! changes show up quickly), and is only stored for complete, uncancelled,
//! full-depth scans.

use super::Entry;
use crate::fuzzy;
use parking_lot::Mutex;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering};
use std::sync::{mpsc, Arc};
use std::time::{Duration, Instant};
use tauri::Emitter;

const FLUSH_INTERVAL: Duration = Duration::from_millis(50);
/// How long a built index stays valid. Short enough that renames/deletes made
/// outside the app appear quickly; long enough to cover a typing session.
const INDEX_TTL: Duration = Duration::from_secs(45);
/// Memory guard: trees bigger than this are not cached (still searched fine).
const INDEX_CAP: usize = 400_000;

struct IndexedEntry {
    entry: Entry,
    name_folded: String,
    /// 1 = direct child of the searched root.
    depth: usize,
}

struct CachedIndex {
    built: Instant,
    /// Whether hidden subtrees were descended during the build. A cache built
    /// without them cannot serve a "show hidden" query.
    hidden_included: bool,
    entries: Arc<Vec<IndexedEntry>>,
}

#[derive(Default)]
pub struct SearchInner {
    cancel_flag: Mutex<Option<Arc<AtomicBool>>>,
    index: Mutex<HashMap<String, CachedIndex>>,
}

/// Managed Tauri state; `Arc` so worker threads can outlive the command call.
#[derive(Default)]
pub struct SearchState(pub Arc<SearchInner>);

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchQuery {
    /// Client-generated id echoed back in every result batch, so the
    /// frontend can match batches even before the invoke resolves.
    pub search_id: u64,
    pub root: String,
    pub pattern: String,
    /// Lowercase extensions without dots, e.g. ["rs", "md"]. Empty = all.
    pub extensions: Vec<String>,
    pub include_hidden: bool,
    pub max_results: usize,
    /// 0 = unlimited depth; 1 = current folder only.
    pub max_depth: usize,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchBatch {
    search_id: u64,
    entries: Vec<ScoredEntry>,
    finished: bool,
    scanned: u64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScoredEntry {
    #[serde(flatten)]
    entry: Entry,
    score: i64,
}

fn index_key(root: &str) -> String {
    fuzzy::fold(root.trim_end_matches(['\\', '/']))
}

#[tauri::command]
pub async fn start_search(
    app: tauri::AppHandle,
    state: tauri::State<'_, SearchState>,
    query: SearchQuery,
) -> Result<u64, String> {
    // Cancel any previous search.
    if let Some(flag) = state.0.cancel_flag.lock().take() {
        flag.store(true, Ordering::Relaxed);
    }
    let id = query.search_id;
    let cancel = Arc::new(AtomicBool::new(false));
    *state.0.cancel_flag.lock() = Some(cancel.clone());

    let inner = state.0.clone();
    std::thread::spawn(move || {
        let pattern_folded = fuzzy::fold(query.pattern.trim());
        let key = index_key(&query.root);

        // ---- Layer 2: answer from the in-memory index when fresh. ----------
        let cached: Option<Arc<Vec<IndexedEntry>>> = {
            let map = inner.index.lock();
            map.get(&key)
                .filter(|c| c.built.elapsed() < INDEX_TTL)
                .filter(|c| c.hidden_included || !query.include_hidden)
                .map(|c| c.entries.clone())
        };
        if let Some(list) = cached {
            answer_from_index(&app, &query, &pattern_folded, &list);
            return;
        }

        // ---- Layer 1: parallel BFS scan with live streaming. ---------------
        scan_and_stream(&app, &inner, &cancel, &query, &pattern_folded, &key);
    });

    Ok(id)
}

/// Rank the whole cached index in parallel and emit one finished batch.
fn answer_from_index(
    app: &tauri::AppHandle,
    query: &SearchQuery,
    pattern_folded: &str,
    list: &Arc<Vec<IndexedEntry>>,
) {
    let want_ext = !query.extensions.is_empty();
    let mut hits: Vec<ScoredEntry> = list
        .par_iter()
        .filter_map(|ie| {
            if !query.include_hidden
                && (ie.entry.is_hidden || ie.entry.name.starts_with('.'))
            {
                return None;
            }
            if query.max_depth != 0 && ie.depth > query.max_depth {
                return None;
            }
            if want_ext
                && !ie.entry.is_dir
                && !query.extensions.contains(&ie.entry.extension)
            {
                return None;
            }
            let mut score = fuzzy::rank_folded(pattern_folded, &ie.name_folded)?;
            if ie.entry.is_dir {
                score += 8;
            }
            Some(ScoredEntry { entry: ie.entry.clone(), score })
        })
        .collect();
    hits.par_sort_unstable_by(|a, b| b.score.cmp(&a.score));
    hits.truncate(query.max_results);
    let _ = app.emit(
        "search-results",
        SearchBatch {
            search_id: query.search_id,
            entries: hits,
            finished: true,
            scanned: list.len() as u64,
        },
    );
}

/// Cold path: scan the tree level-by-level with all cores, streaming matches
/// as they are found and building the index cache on the side.
fn scan_and_stream(
    app: &tauri::AppHandle,
    inner: &Arc<SearchInner>,
    cancel: &Arc<AtomicBool>,
    query: &SearchQuery,
    pattern_folded: &str,
    key: &str,
) {
    let want_ext = !query.extensions.is_empty();
    let scanned = Arc::new(AtomicU64::new(0));
    let sent = Arc::new(AtomicUsize::new(0));
    let index_acc: Mutex<Vec<IndexedEntry>> = Mutex::new(Vec::new());
    let overflow = AtomicBool::new(false);

    // Emitter thread: batches matches and pushes them to the UI every 50 ms,
    // including empty progress ticks so the scanned counter keeps moving.
    let (tx, rx) = mpsc::channel::<ScoredEntry>();
    let emitter = {
        let app = app.clone();
        let cancel = cancel.clone();
        let scanned = scanned.clone();
        let sent = sent.clone();
        let id = query.search_id;
        let max_results = query.max_results;
        std::thread::spawn(move || {
            let mut batch: Vec<ScoredEntry> = Vec::new();
            let mut last_flush = Instant::now();
            loop {
                match rx.recv_timeout(FLUSH_INTERVAL) {
                    Ok(e) => {
                        if sent.load(Ordering::Relaxed) + batch.len()
                            < max_results
                        {
                            batch.push(e);
                        } else {
                            // Result cap reached: stop the scan.
                            cancel.store(true, Ordering::Relaxed);
                        }
                    }
                    Err(mpsc::RecvTimeoutError::Timeout) => {}
                    Err(mpsc::RecvTimeoutError::Disconnected) => break,
                }
                let due = last_flush.elapsed() >= FLUSH_INTERVAL;
                if due && (!batch.is_empty() || last_flush.elapsed() >= FLUSH_INTERVAL * 4) {
                    sent.fetch_add(batch.len(), Ordering::Relaxed);
                    let _ = app.emit(
                        "search-results",
                        SearchBatch {
                            search_id: id,
                            entries: std::mem::take(&mut batch),
                            finished: false,
                            scanned: scanned.load(Ordering::Relaxed),
                        },
                    );
                    last_flush = Instant::now();
                }
            }
            sent.fetch_add(batch.len(), Ordering::Relaxed);
            let _ = app.emit(
                "search-results",
                SearchBatch {
                    search_id: id,
                    entries: batch,
                    finished: true,
                    scanned: scanned.load(Ordering::Relaxed),
                },
            );
        })
    };

    let mut level: Vec<PathBuf> = vec![PathBuf::from(&query.root)];
    let mut depth = 0usize;

    while !level.is_empty() && !cancel.load(Ordering::Relaxed) {
        if query.max_depth != 0 && depth >= query.max_depth {
            break;
        }
        let next_level: Mutex<Vec<PathBuf>> = Mutex::new(Vec::new());

        level.par_iter().for_each_with(tx.clone(), |tx, dir| {
            if cancel.load(Ordering::Relaxed) {
                return;
            }
            let Ok(read) = std::fs::read_dir(dir) else {
                return; // unreadable (permissions) — skip silently
            };
            let mut local_next: Vec<PathBuf> = Vec::new();
            let mut local_index: Vec<IndexedEntry> = Vec::new();

            for de in read.filter_map(|r| r.ok()) {
                if cancel.load(Ordering::Relaxed) {
                    break;
                }
                scanned.fetch_add(1, Ordering::Relaxed);
                let Some(entry) = Entry::from_dir_entry(&de) else {
                    continue;
                };
                let hidden = entry.is_hidden || entry.name.starts_with('.');
                let name_folded = fuzzy::fold(&entry.name);

                if entry.is_dir
                    && !entry.is_symlink
                    && (query.include_hidden || !hidden)
                {
                    local_next.push(de.path());
                }

                let visible = query.include_hidden || !hidden;
                let ext_ok = !want_ext
                    || entry.is_dir
                    || query.extensions.contains(&entry.extension);
                if visible && ext_ok {
                    if let Some(mut score) =
                        fuzzy::rank_folded(pattern_folded, &name_folded)
                    {
                        // Folders edge out files of equal relevance (users
                        // usually search folder names to navigate).
                        if entry.is_dir {
                            score += 8;
                        }
                        let _ = tx.send(ScoredEntry {
                            entry: entry.clone(),
                            score,
                        });
                    }
                }
                local_index.push(IndexedEntry {
                    entry,
                    name_folded,
                    depth: depth + 1,
                });
            }

            if !local_next.is_empty() {
                next_level.lock().extend(local_next);
            }
            let mut acc = index_acc.lock();
            if acc.len() + local_index.len() <= INDEX_CAP {
                acc.extend(local_index);
            } else {
                overflow.store(true, Ordering::Relaxed);
            }
        });

        level = next_level.into_inner();
        depth += 1;
    }

    drop(tx);
    let _ = emitter.join();

    // Cache only complete full-depth scans, so later keystrokes are instant.
    let complete =
        !cancel.load(Ordering::Relaxed) && !overflow.load(Ordering::Relaxed);
    if complete && query.max_depth == 0 {
        inner.index.lock().insert(
            key.to_string(),
            CachedIndex {
                built: Instant::now(),
                hidden_included: query.include_hidden,
                entries: Arc::new(index_acc.into_inner()),
            },
        );
    }
}

#[tauri::command]
pub fn cancel_search(state: tauri::State<'_, SearchState>) {
    if let Some(flag) = state.0.cancel_flag.lock().take() {
        flag.store(true, Ordering::Relaxed);
    }
}

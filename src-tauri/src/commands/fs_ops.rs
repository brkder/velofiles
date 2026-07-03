use super::Entry;
use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::Emitter;

fn unique_target(dest_dir: &Path, name: &str) -> PathBuf {
    let candidate = dest_dir.join(name);
    if !candidate.exists() {
        return candidate;
    }
    let (stem, ext) = match name.rsplit_once('.') {
        Some((s, e)) if !s.is_empty() => (s.to_string(), format!(".{e}")),
        _ => (name.to_string(), String::new()),
    };
    for i in 2..10_000 {
        let c = dest_dir.join(format!("{stem} ({i}){ext}"));
        if !c.exists() {
            return c;
        }
    }
    dest_dir.join(format!("{stem} (copy){ext}"))
}

#[tauri::command]
pub fn create_file(dir: String, name: String) -> Result<Entry, String> {
    let path = Path::new(&dir).join(&name);
    if path.exists() {
        return Err("ALREADY_EXISTS".into());
    }
    std::fs::File::create(&path).map_err(|e| e.to_string())?;
    Entry::from_path(&path).ok_or_else(|| "Failed to stat created file".into())
}

#[tauri::command]
pub fn create_dir(dir: String, name: String) -> Result<Entry, String> {
    let path = Path::new(&dir).join(&name);
    if path.exists() {
        return Err("ALREADY_EXISTS".into());
    }
    std::fs::create_dir(&path).map_err(|e| e.to_string())?;
    Entry::from_path(&path).ok_or_else(|| "Failed to stat created directory".into())
}

#[tauri::command]
pub fn rename_entry(path: String, new_name: String) -> Result<Entry, String> {
    let src = PathBuf::from(&path);
    let parent = src.parent().ok_or("No parent directory")?;
    let dst = parent.join(&new_name);
    if dst.exists() && dst != src {
        return Err("ALREADY_EXISTS".into());
    }
    std::fs::rename(&src, &dst).map_err(|e| e.to_string())?;
    Entry::from_path(&dst).ok_or_else(|| "Failed to stat renamed entry".into())
}

/// Move entries to the recycle bin (safe delete).
#[tauri::command]
pub fn delete_entries(paths: Vec<String>) -> Result<(), String> {
    trash::delete_all(&paths).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_entries_permanent(paths: Vec<String>) -> Result<(), String> {
    for p in &paths {
        let path = Path::new(p);
        let res = if path.is_dir() {
            std::fs::remove_dir_all(path)
        } else {
            std::fs::remove_file(path)
        };
        res.map_err(|e| format!("{p}: {e}"))?;
    }
    Ok(())
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TransferProgress {
    done: usize,
    total: usize,
    current: String,
}

fn copy_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    if src.is_dir() {
        std::fs::create_dir_all(dst)?;
        for child in std::fs::read_dir(src)? {
            let child = child?;
            copy_recursive(&child.path(), &dst.join(child.file_name()))?;
        }
        Ok(())
    } else {
        if let Some(parent) = dst.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::copy(src, dst).map(|_| ())
    }
}

#[tauri::command]
pub async fn copy_entries(
    app: tauri::AppHandle,
    paths: Vec<String>,
    dest_dir: String,
) -> Result<(), String> {
    let dest = PathBuf::from(&dest_dir);
    let total = paths.len();
    for (i, p) in paths.iter().enumerate() {
        let src = PathBuf::from(p);
        let name = src
            .file_name()
            .ok_or("Invalid source path")?
            .to_string_lossy()
            .to_string();
        let _ = app.emit(
            "transfer-progress",
            TransferProgress { done: i, total, current: name.clone() },
        );
        let target = unique_target(&dest, &name);
        copy_recursive(&src, &target).map_err(|e| format!("{name}: {e}"))?;
    }
    let _ = app.emit(
        "transfer-progress",
        TransferProgress { done: total, total, current: String::new() },
    );
    Ok(())
}

#[tauri::command]
pub async fn move_entries(
    app: tauri::AppHandle,
    paths: Vec<String>,
    dest_dir: String,
) -> Result<(), String> {
    let dest = PathBuf::from(&dest_dir);
    let total = paths.len();
    for (i, p) in paths.iter().enumerate() {
        let src = PathBuf::from(p);
        let name = src
            .file_name()
            .ok_or("Invalid source path")?
            .to_string_lossy()
            .to_string();
        let _ = app.emit(
            "transfer-progress",
            TransferProgress { done: i, total, current: name.clone() },
        );
        let target = unique_target(&dest, &name);
        // Fast path: same volume rename. Fallback: copy + delete (cross-volume).
        if std::fs::rename(&src, &target).is_err() {
            copy_recursive(&src, &target).map_err(|e| format!("{name}: {e}"))?;
            let res = if src.is_dir() {
                std::fs::remove_dir_all(&src)
            } else {
                std::fs::remove_file(&src)
            };
            res.map_err(|e| format!("{name}: {e}"))?;
        }
    }
    let _ = app.emit(
        "transfer-progress",
        TransferProgress { done: total, total, current: String::new() },
    );
    Ok(())
}

/// Open a file with its default application (or a folder in the system shell).
#[tauri::command]
pub fn open_entry(path: String) -> Result<(), String> {
    open::that_detached(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_with_default(path: String) -> Result<(), String> {
    open::that_detached(&path).map_err(|e| e.to_string())
}

/// Reveal the entry in Windows Explorer (select it).
#[tauri::command]
pub fn show_in_system(path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        std::process::Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(windows))]
    {
        open::that_detached(&path).map_err(|e| e.to_string())
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryStats {
    pub files: u64,
    pub dirs: u64,
    pub total_bytes: u64,
}

/// Recursively compute size/counts for the property dialog.
#[tauri::command]
pub async fn get_entry_stats(paths: Vec<String>) -> Result<EntryStats, String> {
    let mut stats = EntryStats { files: 0, dirs: 0, total_bytes: 0 };
    for p in paths {
        let path = PathBuf::from(&p);
        if path.is_dir() {
            stats.dirs += 1;
            for e in walkdir::WalkDir::new(&path).into_iter().filter_map(|e| e.ok()) {
                if e.file_type().is_dir() {
                    stats.dirs += 1;
                } else {
                    stats.files += 1;
                    stats.total_bytes += e.metadata().map(|m| m.len()).unwrap_or(0);
                }
            }
        } else {
            stats.files += 1;
            stats.total_bytes += std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
        }
    }
    Ok(stats)
}

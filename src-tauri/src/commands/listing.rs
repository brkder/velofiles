use super::Entry;
use serde::Serialize;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirListing {
    pub path: String,
    pub entries: Vec<Entry>,
}

/// List a directory. Directories are sorted before files, both A→Z.
/// Sorting variants are handled client-side; this default keeps first paint fast.
#[tauri::command]
pub async fn list_dir(path: String, show_hidden: bool) -> Result<DirListing, String> {
    let dir = PathBuf::from(&path);
    if !dir.is_dir() {
        return Err(format!("Not a directory: {path}"));
    }
    let read = std::fs::read_dir(&dir).map_err(|e| e.to_string())?;
    let mut entries: Vec<Entry> = read
        .filter_map(|r| r.ok())
        .filter_map(|de| Entry::from_path(&de.path()))
        .filter(|e| show_hidden || !e.is_hidden)
        .collect();
    entries.sort_unstable_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(DirListing {
        path: dir.to_string_lossy().to_string(),
        entries,
    })
}

#[tauri::command]
pub fn get_home_dir() -> Result<String, String> {
    std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "Cannot resolve home directory".to_string())
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KnownFolder {
    pub id: String,
    pub path: String,
}

/// Well-known user folders (Desktop, Documents, Downloads, …) that exist on disk.
#[tauri::command]
pub fn get_known_folders() -> Vec<KnownFolder> {
    let home = match get_home_dir() {
        Ok(h) => h,
        Err(_) => return vec![],
    };
    let candidates = [
        ("home", home.clone()),
        ("desktop", format!("{home}\\Desktop")),
        ("documents", format!("{home}\\Documents")),
        ("downloads", format!("{home}\\Downloads")),
        ("pictures", format!("{home}\\Pictures")),
        ("music", format!("{home}\\Music")),
        ("videos", format!("{home}\\Videos")),
    ];
    candidates
        .into_iter()
        .filter(|(_, p)| Path::new(p).is_dir())
        .map(|(id, path)| KnownFolder {
            id: id.to_string(),
            path,
        })
        .collect()
}

#[tauri::command]
pub fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

/// Complete the last segment of a partially typed path with matching directories.
#[tauri::command]
pub fn autocomplete_path(partial: String) -> Vec<String> {
    let partial = partial.replace('/', "\\");
    let (parent, prefix) = match partial.rfind('\\') {
        Some(idx) => (partial[..=idx].to_string(), partial[idx + 1..].to_lowercase()),
        None => return vec![],
    };
    let dir = PathBuf::from(&parent);
    if !dir.is_dir() {
        return vec![];
    }
    let mut out: Vec<String> = std::fs::read_dir(&dir)
        .map(|rd| {
            rd.filter_map(|r| r.ok())
                .filter(|de| de.path().is_dir())
                .filter_map(|de| {
                    let name = de.file_name().to_string_lossy().to_string();
                    if name.to_lowercase().starts_with(&prefix) {
                        Some(format!("{parent}{name}"))
                    } else {
                        None
                    }
                })
                .collect()
        })
        .unwrap_or_default();
    out.sort_unstable_by_key(|s| s.to_lowercase());
    out.truncate(12);
    out
}

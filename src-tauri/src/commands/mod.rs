pub mod drives;
pub mod fs_ops;
pub mod listing;
pub mod preview;
pub mod rename;
pub mod search;

use serde::Serialize;

/// A single file-system entry sent to the frontend.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_symlink: bool,
    pub is_hidden: bool,
    pub size: u64,
    /// Unix millis; 0 when unavailable.
    pub modified: i64,
    pub extension: String,
}

impl Entry {
    /// Cheap construction from a `read_dir` item: on Windows the metadata is
    /// already in the directory record, so this avoids a per-file stat call.
    pub fn from_dir_entry(de: &std::fs::DirEntry) -> Option<Entry> {
        let meta = de.metadata().ok()?;
        let ft = meta.file_type();
        let is_symlink = ft.is_symlink();
        let path = de.path();
        let is_dir = if is_symlink {
            std::fs::metadata(&path).map(|m| m.is_dir()).unwrap_or(false)
        } else {
            ft.is_dir()
        };
        let name = de.file_name().to_string_lossy().to_string();
        let modified = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0);
        let extension = if is_dir {
            String::new()
        } else {
            path.extension()
                .map(|e| e.to_string_lossy().to_lowercase())
                .unwrap_or_default()
        };
        Some(Entry {
            is_hidden: is_hidden(&path, &meta),
            name,
            path: path.to_string_lossy().to_string(),
            is_dir,
            is_symlink,
            size: if is_dir { 0 } else { meta.len() },
            modified,
            extension,
        })
    }

    pub fn from_path(path: &std::path::Path) -> Option<Entry> {
        let meta = std::fs::symlink_metadata(path).ok()?;
        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| path.to_string_lossy().to_string());
        let is_symlink = meta.file_type().is_symlink();
        // For symlinks, follow to determine dir-ness (fall back to link meta).
        let is_dir = if is_symlink {
            std::fs::metadata(path).map(|m| m.is_dir()).unwrap_or(false)
        } else {
            meta.is_dir()
        };
        let modified = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0);
        let extension = if is_dir {
            String::new()
        } else {
            path.extension()
                .map(|e| e.to_string_lossy().to_lowercase())
                .unwrap_or_default()
        };
        Some(Entry {
            is_hidden: is_hidden(path, &meta),
            name,
            path: path.to_string_lossy().to_string(),
            is_dir,
            is_symlink,
            size: if is_dir { 0 } else { meta.len() },
            modified,
            extension,
        })
    }
}

#[cfg(windows)]
fn is_hidden(_path: &std::path::Path, meta: &std::fs::Metadata) -> bool {
    use std::os::windows::fs::MetadataExt;
    const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;
    meta.file_attributes() & FILE_ATTRIBUTE_HIDDEN != 0
}

#[cfg(not(windows))]
fn is_hidden(path: &std::path::Path, _meta: &std::fs::Metadata) -> bool {
    path.file_name()
        .map(|n| n.to_string_lossy().starts_with('.'))
        .unwrap_or(false)
}

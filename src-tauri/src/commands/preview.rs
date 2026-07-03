use base64::Engine;
use serde::Serialize;
use std::io::Read;
use std::path::Path;

const MAX_TEXT_BYTES: usize = 256 * 1024;
const MAX_IMAGE_BYTES: u64 = 20 * 1024 * 1024;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase", tag = "kind")]
pub enum Preview {
    Text { content: String, truncated: bool },
    Image { data_url: String },
    Binary { size: u64 },
    TooLarge { size: u64 },
}

const IMAGE_EXTS: &[&str] = &["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg"];
const TEXT_EXTS: &[&str] = &[
    "txt", "md", "rs", "ts", "tsx", "js", "jsx", "json", "toml", "yaml", "yml", "xml",
    "html", "css", "scss", "py", "java", "kt", "c", "h", "cpp", "hpp", "cs", "go",
    "rb", "php", "sh", "ps1", "bat", "cmd", "ini", "cfg", "conf", "log", "csv", "sql",
    "gitignore", "env", "lock", "svelte", "vue",
];

fn mime_for(ext: &str) -> &'static str {
    match ext {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        "svg" => "image/svg+xml",
        _ => "application/octet-stream",
    }
}

#[tauri::command]
pub async fn preview_file(path: String) -> Result<Preview, String> {
    let p = Path::new(&path);
    let meta = std::fs::metadata(p).map_err(|e| e.to_string())?;
    let size = meta.len();
    let ext = p
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    if IMAGE_EXTS.contains(&ext.as_str()) {
        if size > MAX_IMAGE_BYTES {
            return Ok(Preview::TooLarge { size });
        }
        let bytes = std::fs::read(p).map_err(|e| e.to_string())?;
        let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
        return Ok(Preview::Image {
            data_url: format!("data:{};base64,{}", mime_for(&ext), b64),
        });
    }

    let treat_as_text = TEXT_EXTS.contains(&ext.as_str()) || ext.is_empty();
    if treat_as_text {
        let mut file = std::fs::File::open(p).map_err(|e| e.to_string())?;
        let mut buf = vec![0u8; MAX_TEXT_BYTES.min(size as usize)];
        file.read_exact(&mut buf).map_err(|e| e.to_string())?;
        // Reject if it looks binary (NUL bytes in the sample).
        if buf.iter().take(8192).any(|&b| b == 0) {
            return Ok(Preview::Binary { size });
        }
        let content = String::from_utf8_lossy(&buf).to_string();
        return Ok(Preview::Text {
            content,
            truncated: (size as usize) > MAX_TEXT_BYTES,
        });
    }

    Ok(Preview::Binary { size })
}

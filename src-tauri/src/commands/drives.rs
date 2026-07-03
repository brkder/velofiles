use serde::Serialize;
use sysinfo::Disks;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DriveInfo {
    pub name: String,
    pub mount_point: String,
    pub total_bytes: u64,
    pub free_bytes: u64,
    pub is_removable: bool,
    pub file_system: String,
}

#[tauri::command]
pub fn list_drives() -> Vec<DriveInfo> {
    let disks = Disks::new_with_refreshed_list();
    disks
        .iter()
        .map(|d| DriveInfo {
            name: d.name().to_string_lossy().to_string(),
            mount_point: d.mount_point().to_string_lossy().to_string(),
            total_bytes: d.total_space(),
            free_bytes: d.available_space(),
            is_removable: d.is_removable(),
            file_system: d.file_system().to_string_lossy().to_string(),
        })
        .collect()
}

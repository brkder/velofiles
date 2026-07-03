mod commands;
mod fuzzy;

use commands::{drives, fs_ops, listing, preview, rename, search};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(search::SearchState::default())
        .invoke_handler(tauri::generate_handler![
            listing::list_dir,
            listing::get_home_dir,
            listing::get_known_folders,
            listing::path_exists,
            listing::autocomplete_path,
            drives::list_drives,
            fs_ops::create_file,
            fs_ops::create_dir,
            fs_ops::rename_entry,
            fs_ops::delete_entries,
            fs_ops::delete_entries_permanent,
            fs_ops::copy_entries,
            fs_ops::move_entries,
            fs_ops::open_entry,
            fs_ops::open_with_default,
            fs_ops::show_in_system,
            fs_ops::get_entry_stats,
            search::start_search,
            search::cancel_search,
            preview::preview_file,
            rename::batch_rename_preview,
            rename::batch_rename_apply,
        ])
        .run(tauri::generate_context!())
        .expect("error while running VeloFiles");
}

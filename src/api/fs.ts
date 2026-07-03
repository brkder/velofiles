import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export interface Entry {
  name: string;
  path: string;
  isDir: boolean;
  isSymlink: boolean;
  isHidden: boolean;
  size: number;
  modified: number;
  extension: string;
}

export interface ScoredEntry extends Entry {
  score: number;
}

export interface DirListing {
  path: string;
  entries: Entry[];
}

export interface DriveInfo {
  name: string;
  mountPoint: string;
  totalBytes: number;
  freeBytes: number;
  isRemovable: boolean;
  fileSystem: string;
}

export interface KnownFolder {
  id: string;
  path: string;
}

export interface EntryStats {
  files: number;
  dirs: number;
  totalBytes: number;
}

export type Preview =
  | { kind: "text"; content: string; truncated: boolean }
  | { kind: "image"; dataUrl: string }
  | { kind: "binary"; size: number }
  | { kind: "tooLarge"; size: number };

export interface RenameRule {
  template: string;
  find: string;
  replace: string;
  useRegex: boolean;
  caseInsensitive: boolean;
  counterStart: number;
  counterStep: number;
}

export interface RenamePlanItem {
  from: string;
  to: string;
  ok: boolean;
  error: string;
}

export interface SearchBatch {
  searchId: number;
  entries: ScoredEntry[];
  finished: boolean;
  scanned: number;
}

export interface TransferProgress {
  done: number;
  total: number;
  current: string;
}

export const listDir = (path: string, showHidden: boolean) =>
  invoke<DirListing>("list_dir", { path, showHidden });

export const getHomeDir = () => invoke<string>("get_home_dir");
export const getKnownFolders = () => invoke<KnownFolder[]>("get_known_folders");
export const pathExists = (path: string) => invoke<boolean>("path_exists", { path });
export const autocompletePath = (partial: string) =>
  invoke<string[]>("autocomplete_path", { partial });

export const listDrives = () => invoke<DriveInfo[]>("list_drives");

export const createFile = (dir: string, name: string) =>
  invoke<Entry>("create_file", { dir, name });
export const createDir = (dir: string, name: string) =>
  invoke<Entry>("create_dir", { dir, name });
export const renameEntry = (path: string, newName: string) =>
  invoke<Entry>("rename_entry", { path, newName });
export const deleteEntries = (paths: string[]) =>
  invoke<void>("delete_entries", { paths });
export const deleteEntriesPermanent = (paths: string[]) =>
  invoke<void>("delete_entries_permanent", { paths });
export const copyEntries = (paths: string[], destDir: string) =>
  invoke<void>("copy_entries", { paths, destDir });
export const moveEntries = (paths: string[], destDir: string) =>
  invoke<void>("move_entries", { paths, destDir });
export const openEntry = (path: string) => invoke<void>("open_entry", { path });
export const showInSystem = (path: string) => invoke<void>("show_in_system", { path });
export const getEntryStats = (paths: string[]) =>
  invoke<EntryStats>("get_entry_stats", { paths });

export const previewFile = (path: string) => invoke<Preview>("preview_file", { path });

export const batchRenamePreview = (paths: string[], rule: RenameRule) =>
  invoke<RenamePlanItem[]>("batch_rename_preview", { paths, rule });
export const batchRenameApply = (paths: string[], rule: RenameRule) =>
  invoke<number>("batch_rename_apply", { paths, rule });

export interface SearchQuery {
  searchId: number;
  root: string;
  pattern: string;
  extensions: string[];
  includeHidden: boolean;
  maxResults: number;
  /** 0 = unlimited depth; 1 = current folder only. */
  maxDepth: number;
}

export const startSearch = (query: SearchQuery) =>
  invoke<number>("start_search", { query });
export const cancelSearch = () => invoke<void>("cancel_search");

export const onSearchResults = (cb: (batch: SearchBatch) => void): Promise<UnlistenFn> =>
  listen<SearchBatch>("search-results", (e) => cb(e.payload));

export const onTransferProgress = (
  cb: (p: TransferProgress) => void,
): Promise<UnlistenFn> =>
  listen<TransferProgress>("transfer-progress", (e) => cb(e.payload));

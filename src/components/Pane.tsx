import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  cancelSearch,
  copyEntries,
  createDir,
  createFile,
  deleteEntries,
  deleteEntriesPermanent,
  listDir,
  moveEntries,
  onSearchResults,
  openEntry,
  renameEntry,
  showInSystem,
  startSearch,
  type Entry,
  type ScoredEntry,
} from "../api/fs";
import { useSettings } from "../stores/settings";
import { useTabs, type PaneId } from "../stores/tabs";
import { useT } from "../i18n";
import FileList, { type SortKey } from "./FileList";
import TabBar from "./TabBar";
import Toolbar from "./Toolbar";
import StatusBar from "./StatusBar";
import ContextMenu, { type MenuItem } from "./ContextMenu";
import BatchRenameDialog from "./BatchRenameDialog";
import PropertiesDialog from "./PropertiesDialog";
import { ConfirmDialog, PromptDialog } from "./Dialogs";
import {
  ClipboardGlyph,
  CopyGlyph,
  ExternalGlyph,
  EyeGlyph,
  FilePlusGlyph,
  FolderPlusGlyph,
  InfoGlyph,
  LinkGlyph,
  PencilGlyph,
  Refresh,
  ScissorsGlyph,
  TabPlusGlyph,
  TrashGlyph,
} from "./icons";

interface PaneProps {
  pane: PaneId;
  registerApi: (pane: PaneId, api: PaneApi) => void;
}

export interface PaneApi {
  refresh: () => void;
  focusSearch: () => void;
  selectAll: () => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteClipboard: () => void;
  deleteSelection: (permanent: boolean) => void;
  renameSelection: () => void;
  batchRenameSelection: () => void;
  newFile: () => void;
  newFolder: () => void;
}

type DialogState =
  | { kind: "none" }
  | { kind: "confirm-delete"; permanent: boolean }
  | { kind: "new-file" }
  | { kind: "new-folder" }
  | { kind: "batch-rename" }
  | { kind: "properties"; entries: Entry[] };

export default function Pane({ pane, registerApi }: PaneProps) {
  const t = useT();
  const showHidden = useSettings((s) => s.showHidden);
  const pushRecentFolder = useSettings((s) => s.pushRecentFolder);

  const tabs = useTabs((s) => s.tabs[pane]);
  const activeTabId = useTabs((s) => s.activeTabId[pane]);
  const tab = tabs.find((x) => x.id === activeTabId) ?? tabs[0];
  const navigate = useTabs((s) => s.navigate);
  const goBack = useTabs((s) => s.goBack);
  const goForward = useTabs((s) => s.goForward);
  const addTab = useTabs((s) => s.addTab);
  const setActivePane = useTabs((s) => s.setActivePane);
  const activePane = useTabs((s) => s.activePane);
  const splitView = useTabs((s) => s.splitView);
  const clipboard = useTabs((s) => s.clipboard);
  const setClipboard = useTabs((s) => s.setClipboard);
  const selection = useTabs((s) => s.selection[pane]);
  const setSelection = useTabs((s) => s.setSelection);
  const anchorIndex = useTabs((s) => s.anchorIndex[pane]);
  const setAnchorIndex = useTabs((s) => s.setAnchorIndex);
  const setInspector = useTabs((s) => s.setInspector);
  const setSearchMode = useTabs((s) => s.setSearchMode);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [searchDeep, setSearchDeep] = useState(true);
  const [searchEntries, setSearchEntries] = useState<ScoredEntry[]>([]);
  const [searchScanned, setSearchScanned] = useState(0);
  const [searchDone, setSearchDone] = useState(true);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const [menu, setMenu] = useState<{ x: number; y: number; entry: Entry | null } | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchIdRef = useRef<number>(0);
  const isActive = activePane === pane || !splitView;

  const doNavigate = useCallback(
    (path: string) => {
      navigate(pane, path);
      pushRecentFolder(path);
      setSearchValue("");
    },
    [navigate, pane, pushRecentFolder],
  );

  const refresh = useCallback(() => {
    setLoading(true);
    listDir(tab.path, showHidden)
      .then((res) => setEntries(res.entries))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [tab.path, showHidden]);

  useEffect(() => refresh(), [refresh]);

  // ----- Search (streamed from Rust) -----
  useEffect(() => {
    // Async-safe subscription: if the effect is cleaned up before the
    // listen() promise resolves (e.g. StrictMode double-mount), the late
    // listener is disposed immediately instead of leaking. A leaked
    // listener would append every batch twice and produce duplicate rows.
    let disposed = false;
    let unlisten: (() => void) | undefined;
    onSearchResults((batch) => {
      if (batch.searchId !== searchIdRef.current) return;
      setSearchScanned(batch.scanned);
      if (batch.finished) setSearchDone(true);
      if (batch.entries.length) {
        setSearchEntries((prev) => {
          const seen = new Set(prev.map((e) => e.path));
          const merged = [...prev];
          for (const e of batch.entries) {
            if (!seen.has(e.path)) {
              seen.add(e.path);
              merged.push(e);
            }
          }
          merged.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
          return merged;
        });
      }
    }).then((fn) => {
      if (disposed) fn();
      else unlisten = fn;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  // Navigating anywhere (sidebar, GoTo, breadcrumbs, folder open) leaves
  // search mode and clears the query, like classic file managers.
  useEffect(() => {
    setSearchValue("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id, tab.path]);

  useEffect(() => {
    const term = searchValue.trim();
    if (!term) {
      if (tab.searchMode) setSearchMode(pane, false);
      setSearchEntries([]);
      void cancelSearch().catch(() => undefined);
      return;
    }
    const timer = setTimeout(async () => {
      // "term ext:jpg;png" style filters.
      const extMatch = term.match(/ext:([\w;.,]+)/i);
      const pattern = term.replace(/ext:[\w;.,]+/i, "").trim();
      const extensions = extMatch
        ? extMatch[1].split(/[;,]/).map((x) => x.replace(/^\./, "").toLowerCase()).filter(Boolean)
        : [];
      setSearchEntries([]);
      setSearchScanned(0);
      setSearchDone(false);
      setSearchMode(pane, true);
      // Client-generated id: result batches are matched even if they arrive
      // before the invoke promise resolves.
      const searchId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
      searchIdRef.current = searchId;
      try {
        await startSearch({
          searchId,
          root: tab.path,
          pattern,
          extensions,
          includeHidden: showHidden,
          maxResults: 5000,
          maxDepth: searchDeep ? 0 : 1,
        });
      } catch {
        // Search unavailable (e.g. root missing); stay in listing mode.
        setSearchMode(pane, false);
      }
    }, 120);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, tab.path, showHidden, searchDeep]);

  // ----- Sorting -----
  const sorted = useMemo(() => {
    if (tab.searchMode) return searchEntries;
    const list = [...entries];
    const dir = sortAsc ? 1 : -1;
    list.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      switch (sortKey) {
        case "size":
          return (a.size - b.size) * dir;
        case "modified":
          return (a.modified - b.modified) * dir;
        case "type":
          return a.extension.localeCompare(b.extension) * dir;
        default:
          return a.name.localeCompare(b.name, undefined, { numeric: true }) * dir;
      }
    });
    return list;
  }, [entries, sortKey, sortAsc, tab.searchMode, searchEntries]);

  const onSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  // ----- Selection helpers -----
  const selectedEntries = useMemo(
    () => sorted.filter((e) => selection.has(e.path)),
    [sorted, selection],
  );
  const selectedBytes = useMemo(
    () => selectedEntries.reduce((acc, e) => acc + (e.isDir ? 0 : e.size), 0),
    [selectedEntries],
  );

  const handleSelect = useCallback(
    (sel: Set<string>, anchor: number) => {
      setActivePane(pane);
      setSelection(pane, sel);
      setAnchorIndex(pane, anchor);
    },
    [pane, setActivePane, setSelection, setAnchorIndex],
  );

  // ----- Operations -----
  const openItem = useCallback(
    (entry: Entry) => {
      if (entry.isDir) doNavigate(entry.path);
      else void openEntry(entry.path).catch(() => undefined);
    },
    [doNavigate],
  );

  const copySelection = useCallback(() => {
    const paths = [...selection];
    if (paths.length) setClipboard({ paths, operation: "copy" });
  }, [selection, setClipboard]);

  const cutSelection = useCallback(() => {
    const paths = [...selection];
    if (paths.length) setClipboard({ paths, operation: "cut" });
  }, [selection, setClipboard]);

  const pasteClipboard = useCallback(() => {
    if (!clipboard?.paths.length) return;
    const op = clipboard.operation === "cut" ? moveEntries : copyEntries;
    void op(clipboard.paths, tab.path)
      .then(() => {
        if (clipboard.operation === "cut") setClipboard(null);
        refresh();
      })
      .catch(() => refresh());
  }, [clipboard, tab.path, setClipboard, refresh]);

  const deleteSelection = useCallback(
    (permanent: boolean) => {
      if (selection.size) setDialog({ kind: "confirm-delete", permanent });
    },
    [selection],
  );

  const confirmDelete = useCallback(
    (permanent: boolean) => {
      const paths = [...selection];
      setDialog({ kind: "none" });
      const op = permanent ? deleteEntriesPermanent : deleteEntries;
      void op(paths)
        .then(() => {
          setSelection(pane, new Set());
          setInspector(null);
          refresh();
        })
        .catch(() => refresh());
    },
    [selection, pane, setSelection, setInspector, refresh],
  );

  const renameSelection = useCallback(() => {
    const first = [...selection][0];
    if (first) setRenamingPath(first);
  }, [selection]);

  const batchRenameSelection = useCallback(() => {
    if (selection.size > 0) setDialog({ kind: "batch-rename" });
  }, [selection]);

  const handleRenameSubmit = useCallback(
    (entry: Entry, newName: string) => {
      setRenamingPath(null);
      void renameEntry(entry.path, newName)
        .then(() => refresh())
        .catch(() => refresh());
    },
    [refresh],
  );

  const handleCreate = useCallback(
    (kind: "file" | "folder", name: string) => {
      setDialog({ kind: "none" });
      const op = kind === "file" ? createFile : createDir;
      void op(tab.path, name)
        .then((entry) => {
          refresh();
          setSelection(pane, new Set([entry.path]));
        })
        .catch(() => refresh());
    },
    [tab.path, refresh, pane, setSelection],
  );

  // Expose pane API to the App-level hotkey handler.
  useEffect(() => {
    registerApi(pane, {
      refresh,
      focusSearch: () => searchInputRef.current?.focus(),
      selectAll: () => {
        setSelection(pane, new Set(sorted.map((e) => e.path)));
        setAnchorIndex(pane, 0);
      },
      copySelection,
      cutSelection,
      pasteClipboard,
      deleteSelection,
      renameSelection,
      batchRenameSelection,
      newFile: () => setDialog({ kind: "new-file" }),
      newFolder: () => setDialog({ kind: "new-folder" }),
    });
  }, [
    registerApi, pane, refresh, sorted, setSelection, setAnchorIndex,
    copySelection, cutSelection, pasteClipboard, deleteSelection,
    renameSelection, batchRenameSelection,
  ]);

  // ----- Context menu -----
  const menuItems = useMemo<MenuItem[]>(() => {
    if (!menu) return [];
    const entry = menu.entry;
    const hasSelection = selection.size > 0;
    if (!entry) {
      return [
        { id: "new-file", icon: <FilePlusGlyph size={15} />, label: t("newFile"), onClick: () => setDialog({ kind: "new-file" }) },
        { id: "new-folder", icon: <FolderPlusGlyph size={15} />, label: t("newFolder"), separatorAfter: true, onClick: () => setDialog({ kind: "new-folder" }) },
        { id: "paste", icon: <ClipboardGlyph size={15} />, label: t("paste"), shortcut: "Ctrl+V", disabled: !clipboard, onClick: pasteClipboard },
        { id: "refresh", icon: <Refresh size={15} />, label: t("refresh"), shortcut: "F5", onClick: refresh },
      ];
    }
    const items: MenuItem[] = [
      { id: "open", icon: <ExternalGlyph size={15} />, label: t("open"), onClick: () => openItem(entry) },
    ];
    if (entry.isDir) {
      items.push({
        id: "open-tab",
        icon: <TabPlusGlyph size={15} />,
        label: t("openInNewTab"),
        onClick: () => addTab(pane, entry.path),
      });
    } else {
      items.push({
        id: "inspect",
        icon: <EyeGlyph size={15} />,
        label: t("inspect"),
        onClick: () => {
          setInspector(entry);
          if (!useTabs.getState().inspectorOpen) useTabs.getState().toggleInspector();
        },
      });
    }
    items[items.length - 1].separatorAfter = true;
    items.push(
      { id: "cut", icon: <ScissorsGlyph size={15} />, label: t("cut"), shortcut: "Ctrl+X", disabled: !hasSelection, onClick: cutSelection },
      { id: "copy", icon: <CopyGlyph size={15} />, label: t("copy"), shortcut: "Ctrl+C", disabled: !hasSelection, onClick: copySelection },
      { id: "paste", icon: <ClipboardGlyph size={15} />, label: t("paste"), shortcut: "Ctrl+V", disabled: !clipboard, separatorAfter: true, onClick: pasteClipboard },
      { id: "rename", icon: <PencilGlyph size={15} />, label: t("rename"), shortcut: "F2", onClick: () => setRenamingPath(entry.path) },
      { id: "batch-rename", icon: <PencilGlyph size={15} />, label: t("batchRename"), shortcut: "F6", disabled: selection.size < 2, separatorAfter: true, onClick: batchRenameSelection },
      { id: "delete", icon: <TrashGlyph size={15} />, label: t("delete"), shortcut: "Del", danger: true, onClick: () => deleteSelection(false) },
      { id: "delete-perm", icon: <TrashGlyph size={15} />, label: t("deletePermanently"), shortcut: "Shift+Del", danger: true, separatorAfter: true, onClick: () => deleteSelection(true) },
      {
        id: "copy-path",
        icon: <LinkGlyph size={15} />,
        label: t("copyPath"),
        onClick: () => void navigator.clipboard.writeText([...selection].join("\n") || entry.path),
      },
      {
        id: "show-explorer",
        icon: <ExternalGlyph size={15} />,
        label: t("showInExplorer"),
        separatorAfter: true,
        onClick: () => void showInSystem(entry.path).catch(() => undefined),
      },
      {
        id: "properties",
        icon: <InfoGlyph size={15} />,
        label: t("properties"),
        onClick: () => {
          const targets = selectedEntries.length ? selectedEntries : [entry];
          setDialog({ kind: "properties", entries: targets });
        },
      },
    );
    return items;
  }, [
    menu, selection, selectedEntries, clipboard, t, pane, addTab, openItem,
    setInspector, cutSelection, copySelection, pasteClipboard,
    batchRenameSelection, deleteSelection, refresh,
  ]);

  const cutPaths = useMemo(
    () => new Set(clipboard?.operation === "cut" ? clipboard.paths : []),
    [clipboard],
  );

  const statusExtra = tab.searchMode
    ? `${searchDone ? t("searchResults") : t("searching")}: ${sorted.length} — ${t("searchScanned", { count: searchScanned })}`
    : loading
      ? t("loading")
      : undefined;

  return (
    <section
      className={`pane ${isActive ? "" : "inactive-pane"}`}
      onMouseDown={() => setActivePane(pane)}
    >
      <TabBar pane={pane} />
      <Toolbar
        path={tab.path}
        canBack={tab.historyIndex > 0}
        canForward={tab.historyIndex < tab.history.length - 1}
        searchValue={searchValue}
        searchDeep={searchDeep}
        onBack={() => goBack(pane)}
        onForward={() => goForward(pane)}
        onNavigate={doNavigate}
        onRefresh={refresh}
        onSearchChange={setSearchValue}
        onToggleDeep={() => setSearchDeep((v) => !v)}
        searchInputRef={searchInputRef}
      />
      <FileList
        entries={sorted}
        selection={selection}
        cutPaths={cutPaths}
        sortKey={sortKey}
        sortAsc={sortAsc}
        renamingPath={renamingPath}
        resetKey={tab.searchMode ? `search:${tab.path}:${searchValue.trim()}` : `dir:${tab.path}`}
        showParent={tab.searchMode}
        emptyText={
          tab.searchMode
            ? searchDone
              ? t("noResults")
              : t("searching")
            : t("emptyFolder")
        }
        onSort={onSort}
        onSelect={handleSelect}
        anchorIndex={anchorIndex}
        onOpen={openItem}
        onContextMenu={(e, entry) => setMenu({ x: e.clientX, y: e.clientY, entry })}
        onRenameSubmit={handleRenameSubmit}
        onRenameCancel={() => setRenamingPath(null)}
        onFocusEntry={(entry) => setInspector(entry)}
      />
      <StatusBar
        itemCount={sorted.length}
        selectedCount={selection.size}
        selectedBytes={selectedBytes}
        extraText={statusExtra}
      />

      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />
      )}

      {dialog.kind === "confirm-delete" && (
        <ConfirmDialog
          title={t("confirmDeleteTitle")}
          message={t(dialog.permanent ? "confirmDeletePermanentMsg" : "confirmDeleteMsg", {
            count: selection.size,
          })}
          danger={dialog.permanent}
          onConfirm={() => confirmDelete(dialog.permanent)}
          onCancel={() => setDialog({ kind: "none" })}
        />
      )}
      {dialog.kind === "new-file" && (
        <PromptDialog
          title={t("newFile")}
          label={t("newFileName")}
          onSubmit={(name) => handleCreate("file", name)}
          onCancel={() => setDialog({ kind: "none" })}
        />
      )}
      {dialog.kind === "new-folder" && (
        <PromptDialog
          title={t("newFolder")}
          label={t("newFolderName")}
          onSubmit={(name) => handleCreate("folder", name)}
          onCancel={() => setDialog({ kind: "none" })}
        />
      )}
      {dialog.kind === "batch-rename" && (
        <BatchRenameDialog
          paths={[...selection]}
          onDone={() => {
            setDialog({ kind: "none" });
            setSelection(pane, new Set());
            refresh();
          }}
          onClose={() => setDialog({ kind: "none" })}
        />
      )}
      {dialog.kind === "properties" && (
        <PropertiesDialog
          entries={dialog.entries}
          onClose={() => setDialog({ kind: "none" })}
        />
      )}
    </section>
  );
}

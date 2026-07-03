import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getHomeDir } from "./api/fs";
import { useSettings } from "./stores/settings";
import { useTabs, type PaneId } from "./stores/tabs";
import { useT } from "./i18n";
import Pane, { type PaneApi } from "./components/Pane";
import Sidebar from "./components/Sidebar";
import Inspector from "./components/Inspector";
import CommandPalette, { type Command } from "./components/CommandPalette";
import GoToDialog from "./components/GoToDialog";
import SettingsDialog from "./components/SettingsDialog";

type Overlay = "none" | "palette" | "goto" | "settings";

export default function App() {
  const t = useT();
  const theme = useSettings((s) => s.theme);
  const accent = useSettings((s) => s.accent);
  const fontSize = useSettings((s) => s.fontSize);
  const animations = useSettings((s) => s.animations);
  const setTheme = useSettings((s) => s.setTheme);
  const toggleHidden = useSettings((s) => s.toggleHidden);
  const setViewMode = useSettings((s) => s.setViewMode);
  const viewMode = useSettings((s) => s.viewMode);

  const splitView = useTabs((s) => s.splitView);
  const toggleSplit = useTabs((s) => s.toggleSplit);
  const activePane = useTabs((s) => s.activePane);
  const addTab = useTabs((s) => s.addTab);
  const closeTab = useTabs((s) => s.closeTab);
  const cycleTab = useTabs((s) => s.cycleTab);
  const navigate = useTabs((s) => s.navigate);
  const inspectorOpen = useTabs((s) => s.inspectorOpen);
  const toggleInspector = useTabs((s) => s.toggleInspector);
  const inspectorEntry = useTabs((s) => s.inspectorEntry);

  const [overlay, setOverlay] = useState<Overlay>("none");
  const paneApis = useRef<Partial<Record<PaneId, PaneApi>>>({});

  const registerApi = useCallback((pane: PaneId, api: PaneApi) => {
    paneApis.current[pane] = api;
  }, []);

  const api = () => paneApis.current[activePane];

  // Apply theme / accent / font-size / animations to the document.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.animations = animations ? "on" : "off";
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--font-size", `${fontSize}px`);
  }, [theme, accent, fontSize, animations]);

  // Start in the user's home directory.
  useEffect(() => {
    getHomeDir()
      .then((home) => {
        navigate("left", home);
        navigate("right", home);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTab = () => {
    const s = useTabs.getState();
    const list = s.tabs[s.activePane];
    return list.find((x) => x.id === s.activeTabId[s.activePane]) ?? list[0];
  };

  const commands = useMemo<Command[]>(
    () => [
      { id: "new-tab", label: t("cmdNewTab"), shortcut: "Ctrl+T", run: () => addTab(activePane, activeTab().path) },
      { id: "close-tab", label: t("cmdCloseTab"), shortcut: "Ctrl+W", run: () => closeTab(activePane, activeTab().id) },
      { id: "next-tab", label: t("cmdNextTab"), shortcut: "Ctrl+Tab", run: () => cycleTab(activePane, 1) },
      { id: "prev-tab", label: t("cmdPrevTab"), shortcut: "Ctrl+Shift+Tab", run: () => cycleTab(activePane, -1) },
      { id: "split", label: t("cmdToggleSplit"), shortcut: "Ctrl+\\", run: toggleSplit },
      { id: "inspector", label: t("cmdToggleInspector"), shortcut: "Ctrl+I", run: toggleInspector },
      { id: "hidden", label: t("cmdToggleHidden"), shortcut: "Ctrl+H", run: toggleHidden },
      { id: "search", label: t("cmdFocusSearch"), shortcut: "Ctrl+F", run: () => api()?.focusSearch() },
      { id: "goto", label: t("cmdGoTo"), shortcut: "Ctrl+G", run: () => setOverlay("goto") },
      { id: "settings", label: t("cmdOpenSettings"), run: () => setOverlay("settings") },
      { id: "select-all", label: t("cmdSelectAll"), shortcut: "Ctrl+A", run: () => api()?.selectAll() },
      { id: "copy", label: t("cmdCopy"), shortcut: "Ctrl+C", run: () => api()?.copySelection() },
      { id: "cut", label: t("cmdCut"), shortcut: "Ctrl+X", run: () => api()?.cutSelection() },
      { id: "paste", label: t("cmdPaste"), shortcut: "Ctrl+V", run: () => api()?.pasteClipboard() },
      { id: "delete", label: t("cmdDelete"), shortcut: "Del", run: () => api()?.deleteSelection(false) },
      { id: "rename", label: t("cmdRename"), shortcut: "F2", run: () => api()?.renameSelection() },
      { id: "batch-rename", label: t("cmdBatchRename"), shortcut: "F6", run: () => api()?.batchRenameSelection() },
      { id: "new-file", label: t("cmdNewFile"), run: () => api()?.newFile() },
      { id: "new-folder", label: t("cmdNewFolder"), shortcut: "Ctrl+Shift+N", run: () => api()?.newFolder() },
      { id: "refresh", label: t("cmdRefresh"), shortcut: "F5", run: () => api()?.refresh() },
      { id: "theme", label: t("cmdThemeToggle"), run: () => setTheme(theme === "dark" ? "light" : "dark") },
      {
        id: "view-mode",
        label: `${t("viewMode")}: ${viewMode === "details" ? t("viewGrid") : t("viewDetails")}`,
        run: () => setViewMode(viewMode === "details" ? "grid" : "details"),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, activePane, theme, viewMode],
  );

  // ----- Global hotkeys -----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inField = target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA";
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setOverlay((o) => (o === "palette" ? "none" : "palette"));
        return;
      }
      if (overlay !== "none") return;

      if (ctrl && e.key.toLowerCase() === "g") {
        e.preventDefault();
        setOverlay("goto");
      } else if (ctrl && e.key.toLowerCase() === "t") {
        e.preventDefault();
        addTab(activePane, activeTab().path);
      } else if (ctrl && e.key.toLowerCase() === "w") {
        e.preventDefault();
        closeTab(activePane, activeTab().id);
      } else if (ctrl && e.key === "Tab") {
        e.preventDefault();
        cycleTab(activePane, e.shiftKey ? -1 : 1);
      } else if (ctrl && e.key === "\\") {
        e.preventDefault();
        toggleSplit();
      } else if (ctrl && e.key.toLowerCase() === "i") {
        e.preventDefault();
        toggleInspector();
      } else if (ctrl && e.key.toLowerCase() === "h") {
        e.preventDefault();
        toggleHidden();
      } else if (ctrl && e.key.toLowerCase() === "f") {
        e.preventDefault();
        api()?.focusSearch();
      } else if (ctrl && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        api()?.newFolder();
      } else if (e.key === "F5") {
        e.preventDefault();
        api()?.refresh();
      } else if (inField) {
        return;
      } else if (ctrl && e.key.toLowerCase() === "a") {
        e.preventDefault();
        api()?.selectAll();
      } else if (ctrl && e.key.toLowerCase() === "c") {
        api()?.copySelection();
      } else if (ctrl && e.key.toLowerCase() === "x") {
        api()?.cutSelection();
      } else if (ctrl && e.key.toLowerCase() === "v") {
        api()?.pasteClipboard();
      } else if (e.key === "Delete") {
        api()?.deleteSelection(e.shiftKey);
      } else if (e.key === "F2") {
        e.preventDefault();
        api()?.renameSelection();
      } else if (e.key === "F6") {
        e.preventDefault();
        api()?.batchRenameSelection();
      } else if (e.key === "Backspace") {
        const s = useTabs.getState();
        const tab = s.tabs[s.activePane].find((x) => x.id === s.activeTabId[s.activePane]);
        if (tab && tab.historyIndex > 0) s.goBack(s.activePane);
      }
    };
    // Mouse side buttons: 3 = back, 4 = forward.
    const mouseNav = (e: MouseEvent) => {
      if (e.button !== 3 && e.button !== 4) return;
      e.preventDefault();
      const s = useTabs.getState();
      if (e.button === 3) s.goBack(s.activePane);
      else s.goForward(s.activePane);
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("mouseup", mouseNav);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("mouseup", mouseNav);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay, activePane]);

  // Reactive: re-renders whenever the active tab's path changes, so the
  // sidebar highlight always tracks the real location.
  const currentPath = useTabs((s) => {
    const list = s.tabs[s.activePane];
    const tab = list.find((x) => x.id === s.activeTabId[s.activePane]) ?? list[0];
    return tab.path;
  });

  return (
    <div className="app">
      <div className="app-body">
        <Sidebar
          currentPath={currentPath}
          onNavigate={(p) => navigate(activePane, p)}
        />
        <div className="main-area">
          <div className="panes">
            <Pane pane="left" registerApi={registerApi} />
            {splitView && <Pane pane="right" registerApi={registerApi} />}
          </div>
          {inspectorOpen && (
            <Inspector entry={inspectorEntry} onClose={toggleInspector} />
          )}
        </div>
      </div>

      {overlay === "palette" && (
        <CommandPalette commands={commands} onClose={() => setOverlay("none")} />
      )}
      {overlay === "goto" && (
        <GoToDialog
          onNavigate={(p) => navigate(activePane, p)}
          onClose={() => setOverlay("none")}
        />
      )}
      {overlay === "settings" && <SettingsDialog onClose={() => setOverlay("none")} />}
    </div>
  );
}

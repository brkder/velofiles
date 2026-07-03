import { create } from "zustand";
import type { Entry } from "../api/fs";

export interface Tab {
  id: string;
  path: string;
  history: string[];
  historyIndex: number;
  /** When set, the tab shows streamed search results instead of a listing. */
  searchMode: boolean;
}

export type PaneId = "left" | "right";

export interface ClipboardState {
  paths: string[];
  operation: "copy" | "cut";
}

interface TabsState {
  tabs: Record<PaneId, Tab[]>;
  activeTabId: Record<PaneId, string>;
  activePane: PaneId;
  splitView: boolean;
  clipboard: ClipboardState | null;
  selection: Record<PaneId, Set<string>>;
  anchorIndex: Record<PaneId, number>;
  inspectorEntry: Entry | null;
  inspectorOpen: boolean;

  setActivePane: (p: PaneId) => void;
  toggleSplit: () => void;
  addTab: (pane: PaneId, path: string) => void;
  closeTab: (pane: PaneId, id: string) => void;
  setActiveTab: (pane: PaneId, id: string) => void;
  cycleTab: (pane: PaneId, dir: 1 | -1) => void;
  navigate: (pane: PaneId, path: string) => void;
  goBack: (pane: PaneId) => void;
  goForward: (pane: PaneId) => void;
  setSearchMode: (pane: PaneId, on: boolean) => void;
  setClipboard: (c: ClipboardState | null) => void;
  setSelection: (pane: PaneId, sel: Set<string>) => void;
  setAnchorIndex: (pane: PaneId, idx: number) => void;
  setInspector: (entry: Entry | null) => void;
  toggleInspector: () => void;
}

let tabCounter = 0;
const newTabId = () => `tab-${++tabCounter}-${Date.now().toString(36)}`;

function makeTab(path: string): Tab {
  return { id: newTabId(), path, history: [path], historyIndex: 0, searchMode: false };
}

const firstLeft = makeTab("C:\\");
const firstRight = makeTab("C:\\");

export const useTabs = create<TabsState>()((set, get) => ({
  tabs: { left: [firstLeft], right: [firstRight] },
  activeTabId: { left: firstLeft.id, right: firstRight.id },
  activePane: "left",
  splitView: false,
  clipboard: null,
  selection: { left: new Set(), right: new Set() },
  anchorIndex: { left: -1, right: -1 },
  inspectorEntry: null,
  inspectorOpen: false,

  setActivePane: (activePane) => set({ activePane }),
  toggleSplit: () =>
    set((s) => {
      const splitView = !s.splitView;
      return splitView ? { splitView } : { splitView, activePane: "left" };
    }),

  addTab: (pane, path) =>
    set((s) => {
      const tab = makeTab(path);
      return {
        tabs: { ...s.tabs, [pane]: [...s.tabs[pane], tab] },
        activeTabId: { ...s.activeTabId, [pane]: tab.id },
      };
    }),

  closeTab: (pane, id) =>
    set((s) => {
      const list = s.tabs[pane];
      if (list.length <= 1) return {};
      const idx = list.findIndex((t) => t.id === id);
      const next = list.filter((t) => t.id !== id);
      const active =
        s.activeTabId[pane] === id
          ? next[Math.max(0, idx - 1)].id
          : s.activeTabId[pane];
      return {
        tabs: { ...s.tabs, [pane]: next },
        activeTabId: { ...s.activeTabId, [pane]: active },
      };
    }),

  setActiveTab: (pane, id) =>
    set((s) => ({ activeTabId: { ...s.activeTabId, [pane]: id } })),

  cycleTab: (pane, dir) =>
    set((s) => {
      const list = s.tabs[pane];
      const idx = list.findIndex((t) => t.id === s.activeTabId[pane]);
      const next = list[(idx + dir + list.length) % list.length];
      return { activeTabId: { ...s.activeTabId, [pane]: next.id } };
    }),

  navigate: (pane, path) =>
    set((s) => {
      const list = s.tabs[pane].map((t) => {
        if (t.id !== s.activeTabId[pane]) return t;
        const history = [...t.history.slice(0, t.historyIndex + 1), path];
        return { ...t, path, history, historyIndex: history.length - 1, searchMode: false };
      });
      return {
        tabs: { ...s.tabs, [pane]: list },
        selection: { ...s.selection, [pane]: new Set<string>() },
      };
    }),

  goBack: (pane) =>
    set((s) => {
      const list = s.tabs[pane].map((t) => {
        if (t.id !== s.activeTabId[pane] || t.historyIndex <= 0) return t;
        const historyIndex = t.historyIndex - 1;
        return { ...t, historyIndex, path: t.history[historyIndex], searchMode: false };
      });
      return { tabs: { ...s.tabs, [pane]: list } };
    }),

  goForward: (pane) =>
    set((s) => {
      const list = s.tabs[pane].map((t) => {
        if (t.id !== s.activeTabId[pane] || t.historyIndex >= t.history.length - 1)
          return t;
        const historyIndex = t.historyIndex + 1;
        return { ...t, historyIndex, path: t.history[historyIndex], searchMode: false };
      });
      return { tabs: { ...s.tabs, [pane]: list } };
    }),

  setSearchMode: (pane, on) =>
    set((s) => ({
      tabs: {
        ...s.tabs,
        [pane]: s.tabs[pane].map((t) =>
          t.id === s.activeTabId[pane] ? { ...t, searchMode: on } : t,
        ),
      },
    })),

  setClipboard: (clipboard) => set({ clipboard }),
  setSelection: (pane, sel) =>
    set((s) => ({ selection: { ...s.selection, [pane]: sel } })),
  setAnchorIndex: (pane, idx) =>
    set((s) => ({ anchorIndex: { ...s.anchorIndex, [pane]: idx } })),
  setInspector: (inspectorEntry) => set({ inspectorEntry }),
  toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),
}));

export function activeTab(pane: PaneId): Tab {
  const s = useTabs.getState();
  const list = s.tabs[pane];
  return list.find((t) => t.id === s.activeTabId[pane]) ?? list[0];
}

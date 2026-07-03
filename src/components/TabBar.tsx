import { useTabs, type PaneId } from "../stores/tabs";
import { useT } from "../i18n";
import { CloseGlyph, PlusGlyph } from "./icons";

function tabLabel(path: string): string {
  const normalized = path.replace(/\\+$/, "");
  const idx = normalized.lastIndexOf("\\");
  return idx >= 0 && idx < normalized.length - 1
    ? normalized.slice(idx + 1)
    : normalized || path;
}

export default function TabBar({ pane }: { pane: PaneId }) {
  const t = useT();
  const tabs = useTabs((s) => s.tabs[pane]);
  const activeId = useTabs((s) => s.activeTabId[pane]);
  const setActiveTab = useTabs((s) => s.setActiveTab);
  const closeTab = useTabs((s) => s.closeTab);
  const addTab = useTabs((s) => s.addTab);
  const setActivePane = useTabs((s) => s.setActivePane);

  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  return (
    <div className="tabbar" onMouseDown={() => setActivePane(pane)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab ${tab.id === activeId ? "active" : ""}`}
          onClick={() => setActiveTab(pane, tab.id)}
          onAuxClick={(e) => {
            if (e.button === 1) closeTab(pane, tab.id);
          }}
          title={tab.path}
        >
          <span className="tab-label">{tabLabel(tab.path)}</span>
          {tabs.length > 1 && (
            <span
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(pane, tab.id);
              }}
            >
              <CloseGlyph size={10} />
            </span>
          )}
        </button>
      ))}
      <button className="tab-add" onClick={() => addTab(pane, active.path)} title={t("newTab")}>
        <PlusGlyph size={13} />
      </button>
    </div>
  );
}

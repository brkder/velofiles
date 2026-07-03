import { ACCENT_COLORS, useSettings } from "../stores/settings";
import { LOCALES, useT } from "../i18n";

interface Props {
  onClose: () => void;
}

const HOTKEYS: { combo: string; labelKey: Parameters<ReturnType<typeof useT>>[0] }[] = [
  { combo: "Ctrl+T", labelKey: "cmdNewTab" },
  { combo: "Ctrl+W", labelKey: "cmdCloseTab" },
  { combo: "Ctrl+Tab", labelKey: "cmdNextTab" },
  { combo: "Ctrl+Shift+Tab", labelKey: "cmdPrevTab" },
  { combo: "Ctrl+Shift+P", labelKey: "cmdPalette" },
  { combo: "Ctrl+G", labelKey: "cmdGoTo" },
  { combo: "Ctrl+F", labelKey: "cmdFocusSearch" },
  { combo: "Ctrl+\\", labelKey: "cmdToggleSplit" },
  { combo: "Ctrl+I", labelKey: "cmdToggleInspector" },
  { combo: "Ctrl+H", labelKey: "cmdToggleHidden" },
  { combo: "Ctrl+A", labelKey: "cmdSelectAll" },
  { combo: "Ctrl+C", labelKey: "cmdCopy" },
  { combo: "Ctrl+X", labelKey: "cmdCut" },
  { combo: "Ctrl+V", labelKey: "cmdPaste" },
  { combo: "F2", labelKey: "cmdRename" },
  { combo: "F6", labelKey: "cmdBatchRename" },
  { combo: "F5", labelKey: "cmdRefresh" },
  { combo: "Delete", labelKey: "delete" },
  { combo: "Shift+Delete", labelKey: "deletePermanently" },
];

export default function SettingsDialog({ onClose }: Props) {
  const t = useT();
  const s = useSettings();

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <div className="dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog-title">{t("settingsTitle")}</div>
        <div className="dialog-body">
          <div className="field-row">
            <div className="field">
              <label>{t("language")}</label>
              <select
                value={s.locale}
                onChange={(e) => s.setLocale(e.target.value as typeof s.locale)}
              >
                {LOCALES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t("theme")}</label>
              <select
                value={s.theme}
                onChange={(e) => s.setTheme(e.target.value as typeof s.theme)}
              >
                <option value="dark">{t("themeDark")}</option>
                <option value="light">{t("themeLight")}</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>{t("accentColor")}</label>
            <div className="swatches">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c}
                  className={`swatch ${s.accent === c ? "selected-swatch" : ""}`}
                  style={{ background: c }}
                  onClick={() => s.setAccent(c)}
                />
              ))}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>
                {t("fontSize")} — {s.fontSize}px
              </label>
              <input
                type="range"
                min={10}
                max={22}
                value={s.fontSize}
                onChange={(e) => s.setFontSize(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>{t("viewMode")}</label>
              <select
                value={s.viewMode}
                onChange={(e) => s.setViewMode(e.target.value as typeof s.viewMode)}
              >
                <option value="details">{t("viewDetails")}</option>
                <option value="grid">{t("viewGrid")}</option>
              </select>
            </div>
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={s.showHidden}
              onChange={() => s.toggleHidden()}
            />
            {t("showHiddenFiles")}
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={s.animations}
              onChange={(e) => s.setAnimations(e.target.checked)}
            />
            {t("animations")}
          </label>

          <div className="field">
            <label>{t("hotkeys")}</label>
            <div className="hotkey-list">
              {HOTKEYS.map((h) => (
                <div key={h.combo} className="hotkey-row">
                  <span>{t(h.labelKey)}</span>
                  <kbd>{h.combo}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="dialog-footer">
          <button className="btn primary" onClick={onClose}>
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import {
  batchRenameApply,
  batchRenamePreview,
  type RenamePlanItem,
  type RenameRule,
} from "../api/fs";
import { useT } from "../i18n";

interface Props {
  paths: string[];
  onDone: (renamedCount: number) => void;
  onClose: () => void;
}

const DEFAULT_RULE: RenameRule = {
  template: "{name}",
  find: "",
  replace: "",
  useRegex: false,
  caseInsensitive: true,
  counterStart: 1,
  counterStep: 1,
};

export default function BatchRenameDialog({ paths, onDone, onClose }: Props) {
  const t = useT();
  const [rule, setRule] = useState<RenameRule>(DEFAULT_RULE);
  const [plan, setPlan] = useState<RenamePlanItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      batchRenamePreview(paths, rule)
        .then((p) => alive && setPlan(p))
        .catch((e) => alive && setError(String(e)));
    }, 150);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [paths, rule]);

  const allOk = plan.length > 0 && plan.every((p) => p.ok);
  const set = (patch: Partial<RenameRule>) => setRule((r) => ({ ...r, ...patch }));

  const apply = async () => {
    setBusy(true);
    setError("");
    try {
      const count = await batchRenameApply(paths, rule);
      onDone(count);
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  };

  const fileNameOf = (p: string) => {
    const idx = p.replace(/\\+$/, "").lastIndexOf("\\");
    return idx >= 0 ? p.slice(idx + 1) : p;
  };

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <div className="dialog wide" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog-title">
          {t("batchRename")} — {paths.length}
        </div>
        <div className="dialog-body">
          <div className="field">
            <label>{t("brTemplate")}</label>
            <input
              value={rule.template}
              onChange={(e) => set({ template: e.target.value })}
              spellCheck={false}
            />
            <span className="hint">{t("brTemplateHint")}</span>
          </div>
          <div className="field-row">
            <div className="field">
              <label>{t("brFind")}</label>
              <input
                value={rule.find}
                onChange={(e) => set({ find: e.target.value })}
                spellCheck={false}
              />
            </div>
            <div className="field">
              <label>{t("brReplace")}</label>
              <input
                value={rule.replace}
                onChange={(e) => set({ replace: e.target.value })}
                spellCheck={false}
              />
            </div>
          </div>
          <div className="field-row">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={rule.useRegex}
                onChange={(e) => set({ useRegex: e.target.checked })}
              />
              {t("brRegex")}
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={rule.caseInsensitive}
                onChange={(e) => set({ caseInsensitive: e.target.checked })}
              />
              {t("brIgnoreCase")}
            </label>
            <div className="field">
              <label>{t("brCounterStart")}</label>
              <input
                type="number"
                value={rule.counterStart}
                onChange={(e) => set({ counterStart: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="field">
              <label>{t("brCounterStep")}</label>
              <input
                type="number"
                value={rule.counterStep}
                onChange={(e) => set({ counterStep: Number(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="field">
            <label>{t("brPreview")}</label>
            <div className="br-table">
              <div className="br-row header">
                <span>{t("brOldName")}</span>
                <span>{t("brNewName")}</span>
              </div>
              {plan.map((item) => (
                <div key={item.from} className={`br-row ${item.ok ? "" : "bad"}`}>
                  <span title={item.from}>{fileNameOf(item.from)}</span>
                  <span title={item.to}>{item.to || "—"}</span>
                  {!item.ok && <span className="error-badge">{item.error}</span>}
                </div>
              ))}
            </div>
          </div>
          {error && <span style={{ color: "#ff7676", fontSize: "0.85em" }}>{error}</span>}
        </div>
        <div className="dialog-footer">
          <button className="btn" onClick={onClose}>
            {t("cancel")}
          </button>
          <button
            className="btn primary"
            disabled={!allOk || busy}
            onClick={() => void apply()}
          >
            {t("apply")}
          </button>
        </div>
      </div>
    </div>
  );
}

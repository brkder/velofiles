import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n";

export function ConfirmDialog({
  title,
  message,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      else if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm]);

  return (
    <div className="overlay center" onMouseDown={onCancel}>
      <div className="dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog-title">{title}</div>
        <div className="dialog-body">
          <span>{message}</span>
        </div>
        <div className="dialog-footer">
          <button className="btn" onClick={onCancel}>
            {t("cancel")}
          </button>
          <button className={`btn ${danger ? "danger" : "primary"}`} onClick={onConfirm}>
            {t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PromptDialog({
  title,
  label,
  initialValue,
  onSubmit,
  onCancel,
}: {
  title: string;
  label: string;
  initialValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [value, setValue] = useState(initialValue ?? "");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <div className="overlay center" onMouseDown={onCancel}>
      <div className="dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog-title">{title}</div>
        <div className="dialog-body">
          <div className="field">
            <label>{label}</label>
            <input
              ref={ref}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                else if (e.key === "Escape") onCancel();
              }}
              spellCheck={false}
            />
          </div>
        </div>
        <div className="dialog-footer">
          <button className="btn" onClick={onCancel}>
            {t("cancel")}
          </button>
          <button className="btn primary" disabled={!value.trim()} onClick={submit}>
            {t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

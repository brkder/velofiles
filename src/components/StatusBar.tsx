import { useEffect, useState } from "react";
import { onTransferProgress, type TransferProgress } from "../api/fs";
import { useT } from "../i18n";
import { formatBytes } from "../utils/format";

interface Props {
  itemCount: number;
  selectedCount: number;
  selectedBytes: number;
  extraText?: string;
}

export default function StatusBar({ itemCount, selectedCount, selectedBytes, extraText }: Props) {
  const t = useT();
  const [progress, setProgress] = useState<TransferProgress | null>(null);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    onTransferProgress((p) => {
      setProgress(p);
      if (p.done >= p.total) {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => setProgress(null), 1200);
      }
    }).then((fn) => {
      if (disposed) fn();
      else unlisten = fn;
    });
    return () => {
      disposed = true;
      unlisten?.();
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <div className="statusbar">
      <span>
        {itemCount} {t("items")}
      </span>
      {selectedCount > 0 && (
        <span>
          {selectedCount} {t("selected")}
          {selectedBytes > 0 ? ` — ${formatBytes(selectedBytes)}` : ""}
        </span>
      )}
      {extraText && <span>{extraText}</span>}
      <span className="spacer" />
      {progress && progress.total > 0 && (
        <span className="progress-pill">
          <span>{t("transferring")}</span>
          <span className="progress-track">
            <span
              className="progress-fill"
              style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
            />
          </span>
          <span>
            {progress.done}/{progress.total}
          </span>
        </span>
      )}
    </div>
  );
}

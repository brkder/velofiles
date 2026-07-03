import { useEffect, useState } from "react";
import { previewFile, type Entry, type Preview } from "../api/fs";
import { useSettings } from "../stores/settings";
import { useT } from "../i18n";
import { formatBytes, formatDate } from "../utils/format";
import { CloseGlyph, FileTypeIcon } from "./icons";

interface Props {
  entry: Entry | null;
  onClose: () => void;
}

export default function Inspector({ entry, onClose }: Props) {
  const t = useT();
  const locale = useSettings((s) => s.locale);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPreview(null);
    if (!entry || entry.isDir) return;
    let alive = true;
    setLoading(true);
    previewFile(entry.path)
      .then((p) => alive && setPreview(p))
      .catch(() => alive && setPreview(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [entry?.path, entry?.modified, entry?.isDir]);

  return (
    <aside className="inspector">
      <div className="inspector-header">
        <span>{t("inspector")}</span>
        <button className="icon-btn" onClick={onClose} title={t("close")}>
          <CloseGlyph size={12} />
        </button>
      </div>
      <div className="inspector-body">
        {!entry ? (
          <div className="inspector-placeholder">{t("selectFileToPreview")}</div>
        ) : (
          <>
            <div className="inspector-meta">
              <span
                style={{
                  fontSize: "1.05em",
                  color: "var(--fg-0)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <FileTypeIcon isDir={entry.isDir} extension={entry.extension} size={18} />
                {entry.name}
              </span>
              <span>{entry.path}</span>
              {!entry.isDir && <span>{formatBytes(entry.size)}</span>}
              <span>{formatDate(entry.modified, locale)}</span>
            </div>
            {entry.isDir ? (
              <div className="inspector-placeholder">📁 {t("folder")}</div>
            ) : loading ? (
              <div className="inspector-placeholder">{t("loading")}</div>
            ) : preview?.kind === "text" ? (
              <>
                {preview.truncated && <p className="hint">{t("previewTruncated")}</p>}
                <pre>{preview.content}</pre>
              </>
            ) : preview?.kind === "image" ? (
              <img src={preview.dataUrl} alt={entry.name} />
            ) : preview?.kind === "tooLarge" ? (
              <div className="inspector-placeholder">{t("fileTooLarge")}</div>
            ) : preview?.kind === "binary" ? (
              <div className="inspector-placeholder">{t("binaryFile")}</div>
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}

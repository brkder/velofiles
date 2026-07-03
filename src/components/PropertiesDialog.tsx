import { useEffect, useState } from "react";
import { getEntryStats, type Entry, type EntryStats } from "../api/fs";
import { useSettings } from "../stores/settings";
import { useT } from "../i18n";
import { formatBytes, formatDate, parentPath } from "../utils/format";
import { FileTypeIcon } from "./icons";

interface Props {
  entries: Entry[];
  onClose: () => void;
}

export default function PropertiesDialog({ entries, onClose }: Props) {
  const t = useT();
  const locale = useSettings((s) => s.locale);
  const [stats, setStats] = useState<EntryStats | null>(null);

  useEffect(() => {
    let alive = true;
    getEntryStats(entries.map((e) => e.path))
      .then((s) => alive && setStats(s))
      .catch(() => alive && setStats(null));
    return () => {
      alive = false;
    };
  }, [entries]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const single = entries.length === 1 ? entries[0] : null;
  const title = single ? single.name : `${entries.length} ${t("items")}`;
  const location = single ? parentPath(single.path) ?? single.path : parentPath(entries[0].path);

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: t("type"),
      value: single
        ? single.isDir
          ? t("folder")
          : single.extension
            ? `${t("file")} (.${single.extension})`
            : t("file")
        : t("statsFiles", { files: stats?.files ?? "…", dirs: stats?.dirs ?? "…" }),
    },
    { label: t("propLocation"), value: location ?? "—" },
    {
      label: t("size"),
      value: stats ? (
        <>
          {formatBytes(stats.totalBytes)}
          {single?.isDir || !single ? (
            <span style={{ color: "var(--fg-2)" }}>
              {" "}
              — {t("statsFiles", { files: stats.files, dirs: stats.dirs })}
            </span>
          ) : null}
        </>
      ) : (
        t("propComputing")
      ),
    },
  ];
  if (single) {
    rows.push({ label: t("modified"), value: formatDate(single.modified, locale) });
  }

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <div className="dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FileTypeIcon
            isDir={single ? single.isDir : true}
            extension={single?.extension ?? ""}
            size={20}
          />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
        </div>
        <div className="dialog-body">
          <div className="prop-grid">
            {rows.map((r) => (
              <div key={r.label} className="prop-row">
                <span className="prop-label">{r.label}</span>
                <span className="prop-value">{r.value}</span>
              </div>
            ))}
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

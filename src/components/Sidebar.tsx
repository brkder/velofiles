import { useEffect, useState } from "react";
import {
  getKnownFolders,
  listDrives,
  type DriveInfo,
  type KnownFolder,
} from "../api/fs";
import { useT, type MessageKey } from "../i18n";
import { formatBytes } from "../utils/format";
import {
  DocGlyph,
  DownloadGlyph,
  DriveGlyph,
  FilmGlyph,
  HomeGlyph,
  ImageGlyph,
  MonitorGlyph,
  MusicGlyph,
  UsbGlyph,
} from "./icons";

const FOLDER_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  home: HomeGlyph,
  desktop: MonitorGlyph,
  documents: DocGlyph,
  downloads: DownloadGlyph,
  pictures: ImageGlyph,
  music: MusicGlyph,
  videos: FilmGlyph,
};

interface Props {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export default function Sidebar({ currentPath, onNavigate }: Props) {
  const t = useT();
  const [folders, setFolders] = useState<KnownFolder[]>([]);
  const [drives, setDrives] = useState<DriveInfo[]>([]);

  useEffect(() => {
    getKnownFolders().then(setFolders).catch(() => setFolders([]));
    const load = () => listDrives().then(setDrives).catch(() => setDrives([]));
    load();
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, []);

  const norm = (p: string) => p.replace(/\\+$/, "").toLowerCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-heading">{t("quickAccess")}</div>
        {folders.map((f) => {
          const Icon = FOLDER_ICONS[f.id] ?? DocGlyph;
          return (
            <button
              key={f.id}
              className={`sidebar-item ${norm(currentPath) === norm(f.path) ? "current" : ""}`}
              onClick={() => onNavigate(f.path)}
              title={f.path}
            >
              <span className="sidebar-glyph">
                <Icon size={16} />
              </span>
              <span>{t(f.id as MessageKey)}</span>
            </button>
          );
        })}
      </div>
      <div className="sidebar-section">
        <div className="sidebar-heading">{t("drives")}</div>
        {drives.map((d) => {
          const used = d.totalBytes - d.freeBytes;
          const pct = d.totalBytes > 0 ? (used / d.totalBytes) * 100 : 0;
          const label = d.name
            ? `${d.name} (${d.mountPoint.replace(/\\+$/, "")})`
            : d.mountPoint;
          return (
            <button
              key={d.mountPoint}
              className={`sidebar-item drive-item ${norm(currentPath) === norm(d.mountPoint) ? "current" : ""}`}
              onClick={() => onNavigate(d.mountPoint)}
              title={`${label} — ${d.fileSystem} — ${formatBytes(used)} / ${formatBytes(d.totalBytes)} (${Math.round(pct)}%)`}
            >
              <span className="sidebar-glyph">
                {d.isRemovable ? <UsbGlyph size={16} /> : <DriveGlyph size={16} />}
              </span>
              <span className="drive-info">
                <span className="drive-label">{label}</span>
                <span className="drive-bar">
                  <span
                    className={`drive-bar-fill ${pct >= 90 ? "warn" : ""}`}
                    style={{ width: `${Math.min(100, Math.max(pct, 1.5))}%` }}
                  />
                </span>
                <span className="drive-free">
                  {t("freeOf", {
                    free: formatBytes(d.freeBytes),
                    total: formatBytes(d.totalBytes),
                  })}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

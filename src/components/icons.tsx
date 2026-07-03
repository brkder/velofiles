/**
 * Original SVG icon set for VeloFiles (MIT, drawn for this project).
 * File-type icons are color-coded; UI glyphs inherit currentColor.
 */

interface IconProps {
  size?: number;
  className?: string;
}

type P = IconProps;

const base = (size: number | undefined) => ({
  width: size ?? 16,
  height: size ?? 16,
  viewBox: "0 0 24 24",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
});

/* ---------- UI glyphs (stroke = currentColor) ---------- */

export const ArrowLeft = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowRight = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M10 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowUp = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 19V6M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Refresh = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SearchGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
    <path d="M20 20l-4.5-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const CloseGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const PlusGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const SplitGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M12 4v16" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const GearGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="2" />
    <path
      d="M12 2.8l1.2 2.6 2.8-.6 1.2 2.1 2.6 1.2-.6 2.8 1.6 2.1-1.6 2.1.6 2.8-2.6 1.2-1.2 2.1-2.8-.6L12 21.2l-1.2-2.6-2.8.6-1.2-2.1-2.6-1.2.6-2.8L3.2 12l1.6-2.1-.6-2.8 2.6-1.2 1.2-2.1 2.8.6L12 2.8z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

export const EyeGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const StarGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path
      d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

export const ClockGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
    <path d="M12 7.5V12l3 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const DriveGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="8" width="18" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
    <circle cx="17" cy="12.5" r="1.4" fill="currentColor" />
    <path d="M6 12.5h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const UsbGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="7" y="3" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
    <rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M10 6.5h1.5M13 6.5h1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const HomeGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 11l8-7 8 7v8a2 2 0 0 1-2 2h-4v-6h-4v6H6a2 2 0 0 1-2-2v-8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

export const MonitorGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M9 20h6M12 16v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const DownloadGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 4v10M7.5 10.5L12 15l4.5-4.5M5 19h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ImageGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
    <circle cx="9" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.6" />
    <path d="M4 18l5-5 3 3 4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

export const MusicGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M9 18V6l10-2v12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="6.8" cy="18" r="2.4" stroke="currentColor" strokeWidth="2" />
    <circle cx="16.8" cy="16" r="2.4" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const FilmGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M7 5v14M17 5v14M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const DocGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6 3h8l4 4v14H6V3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M14 3v4h4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M9 12h6M9 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const ScissorsGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="6.5" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="6.5" cy="17.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8.6 8.2L20 19M8.6 15.8L20 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const CopyGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

export const ClipboardGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="5" y="4.5" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <rect x="9" y="2.5" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />
    <path d="M9 12h6M9 16h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const PencilGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M14.5 6.5l3 3" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

export const TrashGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l1 13a1 1 0 0 0 1 .9h7a1 1 0 0 0 1-.9l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const LinkGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M10 14a4.5 4.5 0 0 0 6.4.4l2.4-2.4a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M14 10a4.5 4.5 0 0 0-6.4-.4l-2.4 2.4a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const InfoGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 11v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="8" r="1.1" fill="currentColor" />
  </svg>
);

export const ExternalGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M14 4h6v6M20 4L11 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const FolderPlusGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l2 2.5h8.4A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-12z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M12 11.5v5M9.5 14h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const FilePlusGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6 3h8l4 4v14H6V3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M12 11v6M9 14h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const TabPlusGlyph = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <path d="M3 9h10M13 5v4" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

/* ---------- File-type icons (filled, color-coded) ---------- */

function FileShape({ color, badge }: { color: string; badge?: string }) {
  return (
    <>
      <path d="M6 2.5h8.2L19 7.3V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" fill={color} opacity="0.22" />
      <path d="M6 2.5h8.2L19 7.3V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 2.8v4.7h4.6" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      {badge && (
        <text x="12" y="17.5" textAnchor="middle" fontSize="6.4" fontWeight="700" fill={color} fontFamily="Segoe UI, sans-serif">
          {badge}
        </text>
      )}
    </>
  );
}

const TYPE_STYLES: Record<string, { color: string; badge?: string }> = {
  // documents
  pdf: { color: "#e5484d", badge: "PDF" },
  doc: { color: "#3b82f6", badge: "DOC" }, docx: { color: "#3b82f6", badge: "DOC" },
  xls: { color: "#22a06b", badge: "XLS" }, xlsx: { color: "#22a06b", badge: "XLS" },
  csv: { color: "#22a06b", badge: "CSV" },
  ppt: { color: "#f76808", badge: "PPT" }, pptx: { color: "#f76808", badge: "PPT" },
  txt: { color: "#8b95a5", badge: "TXT" },
  md: { color: "#8b95a5", badge: "MD" },
  // code
  rs: { color: "#f97316", badge: "RS" },
  ts: { color: "#3178c6", badge: "TS" }, tsx: { color: "#3178c6", badge: "TSX" },
  js: { color: "#eab308", badge: "JS" }, jsx: { color: "#eab308", badge: "JSX" },
  json: { color: "#a3a635", badge: "{ }" },
  html: { color: "#f16529", badge: "<>" },
  css: { color: "#42a5f5", badge: "CSS" }, scss: { color: "#cd6799", badge: "SCSS" },
  py: { color: "#3776ab", badge: "PY" },
  java: { color: "#e76f00", badge: "JAVA" },
  c: { color: "#5c6bc0", badge: "C" }, h: { color: "#5c6bc0", badge: "H" },
  cpp: { color: "#5c6bc0", badge: "C++" }, cs: { color: "#68217a", badge: "C#" },
  go: { color: "#00add8", badge: "GO" }, rb: { color: "#cc342d", badge: "RB" },
  php: { color: "#777bb3", badge: "PHP" },
  sh: { color: "#4caf50", badge: ">_" }, ps1: { color: "#0277bd", badge: ">_" },
  bat: { color: "#0277bd", badge: ">_" }, cmd: { color: "#0277bd", badge: ">_" },
  toml: { color: "#9c6644", badge: "TOML" }, yaml: { color: "#9c6644", badge: "YML" },
  yml: { color: "#9c6644", badge: "YML" }, xml: { color: "#9c6644", badge: "XML" },
  sql: { color: "#00758f", badge: "SQL" },
  // archives
  zip: { color: "#b08968", badge: "ZIP" }, rar: { color: "#b08968", badge: "RAR" },
  "7z": { color: "#b08968", badge: "7Z" }, tar: { color: "#b08968", badge: "TAR" },
  gz: { color: "#b08968", badge: "GZ" },
  // executables
  exe: { color: "#7c3aed", badge: "EXE" }, msi: { color: "#7c3aed", badge: "MSI" },
  dll: { color: "#9575cd", badge: "DLL" },
};

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico"]);
const AUDIO_EXTS = new Set(["mp3", "wav", "flac", "ogg", "m4a", "aac", "wma"]);
const VIDEO_EXTS = new Set(["mp4", "mkv", "avi", "mov", "webm", "wmv", "flv"]);

export function FileTypeIcon({
  isDir,
  extension,
  size,
}: {
  isDir: boolean;
  extension: string;
  size?: number;
}) {
  if (isDir) {
    return (
      <svg {...base(size)}>
        <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l2 2.5h8.4A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-12z" fill="#f5b642" opacity="0.28" />
        <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l2 2.5h8.4A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-12z" stroke="#f5b642" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }
  if (IMAGE_EXTS.has(extension)) {
    return (
      <svg {...base(size)}>
        <rect x="4" y="4.5" width="16" height="15" rx="1.5" fill="#38bdf8" opacity="0.22" />
        <rect x="4" y="4.5" width="16" height="15" rx="1.5" stroke="#38bdf8" strokeWidth="1.6" />
        <circle cx="9" cy="10" r="1.6" stroke="#38bdf8" strokeWidth="1.4" />
        <path d="M5 17l4.5-4.5 2.7 2.7 3.4-3.4L19 15" stroke="#38bdf8" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }
  if (AUDIO_EXTS.has(extension)) {
    return (
      <svg {...base(size)}>
        <path d="M9.5 17.5V6.8l9-1.8v10.7" stroke="#e879f9" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="7.3" cy="17.5" r="2.3" fill="#e879f9" opacity="0.25" stroke="#e879f9" strokeWidth="1.6" />
        <circle cx="16.3" cy="15.7" r="2.3" fill="#e879f9" opacity="0.25" stroke="#e879f9" strokeWidth="1.6" />
      </svg>
    );
  }
  if (VIDEO_EXTS.has(extension)) {
    return (
      <svg {...base(size)}>
        <rect x="4" y="5.5" width="16" height="13" rx="1.5" fill="#f87171" opacity="0.2" />
        <rect x="4" y="5.5" width="16" height="13" rx="1.5" stroke="#f87171" strokeWidth="1.6" />
        <path d="M10.5 9.2l4.6 2.8-4.6 2.8V9.2z" fill="#f87171" />
      </svg>
    );
  }
  const style = TYPE_STYLES[extension] ?? { color: "#8b95a5" };
  return (
    <svg {...base(size)}>
      <FileShape color={style.color} badge={style.badge} />
    </svg>
  );
}

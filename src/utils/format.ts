export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log2(bytes) / 10));
  const value = bytes / 2 ** (10 * i);
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

export function formatDate(unixMillis: number, locale: string): string {
  if (!unixMillis) return "—";
  const d = new Date(unixMillis);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Split a Windows path into breadcrumb segments with cumulative paths. */
export function breadcrumbSegments(path: string): { label: string; path: string }[] {
  const normalized = path.replace(/\//g, "\\").replace(/\\+$/, "");
  const parts = normalized.split("\\").filter(Boolean);
  const out: { label: string; path: string }[] = [];
  let acc = "";
  for (const part of parts) {
    acc = acc ? `${acc}\\${part}` : `${part}\\`;
    out.push({ label: part, path: acc.endsWith("\\") ? acc : acc });
  }
  return out;
}

export function parentPath(path: string): string | null {
  const normalized = path.replace(/\//g, "\\").replace(/\\+$/, "");
  const idx = normalized.lastIndexOf("\\");
  if (idx <= 0) return null;
  const parent = normalized.slice(0, idx);
  // "C:" needs a trailing backslash to be a valid root.
  return parent.includes("\\") ? parent : `${parent}\\`;
}


import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Entry } from "../api/fs";
import { useSettings } from "../stores/settings";
import { useT } from "../i18n";
import { formatBytes, formatDate, parentPath } from "../utils/format";
import { fold } from "../utils/fuzzy";
import { FileTypeIcon } from "./icons";

export type SortKey = "name" | "size" | "modified" | "type";

interface Props {
  entries: Entry[];
  selection: Set<string>;
  cutPaths: Set<string>;
  sortKey: SortKey;
  sortAsc: boolean;
  renamingPath: string | null;
  /** Scroll position resets when this changes (path / search session). */
  resetKey: string;
  /** Search mode: show each entry's parent folder next to the name. */
  showParent: boolean;
  /** Message for the empty state ("folder is empty" / "searching…" / "no results"). */
  emptyText: string;
  onSort: (key: SortKey) => void;
  onSelect: (sel: Set<string>, anchor: number) => void;
  anchorIndex: number;
  onOpen: (entry: Entry) => void;
  onContextMenu: (e: React.MouseEvent, entry: Entry | null) => void;
  onRenameSubmit: (entry: Entry, newName: string) => void;
  onRenameCancel: () => void;
  onFocusEntry: (entry: Entry | null) => void;
}

const OVERSCAN = 8;

export default function FileList(props: Props) {
  const {
    entries, selection, cutPaths, sortKey, sortAsc, renamingPath,
    resetKey, showParent, emptyText,
    onSort, onSelect, anchorIndex, onOpen, onContextMenu,
    onRenameSubmit, onRenameCancel, onFocusEntry,
  } = props;
  const t = useT();
  const viewMode = useSettings((s) => s.viewMode);
  const fontSize = useSettings((s) => s.fontSize);
  const locale = useSettings((s) => s.locale);
  const rowHeight = Math.round(fontSize * 2.0);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);
  // Explorer-style type-ahead: typed characters accumulate briefly and jump
  // to the next entry whose name starts with them.
  const typeahead = useRef({ buffer: "", at: 0 });

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight));
    ro.observe(el);
    setViewportH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  // Reset scroll only when the location or search session changes — never
  // while streamed search batches are still arriving.
  useEffect(() => {
    viewportRef.current?.scrollTo({ top: 0 });
    setScrollTop(0);
  }, [resetKey]);

  const indexByPath = useMemo(() => {
    const m = new Map<string, number>();
    entries.forEach((e, i) => m.set(e.path, i));
    return m;
  }, [entries]);

  const handleRowMouseDown = useCallback(
    (e: React.MouseEvent, entry: Entry, index: number) => {
      if (e.button === 2 && selection.has(entry.path)) return;
      let next: Set<string>;
      let anchor = index;
      if (e.shiftKey && anchorIndex >= 0) {
        const [a, b] = [Math.min(anchorIndex, index), Math.max(anchorIndex, index)];
        next = new Set(entries.slice(a, b + 1).map((x) => x.path));
        anchor = anchorIndex;
      } else if (e.ctrlKey || e.metaKey) {
        next = new Set(selection);
        if (next.has(entry.path)) next.delete(entry.path);
        else next.add(entry.path);
      } else {
        next = new Set([entry.path]);
      }
      onSelect(next, anchor);
      onFocusEntry(entry);
    },
    [entries, selection, anchorIndex, onSelect, onFocusEntry],
  );

  const focusIndex = useCallback(
    (index: number) => {
      const entry = entries[index];
      onSelect(new Set([entry.path]), index);
      onFocusEntry(entry);
      // Keep the focused row visible.
      const el = viewportRef.current;
      if (el) {
        const top = index * rowHeight;
        if (top < el.scrollTop) el.scrollTo({ top });
        else if (top + rowHeight > el.scrollTop + el.clientHeight)
          el.scrollTo({ top: top + rowHeight - el.clientHeight });
      }
    },
    [entries, rowHeight, onSelect, onFocusEntry],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (renamingPath) return;
      if (!entries.length) return;
      const current =
        anchorIndex >= 0 && anchorIndex < entries.length ? anchorIndex : -1;

      // Type-ahead: any printable character (Windows Explorer behavior).
      // Repeating the same letter cycles through entries starting with it;
      // typing quickly builds a longer prefix ("do" → "Documents").
      if (
        e.key.length === 1 &&
        e.key !== " " &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        const ta = typeahead.current;
        const now = Date.now();
        if (now - ta.at > 800) ta.buffer = "";
        ta.at = now;
        const ch = fold(e.key);
        const cycling =
          ta.buffer.length > 0 && [...ta.buffer].every((c) => c === ch);
        ta.buffer += ch;
        const prefix = cycling ? ch : ta.buffer;
        // Cycling or a fresh single letter searches after the focused row;
        // a growing prefix keeps the focused row if it still matches.
        const begin =
          cycling || prefix.length === 1
            ? current + 1
            : Math.max(current, 0);
        const n = entries.length;
        for (let k = 0; k < n; k++) {
          const idx = (begin + k + n) % n;
          if (fold(entries[idx].name).startsWith(prefix)) {
            focusIndex(idx);
            return;
          }
        }
        return; // no match: keep selection, buffer stays for the next key
      }

      let nextIndex: number | null = null;
      if (e.key === "ArrowDown") nextIndex = Math.min(entries.length - 1, current + 1);
      else if (e.key === "ArrowUp") nextIndex = Math.max(0, current - 1);
      else if (e.key === "Home") nextIndex = 0;
      else if (e.key === "End") nextIndex = entries.length - 1;
      else if (e.key === "PageDown")
        nextIndex = Math.min(entries.length - 1, current + Math.floor(viewportH / rowHeight));
      else if (e.key === "PageUp")
        nextIndex = Math.max(0, current - Math.floor(viewportH / rowHeight));
      else if (e.key === "Enter" && current >= 0) {
        onOpen(entries[current]);
        e.preventDefault();
        return;
      } else return;

      e.preventDefault();
      if (nextIndex === null) return;
      if (e.shiftKey && current >= 0) {
        const [a, b] = [Math.min(current, nextIndex), Math.max(current, nextIndex)];
        onSelect(new Set(entries.slice(a, b + 1).map((x) => x.path)), current);
        onFocusEntry(entries[nextIndex]);
        // Keep the focused row visible.
        const el = viewportRef.current;
        if (el) {
          const top = nextIndex * rowHeight;
          if (top < el.scrollTop) el.scrollTo({ top });
          else if (top + rowHeight > el.scrollTop + el.clientHeight)
            el.scrollTo({ top: top + rowHeight - el.clientHeight });
        }
      } else {
        focusIndex(nextIndex);
      }
    },
    [entries, anchorIndex, renamingPath, rowHeight, viewportH, onSelect, onOpen, onFocusEntry, focusIndex],
  );

  if (viewMode === "grid") {
    return (
      <div
        className="filelist-container"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(e, null);
        }}
      >
        <div className="filelist-viewport grid-viewport" ref={viewportRef}>
          {entries.length === 0 ? (
            <div className="empty-state">{emptyText}</div>
          ) : (
            <div className="grid-cells">
              {entries.map((entry, i) => (
                <div
                  key={entry.path}
                  className={`grid-cell ${selection.has(entry.path) ? "selected" : ""} ${cutPaths.has(entry.path) ? "cut-pending" : ""}`}
                  onMouseDown={(e) => handleRowMouseDown(e, entry, i)}
                  onDoubleClick={() => onOpen(entry)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!selection.has(entry.path)) onSelect(new Set([entry.path]), i);
                    onContextMenu(e, entry);
                  }}
                  title={entry.name}
                >
                  <span className="grid-icon">
                    <FileTypeIcon isDir={entry.isDir} extension={entry.extension} size={34} />
                  </span>
                  {renamingPath === entry.path ? (
                    <RenameInput
                      entry={entry}
                      onSubmit={onRenameSubmit}
                      onCancel={onRenameCancel}
                    />
                  ) : (
                    <span className="grid-name">{entry.name}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const total = entries.length * rowHeight;
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  const end = Math.min(
    entries.length,
    Math.ceil((scrollTop + viewportH) / rowHeight) + OVERSCAN,
  );
  const visible = entries.slice(start, end);

  const arrow = (key: SortKey) => (sortKey === key ? (sortAsc ? "▲" : "▼") : "");

  return (
    <div
      className="filelist-container"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e, null);
      }}
    >
      <div className="filelist-header">
        <span className="col col-name" onClick={() => onSort("name")}>
          {t("name")} {arrow("name")}
        </span>
        <span className="col col-size" onClick={() => onSort("size")}>
          {t("size")} {arrow("size")}
        </span>
        <span className="col col-date" onClick={() => onSort("modified")}>
          {t("modified")} {arrow("modified")}
        </span>
      </div>
      <div
        className="filelist-viewport"
        ref={viewportRef}
        onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      >
        {entries.length === 0 ? (
          <div className="empty-state">{emptyText}</div>
        ) : (
          <div style={{ height: total, position: "relative" }}>
            {visible.map((entry) => {
              const i = indexByPath.get(entry.path) ?? 0;
              return (
                <div
                  key={entry.path}
                  className={`row ${selection.has(entry.path) ? "selected" : ""} ${cutPaths.has(entry.path) ? "cut-pending" : ""}`}
                  style={{
                    position: "absolute",
                    top: i * rowHeight,
                    left: 0,
                    right: 0,
                    height: rowHeight,
                  }}
                  onMouseDown={(e) => handleRowMouseDown(e, entry, i)}
                  onDoubleClick={() => onOpen(entry)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!selection.has(entry.path)) onSelect(new Set([entry.path]), i);
                    onContextMenu(e, entry);
                  }}
                >
                  <span className="col-name">
                    <span className="file-icon">
                      <FileTypeIcon
                        isDir={entry.isDir}
                        extension={entry.extension}
                        size={Math.round(rowHeight * 0.62)}
                      />
                    </span>
                    {renamingPath === entry.path ? (
                      <RenameInput
                        entry={entry}
                        onSubmit={onRenameSubmit}
                        onCancel={onRenameCancel}
                      />
                    ) : (
                      <span className="fname" title={entry.path}>
                        {entry.name}
                        {showParent && (
                          <span className="fparent">
                            {parentPath(entry.path) ?? ""}
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                  <span className="col-size">
                    {entry.isDir ? "—" : formatBytes(entry.size)}
                  </span>
                  <span className="col-date">{formatDate(entry.modified, locale)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function RenameInput({
  entry,
  onSubmit,
  onCancel,
}: {
  entry: Entry;
  onSubmit: (entry: Entry, newName: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(entry.name);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    // Select the stem only, keep extension out of the initial selection.
    const dot = entry.name.lastIndexOf(".");
    el.setSelectionRange(0, dot > 0 ? dot : entry.name.length);
  }, [entry.name]);
  return (
    <input
      ref={ref}
      className="rename-input"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          const trimmed = value.trim();
          if (trimmed && trimmed !== entry.name) onSubmit(entry, trimmed);
          else onCancel();
        } else if (e.key === "Escape") onCancel();
      }}
      onBlur={onCancel}
    />
  );
}

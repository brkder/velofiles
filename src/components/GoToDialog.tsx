import { useEffect, useMemo, useRef, useState } from "react";
import {
  autocompletePath,
  getKnownFolders,
  pathExists,
  type KnownFolder,
} from "../api/fs";
import { useSettings } from "../stores/settings";
import { useT, type MessageKey } from "../i18n";
import { fuzzyScore } from "../utils/fuzzy";
import { ClockGlyph, FileTypeIcon, StarGlyph } from "./icons";

interface Suggestion {
  label: string;
  path: string;
  icon: "folder" | "star" | "clock";
  section: "completion" | "known" | "recent";
}

interface Props {
  onNavigate: (path: string) => void;
  onClose: () => void;
}

export default function GoToDialog({ onNavigate, onClose }: Props) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [completions, setCompletions] = useState<string[]>([]);
  const [known, setKnown] = useState<KnownFolder[]>([]);
  const recents = useSettings((s) => s.recentFolders);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    getKnownFolders().then(setKnown).catch(() => setKnown([]));
  }, []);

  // Live path completion when the query looks like a path.
  useEffect(() => {
    const looksLikePath = /^[a-zA-Z]:[\\/]/.test(query) || query.startsWith("\\\\");
    if (!looksLikePath) {
      setCompletions([]);
      return;
    }
    let alive = true;
    autocompletePath(query)
      .then((r) => alive && setCompletions(r))
      .catch(() => alive && setCompletions([]));
    return () => {
      alive = false;
    };
  }, [query]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const out: Suggestion[] = [];
    for (const c of completions) {
      out.push({ label: c, path: c, icon: "folder", section: "completion" });
    }
    const scored = (items: Suggestion[]) => {
      if (!query.trim()) return items;
      return items
        .map((it) => ({ it, s: fuzzyScore(query, it.label) ?? fuzzyScore(query, it.path) }))
        .filter((x): x is { it: Suggestion; s: number } => x.s !== null)
        .sort((a, b) => b.s - a.s)
        .map((x) => x.it);
    };
    out.push(
      ...scored(
        known.map((k) => ({
          label: t(k.id as MessageKey),
          path: k.path,
          icon: "star" as const,
          section: "known" as const,
        })),
      ),
    );
    out.push(
      ...scored(
        recents.map((r) => ({
          label: r,
          path: r,
          icon: "clock" as const,
          section: "recent" as const,
        })),
      ).slice(0, 8),
    );
    return out.slice(0, 20);
  }, [completions, known, recents, query, t]);

  useEffect(() => setHighlight(0), [query]);

  const go = async (path: string) => {
    if (await pathExists(path)) {
      onClose();
      onNavigate(path);
    }
  };

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          placeholder={t("goToPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(suggestions.length - 1, h + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(0, h - 1));
            } else if (e.key === "Tab" && suggestions[highlight]) {
              e.preventDefault();
              setQuery(suggestions[highlight].path);
            } else if (e.key === "Enter") {
              const target = suggestions[highlight]?.path ?? query.trim();
              if (target) void go(target);
            } else if (e.key === "Escape") {
              onClose();
            }
          }}
          spellCheck={false}
        />
        <div className="palette-list">
          {suggestions.length === 0 && (
            <div className="palette-empty">{t("noResults")}</div>
          )}
          {suggestions.map((s, i) => (
            <button
              key={`${s.section}-${s.path}`}
              className={`palette-item ${i === highlight ? "highlighted" : ""}`}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => void go(s.path)}
              title={s.path}
            >
              <span style={{ display: "inline-flex" }}>
                {s.icon === "folder" ? (
                  <FileTypeIcon isDir extension="" size={15} />
                ) : s.icon === "star" ? (
                  <StarGlyph size={15} />
                ) : (
                  <ClockGlyph size={15} />
                )}
              </span>
              <span className="grow">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

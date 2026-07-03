import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "../i18n";
import { fuzzyScore } from "../utils/fuzzy";

export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  run: () => void;
}

interface Props {
  commands: Command[];
  onClose: () => void;
}

export default function CommandPalette({ commands, onClose }: Props) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    return commands
      .map((c) => ({ c, s: fuzzyScore(query, c.label) }))
      .filter((x): x is { c: Command; s: number } => x.s !== null)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.c);
  }, [query, commands]);

  useEffect(() => setHighlight(0), [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector(".highlighted")
      ?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  const run = (cmd: Command) => {
    onClose();
    cmd.run();
  };

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          placeholder={t("cmdPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(filtered.length - 1, h + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(0, h - 1));
            } else if (e.key === "Enter" && filtered[highlight]) {
              run(filtered[highlight]);
            } else if (e.key === "Escape") {
              onClose();
            }
          }}
          spellCheck={false}
        />
        <div className="palette-list" ref={listRef}>
          {filtered.length === 0 && <div className="palette-empty">{t("noResults")}</div>}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              className={`palette-item ${i === highlight ? "highlighted" : ""}`}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => run(cmd)}
            >
              <span className="grow">{cmd.label}</span>
              {cmd.shortcut && <kbd>{cmd.shortcut}</kbd>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

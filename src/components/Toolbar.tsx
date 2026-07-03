import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import { breadcrumbSegments, parentPath } from "../utils/format";
import { pathExists } from "../api/fs";
import { ArrowLeft, ArrowRight, ArrowUp, Refresh, SearchGlyph } from "./icons";

interface Props {
  path: string;
  canBack: boolean;
  canForward: boolean;
  searchValue: string;
  searchDeep: boolean;
  onBack: () => void;
  onForward: () => void;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
  onToggleDeep: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export default function Toolbar(props: Props) {
  const {
    path, canBack, canForward, searchValue, searchDeep,
    onBack, onForward, onNavigate, onRefresh, onSearchChange, onToggleDeep,
    searchInputRef,
  } = props;
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(path);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setEditValue(path);
      editRef.current?.focus();
      editRef.current?.select();
    }
  }, [editing, path]);

  const parent = parentPath(path);
  const crumbs = breadcrumbSegments(path);

  const submitPath = async () => {
    const target = editValue.trim();
    setEditing(false);
    if (!target || target === path) return;
    if (await pathExists(target)) onNavigate(target);
  };

  return (
    <div className="toolbar">
      <button className="icon-btn" disabled={!canBack} onClick={onBack} title={t("back")}>
        <ArrowLeft />
      </button>
      <button
        className="icon-btn"
        disabled={!canForward}
        onClick={onForward}
        title={t("forward")}
      >
        <ArrowRight />
      </button>
      <button
        className="icon-btn"
        disabled={!parent}
        onClick={() => parent && onNavigate(parent)}
        title={t("up")}
      >
        <ArrowUp />
      </button>
      <button className="icon-btn" onClick={onRefresh} title={t("refresh")}>
        <Refresh />
      </button>

      {editing ? (
        <input
          ref={editRef}
          className="path-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submitPath();
            else if (e.key === "Escape") setEditing(false);
          }}
          onBlur={() => setEditing(false)}
          spellCheck={false}
        />
      ) : (
        <div className="breadcrumbs" onDoubleClick={() => setEditing(true)}>
          {crumbs.map((c, i) => (
            <span key={c.path} style={{ display: "inline-flex", alignItems: "center" }}>
              {i > 0 && <span className="crumb-sep">›</span>}
              <button className="crumb" onClick={() => onNavigate(c.path)} title={c.path}>
                {c.label}
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="search-wrap">
        <span className="search-glyph">
          <SearchGlyph size={14} />
        </span>
        <input
          ref={searchInputRef as React.RefObject<HTMLInputElement>}
          className="search-box"
          placeholder={t("searchPlaceholder")}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onSearchChange("");
              (e.target as HTMLInputElement).blur();
            }
          }}
          spellCheck={false}
        />
        {searchValue.trim() !== "" && (
          <button
            className={`deep-toggle ${searchDeep ? "on" : ""}`}
            onClick={onToggleDeep}
            title={t("searchDeepTitle")}
          >
            {t("searchDeep")}
          </button>
        )}
      </div>
    </div>
  );
}

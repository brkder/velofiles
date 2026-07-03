<div align="center">

# ⚡ VeloFiles

**A blazing-fast, open-source, multilingual file explorer for Windows.**

Built with Rust 🦀 + Tauri 2 + React — native speed, tiny footprint, beautiful UI.

[![License: MIT](https://img.shields.io/badge/License-MIT-4f8cff.svg?style=flat-square)](./LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011-0078d4?style=flat-square&logo=windows)](https://github.com)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-ffc131?style=flat-square&logo=tauri&logoColor=black)](https://tauri.app)
[![Rust](https://img.shields.io/badge/Backend-Rust-dea584?style=flat-square&logo=rust&logoColor=black)](https://www.rust-lang.org)
[![React](https://img.shields.io/badge/Frontend-React%2018-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-2ea043?style=flat-square)](#-contributing)

*Windows file manager alternative · dual-pane explorer · instant fuzzy search · batch rename · tabs & split view*

[Download](#-download) •
[Features](#-features) •
[Why VeloFiles?](#-why-velofiles) •
[Search Engine](#-the-search-engine) •
[Shortcuts](#️-keyboard-shortcuts) •
[Build](#-building-from-source) •
[Contributing](#-contributing)

</div>

---

## 📥 Download

Grab the latest installer from the **[Releases page](../../releases/latest)**:

- **`VeloFiles_x.y.z_x64.msi`** — standard Windows installer (recommended)
- **`VeloFiles_x.y.z_x64-setup.exe`** — NSIS installer (smaller download)

Requires Windows 10/11. No admin rights, no telemetry, uninstalls cleanly.
Prefer building yourself? See [Building from source](#-building-from-source).

## 🚀 Why VeloFiles?

Windows Explorer hasn't gotten faster in a decade. VeloFiles is a from-scratch reimagining of what a file manager should feel like in the 2020s:

| | Windows Explorer | **VeloFiles** |
|---|---|---|
| Search a big folder | ⏳ seconds–minutes | ⚡ **streams results in milliseconds**, repeat searches answered from a RAM index |
| Large folders (100k+ files) | stutters | 🧈 **60 fps** virtualized list |
| Tabs + split view | limited | ✅ unlimited tabs, dual-pane (`Ctrl+\`) |
| Batch rename | ❌ | ✅ regex + tokens + live preview |
| Languages | OS locale only | 🌍 **6 languages**, switchable live |
| Binary size | — | 📦 a few MB (native WebView2, no Electron) |

No telemetry. No ads. No background services. Just files, fast.

## ✨ Features

### 🔍 Instant search
- **Multi-core scanner** — every directory level is scanned across all CPU cores in parallel
- **In-memory index** — the first scan builds a RAM index; every next keystroke is answered in **milliseconds with zero disk I/O**
- **Smart ranking** — exact > prefix > word-boundary > substring > dense fuzzy; folders ranked above files
- **Unicode-correct** — Turkish `ı/İ`, accents, and diacritics all fold correctly (`indirilenler` finds `İndirilenler`)
- **Filters** — extension syntax `report ext:pdf;docx`, hidden-file toggle, current-folder-only mode
- Results **stream live** while the scan runs — first hits appear instantly

### 🗂️ Panes, tabs & navigation
- Unlimited tabs per pane, **dual-pane split view**, middle-click to close
- Mouse **back/forward buttons**, full history per tab, breadcrumb path bar with autocompletion
- **Type-ahead** — press `f` to jump to the next item starting with *f*, exactly like Explorer
- **GoTo** (`Ctrl+G`) — jump to known folders, recents, or any typed path
- **Command palette** (`Ctrl+Shift+P`) — every action fuzzy-searchable

### 🛠️ File operations
- Copy / move with **live progress** in the status bar; same-volume moves are instant renames
- Safe delete to **Recycle Bin** by default (`Shift+Delete` for permanent)
- **Batch rename** (`F6`) — find/replace, regex, and tokens: `{name}` `{ext}` `{n}` `{n:3}` `{date}` `{time}` `{uid}` `{parent}` — with live collision-checked preview
- Properties dialog with recursive folder size, rich right-click context menu, reveal in Explorer

### 👁️ Inspector & preview
- `Ctrl+I` — preview text, code, and images inline without opening another app
- Binary detection and size caps keep previews safe and fast

### 🎨 Design & customization
- Hand-crafted SVG icon set, dark & light themes, **6 accent colors**
- Details or grid view, font-size scaling, reduced-motion toggle
- Drive list with **capacity bars** (red when nearly full) and free/total readout

### 🌍 Multilingual
English · Türkçe · Deutsch · Français · Español · 中文 — auto-detected from the OS, switchable in Settings. Adding a language is one file.

## 🧠 The search engine

VeloFiles' search is a two-layer design, entirely in Rust:

```
keystroke
   │
   ├─ index fresh? ──▶ RAM index (pre-folded names) ──▶ parallel rank ──▶ results in ~ms
   │
   └─ cold? ──▶ level-synchronized parallel BFS (all cores)
                 ├─ matches stream to the UI every 50 ms
                 └─ side-builds the RAM index for the next keystroke
```

- **Breadth-first** traversal guarantees items you can see (shallow matches) appear before deep subtree noise
- Entries are built from directory read records — **no extra stat() call per file**
- Tiered ranking with a density gate rejects scattered subsequence noise (`rat` will not match `gradle-wrapper.jar`)
- Cancellation is instant: a newer keystroke stops the previous scan cooperatively

## ⌨️ Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+T` / `Ctrl+W` | New / close tab |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Next / previous tab |
| `Ctrl+\` | Toggle split view |
| `Ctrl+F` | Search in current folder |
| `Ctrl+G` | GoTo dialog |
| `Ctrl+Shift+P` | Command palette |
| `Ctrl+I` | Toggle inspector |
| `Ctrl+H` | Toggle hidden files |
| `Ctrl+A` / `Ctrl+C` / `Ctrl+X` / `Ctrl+V` | Select all / copy / cut / paste |
| `F2` / `F6` | Rename / batch rename |
| `F5` | Refresh |
| `Delete` / `Shift+Delete` | Recycle bin / permanent delete |
| `Backspace` | Go back |
| `Enter` | Open selection |
| `a`–`z` | Type-ahead jump to matching name |

## 🏗️ Architecture

```
src-tauri/                 Rust backend (native speed)
  src/fuzzy.rs               Tiered fuzzy ranking engine (unit-tested, Unicode-folding)
  src/commands/
    search.rs                Parallel BFS scanner + in-memory index cache + streaming
    listing.rs               Directory listing, known folders, path autocompletion
    fs_ops.rs                Copy/move/rename/delete (recycle bin) + progress events
    preview.rs               Text/image preview with binary detection & size caps
    rename.rs                Batch rename engine (templates, regex, collision checks)
    drives.rs                Drive enumeration with capacity info
src/                       React 18 + TypeScript frontend
  api/fs.ts                  Typed wrappers over Tauri commands & events
  stores/                    Zustand stores (tabs, panes, selection, settings)
  i18n/                      6-language translation system
  components/                Virtualized file list, palette, dialogs, inspector, …
```

**Performance principles**

- Only visible rows are rendered (virtualization) — 100,000-file folders scroll smoothly
- All I/O happens on Rust background threads; the UI thread never blocks
- Release builds: LTO + `opt-level 3` + symbol stripping → small, fast binary

## 📦 Building from source

**Prerequisites**

1. [Rust](https://rustup.rs/) (stable, MSVC toolchain on Windows)
2. [Node.js](https://nodejs.org/) 20+ and [pnpm](https://pnpm.io/) — `npm i -g pnpm`
3. WebView2 runtime (preinstalled on Windows 10/11)

```powershell
pnpm install        # install frontend dependencies
pnpm tauri dev      # run in development mode (hot reload)
pnpm tauri build    # release installers (msi / nsis) → src-tauri/target/release/bundle
```

> **App icons**: generate `src-tauri/icons/` from any 1024×1024 image with
> `pnpm tauri icon path/to/icon.png`.

**Run the Rust test suite**

```powershell
cd src-tauri
cargo test
```

## 🤝 Contributing

Issues and pull requests are very welcome!

- 🌍 **Add a language** — copy `src/i18n/locales/en.ts`, translate the values, register it in `src/i18n/index.ts`. Done.
- 🐛 **Report a bug** — open an issue with steps to reproduce
- 💡 **Suggest a feature** — open a discussion; small, focused PRs merge fastest

## 📄 License

[MIT](./LICENSE) — free for personal and commercial use.

---

<div align="center">

**If VeloFiles saves you time, consider giving it a ⭐ — it helps others find the project!**

*Keywords: Windows file manager, file explorer alternative, Tauri app, Rust file manager, fast file search, dual pane file manager, open source explorer, batch rename tool, fuzzy file search*

</div>

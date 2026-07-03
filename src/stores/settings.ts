import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale } from "../i18n";

export type Theme = "dark" | "light";
export type ViewMode = "details" | "grid";

export const ACCENT_COLORS = [
  "#4f8cff",
  "#9a6bff",
  "#ff6b9a",
  "#ff9f43",
  "#2ecc71",
  "#00cec9",
] as const;

interface SettingsState {
  locale: Locale;
  theme: Theme;
  accent: string;
  fontSize: number;
  showHidden: boolean;
  viewMode: ViewMode;
  animations: boolean;
  recentFolders: string[];
  setLocale: (l: Locale) => void;
  setTheme: (t: Theme) => void;
  setAccent: (c: string) => void;
  setFontSize: (px: number) => void;
  toggleHidden: () => void;
  setViewMode: (m: ViewMode) => void;
  setAnimations: (on: boolean) => void;
  pushRecentFolder: (path: string) => void;
}

const initialLocale = ((): Locale => {
  const nav = navigator.language?.toLowerCase() ?? "en";
  for (const l of ["tr", "de", "fr", "es", "zh"] as Locale[]) {
    if (nav.startsWith(l)) return l;
  }
  return "en";
})();

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      locale: initialLocale,
      theme: "dark",
      accent: ACCENT_COLORS[0],
      fontSize: 14,
      showHidden: false,
      viewMode: "details",
      animations: true,
      recentFolders: [],
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setFontSize: (fontSize) => set({ fontSize: Math.min(22, Math.max(10, fontSize)) }),
      toggleHidden: () => set((s) => ({ showHidden: !s.showHidden })),
      setViewMode: (viewMode) => set({ viewMode }),
      setAnimations: (animations) => set({ animations }),
      pushRecentFolder: (path) =>
        set((s) => ({
          recentFolders: [path, ...s.recentFolders.filter((p) => p !== path)].slice(0, 20),
        })),
    }),
    { name: "velofiles-settings" },
  ),
);

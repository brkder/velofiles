import { en, type Messages } from "./locales/en";
import { tr } from "./locales/tr";
import { de } from "./locales/de";
import { fr } from "./locales/fr";
import { es } from "./locales/es";
import { zh } from "./locales/zh";
import { useSettings } from "../stores/settings";

export type Locale = "en" | "tr" | "de" | "fr" | "es" | "zh";

export const LOCALES: { id: Locale; label: string }[] = [
  { id: "en", label: "English" },
  { id: "tr", label: "Türkçe" },
  { id: "de", label: "Deutsch" },
  { id: "fr", label: "Français" },
  { id: "es", label: "Español" },
  { id: "zh", label: "中文" },
];

const messages: Record<Locale, Messages> = { en, tr, de, fr, es, zh };

export type MessageKey = keyof Messages;

export function translate(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  let text: string = messages[locale][key] ?? messages.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.split(`{${k}}`).join(String(v));
    }
  }
  return text;
}

/** Hook returning the translation function bound to the active locale. */
export function useT() {
  const locale = useSettings((s) => s.locale);
  return (key: MessageKey, params?: Record<string, string | number>) =>
    translate(locale, key, params);
}

export function detectLocale(): Locale {
  const nav = navigator.language?.toLowerCase() ?? "en";
  const found = LOCALES.find((l) => nav.startsWith(l.id));
  return found?.id ?? "en";
}

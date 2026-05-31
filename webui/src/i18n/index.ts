import { createI18n } from "vue-i18n";
import en from "./locales/en";
import zh from "./locales/zh";

const STORAGE_KEY = "duck-locale";

function getSavedLocale(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (saved === "en" || saved === "zh")) return saved;
  } catch {
    // localStorage unavailable
  }
  return "en";
}

export function saveLocale(locale: string) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // localStorage unavailable
  }
}

export const i18n = createI18n({
  legacy: false,
  locale: getSavedLocale(),
  fallbackLocale: "en",
  messages: { en, zh },
});

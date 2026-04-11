import React, { createContext, useContext, useState, ReactNode, useMemo } from "react";
import trTranslations from "./locales/tr.json";
import azTranslations from "./locales/az.json";
import enTranslations from "./locales/en.json";
import deTranslations from "./locales/de.json";
import esTranslations from "./locales/es.json";
import frTranslations from "./locales/fr.json";
import ptTranslations from "./locales/pt.json";
import zhTranslations from "./locales/zh.json";
import jaTranslations from "./locales/ja.json";
import itTranslations from "./locales/it.json";
import ruTranslations from "./locales/ru.json";
import koTranslations from "./locales/ko.json";
import arTranslations from "./locales/ar.json";
import hiTranslations from "./locales/hi.json";
import idTranslations from "./locales/id.json";
import viTranslations from "./locales/vi.json";
import thTranslations from "./locales/th.json";
import nlTranslations from "./locales/nl.json";
import svTranslations from "./locales/sv.json";
import plTranslations from "./locales/pl.json";
import ukTranslations from "./locales/uk.json";

export type Language = 
  | "tr" | "az" | "en" | "de" | "es" | "fr" | "pt" | "it" | "zh" | "ja" 
  | "ru" | "ko" | "ar" | "hi" | "id" | "vi" | "th" | "nl" | "sv" | "pl" | "uk";

type TranslationKey = keyof typeof trTranslations;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode, initialLanguage?: string }> = ({
  children,
  initialLanguage = "tr"
}) => {
  const [language, setLanguageState] = useState<Language>(initialLanguage as Language);


  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app_lang", lang);
  };

  const currentTranslations = useMemo(() => {
    const translations: Record<Language, any> = {
      tr: trTranslations,
      az: azTranslations,
      en: enTranslations,
      de: deTranslations,
      es: esTranslations,
      fr: frTranslations,
      pt: ptTranslations,
      zh: zhTranslations,
      ja: jaTranslations,
      it: itTranslations,
      ru: ruTranslations,
      ko: koTranslations,
      ar: arTranslations,
      hi: hiTranslations,
      id: idTranslations,
      vi: viTranslations,
      th: thTranslations,
      nl: nlTranslations,
      sv: svTranslations,
      pl: plTranslations,
      uk: ukTranslations
    };
    return translations[language] || trTranslations;
  }, [language]);

  const t = (key: TranslationKey): string => {
    return currentTranslations[key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
};

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getStoredLanguage, storeLanguage, hasLanguageBeenSelected, detectBrowserLanguage } from './languages';
import type { TranslationDict } from './types';

// Import all locale files
import en from '@/locales/en.json';
import hi from '@/locales/hi.json';
import bn from '@/locales/bn.json';
import mr from '@/locales/mr.json';
import te from '@/locales/te.json';
import ta from '@/locales/ta.json';
import gu from '@/locales/gu.json';
import kn from '@/locales/kn.json';
import ml from '@/locales/ml.json';
import pa from '@/locales/pa.json';
import es from '@/locales/es.json';
import fr from '@/locales/fr.json';

const TRANSLATIONS: Record<string, TranslationDict> = {
  en: en as TranslationDict,
  hi: hi as TranslationDict,
  bn: bn as TranslationDict,
  mr: mr as TranslationDict,
  te: te as TranslationDict,
  ta: ta as TranslationDict,
  gu: gu as TranslationDict,
  kn: kn as TranslationDict,
  ml: ml as TranslationDict,
  pa: pa as TranslationDict,
  es: es as TranslationDict,
  fr: fr as TranslationDict,
};

export type TranslationFn = (key: string, params?: Record<string, string | number>) => string;

interface I18nContextValue {
  lang: string;
  setLang: (lang: string) => void;
  t: TranslationFn;
  isFirstLaunch: boolean;
  setLanguageSelected: () => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const missingKeys = new Set<string>();

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<string>(() => {
    const stored = getStoredLanguage();
    return stored || detectBrowserLanguage();
  });
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean>(() => !hasLanguageBeenSelected());

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((newLang: string) => {
    setLangState(newLang);
    storeLanguage(newLang);
  }, []);

  const setLanguageSelected = useCallback(() => {
    setIsFirstLaunch(false);
  }, []);

  const t = useCallback<TranslationFn>((key: string, params?: Record<string, string | number>) => {
    const dict = TRANSLATIONS[lang];
    const fallbackDict = TRANSLATIONS.en;

    let value: string | undefined;
    if (dict && key in dict) {
      value = dict[key] as string;
    } else if (fallbackDict && key in fallbackDict) {
      value = fallbackDict[key] as string;
    } else {
      if (!missingKeys.has(key) && typeof console !== 'undefined') {
        missingKeys.add(key);
        console.warn(`[i18n] Missing translation key: ${key}`);
      }
      return key;
    }

    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        value = value!.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      }
    }

    return value!;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, isFirstLaunch, setLanguageSelected }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}

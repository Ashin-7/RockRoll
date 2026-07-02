import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { defaultLocale, Locale, MessageKey, messages } from './messages';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
}

const storageKey = 'rockroll.locale';
const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function readStoredLocale(): Locale {
  const storedLocale = window.localStorage.getItem(storageKey);
  return storedLocale === 'zh-CN' || storedLocale === 'en' ? storedLocale : defaultLocale;
}

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  const value = useMemo<I18nContextValue>(() => {
    function setLocale(nextLocale: Locale) {
      window.localStorage.setItem(storageKey, nextLocale);
      setLocaleState(nextLocale);
    }

    function t(key: MessageKey) {
      return messages[locale][key] ?? messages[defaultLocale][key];
    }

    return {
      locale,
      setLocale,
      t,
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);

  if (!value) {
    throw new Error('useI18n must be used inside I18nProvider');
  }

  return value;
}

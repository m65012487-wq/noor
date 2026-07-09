import React, { createContext, useContext, useEffect, useState } from 'react';
import { getLocales } from 'expo-localization';
import { STRINGS } from './strings';
import { loadJSON, saveJSON } from '../utils/helpers';

const LangContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await loadJSON('appLang', null);
      if (saved) {
        setLangState(saved);
      } else {
        // Detect from phone language, default English otherwise.
        const sys = getLocales()?.[0]?.languageCode;
        setLangState(sys === 'ru' ? 'ru' : 'en');
      }
      setReady(true);
    })();
  }, []);

  const setLang = async (l) => {
    setLangState(l);
    await saveJSON('appLang', l);
  };

  const t = (key) => STRINGS[lang][key] ?? STRINGS.en[key] ?? key;

  if (!ready) return null;

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);

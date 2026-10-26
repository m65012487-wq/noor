import React, { createContext, useContext, useEffect, useState } from 'react';
import { getLocales } from 'expo-localization';
import { STRINGS } from './strings';
import { LANG_IDS } from './languages';
import { loadJSON, saveJSON } from '../utils/helpers';

// Строка словаря на языке интерфейса: нет перевода — английская, затем ключ.
// vars подставляются вместо {имя}: t('min_until', { n: 5 }) → «5 минут до…».
function translate(lang, key, vars) {
  let text = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  if (vars) for (const [name, value] of Object.entries(vars)) text = text.split(`{${name}}`).join(String(value));
  return text;
}

const LangContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (k, vars) => translate('en', k, vars),
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await loadJSON('appLang', null);
      if (saved && LANG_IDS.includes(saved)) {
        setLangState(saved);
      } else {
        // Язык телефона, если он среди наших; иначе английский.
        const sys = getLocales()?.[0]?.languageCode;
        setLangState(LANG_IDS.includes(sys) ? sys : 'en');
      }
      setReady(true);
    })();
  }, []);

  const setLang = async (l) => {
    setLangState(l);
    await saveJSON('appLang', l);
  };

  const t = (key, vars) => translate(lang, key, vars);

  if (!ready) return null;

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);

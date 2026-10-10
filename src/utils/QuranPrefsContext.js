import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadJSON, saveJSON } from './helpers';
import { TRANSLATIONS, RECITERS, DEFAULTS } from './quranApi';

const QuranPrefsContext = createContext(null);

export function QuranPrefsProvider({ lang, children }) {
  const [translationId, setTranslationId] = useState(null);
  const [reciterId, setReciterId] = useState(DEFAULTS.audio);
  const [showArabic, setShowArabic] = useState(true);
  const [showTranslit, setShowTranslit] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [wordByWord, setWordByWord] = useState(false);
  // Размер текста один на читалку суры и ежедневное чтение: человек выбирает
  // его там, где читает суру, а в ежедневном чтении он просто совпадает.
  const [fontScale, setFontScaleState] = useState(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const savedT = await loadJSON('quranTranslation', null);
      const savedR = await loadJSON('quranReciter', null);
      const fallback = (TRANSLATIONS[lang] || TRANSLATIONS.en)[0].id;
      setTranslationId(savedT || fallback);
      setReciterId(savedR || DEFAULTS.audio);
      setShowArabic(await loadJSON('quranShowArabic', true));
      setShowTranslit(await loadJSON('quranShowTranslit', true));
      setShowTranslation(await loadJSON('quranShowTranslation', true));
      setWordByWord(await loadJSON('quranWordByWord', false));
      const savedScale = await loadJSON('quranFontScale', 1);
      setFontScaleState(Number.isFinite(savedScale) ? Math.min(1.6, Math.max(0.8, savedScale)) : 1);
      setReady(true);
    })();
  }, []);

  // When app language changes and the user hasn't manually chosen, follow it.
  useEffect(() => {
    (async () => {
      const savedT = await loadJSON('quranTranslation', null);
      if (!savedT) {
        const fallback = (TRANSLATIONS[lang] || TRANSLATIONS.en)[0].id;
        setTranslationId(fallback);
      }
    })();
  }, [lang]);

  const chooseTranslation = async (id) => {
    setTranslationId(id);
    await saveJSON('quranTranslation', id);
  };
  const chooseReciter = async (id) => {
    setReciterId(id);
    await saveJSON('quranReciter', id);
  };
  const toggleArabic = async (v) => { setShowArabic(v); await saveJSON('quranShowArabic', v); };
  const toggleTranslit = async (v) => { setShowTranslit(v); await saveJSON('quranShowTranslit', v); };
  const toggleTranslation = async (v) => { setShowTranslation(v); await saveJSON('quranShowTranslation', v); };
  const toggleWordByWord = async (v) => { setWordByWord(v); await saveJSON('quranWordByWord', v); };

  const changeFontScale = async (delta) => {
    const v = Math.min(1.6, Math.max(0.8, +(fontScale + delta).toFixed(2)));
    setFontScaleState(v);
    await saveJSON('quranFontScale', v);
  };

  if (!ready) return null;

  return (
    <QuranPrefsContext.Provider
      value={{ translationId, reciterId, chooseTranslation, chooseReciter,
        showArabic, showTranslit, showTranslation,
        toggleArabic, toggleTranslit, toggleTranslation, wordByWord, toggleWordByWord, fontScale, changeFontScale }}
    >
      {children}
    </QuranPrefsContext.Provider>
  );
}

export const useQuranPrefs = () => useContext(QuranPrefsContext);

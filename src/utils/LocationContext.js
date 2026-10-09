import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { loadJSON, saveJSON } from '../utils/helpers';

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const [coords, setCoords] = useState(null); // { lat, lng, label, region, country }
  const [status, setStatus] = useState('init'); // init | ok | denied | error
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // Use a previously chosen/cached location first for instant load.
      const saved = await loadJSON('chosenLocation', null);
      if (saved) {
        setCoords(saved);
        setStatus('ok');
      }
      // Location permission/GPS can remain pending. Reading and Tasbih must still open.
      setReady(true);
      // Место, сохранённое до появления страны, дополняем один раз.
      if (saved && !saved.country && !saved.geoChecked) await fillPlace(saved);
      // Then try to refresh from GPS unless user manually picked a city.
      if (!saved || saved.fromGps) {
        await requestGps();
      }
    })();
  }, []);

  async function requestGps() {
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        setStatus((s) => (coords ? s : 'denied'));
        return false;
      }
      const loc = await Location.getCurrentPositionAsync({});
      // Reverse geocode to show a friendly label. Регион и страна нужны ещё и
      // времени намаза: официальный график ДУМ действует в границах своего
      // региона, а управление на всю страну (и метод по умолчанию) — своей страны.
      let label = 'Current location';
      let region;
      let country;
      try {
        const geo = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (geo?.[0]) {
          label = geo[0].city || geo[0].region || label;
          region = geo[0].region || undefined;
          country = geo[0].isoCountryCode ? String(geo[0].isoCountryCode).toUpperCase() : undefined;
        }
      } catch {}
      const c = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        label,
        region,
        country,
        fromGps: true,
      };
      setCoords(c);
      setStatus('ok');
      await saveJSON('chosenLocation', c);
      return true;
    } catch (e) {
      setStatus((s) => (coords ? s : 'error'));
      return false;
    }
  }

  // Сохранённому месту без страны (выбрано до того, как её стали хранить)
  // допишем страну и недостающий регион обратным геокодированием. Ответ
  // геокодера запоминается флагом geoChecked, чтобы не спрашивать при каждом
  // запуске; если спросить не удалось (нет сети), флага нет и спросим позже.
  async function fillPlace(saved) {
    let answer = null;
    try {
      answer = await Location.reverseGeocodeAsync({ latitude: saved.lat, longitude: saved.lng });
    } catch {}
    if (!Array.isArray(answer)) return;
    // Пока шёл запрос, место могли выбрать заново: тогда дописывать некуда.
    const current = await loadJSON('chosenLocation', null);
    if (!current || current.lat !== saved.lat || current.lng !== saved.lng) return;
    const geo = answer[0];
    const code = geo?.isoCountryCode ? String(geo.isoCountryCode).toUpperCase() : undefined;
    const filled = {
      ...current,
      country: current.country || code,
      region: current.region || geo?.region || undefined,
      geoChecked: true,
    };
    setCoords(filled);
    await saveJSON('chosenLocation', filled);
  }

  async function setManual(c) {
    const chosen = { ...c, fromGps: false };
    setCoords(chosen);
    setStatus('ok');
    await saveJSON('chosenLocation', chosen);
  }

  if (!ready) return null;

  return (
    <LocationContext.Provider value={{ coords, status, requestGps, setManual }}>
      {children}
    </LocationContext.Provider>
  );
}

export const useLocation = () => useContext(LocationContext);

// Free worldwide city search via Open-Meteo geocoding (no API key).
// Язык поиска — по алфавиту запроса: с language=en кириллический «Нальчик»
// не находится вовсе, а с ru находится вместе с регионом «Кабардино-Балкария».
export async function searchCity(name) {
  const language = /[а-яё]/i.test(name) ? 'ru' : 'en';
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    name
  )}&count=8&language=${language}&format=json`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.results) return [];
  return json.results.map((r) => ({
    lat: r.latitude,
    lng: r.longitude,
    label: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    short: r.name,
    region: r.admin1,
    country: r.country_code ? String(r.country_code).toUpperCase() : undefined,
  }));
}

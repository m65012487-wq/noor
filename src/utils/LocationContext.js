import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { loadJSON, saveJSON } from '../utils/helpers';

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const [coords, setCoords] = useState(null); // { lat, lng, label }
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
      // Then try to refresh from GPS unless user manually picked a city.
      if (!saved || saved.fromGps) {
        await useGps();
      }
      setReady(true);
    })();
  }, []);

  async function useGps() {
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        setStatus((s) => (coords ? s : 'denied'));
        return false;
      }
      const loc = await Location.getCurrentPositionAsync({});
      // Reverse geocode to show a friendly label.
      let label = 'Current location';
      try {
        const geo = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (geo?.[0]) label = geo[0].city || geo[0].region || label;
      } catch {}
      const c = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        label,
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

  async function setManual(c) {
    const chosen = { ...c, fromGps: false };
    setCoords(chosen);
    setStatus('ok');
    await saveJSON('chosenLocation', chosen);
  }

  if (!ready) return null;

  return (
    <LocationContext.Provider value={{ coords, status, useGps, setManual }}>
      {children}
    </LocationContext.Provider>
  );
}

export const useLocation = () => useContext(LocationContext);

// Free worldwide city search via Open-Meteo geocoding (no API key).
export async function searchCity(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    name
  )}&count=8&language=en&format=json`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.results) return [];
  return json.results.map((r) => ({
    lat: r.latitude,
    lng: r.longitude,
    label: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    short: r.name,
  }));
}

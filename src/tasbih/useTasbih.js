import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ackDrop, advance, definition, plantSeed, registerDhikr, selectDhikr, setActiveTree } from './model';
import { tasbihPersistence } from './persistence';
import { localDateKey } from '../utils/calendarDate';
const TasbihContext = createContext(null);
export function TasbihProvider({ children }) {
  const value = useTasbihState();
  return <TasbihContext.Provider value={value}>{children}</TasbihContext.Provider>;
}
export default function useTasbih() { return useContext(TasbihContext); }
function useTasbihState() {
  const [state, setState] = useState(null);
  const [error, setError] = useState(false);
  const current = useRef(null);
  const mounted = useRef(true);
  const revision = useRef(0);
  const persist = useCallback(next => {
    current.current = next;
    setState(next);
    const rev = ++revision.current;
    tasbihPersistence.save(next).then(() => {
      if (mounted.current && rev === revision.current) setError(false);
    }).catch(() => { if (mounted.current) setError(true); });
  }, []);
  const load = useCallback(() => {
    tasbihPersistence.load().then(value => {
      if (!mounted.current) return;
      current.current = value; setState(value); setError(false);
    }).catch(() => { if (mounted.current) setError(true); });
  }, []);
  useEffect(() => {
    mounted.current = true;
    load();
    const sub = AppState.addEventListener('change', status => {
      if (status !== 'active' && current.current) tasbihPersistence.save(current.current).catch(() => { if (mounted.current) setError(true); });
    });
    return () => { mounted.current = false; sub.remove(); };
  }, [load]);
  useEffect(() => {
    if (!state || state.currentDhikrCount < definition(state).target) return undefined;
    const timer = setTimeout(() => persist(advance(current.current)), 550);
    return () => clearTimeout(timer);
  }, [state, persist]);
  return { state, error,
    tap: () => { if (current.current) persist(registerDhikr(current.current, localDateKey())); },
    select: id => { if (current.current) persist(selectDhikr(current.current, id)); },
    plant: species => { if (current.current) persist(plantSeed(current.current, species, localDateKey())); },
    setActive: id => { if (current.current) persist(setActiveTree(current.current, id)); },
    ackDrop: () => { if (current.current) persist(ackDrop(current.current)); },
    sawGate: () => { if (current.current && !current.current.hasSeenGateHint) persist({ ...current.current, hasSeenGateHint: true }); },
    retry: () => current.current ? persist(current.current) : load(),
  };
}

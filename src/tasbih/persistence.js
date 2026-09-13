import AsyncStorage from '@react-native-async-storage/async-storage';
import { initialState, restoreState } from './model';
export const TASBIH_KEY = 'tasbih:v1';
export function createPersistence(storage = AsyncStorage) {
  let tail = Promise.resolve();
  return {
    async load() {
      await tail.catch(() => {});
      const raw = await storage.getItem(TASBIH_KEY);
      return raw ? restoreState(JSON.parse(raw)) : initialState();
    },
    save(state) {
      const value = JSON.stringify(state);
      tail = tail.catch(() => {}).then(() => storage.setItem(TASBIH_KEY, value));
      return tail;
    },
  };
}
export const tasbihPersistence = createPersistence();

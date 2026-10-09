import { useSyncExternalStore } from 'react';
import { subscribeTables, tablesVersion } from './officialTables';

// Версия графиков для зависимостей эффектов: пришла таблица с сервера — экран
// пересчитывает времена сразу, не дожидаясь следующего открытия. Отдельный
// файл нужен, чтобы officialTables.js не тянул React: его грузят тесты в node.
export function useTablesVersion() {
  return useSyncExternalStore(subscribeTables, tablesVersion);
}

// Синхронизация официальных графиков с сервером noor-times.
//
// Сервер — статические файлы на GitHub Pages (формат — FORMAT.md в его
// репозитории): index.json со списком управлений и таблицы по пунктам и годам.
// Приложение должно работать и без него, поэтому любая беда с сетью здесь
// гасится: встроенные графики и уже скачанные остаются на месте.
//
// В хранилище лежит (все ключи с префиксом officialTables:v1:):
//   index     — последний принятый индекс;
//   etag      — его ETag, для условного запроса;
//   syncedAt  — когда сверка с сервером прошла без ошибок;
//   manifest  — какие таблицы скачаны: id -> hash, с которым скачаны;
//   table:<id> — сама таблица ({ hash, table }), id вида ru-kbr/kbr/2026.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { batchInstall, installIndex, installTables, isValidTable, resolveAuthority, resolvePlace } from './officialTables';

export const SERVER_URL = 'https://m65012487-wq.github.io/noor-times/v1/';

const PREFIX = 'officialTables:v1:';
const KEY_INDEX = PREFIX + 'index';
const KEY_ETAG = PREFIX + 'etag';
const KEY_SYNCED = PREFIX + 'syncedAt';
const KEY_MANIFEST = PREFIX + 'manifest';
const KEY_TABLE = PREFIX + 'table:';

// Графики меняются редко, а открывают приложение часто: чаще раза в 12 часов
// сервер не спрашиваем.
const SYNC_INTERVAL_MS = 12 * 3600 * 1000;
const FETCH_TIMEOUT_MS = 15000;
// Сверка дошла до таблиц, но одна не скачалась (404, битый файл): повторять её
// при каждом выходе на передний план значит каждый раз гонять index.json зря.
const RETRY_PAUSE_MS = 3600 * 1000;

let loading = null; // загрузка сохранённого: одна на запуск
const stored = new Map(); // id таблицы -> hash, с которым она скачана
let etag = null; // ETag принятого индекса
let syncedAt = 0; // время последней удачной сверки, мс
let failedAt = 0; // когда сверка в последний раз споткнулась о таблицу, мс
let queue = Promise.resolve(); // сверки идут по очереди, а не вперебой

async function read(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

// Запись — по возможности: не записалось, значит при следующем запуске таблицу
// скачают снова. Установленное в память от этого не страдает.
async function write(key, value) {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch { /* см. выше */ }
}

async function restore() {
  try {
    const index = await read(KEY_INDEX);
    const tag = await read(KEY_ETAG);
    const syncedRaw = await read(KEY_SYNCED);
    const manifest = (await read(KEY_MANIFEST)) || {};
    const found = [];
    for (const id of Object.keys(manifest)) {
      const item = await read(KEY_TABLE + id);
      if (!item || !isValidTable(item.table)) continue;
      found.push(item.table);
      stored.set(id, item.hash ?? null);
    }
    // Индекс и таблицы встают одним коммитом: экран пересчитается один раз.
    await batchInstall(async () => {
      // ETag без индекса опасен: сервер ответил бы 304, а ставить было бы нечего.
      if (index && installIndex(index)) {
        etag = typeof tag === 'string' ? tag : null;
        syncedAt = Number(syncedRaw) || 0;
      }
      installTables(found);
    });
  } catch {
    // Хранилище недоступно — живём на встроенном.
  }
}

/**
 * Поднять из хранилища сохранённые индекс и таблицы и поставить их. Звать один
 * раз на старте, до первого расчёта времён. Повторные вызовы возвращают тот же
 * промис; ошибок не бросает.
 */
export function loadStoredTables() {
  if (!loading) loading = restore();
  return loading;
}

// Запрос с таймаутом на всё: и на ответ, и на чтение тела. Таймер обрывает
// fetch, а гонка нужна на случай, когда реализация сигнал не слушает.
function request(url, headers, timeoutMs) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, timeoutMs);
  });
  const work = (async () => {
    const res = await fetch(url, { headers, signal: controller.signal });
    const text = res.status === 200 ? await res.text() : '';
    return { status: res.status, etag: res.headers?.get?.('etag') || null, text };
  })();
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

// Путь из индекса подставляется в адрес, поэтому пускаем только обычный
// относительный: без схемы, без «..».
function isSafePath(path) {
  return typeof path === 'string' && /^[\w.-]+(\/[\w.-]+)*$/.test(path)
    && !path.split('/').some((part) => part === '.' || part === '..');
}

// Пункт, для которого сверяемся: ближайший пункт управления места.
function target(where) {
  const authority = resolveAuthority(where);
  const place = authority && resolvePlace(authority, where);
  return place ? { authority, place } : null;
}

// Таблицы ближайшего пункта за прошлый, этот и следующий год, если они есть в
// индексе: на стыке лет нужна и новая, и прошлогодняя (она подстраховывает
// новую, пока та не вышла).
function wanted(here, year) {
  if (!here) return [];
  const { authority, place } = here;
  return place.tables
    .filter((entry) => Number.isInteger(entry.year) && Math.abs(entry.year - year) <= 1 && isSafePath(entry.path))
    .map((entry) => ({ id: `${authority.id}/${place.id}/${entry.year}`, entry, authority, place }));
}

// Скачана ли таблица в нужной версии. У записи без hash сверять нечем, и
// годится любая скачанная.
const isCurrent = ({ id, entry }) => stored.has(id) && (entry.hash == null || stored.get(id) === entry.hash);

// Файл должен быть тем, что обещает индекс: чужая, битая или обрезанная
// таблица не вправе занять место настоящей. Длина и начало сверяются, когда
// индекс их назвал.
function matches(table, { authority, place, entry }) {
  return isValidTable(table) && table.authority === authority.id && table.place.id === place.id
    && Number(table.start.slice(0, 4)) === entry.year
    && (typeof entry.start !== 'string' || table.start === entry.start)
    && (!Number.isFinite(entry.days) || table.days.length === entry.days);
}

// Сохранённые таблицы вне текущего пункта и лет Y−1..Y+1 больше не нужны:
// уходят из хранилища и манифеста. В памяти до перезапуска они остаются —
// лишнего не показывают, а версию графиков зря не дёргают.
async function prune({ authority, place }, year) {
  let removed = false;
  for (const id of [...stored.keys()]) {
    const [a, p, y] = id.split('/');
    if (a === authority.id && p === place.id && Math.abs(Number(y) - year) <= 1) continue;
    stored.delete(id);
    removed = true;
    try { await AsyncStorage.removeItem(KEY_TABLE + id); } catch { /* уберётся в следующий раз */ }
  }
  if (removed) await write(KEY_MANIFEST, Object.fromEntries(stored));
}

async function sync(where, { force = false, now = Date.now(), timeoutMs = FETCH_TIMEOUT_MS } = {}) {
  try {
    await loadStoredTables();
    const at = now instanceof Date ? now.getTime() : Number(now);
    const year = new Date(at).getFullYear();

    // Недавний сбой на таблице: час не трогаем сервер (если часы не ушли назад).
    if (!force && failedAt && at >= failedAt && at - failedAt < RETRY_PAUSE_MS) return false;

    // Предел в 12 часов — про опрос сервера за новостями. Таблицы, которые
    // индекс уже обещает для этого места, но которых нет, опрос не ждут:
    // иначе после переезда в другой регион график появился бы только завтра.
    // Часы, переведённые назад, взаперти сверку не держат.
    const stale = !syncedAt || at < syncedAt || at - syncedAt >= SYNC_INTERVAL_MS;
    if (!force && !stale && wanted(target(where), year).every(isCurrent)) return true;

    // Индекс и таблицы встают одним коммитом: экран пересчитается один раз.
    return await batchInstall(async () => {
      const res = await request(SERVER_URL + 'index.json', etag ? { 'If-None-Match': etag } : {}, timeoutMs);
      let fresh = null;
      if (res.status === 200) {
        fresh = JSON.parse(res.text);
        // Ставим сразу: ближайший пункт определяется уже по новому индексу.
        if (!installIndex(fresh)) return false;
      } else if (!(res.status === 304 && etag)) {
        return false;
      }

      const here = target(where);
      let ok = true;
      const downloaded = [];
      for (const item of wanted(here, year).filter((w) => !isCurrent(w))) {
        let table;
        try {
          const got = await request(SERVER_URL + item.entry.path, {}, timeoutMs);
          if (got.status !== 200) { ok = false; continue; }
          table = JSON.parse(got.text);
        } catch {
          // Сеть отвалилась — остальные попытки обернулись бы тем же ожиданием.
          ok = false;
          break;
        }
        if (!matches(table, item)) { ok = false; continue; }
        await write(KEY_TABLE + item.id, { hash: item.entry.hash ?? null, table });
        stored.set(item.id, item.entry.hash ?? null);
        downloaded.push(table);
      }
      if (downloaded.length) {
        installTables(downloaded);
        await write(KEY_MANIFEST, Object.fromEntries(stored));
      }

      // Индекс и ETag запоминаем, только когда всё скачалось: иначе при 304 не
      // дошедшие таблицы так и остались бы недокачанными. Индекс пишется раньше
      // ETag — оборвись запись посередине, следующий запрос просто вернёт 200.
      if (!ok) {
        failedAt = at;
        return false;
      }
      failedAt = 0;
      if (fresh) {
        await write(KEY_INDEX, fresh);
        etag = res.etag;
        await write(KEY_ETAG, etag);
      }
      syncedAt = at;
      await write(KEY_SYNCED, at);
      if (here) await prune(here, year);
      return true;
    });
  } catch {
    return false;
  }
}

/**
 * Сверить графики с сервером для этого места.
 *
 * Не чаще раза в 12 часов (кроме force) — и то только если нужные таблицы уже
 * скачаны. Индекс запрашивается с If-None-Match; затем скачиваются таблицы
 * ближайшего пункта управления места за годы Y−1, Y, Y+1, если они есть в
 * индексе и их hash отличается от сохранённого. Скачанное сохраняется и сразу
 * ставится в officialTables вместе с индексом одним коммитом, подписчики
 * (useTablesVersion) узнают об этом один раз. Скачанная таблица сверяется с
 * записью индекса (управление, пункт, год, начало, число строк). После удачной
 * сверки лишние сохранённые таблицы (чужой пункт, годы вне Y−1..Y+1) удаляются.
 * Если на таблице вышел сбой (404, битый файл), час сервер не трогаем.
 *
 * Сверки идут по очереди, ошибок не бросает.
 *
 * @param {{lat?:number, lng?:number, region?:string, country?:string}} where место
 * @param {{force?:boolean, now?:Date|number, timeoutMs?:number}} [options]
 *   force — игнорировать предел в 12 часов; now и timeoutMs нужны тестам
 * @returns {Promise<boolean>} true — графики актуальны (сверено сейчас или
 *   недавно), false — сервер недоступен или ответил непонятно
 */
export function syncOfficialTables(where, options = {}) {
  const run = queue.then(() => sync(where || {}, options));
  queue = run.then(() => {}, () => {});
  return run;
}

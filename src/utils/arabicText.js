// Арабский в интерфейсе: подбор кегля для строки, вписанной в ширину
// (ArabicFitText), и поиск арабских вставок в русском или английском тексте
// (AppText). Чистые функции — покрыты тестами (tests/core.test.cjs).

// Диапазоны записаны кодами, а не самими символами: среди них есть невидимые
// (U+FEFF), которые редактор может молча потерять.
const AR = '\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF';
const HAS_AR = new RegExp(`[${AR}]`, 'u');
// Арабский отрезок вместе с пробелами между арабскими словами.
const AR_RUN = new RegExp(`([${AR}]+(?:\\s+[${AR}]+)*)`, 'u');
const HAS_LETTER = /[A-Za-zА-Яа-яЁё]/;

// Строка, где арабский соседствует с русскими или латинскими буквами.
export function isMixedArabic(value) {
  return typeof value === 'string' && HAS_AR.test(value) && HAS_LETTER.test(value);
}

// Отрезки строки по порядку: { text, arabic }. Пустых отрезков нет.
export function splitArabicRuns(value) {
  // split с группой захвата: арабские отрезки стоят на нечётных местах.
  return String(value).split(AR_RUN)
    .map((text, i) => ({ text, arabic: i % 2 === 1 }))
    .filter((part) => part.text !== '');
}

// Кегль арабской строки по её полной ширине при обычном кегле (total) и ширине
// рамки (boxW). Ширина букв растёт с кеглем линейно, поэтому кегль считается
// пропорцией: такой, чтобы строка поместилась, но не меньше min. Если не
// помещается и на min — перенос на следующую строку (до maxLines), а не сжатие
// дальше. При переносе кегль ограничен ещё и высотой maxHeight всего блока:
// две строки полного кегля не влезли бы в отведённое место.
//
// base — обычные { fontSize, lineHeight }; межстрочный меняется вместе с кеглем.
// wrapped — текст при замере перенёсся. Сумма ширин строк не включает пробелы
// на местах переноса и может выйти чуть меньше рамки, хотя в одну строку текст
// не встал, — поэтому перенос учитывается отдельно, а не только по ширине.
export function fitArabicSize({ total, boxW, base, min, maxLines = 1, maxHeight = Infinity, wrapped = false }) {
  const ratio = base.lineHeight / base.fontSize;
  if (!(boxW > 0) || !(wrapped || total > boxW)) {
    return { fontSize: base.fontSize, lineHeight: base.lineHeight, lines: 1 };
  }
  // Запас на неровный перенос по словам и на округления.
  const need = Math.max(total, boxW) * 1.04;
  let lines = 1;
  let size = (base.fontSize * boxW) / need;
  while (size < min && lines < maxLines) {
    lines += 1;
    size = (base.fontSize * boxW * lines * 0.85) / need;
  }
  if (lines > 1) size = Math.min(size, maxHeight / (lines * ratio));
  const fontSize = Math.max(min, Math.min(base.fontSize, Math.floor(size)));
  return { fontSize, lineHeight: Math.round(fontSize * ratio), lines };
}

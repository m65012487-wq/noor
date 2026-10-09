// Метод расчёта по стране — для источника «Авто», когда у места нет своего
// духовного управления (officialTables.js) или управление не назвало запасной
// способ. Числа — номера методов Aladhan (api.aladhan.com/v1/methods): страна
// или её главная организация выбрала метод сама, мы только сопоставляем.
export const COUNTRY_METHODS = {
  RU: 14, KZ: 14, // ДУМ РФ: Фаджр 16°, Иша 15°
  TR: 13, AZ: 13, DE: 13, // Диянет
  MY: 17, // JAKIM
  ID: 20, // Kemenag
  SG: 11, // MUIS
  FR: 12, // UOIF
  US: 2, CA: 2, // ISNA
  SA: 4, // Умм аль-Кура
  EG: 5, // Египетская организация
  AE: 16, // Дубай
  KW: 9, QA: 10, JO: 23, TN: 18, DZ: 19, MA: 21, PT: 22,
  PK: 1, IN: 1, BD: 1, // Карачи
  IR: 7, // Тегеран
  UZ: 3, NL: 3, BE: 3, // Лига исламского мира
  GB: 15, // Комитет наблюдения луны
};

// Страна не из списка: Лига исламского мира, самый нейтральный из методов.
export const DEFAULT_ALADHAN_METHOD = 3;

// Ближайший к методу Aladhan локальный метод adhan (id из calcMethods.js) —
// для расчёта без сети. «Ближайший» значит по углам Фаджра и Иши; adhan умеет
// не все методы Aladhan, поэтому часть номеров сводится к соседям:
//   14 (16°/15°) и 12 (12°/12°) ближе всего к ISNA (15°/15°);
//   17 и 20 (20°/18°) совпадают с сингапурским;
//   18, 19, 21–23 (18–19°/17–18°) — с Лигой исламского мира;
//   8 (Персидский залив: 19,5° и 90 минут после магриба) — с катарским.
export const LOCAL_FOR_ALADHAN = {
  0: 'tehran', 1: 'karachi', 2: 'isna', 3: 'mwl', 4: 'makkah', 5: 'egypt', 7: 'tehran',
  8: 'qatar', 9: 'kuwait', 10: 'qatar', 11: 'singapore', 12: 'isna', 13: 'turkey',
  14: 'isna', 15: 'moonsighting', 16: 'dubai', 17: 'singapore', 18: 'mwl', 19: 'mwl',
  20: 'singapore', 21: 'mwl', 22: 'mwl', 23: 'mwl',
};

export function localMethodFor(aladhanMethod) {
  return LOCAL_FOR_ALADHAN[aladhanMethod] || 'mwl';
}

/**
 * Метод по стране места.
 *
 * @param {string} [country] ISO 3166-1 alpha-2, регистр не важен
 * @returns {{aladhan:number, local:string}} номер метода Aladhan и его локальный двойник
 */
export function methodForCountry(country) {
  const code = typeof country === 'string' ? country.trim().toUpperCase() : '';
  const aladhan = COUNTRY_METHODS[code] ?? DEFAULT_ALADHAN_METHOD;
  return { aladhan, local: localMethodFor(aladhan) };
}

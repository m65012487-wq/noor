// Calculation methods for LOCAL prayer-time computation (adhan library).
export const CALC_METHODS = [
  { id: 'mwl', label_en: 'Muslim World League', label_tr: 'Müslüman Dünya Birliği', label_id: 'Liga Dunia Muslim', label_fr: 'Ligue islamique mondiale', label_de: 'Muslimische Weltliga', label_es: 'Liga Musulmana Mundial', label_ru: 'Лига исламского мира' },
  { id: 'isna', label_en: 'ISNA (North America)', label_tr: 'ISNA (Kuzey Amerika)', label_id: 'ISNA (Amerika Utara)', label_fr: 'ISNA (Amérique du Nord)', label_de: 'ISNA (Nordamerika)', label_es: 'ISNA (Norteamérica)', label_ru: 'ISNA (Сев. Америка)' },
  { id: 'egypt', label_en: 'Egyptian Authority', label_tr: 'Mısır Otoritesi', label_id: 'Otoritas Mesir', label_fr: 'Autorité égyptienne', label_de: 'Ägyptische Behörde', label_es: 'Autoridad egipcia', label_ru: 'Египетская организация' },
  { id: 'makkah', label_en: 'Umm al-Qura (Makkah)', label_tr: 'Ümmü’l-Kura (Mekke)', label_id: 'Ummul Qura (Makkah)', label_fr: 'Oumm al-Qura (La Mecque)', label_de: 'Umm al-Qura (Mekka)', label_es: 'Umm al-Qura (La Meca)', label_ru: 'Умм аль-Кура (Мекка)' },
  { id: 'karachi', label_en: 'Karachi', label_tr: 'Karaçi', label_id: 'Karachi', label_fr: 'Karachi', label_de: 'Karatschi', label_es: 'Karachi', label_ru: 'Карачи' },
  { id: 'dubai', label_en: 'Dubai', label_tr: 'Dubai', label_id: 'Dubai', label_fr: 'Dubaï', label_de: 'Dubai', label_es: 'Dubái', label_ru: 'Дубай' },
  { id: 'kuwait', label_en: 'Kuwait', label_tr: 'Kuveyt', label_id: 'Kuwait', label_fr: 'Koweït', label_de: 'Kuwait', label_es: 'Kuwait', label_ru: 'Кувейт' },
  { id: 'qatar', label_en: 'Qatar', label_tr: 'Katar', label_id: 'Qatar', label_fr: 'Qatar', label_de: 'Katar', label_es: 'Catar', label_ru: 'Катар' },
  { id: 'turkey', label_en: 'Turkey (Diyanet)', label_tr: 'Türkiye (Diyanet)', label_id: 'Turki (Diyanet)', label_fr: 'Turquie (Diyanet)', label_de: 'Türkei (Diyanet)', label_es: 'Turquía (Diyanet)', label_ru: 'Турция (Диянет)' },
  { id: 'tehran', label_en: 'Tehran', label_tr: 'Tahran', label_id: 'Teheran', label_fr: 'Téhéran', label_de: 'Teheran', label_es: 'Teherán', label_ru: 'Тегеран' },
  { id: 'singapore', label_en: 'Singapore', label_tr: 'Singapur', label_id: 'Singapura', label_fr: 'Singapour', label_de: 'Singapur', label_es: 'Singapur', label_ru: 'Сингапур' },
  { id: 'moonsighting', label_en: 'Moonsighting Committee', label_tr: 'Hilal Gözlem Komitesi', label_id: 'Komite Rukyat Hilal', label_fr: 'Comité d’observation de la lune', label_de: 'Mondsichtungs-Komitee', label_es: 'Comité de avistamiento lunar', label_ru: 'Комитет наблюдения луны' },
];

export const ASR_SCHOOLS = [
  { id: 'shafi', label_en: 'Standard (Shafi/Maliki/Hanbali)', label_tr: 'Standart (Şafii/Maliki/Hanbeli)', label_id: 'Standar (Syafi’i/Maliki/Hanbali)', label_fr: 'Standard (chaféite/malikite/hanbalite)', label_de: 'Standard (schafiitisch/malikitisch/hanbalitisch)', label_es: 'Estándar (shafií/malikí/hanbalí)', label_ru: 'Стандартный (Шафии/Малики/Ханбали)' },
  { id: 'hanafi', label_en: 'Hanafi', label_tr: 'Hanefi', label_id: 'Hanafi', label_fr: 'Hanafite', label_de: 'Hanafitisch', label_es: 'Hanafí', label_ru: 'Ханафитский' },
];

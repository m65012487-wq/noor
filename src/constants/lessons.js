// Structured Quran-reading course based on the classic Noorani Qaida method.
// Progression: letters -> letter forms -> short vowels (harakat) ->
// long vowels (madd) -> sukoon -> shadda -> tanwin -> blending words.
// Each lesson is bite-sized; tap any Arabic to hear it.

// Переводы рядом с _ru / _en: tx('title', [tr, id, fr, de, es]) → title_tr … title_es.
const tx = (field, [tr, id, fr, de, es]) => ({
  [`${field}_tr`]: tr,
  [`${field}_id`]: id,
  [`${field}_fr`]: fr,
  [`${field}_de`]: de,
  [`${field}_es`]: es,
});

export const LESSONS = [
  {
    id: 1,
    title_en: 'Lesson 1 · The Letters',
    ...tx('title', ['Ders 1 · Harfler', 'Pelajaran 1 · Huruf', 'Leçon 1 · Les lettres', 'Lektion 1 · Die Buchstaben', 'Lección 1 · Las letras']),
    title_ru: 'Урок 1 · Буквы',
    intro_en: 'Start here. Learn to recognize each Arabic letter and its sound. Tap a letter to hear it. Practice 3–5 a day.',
    ...tx('intro', [
      'Buradan başlayın. Her Arap harfini ve sesini tanımayı öğrenin. Dinlemek için bir harfe dokunun. Günde 3–5 harf çalışın.',
      'Mulai dari sini. Kenali setiap huruf Arab dan bunyinya. Ketuk huruf untuk mendengarnya. Latihan 3–5 huruf per hari.',
      'Commencez ici. Apprenez à reconnaître chaque lettre arabe et son son. Touchez une lettre pour l’écouter. Exercez-vous sur 3 à 5 lettres par jour.',
      'Hier beginnen Sie. Lernen Sie, jeden arabischen Buchstaben und seinen Laut zu erkennen. Tippen Sie auf einen Buchstaben, um ihn zu hören. Üben Sie 3–5 pro Tag.',
      'Empieza aquí. Aprende a reconocer cada letra árabe y su sonido. Toca una letra para escucharla. Practica de 3 a 5 al día.',
    ]),
    intro_ru: 'Начните отсюда. Научитесь узнавать каждую букву и её звук. Нажмите на букву, чтобы услышать. По 3–5 в день.',
    type: 'letters',
  },
  {
    id: 2,
    title_en: 'Lesson 2 · Letter Forms',
    ...tx('title', ['Ders 2 · Harflerin biçimleri', 'Pelajaran 2 · Bentuk huruf', 'Leçon 2 · Les formes des lettres', 'Lektion 2 · Buchstabenformen', 'Lección 2 · Formas de las letras']),
    title_ru: 'Урок 2 · Формы букв',
    intro_en: 'Most letters change shape depending on their position in a word: beginning, middle, or end. Here are the key ones.',
    ...tx('intro', [
      'Çoğu harf, kelimedeki yerine göre şekil değiştirir: başta, ortada veya sonda. İşte başlıcaları.',
      'Sebagian besar huruf berubah bentuk menurut posisinya dalam kata: awal, tengah, atau akhir. Berikut yang utama.',
      'La plupart des lettres changent de forme selon leur place dans le mot : début, milieu ou fin. Voici les principales.',
      'Die meisten Buchstaben ändern ihre Form je nach Stellung im Wort: Anfang, Mitte oder Ende. Hier die wichtigsten.',
      'La mayoría de las letras cambian de forma según su posición en la palabra: inicio, medio o final. Aquí están las principales.',
    ]),
    intro_ru: 'Большинство букв меняют форму в зависимости от места в слове: начало, середина, конец. Вот основные.',
    type: 'forms',
  },
  {
    id: 3,
    title_en: 'Lesson 3 · Short Vowels (Harakat)',
    ...tx('title', ['Ders 3 · Kısa ünlüler (Hareke)', 'Pelajaran 3 · Vokal pendek (Harakat)', 'Leçon 3 · Voyelles brèves (Harakat)', 'Lektion 3 · Kurze Vokale (Harakat)', 'Lección 3 · Vocales cortas (Harakat)']),
    title_ru: 'Урок 3 · Огласовки (Харакят)',
    intro_en: 'Three small marks give letters their vowel sound: Fatha (a), Kasra (i), Damma (u). Tap to hear each.',
    ...tx('intro', [
      'Üç küçük işaret harfe ünlü sesini verir: Fetha (a), Kesre (i), Damme (u). Her birini dinlemek için dokunun.',
      'Tiga tanda kecil memberi huruf bunyi vokalnya: Fathah (a), Kasrah (i), Dhammah (u). Ketuk untuk mendengar masing-masing.',
      'Trois petits signes donnent aux lettres leur voyelle : Fatha (a), Kasra (i), Damma (ou). Touchez pour écouter chacun.',
      'Drei kleine Zeichen geben den Buchstaben ihren Vokal: Fatha (a), Kasra (i), Damma (u). Tippen Sie, um jedes zu hören.',
      'Tres signos pequeños dan a las letras su vocal: Fatha (a), Kasra (i), Damma (u). Toca para escuchar cada uno.',
    ]),
    intro_ru: 'Три знака дают букве гласный звук: Фатха (а), Касра (и), Дамма (у). Нажмите, чтобы услышать.',
    type: 'harakat',
  },
  {
    id: 4,
    title_en: 'Lesson 4 · Long Vowels (Madd)',
    ...tx('title', ['Ders 4 · Uzun ünlüler (Medd)', 'Pelajaran 4 · Vokal panjang (Mad)', 'Leçon 4 · Voyelles longues (Madd)', 'Lektion 4 · Lange Vokale (Madd)', 'Lección 4 · Vocales largas (Madd)']),
    title_ru: 'Урок 4 · Долгие гласные (Мадд)',
    intro_en: 'Alif after Fatha = "aa" (like car). Ya after Kasra = "ee" (like see). Waw after Damma = "oo" (like moon). Count softly: one… two.',
    ...tx('intro', [
      'Fetha’dan sonra Elif = uzun «aa» (“kâr”daki gibi). Kesre’den sonra Ye = uzun «ii» (“şiir”deki gibi). Damme’den sonra Vav = uzun «uu» (“sûret”teki gibi). Yavaşça sayın: bir… iki.',
      'Alif setelah fathah = "aa" panjang (seperti "aa" pada "saat"). Ya setelah kasrah = "ii" panjang (seperti "i" pada "ini" yang ditarik). Waw setelah dhammah = "uu" panjang (seperti "u" pada "buku" yang ditarik). Hitung pelan: satu… dua.',
      'Alif après fatha = «aa» (comme dans «pâte»). Ya après kasra = «ii» (comme dans «vie», tenu). Waw après damma = «ou» long (comme dans «loup», tenu). Comptez doucement : un… deux.',
      'Alif nach Fatha = „aa“ (wie in „Saat“). Ya nach Kasra = „ii“ (wie in „Lied“). Waw nach Damma = „uu“ (wie in „Hut“). Zählen Sie leise: eins… zwei.',
      'Alif tras fatha = «aa» (una «a» alargada, como «casa» dicho despacio). Ya tras kasra = «ii» (una «i» alargada, como en «mi»). Waw tras damma = «uu» (una «u» alargada, como en «tú»). Cuenta suave: uno… dos.',
    ]),
    intro_ru: 'Алиф после фатхи = «аа» (как в «car»). Йа после касры = «ии» (как в «see»). Вав после даммы = «уу» (как в «moon»). Считайте мягко: раз… два.',
    type: 'madd',
  },
  {
    id: 5,
    title_en: 'Lesson 5 · Sukoon (no vowel)',
    ...tx('title', ['Ders 5 · Sükûn (ünlüsüz)', 'Pelajaran 5 · Sukun (tanpa vokal)', 'Leçon 5 · Soukoun (sans voyelle)', 'Lektion 5 · Sukun (ohne Vokal)', 'Lección 5 · Sukún (sin vocal)']),
    title_ru: 'Урок 5 · Сукун (без гласной)',
    intro_en: 'A small circle (ْ) means the letter has no vowel — you stop the sound sharply. Used to close syllables.',
    ...tx('intro', [
      'Küçük bir daire (ْ) harfin ünlüsü olmadığını gösterir — ses keskin biçimde kesilir. Heceleri kapatır.',
      'Lingkaran kecil (ْ) berarti huruf tidak berharakat vokal — bunyi dihentikan tegas. Dipakai untuk menutup suku kata.',
      'Un petit cercle (ْ) signifie que la lettre n’a pas de voyelle : le son s’arrête net. Il sert à fermer les syllabes.',
      'Ein kleiner Kreis (ْ) bedeutet, dass der Buchstabe keinen Vokal hat – der Laut wird scharf abgebrochen. Er schließt Silben.',
      'Un circulito (ْ) indica que la letra no lleva vocal: el sonido se corta en seco. Sirve para cerrar sílabas.',
    ]),
    intro_ru: 'Маленький кружок (ْ) означает, что у буквы нет гласной — звук обрывается. Закрывает слог.',
    type: 'sukoon',
  },
  {
    id: 6,
    title_en: 'Lesson 6 · Shadda (doubling)',
    ...tx('title', ['Ders 6 · Şedde (çift okuma)', 'Pelajaran 6 · Syaddah (penggandaan)', 'Leçon 6 · Chadda (redoublement)', 'Lektion 6 · Schadda (Verdopplung)', 'Lección 6 · Shadda (duplicación)']),
    title_ru: 'Урок 6 · Шадда (удвоение)',
    intro_en: 'The shadda (ّ) doubles a letter — you press on it. Hold the sound a moment longer.',
    ...tx('intro', [
      'Şedde (ّ) harfi ikiler — üzerine basarsınız. Sesi biraz daha uzun tutun.',
      'Syaddah (ّ) menggandakan huruf — Anda menekannya. Tahan bunyinya sedikit lebih lama.',
      'La chadda (ّ) double une lettre : on appuie dessus. Tenez le son un instant de plus.',
      'Die Schadda (ّ) verdoppelt einen Buchstaben – man betont ihn. Halten Sie den Laut einen Moment länger.',
      'La shadda (ّ) duplica una letra: se presiona sobre ella. Mantén el sonido un instante más.',
    ]),
    intro_ru: 'Шадда (ّ) удваивает букву — вы нажимаете на неё. Держите звук чуть дольше.',
    type: 'shadda',
  },
  {
    id: 7,
    title_en: 'Lesson 7 · Tanwin',
    ...tx('title', ['Ders 7 · Tenvin', 'Pelajaran 7 · Tanwin', 'Leçon 7 · Tanwîn', 'Lektion 7 · Tanwin', 'Lección 7 · Tanwin']),
    title_ru: 'Урок 7 · Танвин',
    intro_en: 'Double vowel marks add an "n" sound: an, in, un. Often at the end of words.',
    ...tx('intro', [
      'Çift hareke bir «n» sesi ekler: an, in, un. Çoğunlukla kelime sonunda bulunur.',
      'Tanda vokal ganda menambahkan bunyi "n": an, in, un. Sering di akhir kata.',
      'Les signes de voyelle doublés ajoutent un son «n» : an, in, oun. Souvent en fin de mot.',
      'Doppelte Vokalzeichen fügen einen „n“-Laut hinzu: an, in, un. Oft am Wortende.',
      'Los signos vocálicos dobles añaden un sonido «n»: an, in, un. Suelen ir al final de la palabra.',
    ]),
    intro_ru: 'Двойные огласовки добавляют звук «н»: ан, ин, ун. Часто в конце слов.',
    type: 'tanwin',
  },
  {
    id: 8,
    title_en: 'Lesson 8 · Blending into Words',
    ...tx('title', ['Ders 8 · Kelimelere birleştirme', 'Pelajaran 8 · Merangkai menjadi kata', 'Leçon 8 · Assembler des mots', 'Lektion 8 · Zu Wörtern verbinden', 'Lección 8 · Formar palabras']),
    title_ru: 'Урок 8 · Соединяем в слова',
    intro_en: 'Now read letters together slowly, then smoothly. Start with two letters, then three. Read aloud and repeat.',
    ...tx('intro', [
      'Şimdi harfleri birlikte okuyun — önce yavaş, sonra akıcı. Önce iki harf, sonra üç. Sesli okuyun ve tekrarlayın.',
      'Sekarang bacalah huruf-huruf bersama, pelan-pelan dulu, lalu lancar. Mulai dari dua huruf, lalu tiga. Baca dengan keras dan ulangi.',
      'Lisez maintenant les lettres ensemble, d’abord lentement, puis avec fluidité. Commencez par deux lettres, puis trois. Lisez à voix haute et répétez.',
      'Lesen Sie die Buchstaben jetzt zusammen – erst langsam, dann flüssig. Beginnen Sie mit zwei Buchstaben, dann drei. Laut lesen und wiederholen.',
      'Ahora lee las letras juntas, primero despacio y luego con fluidez. Empieza con dos letras y después tres. Lee en voz alta y repite.',
    ]),
    intro_ru: 'Теперь читайте буквы вместе — медленно, потом плавно. Сначала две буквы, потом три. Читайте вслух и повторяйте.',
    type: 'words',
  },
];

// Letter forms: isolated, initial, medial, final
export const LETTER_FORMS = [
  { name: 'Ba',  isolated: 'ب', initial: 'بـ', medial: 'ـبـ', final: 'ـب', say: 'باء' },
  { name: 'Jim', isolated: 'ج', initial: 'جـ', medial: 'ـجـ', final: 'ـج', say: 'جيم' },
  { name: 'Sin', isolated: 'س', initial: 'سـ', medial: 'ـسـ', final: 'ـس', say: 'سين' },
  { name: 'Ayn', isolated: 'ع', initial: 'عـ', medial: 'ـعـ', final: 'ـع', say: 'عين' },
  { name: 'Kaf', isolated: 'ك', initial: 'كـ', medial: 'ـكـ', final: 'ـك', say: 'كاف' },
  { name: 'Mim', isolated: 'م', initial: 'مـ', medial: 'ـمـ', final: 'ـم', say: 'ميم' },
  { name: 'Ha',  isolated: 'ه', initial: 'هـ', medial: 'ـهـ', final: 'ـه', say: 'هاء' },
];

export const MADD_EXAMPLES = [
  { ar: 'بَا', tr: 'baa', hint_en: 'a as in car', hint_tr: 'uzun a, “kâr”daki gibi', hint_id: '"a" panjang, seperti "aa" pada "saat"', hint_fr: '«a» long, comme dans «pâte»', hint_de: 'a wie in „Saat“', hint_es: '«a» alargada, como en «casa» dicho despacio', hint_ru: 'а как в "car"', say: 'بَا' },
  { ar: 'بِي', tr: 'bee', hint_en: 'ee as in see', hint_tr: 'uzun i, “şiir”deki gibi', hint_id: '"i" panjang, seperti "i" pada "ini" yang ditarik', hint_fr: '«i» long, comme dans «vie»', hint_de: 'i wie in „Lied“', hint_es: '«i» alargada, como en «mi»', hint_ru: 'и как в "see"', say: 'بِي' },
  { ar: 'بُو', tr: 'boo', hint_en: 'oo as in moon', hint_tr: 'uzun u, “sûret”teki gibi', hint_id: '"u" panjang, seperti "u" pada "buku" yang ditarik', hint_fr: '«ou» long, comme dans «loup»', hint_de: 'u wie in „Hut“', hint_es: '«u» alargada, como en «tú»', hint_ru: 'у как в "moon"', say: 'بُو' },
  { ar: 'قَا', tr: 'qaa', hint_en: 'stretch 2 counts', hint_tr: '2 sayı boyunca uzatın', hint_id: 'tarik 2 hitungan', hint_fr: 'tenez 2 temps', hint_de: '2 Zählzeiten dehnen', hint_es: 'alarga 2 tiempos', hint_ru: 'тяните 2 счёта', say: 'قَا' },
  { ar: 'نُو', tr: 'noo', hint_en: 'stretch 2 counts', hint_tr: '2 sayı boyunca uzatın', hint_id: 'tarik 2 hitungan', hint_fr: 'tenez 2 temps', hint_de: '2 Zählzeiten dehnen', hint_es: 'alarga 2 tiempos', hint_ru: 'тяните 2 счёта', say: 'نُو' },
];

export const SUKOON_EXAMPLES = [
  { ar: 'أَبْ', tr: 'ab', say: 'أَبْ' },
  { ar: 'أَتْ', tr: 'at', say: 'أَتْ' },
  { ar: 'مِنْ', tr: 'min', say: 'مِنْ' },
  { ar: 'قُلْ', tr: 'qul', say: 'قُلْ' },
];

export const SHADDA_EXAMPLES = [
  { ar: 'بَّ', tr: 'bba', say: 'أَبَّ' },
  { ar: 'رَّ', tr: 'rra', say: 'أَرَّ' },
  { ar: 'إِنَّ', tr: 'inna', say: 'إِنَّ' },
  { ar: 'رَبَّ', tr: 'rabba', say: 'رَبَّ' },
];

export const TANWIN_EXAMPLES = [
  { ar: 'بًا', tr: 'ban', say: 'بًا' },
  { ar: 'بٍ', tr: 'bin', say: 'بٍ' },
  { ar: 'بٌ', tr: 'bun', say: 'بٌ' },
  { ar: 'كِتَابًا', tr: 'kitaaban', say: 'كِتَابًا' },
];

export const WORD_BLENDING = [
  { ar: 'بَتَ', tr: 'ba-ta', say: 'بَتَ' },
  { ar: 'تَبَ', tr: 'ta-ba', say: 'تَبَ' },
  { ar: 'كَتَبَ', tr: 'ka-ta-ba (he wrote)', say: 'كَتَبَ' },
  { ar: 'قَرَأَ', tr: 'qa-ra-a (he read)', say: 'قَرَأَ' },
  { ar: 'نَصَرَ', tr: 'na-sa-ra (he helped)', say: 'نَصَرَ' },
  { ar: 'كِتَاب', tr: 'kitaab (book)', say: 'كِتَاب' },
];

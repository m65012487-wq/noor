// Learning content for the classic Qaida method:
// letters -> harakat (short vowels) -> syllables -> tajweed -> surahs

export const ARABIC_LETTERS = [
  { letter: 'ا', name: 'Alif', sound: 'a', say: 'ألف' },
  { letter: 'ب', name: 'Ba', sound: 'b', say: 'باء' },
  { letter: 'ت', name: 'Ta', sound: 't', say: 'تاء' },
  { letter: 'ث', name: 'Tha', sound: 'th', say: 'ثاء' },
  { letter: 'ج', name: 'Jim', sound: 'j', say: 'جيم' },
  { letter: 'ح', name: 'Ha', sound: 'ḥ', say: 'حاء' },
  { letter: 'خ', name: 'Kha', sound: 'kh', say: 'خاء' },
  { letter: 'د', name: 'Dal', sound: 'd', say: 'دال' },
  { letter: 'ذ', name: 'Dhal', sound: 'dh', say: 'ذال' },
  { letter: 'ر', name: 'Ra', sound: 'r', say: 'راء' },
  { letter: 'ز', name: 'Zay', sound: 'z', say: 'زاي' },
  { letter: 'س', name: 'Sin', sound: 's', say: 'سين' },
  { letter: 'ش', name: 'Shin', sound: 'sh', say: 'شين' },
  { letter: 'ص', name: 'Sad', sound: 'ṣ', say: 'صاد' },
  { letter: 'ض', name: 'Dad', sound: 'ḍ', say: 'ضاد' },
  { letter: 'ط', name: 'Ta', sound: 'ṭ', say: 'طاء' },
  { letter: 'ظ', name: 'Za', sound: 'ẓ', say: 'ظاء' },
  { letter: 'ع', name: 'Ayn', sound: 'ʿ', say: 'عين' },
  { letter: 'غ', name: 'Ghayn', sound: 'gh', say: 'غين' },
  { letter: 'ف', name: 'Fa', sound: 'f', say: 'فاء' },
  { letter: 'ق', name: 'Qaf', sound: 'q', say: 'قاف' },
  { letter: 'ك', name: 'Kaf', sound: 'k', say: 'كاف' },
  { letter: 'ل', name: 'Lam', sound: 'l', say: 'لام' },
  { letter: 'م', name: 'Mim', sound: 'm', say: 'ميم' },
  { letter: 'ن', name: 'Nun', sound: 'n', say: 'نون' },
  { letter: 'ه', name: 'Ha', sound: 'h', say: 'هاء' },
  { letter: 'و', name: 'Waw', sound: 'w', say: 'واو' },
  { letter: 'ي', name: 'Ya', sound: 'y', say: 'ياء' },
];

export const HARAKAT = [
  { mark: 'بَ', name_en: 'Fatha (a)', name_ru: 'Фатха (а)', say: 'بَ' },
  { mark: 'بِ', name_en: 'Kasra (i)', name_ru: 'Касра (и)', say: 'بِ' },
  { mark: 'بُ', name_en: 'Damma (u)', name_ru: 'Дамма (у)', say: 'بُ' },
  { mark: 'بْ', name_en: 'Sukoon', name_ru: 'Сукун', say: 'أَبْ' },
  { mark: 'بّ', name_en: 'Shadda (double)', name_ru: 'Шадда (удвоение)', say: 'أَبَّ' },
  { mark: 'بًا', name_en: 'Tanwin (an)', name_ru: 'Танвин (ан)', say: 'بًا' },
];

export const SYLLABLES = [
  { ar: 'بَ تَ ثَ', tr: 'ba ta tha', say: 'بَ تَ ثَ' },
  { ar: 'جَ حَ خَ', tr: 'ja ḥa kha', say: 'جَ حَ خَ' },
  { ar: 'دَ ذَ رَ', tr: 'da dha ra', say: 'دَ ذَ رَ' },
  { ar: 'بِ تِ ثِ', tr: 'bi ti thi', say: 'بِ تِ ثِ' },
  { ar: 'بُ تُ ثُ', tr: 'bu tu thu', say: 'بُ تُ ثُ' },
  { ar: 'مَ نَ هَ', tr: 'ma na ha', say: 'مَ نَ هَ' },
  { ar: 'بَا تَا', tr: 'baa taa', say: 'بَا تَا' },
  { ar: 'كِتَاب', tr: 'kitaab', say: 'كِتَاب' },
];

export const TAJWEED_BASICS = [
  { title_en: 'Madd (Elongation)', title_ru: 'Мадд (Удлинение)',
    text_en: 'Long vowels alif, waw and ya are stretched for 2, 4, or 6 counts.',
    text_ru: 'Долгие гласные алиф, вав и йа тянутся на 2, 4 или 6 счётов.' },
  { title_en: 'Ghunnah (Nasalization)', title_ru: 'Гунна (Назализация)',
    text_en: 'A nasal sound held ~2 counts on noon and meem with shadda.',
    text_ru: 'Носовой звук ~2 счёта на нун и мим с шаддой.' },
  { title_en: 'Qalqalah (Echoing)', title_ru: 'Калькаля (Эхо)',
    text_en: 'A bouncing echo on the letters qaf, ta, ba, jim, dal with sukoon.',
    text_ru: 'Отскакивающее эхо на буквах каф, та, ба, джим, даль при сукуне.' },
  { title_en: 'Idgham (Merging)', title_ru: 'Идгам (Слияние)',
    text_en: 'Noon saakin or tanween merges into certain following letters.',
    text_ru: 'Нун сакин или танвин сливается с некоторыми буквами.' },
];

export const SURAHS = [
  { id: 1, name: 'Al-Fatiha', meaning_en: 'The Opening', meaning_ru: 'Открывающая',
    ayahs: [
      { ar: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', tr: 'Bismillahir-rahmanir-raheem', en: 'In the name of Allah, the Most Gracious, the Most Merciful.', ru: 'Во имя Аллаха, Милостивого, Милосердного.' },
      { ar: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ', tr: 'Alhamdu lillahi rabbil-alameen', en: 'All praise is for Allah, Lord of all worlds.', ru: 'Хвала Аллаху, Господу миров.' },
      { ar: 'ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', tr: 'Ar-rahmanir-raheem', en: 'The Most Gracious, the Most Merciful.', ru: 'Милостивому, Милосердному.' },
      { ar: 'مَـٰلِكِ يَوْمِ ٱلدِّينِ', tr: 'Maliki yawmid-deen', en: 'Master of the Day of Judgment.', ru: 'Властелину Дня воздаяния.' },
      { ar: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', tr: 'Iyyaka nabudu wa iyyaka nastaeen', en: 'You alone we worship, You alone we ask for help.', ru: 'Тебе одному мы поклоняемся и Тебя одного молим о помощи.' },
      { ar: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ', tr: 'Ihdinas-siratal-mustaqeem', en: 'Guide us to the straight path.', ru: 'Веди нас прямым путём.' },
      { ar: 'صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ', tr: 'Siratal-ladheena anamta alayhim...', en: 'The path of those You have blessed, not of those who earned anger or went astray.', ru: 'Путём тех, кого Ты облагодетельствовал, не тех, на кого пал гнев, и не заблудших.' },
    ] },
  { id: 112, name: 'Al-Ikhlas', meaning_en: 'The Sincerity', meaning_ru: 'Искренность',
    ayahs: [
      { ar: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ', tr: 'Qul huwa Allahu ahad', en: 'Say, He is Allah, the One.', ru: 'Скажи: Он — Аллах Единый.' },
      { ar: 'ٱللَّهُ ٱلصَّمَدُ', tr: 'Allahu as-samad', en: 'Allah, the Eternal Refuge.', ru: 'Аллах Самодостаточный.' },
      { ar: 'لَمْ يَلِدْ وَلَمْ يُولَدْ', tr: 'Lam yalid wa lam yoolad', en: 'He neither begets nor is born.', ru: 'Он не родил и не был рождён.' },
      { ar: 'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ', tr: 'Wa lam yakun lahu kufuwan ahad', en: 'Nor is there to Him any equivalent.', ru: 'И нет никого равного Ему.' },
    ] },
  { id: 113, name: 'Al-Falaq', meaning_en: 'The Daybreak', meaning_ru: 'Рассвет',
    ayahs: [
      { ar: 'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ', tr: 'Qul aoodhu bi rabbil-falaq', en: 'Say, I seek refuge in the Lord of daybreak.', ru: 'Скажи: Прибегаю к Господу рассвета.' },
      { ar: 'مِن شَرِّ مَا خَلَقَ', tr: 'Min sharri ma khalaq', en: 'From the evil of that which He created.', ru: 'От зла того, что Он сотворил.' },
      { ar: 'وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ', tr: 'Wa min sharri ghasiqin idha waqab', en: 'And from the evil of darkness when it settles.', ru: 'От зла мрака, когда он наступает.' },
      { ar: 'وَمِن شَرِّ ٱلنَّفَّـٰثَـٰتِ فِى ٱلْعُقَدِ', tr: 'Wa min sharrin-naffathati fil-uqad', en: 'And from the evil of the blowers in knots.', ru: 'От зла колдуний, дующих на узлы.' },
      { ar: 'وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ', tr: 'Wa min sharri hasidin idha hasad', en: 'And from the evil of an envier when he envies.', ru: 'От зла завистника, когда он завидует.' },
    ] },
  { id: 114, name: 'An-Nas', meaning_en: 'Mankind', meaning_ru: 'Люди',
    ayahs: [
      { ar: 'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ', tr: 'Qul aoodhu bi rabbin-nas', en: 'Say, I seek refuge in the Lord of mankind.', ru: 'Скажи: Прибегаю к Господу людей.' },
      { ar: 'مَلِكِ ٱلنَّاسِ', tr: 'Malikin-nas', en: 'The Sovereign of mankind.', ru: 'Царю людей.' },
      { ar: 'إِلَـٰهِ ٱلنَّاسِ', tr: 'Ilahin-nas', en: 'The God of mankind.', ru: 'Богу людей.' },
      { ar: 'مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ', tr: 'Min sharril-waswasil-khannas', en: 'From the evil of the retreating whisperer.', ru: 'От зла искусителя отступающего.' },
      { ar: 'ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ', tr: 'Alladhee yuwaswisu fee sudoorin-nas', en: 'Who whispers in the breasts of mankind.', ru: 'Который наущает в груди людей.' },
      { ar: 'مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ', tr: 'Minal-jinnati wan-nas', en: 'From among the jinn and mankind.', ru: 'Из джиннов и людей.' },
    ] },
];

export const VERSES_OF_THE_DAY = [
  { ar: 'إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا', en: 'Indeed, with hardship comes ease.', ru: 'Поистине, за тягостью — облегчение.', ref: '94:6' },
  { ar: 'فَٱذْكُرُونِىٓ أَذْكُرْكُمْ', en: 'So remember Me; I will remember you.', ru: 'Поминайте Меня, и Я буду помнить о вас.', ref: '2:152' },
  { ar: 'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ', en: 'And He is with you wherever you are.', ru: 'Он с вами, где бы вы ни были.', ref: '57:4' },
  { ar: 'رَبِّ زِدْنِى عِلْمًا', en: 'My Lord, increase me in knowledge.', ru: 'Господи, прибавь мне знания.', ref: '20:114' },
  { ar: 'وَبَشِّرِ ٱلصَّـٰبِرِينَ', en: 'And give good tidings to the patient.', ru: 'Обрадуй терпеливых.', ref: '2:155' },
];

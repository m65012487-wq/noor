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
  { mark: 'بَ', name_en: 'Fatha (a)', name_tr: 'Fetha (a)', name_id: 'Fathah (a)', name_fr: 'Fatha (a)', name_de: 'Fatha (a)', name_es: 'Fatha (a)', name_ru: 'Фатха (а)', say: 'بَ' },
  { mark: 'بِ', name_en: 'Kasra (i)', name_tr: 'Kesre (i)', name_id: 'Kasrah (i)', name_fr: 'Kasra (i)', name_de: 'Kasra (i)', name_es: 'Kasra (i)', name_ru: 'Касра (и)', say: 'بِ' },
  { mark: 'بُ', name_en: 'Damma (u)', name_tr: 'Damme (u)', name_id: 'Dammah (u)', name_fr: 'Damma (u)', name_de: 'Damma (u)', name_es: 'Damma (u)', name_ru: 'Дамма (у)', say: 'بُ' },
  { mark: 'بْ', name_en: 'Sukoon', name_tr: 'Sükûn', name_id: 'Sukun', name_fr: 'Soukoun', name_de: 'Sukun', name_es: 'Sukún', name_ru: 'Сукун', say: 'أَبْ' },
  { mark: 'بّ', name_en: 'Shadda (double)', name_tr: 'Şedde (çift)', name_id: 'Syaddah (rangkap)', name_fr: 'Chadda (doublement)', name_de: 'Schadda (Verdopplung)', name_es: 'Shadda (duplicación)', name_ru: 'Шадда (удвоение)', say: 'أَبَّ' },
  { mark: 'بًا', name_en: 'Tanwin (an)', name_tr: 'Tenvin (an)', name_id: 'Tanwin (an)', name_fr: 'Tanwin (an)', name_de: 'Tanwin (an)', name_es: 'Tanwin (an)', name_ru: 'Танвин (ан)', say: 'بًا' },
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
  { title_en: 'Madd (Elongation)', title_tr: 'Med (Uzatma)', title_id: 'Mad (Pemanjangan)', title_fr: 'Madd (Allongement)', title_de: 'Madd (Dehnung)', title_es: 'Madd (Alargamiento)', title_ru: 'Мадд (Удлинение)',
    text_en: 'Long vowels alif, waw and ya are stretched for 2, 4, or 6 counts.', text_tr: 'Uzun ünlüler elif, vav ve ye 2, 4 veya 6 vuruş uzatılır.', text_id: 'Vokal panjang alif, waw, dan ya dibaca panjang 2, 4, atau 6 harakat.', text_fr: 'Les voyelles longues alif, waw et ya se prolongent de 2, 4 ou 6 temps.', text_de: 'Die langen Vokale Alif, Waw und Ya werden 2, 4 oder 6 Zählzeiten gedehnt.', text_es: 'Las vocales largas alif, waw y ya se alargan 2, 4 o 6 tiempos.',
    text_ru: 'Долгие гласные алиф, вав и йа тянутся на 2, 4 или 6 счётов.' },
  { title_en: 'Ghunnah (Nasalization)', title_tr: 'Gunne (Genizden okuma)', title_id: 'Ghunnah (Dengung)', title_fr: 'Ghunna (Nasalisation)', title_de: 'Ghunna (Nasalierung)', title_es: 'Ghunna (Nasalización)', title_ru: 'Гунна (Назализация)',
    text_en: 'A nasal sound held ~2 counts on noon and meem with shadda.', text_tr: 'Şeddeli nun ve mimde yaklaşık 2 vuruş süren genizden bir ses.', text_id: 'Bunyi sengau yang ditahan sekitar 2 harakat pada nun dan mim bertasydid.', text_fr: 'Un son nasal tenu environ 2 temps sur noun et mim avec chadda.', text_de: 'Ein nasaler Laut von etwa 2 Zählzeiten bei Nun und Mim mit Schadda.', text_es: 'Un sonido nasal de unos 2 tiempos sobre nun y mim con shadda.',
    text_ru: 'Носовой звук ~2 счёта на нун и мим с шаддой.' },
  { title_en: 'Qalqalah (Echoing)', title_tr: 'Kalkale (Yankı)', title_id: 'Qalqalah (Pantulan)', title_fr: 'Qalqala (Écho)', title_de: 'Qalqala (Echo)', title_es: 'Qalqala (Eco)', title_ru: 'Калькаля (Эхо)',
    text_en: 'A bouncing echo on the letters qaf, ta, ba, jim, dal with sukoon.', text_tr: 'Sükûnlü kaf, tı, be, cim, dal harflerinde sekerek yankılanan ses.', text_id: 'Pantulan bunyi pada huruf qaf, ṭa, ba, jim, dal yang bersukun.', text_fr: 'Un écho rebondissant sur les lettres qaf, ta, ba, jim, dal portant un soukoun.', text_de: 'Ein federndes Echo auf den Buchstaben Qaf, Ta, Ba, Dschim, Dal mit Sukun.', text_es: 'Un eco rebotante sobre las letras qaf, ta, ba, yim, dal con sukún.',
    text_ru: 'Отскакивающее эхо на буквах каф, та, ба, джим, даль при сукуне.' },
  { title_en: 'Idgham (Merging)', title_tr: 'İdğam (Birleştirme)', title_id: 'Idgham (Peleburan)', title_fr: 'Idgham (Fusion)', title_de: 'Idgham (Verschmelzung)', title_es: 'Idgham (Fusión)', title_ru: 'Идгам (Слияние)',
    text_en: 'Noon saakin or tanween merges into certain following letters.', text_tr: 'Sâkin nun veya tenvin, kendisinden sonra gelen bazı harflerle birleşir.', text_id: 'Nun sukun atau tanwin melebur ke dalam huruf-huruf tertentu sesudahnya.', text_fr: 'Le noun sakin ou le tanwin se fond dans certaines lettres qui suivent.', text_de: 'Nun sakin oder Tanwin verschmilzt mit bestimmten folgenden Buchstaben.', text_es: 'El nun sakin o el tanwin se fusiona con ciertas letras siguientes.',
    text_ru: 'Нун сакин или танвин сливается с некоторыми буквами.' },
];

export const SURAHS = [
  { id: 1, name: 'Al-Fatiha', meaning_en: 'The Opening', meaning_tr: 'Açılış', meaning_id: 'Pembukaan', meaning_fr: 'L’Ouverture', meaning_de: 'Die Eröffnende', meaning_es: 'La Apertura', meaning_ru: 'Открывающая',
    ayahs: [
      { ar: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', translit: 'Bismillahir-rahmanir-raheem', en: 'In the name of Allah, the Most Gracious, the Most Merciful.', tr: 'Rahman ve Rahim olan Allah’ın adıyla.', id: 'Dengan nama Allah Yang Maha Pengasih, Maha Penyayang.', fr: 'Au nom d’Allah, le Tout Miséricordieux, le Très Miséricordieux.', de: 'Im Namen Allahs, des Allerbarmers, des Barmherzigen.', es: 'En el nombre de Allah, el Clemente, el Misericordioso.', ru: 'Во имя Аллаха, Милостивого, Милосердного.' },
      { ar: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ', translit: 'Alhamdu lillahi rabbil-alameen', en: 'All praise is for Allah, Lord of all worlds.', tr: 'Hamd, âlemlerin Rabbi Allah’a aittir.', id: 'Segala puji bagi Allah, Tuhan semesta alam.', fr: 'Louange à Allah, Seigneur des mondes.', de: 'Lob gebührt Allah, dem Herrn der Welten.', es: 'La alabanza pertenece a Allah, Señor de los mundos.', ru: 'Хвала Аллаху, Господу миров.' },
      { ar: 'ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', translit: 'Ar-rahmanir-raheem', en: 'The Most Gracious, the Most Merciful.', tr: 'O, Rahman’dır, Rahim’dir.', id: 'Yang Maha Pengasih, Maha Penyayang.', fr: 'Le Tout Miséricordieux, le Très Miséricordieux.', de: 'Dem Allerbarmer, dem Barmherzigen.', es: 'El Clemente, el Misericordioso.', ru: 'Милостивому, Милосердному.' },
      { ar: 'مَـٰلِكِ يَوْمِ ٱلدِّينِ', translit: 'Maliki yawmid-deen', en: 'Master of the Day of Judgment.', tr: 'Din gününün sahibidir.', id: 'Pemilik hari pembalasan.', fr: 'Maître du Jour de la rétribution.', de: 'Dem Herrscher am Tag des Gerichts.', es: 'Soberano del Día del Juicio.', ru: 'Властелину Дня воздаяния.' },
      { ar: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', translit: 'Iyyaka nabudu wa iyyaka nastaeen', en: 'You alone we worship, You alone we ask for help.', tr: 'Yalnız Sana kulluk eder, yalnız Senden yardım dileriz.', id: 'Hanya kepada Engkaulah kami menyembah dan hanya kepada Engkaulah kami memohon pertolongan.', fr: 'C’est Toi seul que nous adorons, et c’est Toi seul dont nous implorons le secours.', de: 'Dir allein dienen wir, und Dich allein bitten wir um Hilfe.', es: 'A Ti solo adoramos y a Ti solo pedimos ayuda.', ru: 'Тебе одному мы поклоняемся и Тебя одного молим о помощи.' },
      { ar: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ', translit: 'Ihdinas-siratal-mustaqeem', en: 'Guide us to the straight path.', tr: 'Bizi doğru yola ilet.', id: 'Tunjukilah kami jalan yang lurus.', fr: 'Guide-nous dans le droit chemin.', de: 'Führe uns den geraden Weg.', es: 'Guíanos por el camino recto.', ru: 'Веди нас прямым путём.' },
      { ar: 'صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ', translit: 'Siratal-ladheena anamta alayhim...', en: 'The path of those You have blessed, not of those who earned anger or went astray.', tr: 'Kendilerine nimet verdiklerinin yoluna; gazaba uğrayanların ve sapkınların yoluna değil.', id: 'Yaitu jalan orang-orang yang telah Engkau beri nikmat, bukan jalan mereka yang dimurkai dan bukan pula jalan mereka yang sesat.', fr: 'Le chemin de ceux que Tu as comblés de bienfaits, non pas de ceux qui ont encouru la colère, ni des égarés.', de: 'Den Weg derer, denen Du Gnade erwiesen hast, nicht derer, die Zorn erregt haben, und nicht der Irregehenden.', es: 'El camino de aquellos a quienes has favorecido, no el de los que han incurrido en la ira ni el de los extraviados.', ru: 'Путём тех, кого Ты облагодетельствовал, не тех, на кого пал гнев, и не заблудших.' },
    ] },
  { id: 112, name: 'Al-Ikhlas', meaning_en: 'The Sincerity', meaning_tr: 'İhlas', meaning_id: 'Ikhlas', meaning_fr: 'Le Culte sincère', meaning_de: 'Die Aufrichtigkeit', meaning_es: 'La Sinceridad', meaning_ru: 'Искренность',
    ayahs: [
      { ar: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ', translit: 'Qul huwa Allahu ahad', en: 'Say, He is Allah, the One.', tr: 'De ki: O, Allah’tır, tektir.', id: 'Katakanlah: Dialah Allah, Yang Maha Esa.', fr: 'Dis : Il est Allah, Unique.', de: 'Sprich: Er ist Allah, der Eine.', es: 'Di: Él es Allah, el Uno.', ru: 'Скажи: Он — Аллах Единый.' },
      { ar: 'ٱللَّهُ ٱلصَّمَدُ', translit: 'Allahu as-samad', en: 'Allah, the Eternal Refuge.', tr: 'Allah Samed’dir (her şey O’na muhtaçtır).', id: 'Allah tempat bergantung segala sesuatu.', fr: 'Allah, le Refuge éternel.', de: 'Allah, der ewig Unabhängige, an den sich alle wenden.', es: 'Allah, el Eterno Refugio.', ru: 'Аллах Самодостаточный.' },
      { ar: 'لَمْ يَلِدْ وَلَمْ يُولَدْ', translit: 'Lam yalid wa lam yoolad', en: 'He neither begets nor is born.', tr: 'Doğurmamış ve doğurulmamıştır.', id: 'Dia tidak beranak dan tidak pula diperanakkan.', fr: 'Il n’a pas engendré et n’a pas été engendré.', de: 'Er zeugt nicht und ist nicht gezeugt worden.', es: 'No ha engendrado ni ha sido engendrado.', ru: 'Он не родил и не был рождён.' },
      { ar: 'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ', translit: 'Wa lam yakun lahu kufuwan ahad', en: 'Nor is there to Him any equivalent.', tr: 'Hiçbir şey O’na denk değildir.', id: 'Dan tidak ada sesuatu pun yang setara dengan Dia.', fr: 'Et nul n’est égal à Lui.', de: 'Und keiner ist Ihm ebenbürtig.', es: 'Y no hay nadie equiparable a Él.', ru: 'И нет никого равного Ему.' },
    ] },
  { id: 113, name: 'Al-Falaq', meaning_en: 'The Daybreak', meaning_tr: 'Şafak Vakti', meaning_id: 'Subuh', meaning_fr: 'L’Aube naissante', meaning_de: 'Das Tagesgrauen', meaning_es: 'El Amanecer', meaning_ru: 'Рассвет',
    ayahs: [
      { ar: 'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ', translit: 'Qul aoodhu bi rabbil-falaq', en: 'Say, I seek refuge in the Lord of daybreak.', tr: 'De ki: Sığınırım şafağın Rabbine.', id: 'Katakanlah: Aku berlindung kepada Tuhan yang menguasai subuh.', fr: 'Dis : Je cherche protection auprès du Seigneur de l’aube naissante.', de: 'Sprich: Ich suche Zuflucht beim Herrn des Tagesanbruchs.', es: 'Di: Me refugio en el Señor del amanecer.', ru: 'Скажи: Прибегаю к Господу рассвета.' },
      { ar: 'مِن شَرِّ مَا خَلَقَ', translit: 'Min sharri ma khalaq', en: 'From the evil of that which He created.', tr: 'Yarattığı şeylerin şerrinden.', id: 'Dari kejahatan makhluk yang Dia ciptakan.', fr: 'Contre le mal de ce qu’Il a créé.', de: 'Vor dem Übel dessen, was Er erschaffen hat.', es: 'Del mal de lo que Él ha creado.', ru: 'От зла того, что Он сотворил.' },
      { ar: 'وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ', translit: 'Wa min sharri ghasiqin idha waqab', en: 'And from the evil of darkness when it settles.', tr: 'Karanlığı çöktüğü zaman gecenin şerrinden.', id: 'Dan dari kejahatan malam apabila telah gelap gulita.', fr: 'Et contre le mal de l’obscurité quand elle s’approfondit.', de: 'Und vor dem Übel der Finsternis, wenn sie hereinbricht.', es: 'Y del mal de la oscuridad cuando se extiende.', ru: 'От зла мрака, когда он наступает.' },
      { ar: 'وَمِن شَرِّ ٱلنَّفَّـٰثَـٰتِ فِى ٱلْعُقَدِ', translit: 'Wa min sharrin-naffathati fil-uqad', en: 'And from the evil of the blowers in knots.', tr: 'Düğümlere üfleyenlerin şerrinden.', id: 'Dan dari kejahatan para penyihir yang meniup pada buhul-buhul.', fr: 'Et contre le mal de celles qui soufflent sur les nœuds.', de: 'Und vor dem Übel derer, die auf Knoten blasen.', es: 'Y del mal de las que soplan en los nudos.', ru: 'От зла колдуний, дующих на узлы.' },
      { ar: 'وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ', translit: 'Wa min sharri hasidin idha hasad', en: 'And from the evil of an envier when he envies.', tr: 'Haset ettiği zaman hasetçinin şerrinden.', id: 'Dan dari kejahatan orang yang dengki apabila ia dengki.', fr: 'Et contre le mal de l’envieux quand il envie.', de: 'Und vor dem Übel eines Neiders, wenn er neidet.', es: 'Y del mal del envidioso cuando envidia.', ru: 'От зла завистника, когда он завидует.' },
    ] },
  { id: 114, name: 'An-Nas', meaning_en: 'Mankind', meaning_tr: 'İnsanlar', meaning_id: 'Manusia', meaning_fr: 'Les Hommes', meaning_de: 'Die Menschen', meaning_es: 'Los Hombres', meaning_ru: 'Люди',
    ayahs: [
      { ar: 'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ', translit: 'Qul aoodhu bi rabbin-nas', en: 'Say, I seek refuge in the Lord of mankind.', tr: 'De ki: Sığınırım insanların Rabbine.', id: 'Katakanlah: Aku berlindung kepada Tuhan manusia.', fr: 'Dis : Je cherche protection auprès du Seigneur des hommes.', de: 'Sprich: Ich suche Zuflucht beim Herrn der Menschen.', es: 'Di: Me refugio en el Señor de los hombres.', ru: 'Скажи: Прибегаю к Господу людей.' },
      { ar: 'مَلِكِ ٱلنَّاسِ', translit: 'Malikin-nas', en: 'The Sovereign of mankind.', tr: 'İnsanların Melik’ine.', id: 'Raja manusia.', fr: 'Le Souverain des hommes.', de: 'Dem König der Menschen.', es: 'El Soberano de los hombres.', ru: 'Царю людей.' },
      { ar: 'إِلَـٰهِ ٱلنَّاسِ', translit: 'Ilahin-nas', en: 'The God of mankind.', tr: 'İnsanların İlah’ına.', id: 'Sembahan manusia.', fr: 'Dieu des hommes.', de: 'Dem Gott der Menschen.', es: 'El Dios de los hombres.', ru: 'Богу людей.' },
      { ar: 'مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ', translit: 'Min sharril-waswasil-khannas', en: 'From the evil of the retreating whisperer.', tr: 'Sinsi vesvesecinin şerrinden.', id: 'Dari kejahatan (bisikan) setan yang bersembunyi.', fr: 'Contre le mal du tentateur furtif.', de: 'Vor dem Übel des sich davonschleichenden Einflüsterers.', es: 'Del mal del susurrador que se retira.', ru: 'От зла искусителя отступающего.' },
      { ar: 'ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ', translit: 'Alladhee yuwaswisu fee sudoorin-nas', en: 'Who whispers in the breasts of mankind.', tr: 'O ki insanların kalplerine vesvese verir.', id: 'Yang membisikkan (kejahatan) ke dalam dada manusia.', fr: 'Celui qui souffle le mal dans les poitrines des hommes.', de: 'Der in die Brust der Menschen einflüstert.', es: 'Que susurra en el pecho de los hombres.', ru: 'Который наущает в груди людей.' },
      { ar: 'مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ', translit: 'Minal-jinnati wan-nas', en: 'From among the jinn and mankind.', tr: 'Gerek cinlerden, gerek insanlardan.', id: 'Dari golongan jin dan manusia.', fr: 'Qu’il soit parmi les djinns ou les hommes.', de: 'Von den Dschinn und den Menschen.', es: 'Sea de los genios o de los hombres.', ru: 'Из джиннов и людей.' },
    ] },
];

export const VERSES_OF_THE_DAY = [
  { ar: 'إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا', en: 'Indeed, with hardship comes ease.', tr: 'Muhakkak ki zorlukla beraber bir kolaylık vardır.', id: 'Sesungguhnya bersama kesulitan ada kemudahan.', fr: 'En vérité, avec la difficulté vient la facilité.', de: 'Wahrlich, mit der Bedrängnis kommt Erleichterung.', es: 'En verdad, con la dificultad viene la facilidad.', ru: 'Поистине, за тягостью — облегчение.', ref: '94:6' },
  { ar: 'فَٱذْكُرُونِىٓ أَذْكُرْكُمْ', en: 'So remember Me; I will remember you.', tr: 'Öyleyse beni anın ki ben de sizi anayım.', id: 'Maka ingatlah kepada-Ku, niscaya Aku ingat pula kepadamu.', fr: 'Souvenez-vous donc de Moi, Je Me souviendrai de vous.', de: 'So gedenkt Meiner, und Ich werde euer gedenken.', es: 'Recordadme, y Yo os recordaré.', ru: 'Поминайте Меня, и Я буду помнить о вас.', ref: '2:152' },
  { ar: 'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ', en: 'And He is with you wherever you are.', tr: 'Nerede olursanız olun, O sizinle beraberdir.', id: 'Dan Dia bersama kamu di mana saja kamu berada.', fr: 'Et Il est avec vous où que vous soyez.', de: 'Und Er ist mit euch, wo immer ihr seid.', es: 'Y Él está con vosotros dondequiera que estéis.', ru: 'Он с вами, где бы вы ни были.', ref: '57:4' },
  { ar: 'رَبِّ زِدْنِى عِلْمًا', en: 'My Lord, increase me in knowledge.', tr: 'Rabbim, ilmimi artır.', id: 'Ya Tuhanku, tambahkanlah ilmu kepadaku.', fr: 'Seigneur, augmente mes connaissances.', de: 'Mein Herr, mehre mein Wissen.', es: 'Señor mío, aumenta mi conocimiento.', ru: 'Господи, прибавь мне знания.', ref: '20:114' },
  { ar: 'وَبَشِّرِ ٱلصَّـٰبِرِينَ', en: 'And give good tidings to the patient.', tr: 'Sabredenleri müjdele.', id: 'Dan sampaikanlah kabar gembira kepada orang-orang yang sabar.', fr: 'Et annonce la bonne nouvelle aux endurants.', de: 'Und verkünde den Geduldigen frohe Botschaft.', es: 'Y anuncia buenas nuevas a los pacientes.', ru: 'Обрадуй терпеливых.', ref: '2:155' },
];

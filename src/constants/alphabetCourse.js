// Курс «Чтение по слогам» (методика приложения Arabic alphabet).
// 28 букв идут не по алфавиту, а в учебном порядке: сначала те, из которых
// быстрее складываются слова. У каждой буквы — сама буква, три огласовки,
// слоги с сукуном и слова только из уже пройденных букв; у каждого элемента
// своя живая запись. Буквы разбиты на 7 уроков, урок в день.
import { LETTER_ITEMS, AUDIO } from './alphabetSource';
import { LETTER_NAME_AUDIO } from './letterNameAudio';
import { localized } from '../i18n/languages';

// Имена букв. В русском у трёх «Ха» и двух «Та» одно имя, а в упражнениях на
// сопоставление имена обязаны различаться, поэтому взяты имена из
// русскоязычной каиды: Хьа, Хо, То.
const NAMES = [
  ['Алиф', 'Alif'], ['Ра', 'Ra'], ['Зайн', 'Zay'], ['Мим', 'Mim'], ['Та', 'Ta'], ['Нун', 'Nun'], ['Йа', 'Ya'],
  ['Ба', 'Ba'], ['Кяф', 'Kaf'], ['Лям', 'Lam'], ['Уау', 'Waw'], ['Ха', 'Ha'], ['Фа', 'Fa'], ['Каф', 'Qaf'],
  ['Шин', 'Shin'], ['Син', 'Sin'], ['Са', 'Tha'], ['Сад', 'Ṣad'], ['То', 'Ṭa'], ['Джим', 'Jim'], ['Хо', 'Kha'],
  ['Хьа', 'Ḥa'], ['Гайн', 'Ghayn'], ['Айн', 'Ayn'], ['Даль', 'Dal'], ['Дад', 'Ḍad'], ['Заль', 'Dhal'], ['За', 'Ẓa'],
];

// Карточка буквы вместо сплошного абзаца: место в алфавите, звук одной
// строкой, подсказка к произношению и два признака — не соединяется со
// следующей буквой и твёрдая (делает гласные рядом глубже).
// [номер в алфавите, звук ru, звук en, подсказка ru, подсказка en, флаги]
// Флаги: 'n' — не соединяется со следующей, 'h' — твёрдая.
const INFO = [
  [1, 'долгое «а»', 'long "aa"', 'С огласовкой (اَ اِ اُ) читается просто «а», «и», «у». Без неё тянет гласную перед собой: بَا — «баа».', 'With a vowel mark (اَ اِ اُ) it reads simply "a", "i", "u". Without one it lengthens the vowel before it: بَا — "baa".', 'n'],
  [10, 'раскатистое «р»', 'rolled "r"', 'Энергичнее русского «р»: кончик языка дрожит у нёба.', 'More energetic than the English "r": the tongue tip trills against the palate.', 'n'],
  [11, '«з», как в «зима»', '"z", as in "zoo"', null, null, 'n'],
  [24, '«м»', '"m"', null, null, ''],
  [3, '«т», как в «том»', '"t", as in "tea"', 'Кончик языка у верхних зубов, без смягчения и придыхания: «та», а не «тя».', 'Tongue tip at the upper teeth, without a puff of air.', ''],
  [25, '«н»', '"n"', null, null, ''],
  [28, '«й»', '"y", as in "yes"', 'После кясры тянет «и»: بِي — «бии».', 'After kasra it lengthens "i": بِي — "bee".', ''],
  [2, '«б»', '"b"', null, null, ''],
  [22, '«к», как в «кепка»', 'light "k", as in "keep"', 'Произносится у переднего нёба, не путайте с глубоким Каф (ق).', 'Made at the front of the palate — not the deep Qaf (ق).', ''],
  [23, 'лёгкое «л»', 'light "l", as in "leaf"', 'Редко звучит твёрдо, как русское «л» в «лук», — например, в слове «Аллах» после «а» или «у».', 'It sounds heavy only rarely — in "Allah" after "a" or "u".', ''],
  [27, 'губное «w», как в «water»', '"w", as in "water"', 'Губы округляются, как для «у», и сразу раскрываются. После даммы тянет «у»: بُو — «буу».', 'Round the lips as for "u" and open them at once. After damma it lengthens "u": بُو — "boo".', 'n'],
  [26, 'лёгкое «h» на выдохе', 'light breathy "h"', 'Как английское «h» в «hat»: просто выдох, как при согревании рук, без хрипа.', 'As in "hat": just a breath of air, no friction.', ''],
  [20, '«ф»', '"f"', null, null, ''],
  [21, 'глубокое «к»', 'deep "q"', 'Корень языка касается самой дальней части нёба — глубже русского «к».', 'The back of the tongue touches the far end of the palate — deeper than "k".', 'h'],
  [13, 'мягкое «ш»', '"sh", as in "shoe"', 'Мягче русского «ш».', 'Soft, never harsh.', ''],
  [12, '«с»', '"s"', null, null, ''],
  [4, 'глухое межзубное «th», как в «think»', '"th", as in "think"', 'Кончик языка между зубами, без голоса.', 'Tongue tip between the teeth, no voice.', ''],
  [14, 'твёрдое «с»', 'heavy "s"', 'Опустите челюсть и отведите язык назад, как при глубоком «а» у врача.', 'Lower the jaw and pull the tongue back, as for a deep "a" at the doctor.', 'h'],
  [16, 'твёрдое «т»', 'heavy "t"', 'Язык отведён назад, челюсть опущена.', 'Tongue pulled back, jaw lowered.', 'h'],
  [5, 'мягкое «дж»', '"j", as in "jam"', null, null, ''],
  [7, 'хриплое «х»', 'rasping "kh", as in "loch"', 'Глубже русского «х», с лёгким трением в горле, как в шотландском «loch».', 'Deep in the throat with light friction, like the Scottish "loch".', 'h'],
  [6, 'сильное «h» с придыханием', 'strong breathy "ḥ"', 'Горло слегка сжато, как при сильном шёпоте, — но без хрипа.', 'Squeeze the throat slightly, like a forceful whisper — no rasp.', ''],
  [19, 'картавое «р», как во французском', 'French-style "r", deep and voiced', 'Звучит в горле, голос включён.', 'Made in the throat, with voice.', 'h'],
  [18, 'гортанный звук', 'throat sound', 'Скажите «а», сжав верх горла: голос дрожит, воздух почти перекрыт.', 'Say "a" while squeezing the top of the throat: the voice trembles, the air almost stops.', ''],
  [8, '«д»', '"d"', 'Хвостик не опускается ниже строки — в отличие от Ра (ر).', 'Its tail stays on the line — unlike Ra (ر).', 'n'],
  [15, 'твёрдое «д»', 'heavy "d"', 'Скажите «д», отведите язык назад и опустите челюсть.', 'Say "d", then pull the tongue back and lower the jaw.', 'h'],
  [9, 'звонкое межзубное «th», как в «this»', '"th", as in "this"', 'Кончик языка между зубами, с голосом. Хвостик не опускается ниже строки — в отличие от Зайн (ز).', 'Tongue tip between the teeth, with voice. Its tail stays on the line — unlike Zay (ز).', 'n'],
  [17, 'твёрдое «з»', 'heavy "ẓ"', 'Кончик языка касается верхних передних зубов — иначе выйдет обычный Зайн (ز).', 'The tongue tip touches the upper front teeth — otherwise it becomes a plain Zay (ز).', 'h'],
];

// Переводы названий и карточек букв. Это не дословный перевод английского:
// сравнения звуков переписаны под фонетику каждого языка (турецкий «c» = дж,
// французское «r» из горла, немецкое «ch» из «Bach», испанская «j» и т. д.).
// Порядок строк тот же, что в NAMES и INFO; в INFO_TX строка — [звук, подсказка].
const LANGS = ['tr', 'id', 'fr', 'de', 'es'];

const NAMES_TX = {
  tr: ['Elif', 'Re', 'Zey', 'Mim', 'Te', 'Nun', 'Ye', 'Be', 'Kef', 'Lam', 'Vav', 'He', 'Fe', 'Kaf', 'Şın', 'Sin', 'Se', 'Sad', 'Tı', 'Cim', 'Hı', 'Ha', 'Gayn', 'Ayn', 'Dal', 'Dad', 'Zel', 'Zı'],
  id: ['Alif', 'Ra', 'Zai', 'Mim', 'Ta', 'Nun', 'Ya', 'Ba', 'Kaf', 'Lam', 'Waw', 'Ha', 'Fa', 'Qaf', 'Syin', 'Sin', 'Tsa', 'Shad', 'Tha', 'Jim', 'Kho', 'Ḥa', 'Ghain', 'Ain', 'Dal', 'Dhad', 'Dzal', 'Zha'],
  fr: ['Alif', 'Ra', 'Zayn', 'Mim', 'Ta', 'Noun', 'Ya', 'Ba', 'Kaf', 'Lam', 'Waw', 'Ha', 'Fa', 'Qaf', 'Chin', 'Sin', 'Tha', 'Ṣad', 'Ṭa', 'Jim', 'Kha', 'Ḥa', 'Ghayn', 'Ayn', 'Dal', 'Ḍad', 'Dhal', 'Ẓa'],
  de: ['Alif', 'Ra', 'Zai', 'Mim', 'Ta', 'Nun', 'Ya', 'Ba', 'Kaf', 'Lam', 'Waw', 'Ha', 'Fa', 'Qaf', 'Schin', 'Sin', 'Tha', 'Ṣad', 'Ṭa', 'Dschim', 'Kha', 'Ḥa', 'Ghain', 'Ain', 'Dal', 'Ḍad', 'Dhal', 'Ẓa'],
  es: ['Alif', 'Ra', 'Zay', 'Mim', 'Ta', 'Nun', 'Ya', 'Ba', 'Kaf', 'Lam', 'Waw', 'Ha', 'Fa', 'Qaf', 'Shin', 'Sin', 'Tha', 'Ṣad', 'Ṭa', 'Yim', 'Kha', 'Ḥa', 'Ghayn', 'Ayn', 'Dal', 'Ḍad', 'Dhal', 'Ẓa'],
};

const INFO_TX = {
  tr: [
    ['uzun «aa»', 'Harekeyle (اَ اِ اُ) sadece «a», «i», «u» okunur. Harekesiz önündeki ünlüyü uzatır: بَا — «baa».'],
    ['titreyen «r»', 'Türkçe «r»’den daha güçlü: dil ucu damakta titrer.'],
    ['«z», «zil»deki gibi', null],
    ['«m»', null],
    ['«t», «top»taki gibi', 'Dil ucu üst dişlerde, havasız: «ta».'],
    ['«n»', null],
    ['«y», «yol»daki gibi', 'Kesre’den sonra «i»’yi uzatır: بِي — «bii».'],
    ['«b»', null],
    ['ince «k», «kedi»deki gibi', 'Ön damakta çıkar; derin Kaf (ق) ile karıştırmayın.'],
    ['ince «l», «lale»deki gibi', 'Kalın okunması nadirdir — örneğin «Allah»’ta «a» veya «u»’dan sonra.'],
    ['dudaklı «w» (Türkçe «v» değil)', 'Dudaklar «u» gibi yuvarlanır ve hemen açılır; Türkçe «v»’deki gibi diş dudağa değmez. Damme’den sonra «u»’yu uzatır: بُو — «buu».'],
    ['hafif, nefesli «h», «hava»daki gibi', 'Sadece bir soluk, boğazda sürtünme olmadan; ellerinizi ısıtırken verdiğiniz nefes gibi.'],
    ['«f»', null],
    ['derin «k»', 'Dilin kökü damağın en arka kısmına değer — «k»’dan çok daha derin.'],
    ['yumuşak «ş», «şeker»deki gibi', 'Yumuşak, asla sert değil.'],
    ['«s», «sal»daki gibi', null],
    ['sessiz «th» (dişler arası)', 'Dil ucu iki diş sırasının arasında, sessiz — İngilizce «think»’teki gibi. Türkçede böyle bir ses yok: ne «s» ne «t» deyin, dil ucu dışarıda kalsın.'],
    ['kalın «s»', 'Çeneyi indirin ve dili geri çekin, doktorda derin «aa» derken olduğu gibi.'],
    ['kalın «t»', 'Dil geride, çene aşağıda.'],
    ['«c», «can»daki gibi', null],
    ['hırıltılı «h»', 'Boğazın derininde hafif sürtünmeyle; Almanca «Bach»’taki «ch» gibi — Türkçe «h»’den çok daha arkada ve hırıltılı.'],
    ['güçlü, nefesli «h»', 'Boğaz hafifçe daralır, güçlü bir fısıltı gibi — ama hırıltısız.'],
    ['boğazdan «ğ»', '“Ağa” sözündeki «ğ» gibi, ama daha derinde — boğazdan ve sesli; Fransızca «r» gibi.'],
    ['gırtlak sesi', '«a» deyip boğazın üstünü sıkın: ses titrer, hava neredeyse kesilir.'],
    ['«d»', 'Kuyruğu satırın altına inmez — Re (ر) harfinden farkı bu.'],
    ['kalın «d»', '«d» deyin, sonra dili geri çekip çeneyi indirin.'],
    ['sesli «th» (dişler arası)', 'Dil ucu dişlerin arasında, sesli — İngilizce «this»’teki gibi; Türkçede yok. Kuyruğu satırın altına inmez — Zey (ز) harfinden farkı bu.'],
    ['kalın «z»', 'Dil ucu üst ön dişlere değer — yoksa sıradan bir Zey (ز) olur.'],
  ],
  id: [
    ['"aa" panjang', 'Dengan harakat (اَ اِ اُ) dibaca biasa: "a", "i", "u". Tanpa harakat, huruf ini memanjangkan vokal sebelumnya: بَا — "baa".'],
    ['"r" bergetar', 'Seperti "r" pada "roti", tetapi lebih tegas: ujung lidah bergetar di langit-langit.'],
    ['"z", seperti pada "zaman"', null],
    ['"m"', null],
    ['"t", seperti pada "tali"', 'Ujung lidah di gigi atas, tanpa hembusan udara: "ta".'],
    ['"n"', null],
    ['"y", seperti pada "yakin"', 'Setelah kasrah memanjang: بِي — "bii".'],
    ['"b"', null],
    ['"k" ringan, seperti pada "kaki"', 'Dibunyikan di langit-langit depan — jangan tertukar dengan Qaf (ق) yang dalam.'],
    ['"l" ringan, seperti pada "lampu"', 'Jarang dibaca tebal — misalnya pada "Allah" setelah "a" atau "u".'],
    ['"w", seperti pada "waktu"', 'Bibir membulat seperti untuk "u", lalu langsung terbuka. Setelah dhammah memanjang: بُو — "buu".'],
    ['"h" ringan berhembus, seperti pada "hari"', 'Hanya hembusan napas, tanpa gesekan di tenggorokan.'],
    ['"f"', null],
    ['"q" dalam', 'Pangkal lidah menyentuh bagian paling belakang langit-langit — jauh lebih dalam daripada "k".'],
    ['"sy" lembut, seperti pada "syarat"', 'Lembut, tidak keras.'],
    ['"s"', null],
    ['"ts" tanpa suara (antargigi)', 'Ujung lidah di antara gigi atas dan bawah, tanpa suara; bukan "s" biasa, meski sering ditulis "ts". Jangan dibaca "s".'],
    ['"s" tebal', 'Turunkan rahang dan tarik lidah ke belakang, seperti membuka mulut lebar ketika diperiksa dokter.'],
    ['"t" tebal', 'Lidah ditarik ke belakang, rahang turun.'],
    ['"j", seperti pada "jalan"', null],
    ['"kh" serak, seperti pada "khusus"', 'Dalam di tenggorokan dengan gesekan; seperti "kh" pada "khusus", tetapi lebih ke belakang dan lebih serak.'],
    ['"h" kuat berhembus', 'Tenggorokan sedikit dipersempit, seperti berbisik dengan kuat — tanpa serak.'],
    ['"gh" dari tenggorokan', 'Dari tenggorokan dengan suara, seperti "gh" pada "ghaib" — seperti berkumur ringan; mirip "r" Prancis.'],
    ['bunyi tenggorokan', 'Ucapkan "a" sambil menyempitkan bagian atas tenggorokan: suara bergetar, udara hampir terhenti.'],
    ['"d"', 'Ekornya tidak turun di bawah garis — beda dengan Ra (ر).'],
    ['"d" tebal', 'Ucapkan "d", lalu tarik lidah ke belakang dan turunkan rahang.'],
    ['"dz" antargigi bersuara', 'Ujung lidah di antara gigi, dengan suara — seperti "th" bahasa Inggris pada "this"; jangan dibaca "d" atau "z". Ekornya tidak turun di bawah garis — beda dengan Zai (ز).'],
    ['"z" tebal', 'Ujung lidah menyentuh gigi depan atas — kalau tidak, jadi Zai (ز) biasa.'],
  ],
  fr: [
    ['«aa» long', 'Avec une voyelle brève (اَ اِ اُ), elle se lit simplement «a», «i», «ou». Sans voyelle, elle allonge la voyelle qui la précède : بَا — «baa».'],
    ['«r» roulé', 'Plus énergique que le «r» français : la pointe de la langue vibre contre le palais, comme le «r» espagnol ou italien.'],
    ['«z», comme dans «zèbre»', null],
    ['«m»', null],
    ['«t», comme dans «tête»', 'Pointe de la langue contre les dents du haut, sans souffle : «ta».'],
    ['«n»', null],
    ['«y», comme dans «yeux»', 'Après la kasra, elle allonge le «i» : بِي — «bii».'],
    ['«b»', null],
    ['«k» léger, comme dans «képi»', 'Prononcé à l’avant du palais — à ne pas confondre avec le Qaf profond (ق).'],
    ['«l» léger, comme dans «lame»', 'Il n’est lourd que rarement — par exemple dans «Allah» après «a» ou «ou».'],
    ['«w», comme dans «oui»', 'Arrondissez les lèvres comme pour «ou» et ouvrez-les aussitôt. Après la damma, elle allonge le «ou» : بُو — «bouu».'],
    ['«h» léger, soufflé', 'Le «h» français est muet ; ici on le prononce : un simple souffle, sans frottement, comme pour se réchauffer les mains.'],
    ['«f»', null],
    ['«q» profond', 'La base de la langue touche le fond du palais — bien plus profond que le «k».'],
    ['«ch» doux, comme dans «chat»', 'Doux, jamais dur.'],
    ['«s» sourd, comme dans «sac»', null],
    ['«th» sourd (entre les dents)', 'Pointe de la langue entre les dents, sans voix — comme le «th» anglais de «think». Ce son n’existe pas en français : ne dites ni «s» ni «t», laissez la langue sortir.'],
    ['«s» emphatique', 'Abaissez la mâchoire et reculez la langue, comme pour un «a» profond chez le médecin.'],
    ['«t» emphatique', 'Langue reculée, mâchoire abaissée.'],
    ['«dj», comme dans «djembé»', null],
    ['«kh» rauque', 'Au fond de la gorge, avec un frottement : c’est un «r» français sans voix, comme la «jota» espagnole ou le «ch» allemand de «Bach».'],
    ['«h» fort et soufflé', 'La gorge est légèrement serrée, comme un chuchotement appuyé — mais sans raclement.'],
    ['«r» grasseyé, comme dans «rue»', 'C’est exactement le «r» français de «rue» : dans la gorge, avec la voix. Ne le confondez pas avec Ra (ر), qui est roulé.'],
    ['son de gorge', 'Dites «a» en serrant le haut de la gorge : la voix tremble, l’air est presque bloqué.'],
    ['«d»', 'Sa queue ne descend pas sous la ligne — contrairement à Ra (ر).'],
    ['«d» emphatique', 'Dites «d», puis reculez la langue et abaissez la mâchoire.'],
    ['«th» sonore (entre les dents)', 'Pointe de la langue entre les dents, avec la voix — comme le «th» anglais de «this» ; ni «z» ni «d». Sa queue ne descend pas sous la ligne — contrairement à Zayn (ز).'],
    ['«z» emphatique', 'La pointe de la langue touche les dents du haut — sinon on obtient un Zayn (ز) ordinaire.'],
  ],
  de: [
    ['langes „aa“', 'Mit Vokalzeichen (اَ اِ اُ) liest man einfach „a“, „i“, „u“. Ohne Vokalzeichen dehnt der Buchstabe den Vokal davor: بَا — „baa“.'],
    ['gerolltes „r“', 'Kräftiger als das deutsche Rachen-„r“: Die Zungenspitze vibriert am Gaumen (wie im Bairischen oder Italienischen), nicht im Rachen.'],
    ['stimmhaftes „s“, wie in „Sonne“', 'Nicht das deutsche „z“ (das ist „ts“): ein summendes, stimmhaftes „s“ wie bei „Sonne“.'],
    ['„m“', null],
    ['„t“, wie in „Tal“', 'Zungenspitze an den oberen Zähnen, ohne Hauch: „ta“.'],
    ['„n“', null],
    ['„j“, wie in „Jahr“', 'Nach Kasra dehnt es das „i“: بِي — „bii“.'],
    ['„b“', null],
    ['helles „k“, wie in „Kind“', 'Vorn am Gaumen gebildet — nicht mit dem tiefen Qaf (ق) verwechseln.'],
    ['helles „l“, wie in „Lied“', 'Nur selten dunkel — z. B. in „Allah“ nach „a“ oder „u“.'],
    ['„w“ wie im Englischen „water“', 'Nicht das deutsche „w“ (= „v“): Die Lippen runden sich wie für „u“ und öffnen sich sofort, die Zähne berühren die Lippe nicht. Nach Damma dehnt es das „u“: بُو — „buu“.'],
    ['leichtes, gehauchtes „h“, wie in „Hand“', 'Nur ein Hauch, ohne Reibung im Rachen.'],
    ['„f“', null],
    ['tiefes „q“', 'Der Zungengrund berührt den hintersten Gaumen — viel tiefer als „k“.'],
    ['weiches „sch“, wie in „Schule“', 'Ohne vorgestülpte Lippen, weich — nie hart.'],
    ['stimmloses „s“, wie „ß“ in „Straße“', null],
    ['stimmloses „th“ (zwischen den Zähnen)', 'Zungenspitze zwischen den Zähnen, ohne Stimme — wie englisch „think“. Im Deutschen gibt es das nicht: weder „s“ noch „t“ sagen, die Zunge bleibt draußen.'],
    ['dunkles „s“', 'Kiefer senken und die Zunge zurückziehen, wie bei einem tiefen „a“ beim Arzt.'],
    ['dunkles „t“', 'Zunge zurückgezogen, Kiefer gesenkt.'],
    ['„dsch“, wie in „Dschungel“', null],
    ['rauhes „ch“, wie in „Bach“', 'Tief im Rachen mit leichter Reibung — wie das „ch“ in „Bach“, nur noch ein Stück tiefer.'],
    ['starkes, gehauchtes „h“', 'Der Rachen ist leicht verengt, wie bei einem kräftigen Flüstern — aber ohne Rauheit.'],
    ['Rachen-„r“, wie in „rot“', 'Im Rachen, mit Stimme — wie das deutsche „r“ in „rot“ (nicht gerollt!). Nicht mit Ra (ر) verwechseln.'],
    ['Rachenlaut', 'Sagen Sie „a“ und verengen Sie dabei den oberen Rachen: Die Stimme zittert, die Luft stockt fast.'],
    ['„d“', 'Der Schwanz sinkt nicht unter die Zeile — anders als bei Ra (ر).'],
    ['dunkles „d“', 'Sagen Sie „d“, ziehen Sie dann die Zunge zurück und senken Sie den Kiefer.'],
    ['stimmhaftes „th“ (zwischen den Zähnen)', 'Zungenspitze zwischen den Zähnen, mit Stimme — wie englisch „this“; weder „d“ noch „s“. Der Schwanz sinkt nicht unter die Zeile — anders als bei Zai (ز).'],
    ['dunkles stimmhaftes „s“ (ẓ)', 'Die Zungenspitze berührt die oberen Schneidezähne — sonst wird daraus ein gewöhnliches Zai (ز).'],
  ],
  es: [
    ['«aa» larga', 'Con vocal corta (اَ اِ اُ) se lee simplemente «a», «i», «u». Sin ella, alarga la vocal anterior: بَا — «baa».'],
    ['«r» vibrante, como en «perro»', 'Como la «r» de «pero», pero más enérgica: la punta de la lengua vibra contra el paladar (casi como la «rr» de «perro»).'],
    ['«s» sonora, como en «mismo»', 'No es la «z» española (ni la «th» de España): es una «s» con voz, como un zumbido de abeja.'],
    ['«m»', null],
    ['«t», como en «tela»', 'Punta de la lengua en los dientes superiores, sin soplo: «ta».'],
    ['«n»', null],
    ['«y», como en «yo»', 'Tras la kasra alarga la «i»: بِي — «bii».'],
    ['«b»', null],
    ['«k» suave, como en «casa»', 'Se forma en el paladar anterior; no la confundas con la Qaf profunda (ق).'],
    ['«l» clara, como en «lana»', 'Solo rara vez es «pesada», por ejemplo en «Allah» tras «a» o «u».'],
    ['«w», como en «huevo»', 'Redondea los labios como para «u» y ábrelos enseguida. Tras la damma alarga la «u»: بُو — «buu».'],
    ['«h» suave, soplada', 'En español la «h» es muda; aquí sí se pronuncia: un simple soplo de aire, sin fricción, como al empañar un cristal.'],
    ['«f»', null],
    ['«q» profunda', 'La base de la lengua toca el fondo del paladar — mucho más atrás que la «k».'],
    ['«sh» suave, como en «¡shhh!»', 'Suave, nunca áspera; no es la «ch» de «chico».'],
    ['«s»', null],
    ['«th» sorda, como la «z» de «zapato» (España)', 'Punta de la lengua entre los dientes, sin voz — igual que la «z» del español de España. Si tu español es de América, no la digas como «s»: saca la punta de la lengua entre los dientes y sopla.'],
    ['«s» enfática', 'Baja la mandíbula y retrae la lengua, como al decir «aaa» ante el médico.'],
    ['«t» enfática', 'Lengua retraída, mandíbula baja.'],
    ['«dy», como la «y» de «cónyuge»', 'Como la «y» fuerte tras «n» en «cónyuge» o «un yeso»: la lengua toca el paladar y se suelta. No es la «j» española.'],
    ['«j» áspera, como en «jamón»', 'Raspa al fondo de la garganta, como la «j» de «jamón» en España o México, pero aún más atrás y con fricción.'],
    ['«h» fuerte y soplada', 'La garganta se estrecha un poco, como un susurro enérgico — pero sin raspar (no es la «j» de «jamón»).'],
    ['«g» gutural, como en «lago» pero más atrás', 'Suena en la garganta, con voz: como la «g» de «lago», pero más atrás, casi como hacer gárgaras (o la «r» francesa).'],
    ['sonido de garganta', 'Di «a» apretando la parte alta de la garganta: la voz tiembla y el aire casi se detiene.'],
    ['«d»', 'Su cola no baja de la línea — a diferencia de Ra (ر).'],
    ['«d» enfática', 'Di «d», luego retrae la lengua y baja la mandíbula.'],
    ['«th» sonora, como la «d» de «nada»', 'Punta de la lengua entre los dientes, con voz — igual que la «d» suave de «nada» o «cada», pero más marcada. Su cola no baja de la línea — a diferencia de Zay (ز).'],
    ['«z» enfática (ẓ)', 'La punta de la lengua toca los dientes superiores — si no, sale un Zay (ز) normal.'],
  ],
};

// Поля _tr … _es, добавляемые рядом с _en: tx('title', [tr, id, fr, de, es]).
const tx = (field, [tr, id, fr, de, es]) => ({
  [`${field}_tr`]: tr,
  [`${field}_id`]: id,
  [`${field}_fr`]: fr,
  [`${field}_de`]: de,
  [`${field}_es`]: es,
});

// Первая буква каждого урока (номера с единицы, как в оригинале).
const LESSON_STARTS = [1, 5, 9, 13, 17, 23, 27];

const MARKS = /[ً-ْـ]/g;
function kindOf(ar, index) {
  if (index === 0) return 'letter';
  if (index <= 3) return 'vowel';
  return ar.replace(MARKS, '').length <= 2 ? 'syllable' : 'word';
}

export const ALPHABET = LETTER_ITEMS.map((items, i) => {
  const [order, soundRu, soundEn, tipRu, tipEn, flags] = INFO[i];
  return {
    id: i + 1,
    ar: items[0],
    name_ru: NAMES[i][0],
    name_en: NAMES[i][1],
    order,
    sound_ru: soundRu,
    sound_en: soundEn,
    tip_ru: tipRu,
    tip_en: tipEn,
    ...Object.fromEntries(LANGS.flatMap((l) => [
      [`name_${l}`, NAMES_TX[l][i]],
      [`sound_${l}`, INFO_TX[l][i][0]],
      [`tip_${l}`, INFO_TX[l][i][1]],
    ])),
    joinsNext: !flags.includes('n'),
    heavy: flags.includes('h'),
    items: items.map((ar, k) => ({ ar, key: `${i + 1}-${k}`, kind: kindOf(ar, k) })),
  };
});

export const LESSONS = LESSON_STARTS.map((start, li) => {
  const end = li + 1 < LESSON_STARTS.length ? LESSON_STARTS[li + 1] : ALPHABET.length + 1;
  return { index: li, letters: ALPHABET.slice(start - 1, end - 1) };
});

// Записей для вступления в оригинале нет. Синтезатор речи здесь не звучит:
// буква и слоги озвучены записями буквы Ба, сукун — записью «аб» (اَبْ) из её
// же урока, а связки «ба-ба», «ба-би», «бу-би» собраны из записей слогов тем
// же диктором (scripts/alphabet/build_intro_audio.py).
const BA = ALPHABET[7];
const INTRO_FILES = {
  'intro-baba': require('../../assets/alphabet/intro-baba.m4a'),
  'intro-babi': require('../../assets/alphabet/intro-babi.m4a'),
  'intro-bubi': require('../../assets/alphabet/intro-bubi.m4a'),
};
const INTRO_AUDIO = {
  'ب': BA.items[0].key, 'بَ': BA.items[1].key, 'بِ': BA.items[2].key, 'بُ': BA.items[3].key,
  'اَبْ': BA.items[4].key,
  'بَبَ': 'intro-baba', 'بَبِ': 'intro-babi', 'بُبِ': 'intro-bubi',
};

// Вступление: короткие шаги вместо абзацев. У шага может быть заголовок,
// текст, пункты списком, таблица огласовок и арабская карточка для чтения.
const step = (s) => ({
  title_ru: null, title_en: null, points: null, marks: null, ar: '', ...s,
  audio: s.ar ? INTRO_AUDIO[s.ar] || null : null,
});

// Кнопки, повторяющиеся в шагах.
const NEXT = ['İleri', 'Lanjut', 'Suivant', 'Weiter', 'Siguiente'];
const READ = ['Okudum', 'Sudah saya baca', 'J’ai lu', 'Gelesen', 'Ya lo leí'];

// Пункт списка: pt(ru, en, [tr, id, fr, de, es]).
const pt = (ru, en, vals) => ({ ru, en, ...Object.fromEntries(LANGS.map((l, i) => [l, vals[i]])) });

export const INTRO = [
  step({
    title_ru: 'Арабский алфавит', title_en: 'The Arabic alphabet',
    ...tx('title', ['Arap alfabesi', 'Alfabet Arab', 'L’alphabet arabe', 'Das arabische Alphabet', 'El alfabeto árabe']),
    text_ru: '28 букв — и вот что о них важно знать:', text_en: '28 letters — here is what matters:',
    ...tx('text', ['28 harf — bilmeniz gerekenler:', '28 huruf — inilah yang penting:', '28 lettres — voici l’essentiel :', '28 Buchstaben – das ist wichtig:', '28 letras: esto es lo importante:']),
    points: [
      pt('Пишутся и читаются справа налево.', 'Written and read from right to left.', ['Sağdan sola yazılır ve okunur.', 'Ditulis dan dibaca dari kanan ke kiri.', 'Elles s’écrivent et se lisent de droite à gauche.', 'Geschrieben und gelesen wird von rechts nach links.', 'Se escribe y se lee de derecha a izquierda.']),
      pt('Заглавных букв нет.', 'There are no capital letters.', ['Büyük harf yoktur.', 'Tidak ada huruf kapital.', 'Il n’y a pas de majuscules.', 'Es gibt keine Großbuchstaben.', 'No hay mayúsculas.']),
      pt('Большинство букв соединяются со следующей и от этого слегка меняют форму.', 'Most letters join the next one and change shape slightly.', ['Çoğu harf sonrakine bağlanır ve bu yüzden biraz şekil değiştirir.', 'Sebagian besar huruf bersambung dengan huruf berikutnya dan sedikit berubah bentuk.', 'La plupart des lettres se lient à la suivante et changent légèrement de forme.', 'Die meisten Buchstaben verbinden sich mit dem nächsten und ändern dabei leicht ihre Form.', 'La mayoría de las letras se unen a la siguiente y cambian un poco de forma.']),
    ],
    button_ru: 'Понятно', button_en: 'Got it',
    ...tx('button', ['Anladım', 'Mengerti', 'Compris', 'Verstanden', 'Entendido']),
  }),
  step({
    title_ru: 'Огласовки', title_en: 'Vowel marks',
    ...tx('title', ['Harekeler', 'Harakat', 'Les voyelles brèves', 'Vokalzeichen', 'Signos vocálicos']),
    text_ru: 'Короткие гласные не пишутся буквами — их ставят значком над буквой или под ней. Нажмите на строку, чтобы услышать.',
    text_en: 'Short vowels are not letters — they are marks above or below a letter. Tap a row to hear it.',
    ...tx('text', [
      'Kısa ünlüler harf değildir — harfin üstüne veya altına konan işaretlerdir. Dinlemek için bir satıra dokunun.',
      'Vokal pendek bukan huruf — melainkan tanda di atas atau di bawah huruf. Ketuk satu baris untuk mendengarnya.',
      'Les voyelles brèves ne sont pas des lettres : ce sont des signes placés au-dessus ou au-dessous d’une lettre. Touchez une ligne pour l’écouter.',
      'Kurze Vokale sind keine Buchstaben, sondern Zeichen über oder unter einem Buchstaben. Tippen Sie auf eine Zeile, um sie zu hören.',
      'Las vocales cortas no son letras: son signos sobre o bajo una letra. Toca una fila para escucharla.',
    ]),
    marks: [
      { ar: 'بَ', name_ru: 'Фатха', name_en: 'Fatha', ...tx('name', ['Fetha', 'Fathah', 'Fatha', 'Fatha', 'Fatha']), where_ru: 'чёрточка сверху', where_en: 'stroke above', ...tx('where', ['üstte çizgi', 'garis di atas', 'trait au-dessus', 'Strich darüber', 'trazo encima']), sound: 'а', sound_en: 'a', ...tx('sound', ['a', 'a', 'a', 'a', 'a']) },
      { ar: 'بِ', name_ru: 'Кясра', name_en: 'Kasra', ...tx('name', ['Kesre', 'Kasrah', 'Kasra', 'Kasra', 'Kasra']), where_ru: 'чёрточка снизу', where_en: 'stroke below', ...tx('where', ['altta çizgi', 'garis di bawah', 'trait en dessous', 'Strich darunter', 'trazo debajo']), sound: 'и', sound_en: 'i', ...tx('sound', ['i', 'i', 'i', 'i', 'i']) },
      { ar: 'بُ', name_ru: 'Дамма', name_en: 'Damma', ...tx('name', ['Damme', 'Dhammah', 'Damma', 'Damma', 'Damma']), where_ru: 'запятая сверху', where_en: 'small hook above', ...tx('where', ['üstte küçük kıvrım', 'kait kecil di atas', 'petit crochet au-dessus', 'kleiner Haken darüber', 'pequeño gancho encima']), sound: 'у', sound_en: 'u', ...tx('sound', ['u', 'u', 'ou', 'u', 'u']) },
      // Согласный без гласной отдельно не произносится, поэтому образец
      // сукуна — слог «аб»: Алиф с фатхой даёт «а», Ба с сукуном его закрывает.
      { ar: 'اَبْ', name_ru: 'Сукун', name_en: 'Sukun', ...tx('name', ['Sükûn', 'Sukun', 'Soukoun', 'Sukun', 'Sukún']), where_ru: 'кружок сверху — гласной нет', where_en: 'small circle above — no vowel', ...tx('where', ['üstte küçük daire — ünlü yok', 'lingkaran kecil di atas — tanpa vokal', 'petit cercle au-dessus : pas de voyelle', 'kleiner Kreis darüber – kein Vokal', 'circulito encima: sin vocal']), sound: 'аб', sound_en: 'ab', ...tx('sound', ['ab', 'ab', 'ab', 'ab', 'ab']) },
    ].map((m) => ({ ...m, audio: INTRO_AUDIO[m.ar] || null })),
    button_ru: 'Дальше', button_en: 'Next', ...tx('button', NEXT),
  }),
  step({
    text_ru: 'Это буква Ба — звук «б».', text_en: 'This is the letter Ba — the sound "b".',
    ...tx('text', ['Bu Be harfi — «b» sesi.', 'Ini huruf Ba — bunyi "b".', 'Voici la lettre Ba : le son «b».', 'Das ist der Buchstabe Ba – der Laut „b“.', 'Esta es la letra Ba: el sonido «b».']),
    ar: 'ب', button_ru: 'Дальше', button_en: 'Next', ...tx('button', NEXT),
  }),
  step({
    text_ru: 'Фатха сверху — читаем «ба».', text_en: 'Fatha above — it reads "ba".',
    ...tx('text', ['Üstte Fetha — «ba» okunur.', 'Fathah di atas — dibaca "ba".', 'Fatha au-dessus : on lit «ba».', 'Fatha darüber – man liest „ba“.', 'Fatha encima: se lee «ba».']),
    ar: 'بَ', button_ru: 'Дальше', button_en: 'Next', ...tx('button', NEXT),
  }),
  step({
    text_ru: 'Кясра снизу — читаем «би».', text_en: 'Kasra below — it reads "bi".',
    ...tx('text', ['Altta Kesre — «bi» okunur.', 'Kasrah di bawah — dibaca "bi".', 'Kasra en dessous : on lit «bi».', 'Kasra darunter – man liest „bi“.', 'Kasra debajo: se lee «bi».']),
    ar: 'بِ', button_ru: 'Дальше', button_en: 'Next', ...tx('button', NEXT),
  }),
  step({
    text_ru: 'Дамма сверху — читаем «бу».', text_en: 'Damma above — it reads "bu".',
    ...tx('text', ['Üstte Damme — «bu» okunur.', 'Dhammah di atas — dibaca "bu".', 'Damma au-dessus : on lit «bou».', 'Damma darüber – man liest „bu“.', 'Damma encima: se lee «bu».']),
    ar: 'بُ', button_ru: 'Дальше', button_en: 'Next', ...tx('button', NEXT),
  }),
  step({
    text_ru: 'Кружок — сукун: после буквы гласной нет. Алиф с фатхой даёт «а», Ба с сукуном закрывает слог: «аб».',
    text_en: 'The small circle is sukun: no vowel after the letter. Alif with fatha gives "a", Ba with sukun closes the syllable: "ab".',
    ...tx('text', [
      'Küçük daire sükûndur: harften sonra ünlü yok. Fetha’lı Elif «a» verir, sükûnlu Be heceyi kapatır: «ab».',
      'Lingkaran kecil adalah sukun: tidak ada vokal setelah huruf. Alif berfathah menghasilkan "a", Ba bersukun menutup suku kata: "ab".',
      'Le petit cercle est le soukoun : pas de voyelle après la lettre. Alif avec fatha donne «a», Ba avec soukoun ferme la syllabe : «ab».',
      'Der kleine Kreis ist das Sukun: kein Vokal nach dem Buchstaben. Alif mit Fatha ergibt „a“, Ba mit Sukun schließt die Silbe: „ab“.',
      'El circulito es el sukún: no hay vocal tras la letra. Alif con fatha da «a»; Ba con sukún cierra la sílaba: «ab».',
    ]),
    ar: 'اَبْ', button_ru: 'Дальше', button_en: 'Next', ...tx('button', NEXT),
  }),
  step({
    text_ru: 'Две буквы, у обеих фатха: «ба-ба».', text_en: 'Two letters, both with fatha: "ba-ba".',
    ...tx('text', ['İki harf, ikisinde de Fetha: «ba-ba».', 'Dua huruf, keduanya berfathah: "ba-ba".', 'Deux lettres, toutes deux avec fatha : «ba-ba».', 'Zwei Buchstaben, beide mit Fatha: „ba-ba“.', 'Dos letras, ambas con fatha: «ba-ba».']),
    ar: 'بَبَ', button_ru: 'Дальше', button_en: 'Next', ...tx('button', NEXT),
  }),
  step({
    text_ru: 'Теперь сами: прочитайте вслух по слогам, потом нажмите на карточку и сверьте.',
    text_en: 'Now you: read it aloud syllable by syllable, then tap the card to check.',
    ...tx('text', [
      'Şimdi siz: heceleyerek sesli okuyun, sonra kontrol etmek için karta dokunun.',
      'Sekarang giliran Anda: bacalah dengan keras suku kata demi suku kata, lalu ketuk kartu untuk memeriksa.',
      'À vous : lisez à voix haute, syllabe par syllabe, puis touchez la carte pour vérifier.',
      'Jetzt Sie: Lesen Sie laut Silbe für Silbe und tippen Sie dann zur Kontrolle auf die Karte.',
      'Ahora tú: léelo en voz alta, sílaba por sílaba, y luego toca la tarjeta para comprobarlo.',
    ]),
    ar: 'بَبِ', button_ru: 'Я прочитал', button_en: 'I read it', ...tx('button', READ),
  }),
  step({
    text_ru: 'Это «ба-би». Ещё одно:', text_en: 'That was "ba-bi". One more:',
    ...tx('text', ['Bu «ba-bi» idi. Bir tane daha:', 'Itu "ba-bi". Satu lagi:', 'C’était «ba-bi». Encore un :', 'Das war „ba-bi“. Noch eins:', 'Eso era «ba-bi». Uno más:']),
    ar: 'بُبِ', button_ru: 'Я прочитал', button_en: 'I read it', ...tx('button', READ),
  }),
  step({
    text_ru: 'Верно — «бу-би». Принцип понятен: буква даёт согласный, огласовка — гласный.',
    text_en: 'Right — "bu-bi". That is the whole idea: the letter gives the consonant, the mark gives the vowel.',
    ...tx('text', [
      'Doğru — «bu-bi». Bütün mesele bu: harf ünsüzü, işaret ünlüyü verir.',
      'Benar — "bu-bi". Itulah intinya: huruf memberi konsonan, tanda memberi vokal.',
      'Exact : «bou-bi». Voilà le principe : la lettre donne la consonne, le signe donne la voyelle.',
      'Richtig – „bu-bi“. Das ist das ganze Prinzip: Der Buchstabe liefert den Konsonanten, das Zeichen den Vokal.',
      'Correcto: «bu-bi». Esa es la idea: la letra da la consonante y el signo da la vocal.',
    ]),
    button_ru: 'Как устроен курс?', button_en: 'How does the course work?',
    ...tx('button', ['Kurs nasıl işliyor?', 'Bagaimana kursus ini berjalan?', 'Comment se déroule le cours ?', 'Wie funktioniert der Kurs?', '¿Cómo funciona el curso?']),
  }),
  step({
    title_ru: 'Как заниматься', title_en: 'How to practise',
    ...tx('title', ['Nasıl çalışmalı', 'Cara berlatih', 'Comment s’exercer', 'So üben Sie', 'Cómo practicar']),
    points: [
      pt('По одной появляются огласовки, слоги и слова.', 'Vowels, syllables and words appear one at a time.', ['Ünlüler, heceler ve kelimeler tek tek karşınıza çıkar.', 'Vokal, suku kata, dan kata muncul satu per satu.', 'Voyelles, syllabes et mots apparaissent un par un.', 'Vokale, Silben und Wörter erscheinen nacheinander.', 'Las vocales, sílabas y palabras aparecen una a una.']),
      pt('Сначала прочитайте вслух сами.', 'Read each one aloud yourself first.', ['Önce her birini kendiniz sesli okuyun.', 'Bacalah setiap item dengan keras sendiri terlebih dahulu.', 'Lisez d’abord chacun à voix haute, vous-même.', 'Lesen Sie jedes zuerst selbst laut vor.', 'Primero léelo tú mismo en voz alta.']),
      pt('Потом нажмите на карточку и сверьте с записью.', 'Then tap the card and check against the recording.', ['Sonra karta dokunup kayıtla karşılaştırın.', 'Lalu ketuk kartu dan cocokkan dengan rekaman.', 'Puis touchez la carte et comparez avec l’enregistrement.', 'Tippen Sie dann auf die Karte und vergleichen Sie mit der Aufnahme.', 'Luego toca la tarjeta y compáralo con la grabación.']),
      pt('Буквы не заучивайте — просто читайте.', 'Don\'t memorise letters — just read.', ['Harfleri ezberlemeyin — sadece okuyun.', 'Jangan menghafal huruf — cukup baca.', 'Ne mémorisez pas les lettres : lisez, tout simplement.', 'Lernen Sie die Buchstaben nicht auswendig – lesen Sie einfach.', 'No memorices las letras: simplemente lee.']),
    ],
    button_ru: 'Дальше', button_en: 'Next', ...tx('button', NEXT),
  }),
  step({
    title_ru: '7 уроков', title_en: '7 lessons',
    ...tx('title', ['7 ders', '7 pelajaran', '7 leçons', '7 Lektionen', '7 lecciones']),
    points: [
      pt('В уроке несколько новых букв и проверка в конце.', 'Each lesson has a few new letters and a quiz at the end.', ['Her derste birkaç yeni harf ve sonda bir sınav var.', 'Setiap pelajaran berisi beberapa huruf baru dan kuis di akhir.', 'Chaque leçon comporte quelques nouvelles lettres et un quiz à la fin.', 'Jede Lektion enthält ein paar neue Buchstaben und am Ende ein Quiz.', 'Cada lección tiene unas pocas letras nuevas y un cuestionario al final.']),
      pt('Один урок в день.', 'One lesson a day.', ['Günde bir ders.', 'Satu pelajaran per hari.', 'Une leçon par jour.', 'Eine Lektion pro Tag.', 'Una lección al día.']),
      pt('Перед новым уроком бегло повторите прошлые буквы.', 'Before a new lesson, quickly review the letters you know.', ['Yeni derse başlamadan önce bildiğiniz harfleri hızlıca tekrar edin.', 'Sebelum pelajaran baru, ulangi sekilas huruf yang sudah Anda kenal.', 'Avant une nouvelle leçon, révisez rapidement les lettres connues.', 'Wiederholen Sie vor einer neuen Lektion kurz die bekannten Buchstaben.', 'Antes de una lección nueva, repasa rápidamente las letras que ya conoces.']),
    ],
    button_ru: 'Начать', button_en: 'Start',
    ...tx('button', ['Başla', 'Mulai', 'Commencer', 'Los geht’s', 'Empezar']),
  }),
];

// Записи <n>-0 — диктор называет букву по-русски («Буква Алиф»). На других языках
// интерфейса звучит такая же фраза на этом языке (LETTER_NAME_AUDIO), остальные
// записи — арабские слоги и слова — у всех общие.
export function audioFor(key, lang = 'ru') {
  if (!key) return null;
  const name = lang !== 'ru' && /^(\d+)-0$/.exec(key);
  if (name) {
    const own = LETTER_NAME_AUDIO[lang]?.[Number(name[1]) - 1];
    if (own) return own;
  }
  return AUDIO[key] || INTRO_FILES[key] || null;
}

export function letterName(letter, lang) {
  return localized(letter, 'name', lang);
}

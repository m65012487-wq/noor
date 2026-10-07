import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Pressable, Animated, Easing } from 'react-native';
import Text from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import GlassView from '../components/GlassView';
import { COLORS, SPACING, RADIUS, FONTS, TYPE, ARABIC } from '../constants/theme';
import { ALPHABET, INTRO, audioFor, letterName } from '../constants/alphabetCourse';
import {
  buildQuiz, completeIntro, completeLetter, completeQuiz, starsFor, getAlphabetProgress, isQuizPassed,
} from '../utils/alphabetEngine';
import { useAppearance } from '../utils/AppearanceContext';
import { playAsset, stopAudio } from '../utils/audioPlayer';
import { hapticLight, hapticSuccess, hapticError } from '../utils/haptics';
import { useLang } from '../i18n/LanguageContext';
import { ThemedBackground } from '../components/ScreenWrapper';
import { Sprout, SproutPerch, SproutSays, talkTime } from '../components/SproutGuide';
import ArabicFitText from '../components/ArabicFitText';

// Обычные кегли крупной карточки и плитки ответа (с межстрочным): от них
// ArabicFitText уменьшает длинное слово, чтобы оно встало в строку.
const AR_CARD = { fontSize: 64, lineHeight: 120 };
const AR_TILE = { fontSize: 34, lineHeight: 62 };

// Больше стольких шагов сегменты в полосе сливаются в крошки, поэтому
// вместо них рисуется сплошная полоса и счётчик.
const MAX_SEGMENTS = 12;

function LessonBg({ children }) {
  const insets = useSafeAreaInsets();
  // Dynamic Island needs real clearance; modals sometimes report 0 inset,
  // so guarantee a generous minimum.
  const topPad = Math.max(insets.top, 56);
  return (
    // Общий фон вместо собственного: раньше плеер уроков рисовал обои сам
    // и оставался с фотографией, когда выбрана узорная тема.
    <ThemedBackground>
      <View style={[styles.container, { paddingTop: topPad }]}>{children}</View>
    </ThemedBackground>
  );
}

// Запись элемента из бандла; если её нет, ничего не звучит.
function playKey(key, onFinish) {
  const mod = audioFor(key);
  if (mod) playAsset(mod, onFinish);
}

// Верхняя полоса: закрытие, заголовок шага, прогресс и счётчик.
function TopBar({ title, step, total, onExit, accent }) {
  const segmented = total <= MAX_SEGMENTS;
  return (
    <View style={styles.topBarWrap}>
      <GlassView radius={RADIUS.md} style={styles.topBar}>
        <TouchableOpacity onPress={onExit} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="close" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.topMid}>
          <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
          {segmented ? (
            // Сегменты вместо сплошной полосы: видно, сколько всего шагов
            // и на каком идёшь. Заполненная доля этого не говорила.
            <View style={styles.progressTrack}>
              {Array.from({ length: total }).map((_, i) => (
                <View key={i} style={[styles.progressCell,
                  i < step && { backgroundColor: accent },
                  i === step && { backgroundColor: accent, opacity: 0.55 }]} />
              ))}
            </View>
          ) : (
            <View style={[styles.progressTrack, styles.progressSolid]}>
              <View style={[styles.progressBar, { backgroundColor: accent, width: `${((step + 1) / total) * 100}%` }]} />
            </View>
          )}
        </View>
        <Text style={styles.counter}>{step + 1} / {total}</Text>
      </GlassView>
    </View>
  );
}

// Крупная арабская карточка. Слова бывают длинными (اِسْتَعْظَمَ): такое слово
// ужимается, чтобы встать в одну строку, но не мельче 40 pt (ArabicFitText).
// Без onPress (нет записи) карточка не нажимается.
function ArCard({ text, onPress, hint }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={!onPress}>
      <GlassView azure radius={RADIUS.lg} style={styles.arCard}>
        <ArabicFitText style={styles.arCardText} base={AR_CARD} min={40}>{text}</ArabicFitText>
        {hint && <Hint text={hint} />}
      </GlassView>
    </TouchableOpacity>
  );
}

function Hint({ text }) {
  return (
    <View style={styles.tapHintRow}>
      <Icon name="speaker" size={14} color={COLORS.textMuted} />
      <Text style={styles.tapHint}>{text}</Text>
    </View>
  );
}

// Пункты списком: точка цвета схемы и короткая строка.
function Points({ items, lang, accent }) {
  return (
    <View style={styles.points}>
      {items.map((p, i) => (
        <View key={i} style={styles.pointRow}>
          <View style={[styles.pointDot, { backgroundColor: accent }]} />
          <Text style={styles.pointText}>{lang === 'ru' ? p.ru : p.en}</Text>
        </View>
      ))}
    </View>
  );
}

// Таблица огласовок: образец на букве Ба, название, где ставится, звук.
// Строка нажимается — звучит запись диктора; синтезатор речи здесь не звучит.
function MarksTable({ marks, lang, accent, onPlay }) {
  return (
    <GlassView radius={RADIUS.lg} style={styles.marksCard}>
      {marks.map((m, i) => (
        <TouchableOpacity key={m.ar} activeOpacity={0.8} onPress={() => onPlay(m)} disabled={!m.audio}
          style={[styles.markRow, i > 0 && styles.markDivider]}>
          <Text style={styles.markAr}>{m.ar}</Text>
          <View style={styles.markMid}>
            <Text style={styles.markName}>{lang === 'ru' ? m.name_ru : m.name_en}</Text>
            <Text style={styles.markWhere}>{lang === 'ru' ? m.where_ru : m.where_en}</Text>
          </View>
          <Text style={[styles.markSound, { color: accent }]}>{lang === 'ru' ? m.sound : m.sound_en}</Text>
        </TouchableOpacity>
      ))}
    </GlassView>
  );
}

// Звук в данных записан со строчной («глубокое «к»»), а в карточке это
// отдельная строка — с заглавной.
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const ordinalEn = (n) => {
  const tail = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
  return `${n}${tail}`;
};

// Карточка буквы: признаки плашками, затем «Звук» и «Как произносить».
function LetterInfo({ letter, lang, t, accent }) {
  const ru = lang === 'ru';
  const tip = ru ? letter.tip_ru : letter.tip_en;
  const chips = [ru ? `${letter.order}-я буква алфавита` : `${ordinalEn(letter.order)} letter of the alphabet`];
  if (!letter.joinsNext) chips.push(t('chip_no_join'));
  if (letter.heavy) chips.push(t('chip_heavy'));
  return (
    <GlassView radius={RADIUS.lg} style={styles.infoCard}>
      <View style={styles.chips}>
        {chips.map((c, i) => (
          <View key={c} style={[styles.chip, i === 0 ? { borderColor: accent } : styles.chipMuted]}>
            <Text style={[styles.chipText, i === 0 && { color: accent }]}>{c}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.infoLabel}>{t('info_sound')}</Text>
      <Text style={styles.infoSound}>{capitalize(ru ? letter.sound_ru : letter.sound_en)}</Text>
      {!!tip && (
        <>
          <View style={styles.infoDivider} />
          <Text style={styles.infoLabel}>{t('info_how')}</Text>
          <Text style={styles.infoText}>{tip}</Text>
        </>
      )}
    </GlassView>
  );
}

// Экран итога: значок, заголовок, дополнительное содержимое и выход. Росток
// стоит на медали и радуется пройденному — или грустит над несданной проверкой.
function DoneScreen({ badge, title, children, accent, onExit, t, action, mood = 'happy' }) {
  return (
    <LessonBg>
      <View style={styles.doneWrap}>
        <Sprout px={5} mood={mood} />
        <View style={[styles.bigCircle, { borderColor: accent }]}>{badge}</View>
        <Text style={styles.doneTitle}>{title}</Text>
        {children}
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: accent, marginTop: SPACING.xl }]}
          onPress={action ? action.onPress : onExit}>
          <Text style={styles.primaryText}>{action ? action.label : t('continue_btn')}</Text>
        </TouchableOpacity>
        {action && (
          <TouchableOpacity style={styles.textBtn} onPress={onExit}>
            <Text style={styles.secondaryText}>{t('close_btn')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </LessonBg>
  );
}

export default function LessonPlayerScreen({ step, onExit }) {
  // Звук обрывается при закрытии плеера.
  useEffect(() => () => { stopAudio(); }, []);

  if (step.type === 'intro') return <IntroPlayer onExit={onExit} />;
  if (step.type === 'letter') return <LetterPlayer letterId={step.letterId} onExit={onExit} />;
  return <QuizPlayer lessonIndex={step.lessonIndex} onExit={onExit} />;
}

// ---- Введение: короткие шаги с примерами на букве Ба ----
function IntroPlayer({ onExit }) {
  const { t, lang } = useLang();
  const appearance = useAppearance();
  const accent = appearance?.accent || COLORS.accentSoft;
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const s = INTRO[idx];

  // Новый шаг — тишина.
  useEffect(() => { stopAudio(); }, [idx]);

  // Всё во вступлении озвучено записями диктора (alphabetCourse.js); синтезатор
  // речи больше не читает. Без записи нажатие ничего не делает.
  function play(audio) {
    if (!audioFor(audio)) return;
    hapticLight();
    playKey(audio);
  }
  const title = lang === 'ru' ? s.title_ru : s.title_en;
  const text = lang === 'ru' ? s.text_ru : s.text_en;

  function onNext() {
    if (idx + 1 < INTRO.length) { setIdx(idx + 1); return; }
    stopAudio();
    completeIntro();
    hapticSuccess();
    setDone(true);
  }

  if (done) {
    return (
      <DoneScreen accent={accent} onExit={onExit} t={t} title={t('intro_done')}
        badge={<Icon name="check" size={56} color={accent} />} />
    );
  }

  return (
    <LessonBg>
      <TopBar title={t('alphabet_intro')} step={idx} total={INTRO.length} onExit={onExit} accent={accent} />
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        {/* Объяснение «говорит» росток: он стоит на карточке и шевелит ртом,
            пока читается новый шаг. */}
        <SproutPerch talkKey={idx} talkMs={talkTime(text)}>
          <GlassView azure radius={RADIUS.lg} style={styles.textCard}>
            {!!title && <Text style={styles.stepTitle}>{title}</Text>}
            {!!text && <Text style={styles.dialogText}>{text}</Text>}
            {s.points && <Points items={s.points} lang={lang} accent={accent} />}
          </GlassView>
        </SproutPerch>
        {s.marks && <MarksTable marks={s.marks} lang={lang} accent={accent} onPlay={(m) => play(m.audio)} />}
        {!!s.ar && <ArCard text={s.ar} onPress={s.audio ? () => play(s.audio) : undefined}
          hint={s.audio ? t('tap_to_hear_q') : undefined} />}
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: accent }]} onPress={onNext}>
          <Text style={styles.primaryText}>{lang === 'ru' ? s.button_ru : s.button_en}</Text>
        </TouchableOpacity>
      </View>
    </LessonBg>
  );
}

// ---- Буква: сначала читаешь сам, потом проверяешь на записи ----
function LetterPlayer({ letterId, onExit }) {
  const { t, lang } = useLang();
  const appearance = useAppearance();
  const accent = appearance?.accent || COLORS.accentSoft;
  const letter = ALPHABET.find((l) => l.id === letterId);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const total = letter.items.length;
  const item = letter.items[idx];

  // Запись по умолчанию не включается: методика требует прочитать самому.
  useEffect(() => { stopAudio(); }, [idx]);

  function onNext() {
    if (idx + 1 < total) { setIdx(idx + 1); return; }
    stopAudio();
    completeLetter(letter.id);
    hapticSuccess();
    setDone(true);
  }

  if (done) {
    return (
      <DoneScreen accent={accent} onExit={onExit} t={t} title={t('letter_done')}
        badge={<Text style={[styles.doneLetter, { color: accent }]}>{letter.ar}</Text>}>
        <Text style={styles.doneScore}>{letterName(letter, lang)}</Text>
      </DoneScreen>
    );
  }

  return (
    <LessonBg>
      <TopBar title={`${letterName(letter, lang)} · ${letter.ar}`} step={idx} total={total} onExit={onExit} accent={accent} />
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        {idx === 0 ? (
          <>
            <TouchableOpacity activeOpacity={0.85} onPress={() => { hapticLight(); playKey(item.key); }}>
              <GlassView azure radius={RADIUS.lg} style={styles.letterCard}>
                <Text style={styles.bigLetter}>{letter.ar}</Text>
                <Text style={styles.letterNameText}>{letterName(letter, lang)}</Text>
                <Hint text={t('tap_to_hear_q')} />
              </GlassView>
            </TouchableOpacity>
            {/* Как звучит буква и как её произносить — рассказывает росток. */}
            <SproutPerch talkKey={letter.id} talkMs={talkTime(lang === 'ru' ? letter.tip_ru : letter.tip_en)}>
              <LetterInfo letter={letter} lang={lang} t={t} accent={accent} />
            </SproutPerch>
          </>
        ) : (
          <>
            <View style={[styles.kindChip, { borderColor: accent }]}>
              <Text style={[styles.kindText, { color: accent }]}>{t(`kind_${item.kind}`)}</Text>
            </View>
            {/* Подсказку «прочитай сам» говорит росток, а не мелкая строка в карточке. */}
            <SproutSays text={t('read_first_hint')} talkKey={idx} style={styles.says} />
            <ArCard text={item.ar} onPress={() => { hapticLight(); playKey(item.key); }} />
          </>
        )}
      </ScrollView>
      <View style={[styles.footer, styles.footerRow]}>
        <TouchableOpacity
          style={[styles.secondaryBtn, idx === 0 && styles.btnDisabled]}
          disabled={idx === 0}
          onPress={() => setIdx(idx - 1)}>
          <Text style={styles.secondaryText}>{t('step_prev')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.rowPrimary, { backgroundColor: accent }]} onPress={onNext}>
          <Text style={styles.primaryText}>{t('continue_btn')}</Text>
        </TouchableOpacity>
      </View>
    </LessonBg>
  );
}

// У вариантов ответа разный вид: у букв есть id, у элементов — ключ записи.
const optId = (o) => (o.key !== undefined ? o.key : o.id);

// Состояния плитки ответа: обычная, выбранная, верная, неверная, погасшая.
const OK_FILL = 'rgba(76,175,114,0.92)';
const BAD_FILL = 'rgba(214,92,84,0.92)';

// Плитка ответа. Выбор — рамка цвета схемы и лёгкое увеличение; после
// проверки верная заливается зелёным и подпрыгивает, неверная краснеет и
// вздрагивает, остальные гаснут.
function AnswerTile({ state, accent, tint, onPress, disabled, height, children }) {
  const scale = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state === 'selected') {
      Animated.spring(scale, { toValue: 1.04, friction: 6, tension: 220, useNativeDriver: true, isInteraction: false }).start();
    } else if (state === 'correct') {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.1, friction: 4, tension: 260, useNativeDriver: true, isInteraction: false }),
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 180, useNativeDriver: true, isInteraction: false }),
      ]).start();
    } else if (state === 'wrong') {
      scale.setValue(1);
      Animated.sequence([10, -9, 7, -5, 3, 0].map((x) =>
        Animated.timing(shake, { toValue: x, duration: 55, easing: Easing.linear, useNativeDriver: true, isInteraction: false }))).start();
    } else {
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 220, useNativeDriver: true, isInteraction: false }).start();
    }
  }, [state, scale, shake]);

  const look = {
    idle: null,
    selected: { borderColor: accent, borderWidth: 2, backgroundColor: `rgba(${tint},0.24)` },
    correct: { borderColor: OK_FILL, backgroundColor: OK_FILL },
    wrong: { borderColor: BAD_FILL, backgroundColor: BAD_FILL },
    dim: { opacity: 0.35 },
  }[state];

  return (
    <Animated.View style={{ transform: [{ scale }, { translateX: shake }] }}>
      <Pressable disabled={disabled} onPress={onPress} style={[styles.tile, { height }, look]}>
        {children}
        {(state === 'correct' || state === 'wrong') && (
          <View style={styles.tileBadge}>
            <Icon name={state === 'correct' ? 'check' : 'close'} size={12}
              color={state === 'correct' ? COLORS.success : COLORS.danger} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// Плашка результата выезжает снизу: цвет исхода, подпись, правильный ответ
// при ошибке и своя кнопка «Дальше».
function ResultBanner({ ok, title, detail, detailAr, buttonLabel, onPress }) {
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(rise, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true, isInteraction: false }).start();
  }, [rise]);
  const color = ok ? OK_FILL : BAD_FILL;
  return (
    <Animated.View style={[styles.banner, { backgroundColor: color },
      { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }]}>
      <View style={styles.bannerRow}>
        <View style={styles.bannerIcon}>
          <Icon name={ok ? 'check' : 'close'} size={20} color={ok ? COLORS.success : COLORS.danger} />
        </View>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>{title}</Text>
          {!!detail && (
            <Text style={styles.bannerDetail} numberOfLines={1}>
              {detail}{detailAr ? ' ' : ''}{!!detailAr && <Text style={styles.bannerAr}>{detailAr}</Text>}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.bannerBtn}>
        <Text style={[styles.bannerBtnText, { color: ok ? '#2f7a4c' : '#9b3a33' }]}>{buttonLabel}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ---- Проверка после урока ----
function QuizPlayer({ lessonIndex, onExit }) {
  // Повтор проверки — новый набор вопросов, поэтому прохождение пересоздаётся.
  const [attempt, setAttempt] = useState(0);
  // Сдана ли проверка раньше: тогда слабый повтор урок не закрывает
  // и уговаривать пройти заново незачем.
  const [passedBefore, setPassedBefore] = useState(false);
  useEffect(() => {
    let alive = true;
    getAlphabetProgress().then((p) => { if (alive) setPassedBefore(isQuizPassed(p, lessonIndex)); });
    return () => { alive = false; };
  }, [lessonIndex]);
  return <QuizRun key={attempt} lessonIndex={lessonIndex} passedBefore={passedBefore}
    onExit={onExit} onRetry={() => setAttempt((a) => a + 1)} />;
}

function QuizRun({ lessonIndex, passedBefore, onExit, onRetry }) {
  const { t, lang } = useLang();
  const appearance = useAppearance();
  const accent = appearance?.accent || COLORS.accentSoft;
  const tint = appearance?.tint || '150,200,225';
  const [exercises] = useState(() => buildQuiz(lessonIndex));
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [matchOk, setMatchOk] = useState(false); // пары собраны без ошибок

  const ex = exercises[step];
  // Запись на карточке задания: для «услышь» — правильный элемент, для
  // «назови» — сама буква.
  const promptKey = ex.type === 'listen_choose' ? ex.correct.key
    : ex.type === 'name_choose' ? ex.correct.items[0].key : null;

  // Новый шаг — тишина; для «услышь и выбери» запись включается сама.
  useEffect(() => {
    stopAudio();
    if (ex.type === 'listen_choose') {
      const tmo = setTimeout(() => playKey(ex.correct.key), 400);
      return () => clearTimeout(tmo);
    }
  }, [ex]);

  const isCorrect = ex.type === 'match_pairs' ? matchOk : !!selected && optId(selected) === optId(ex.correct);

  function onCheck() {
    if (!selected) return;
    setChecked(true);
    if (optId(selected) === optId(ex.correct)) { setCorrectCount((c) => c + 1); hapticSuccess(); }
    else hapticError();
  }

  function onMatched(mistakes) {
    const ok = mistakes === 0;
    setMatchOk(ok);
    setChecked(true);
    if (ok) { setCorrectCount((c) => c + 1); hapticSuccess(); } else hapticError();
  }

  function onContinue() {
    if (step + 1 < exercises.length) {
      setStep(step + 1); setSelected(null); setChecked(false); setMatchOk(false);
    } else {
      // finish
      stopAudio();
      completeQuiz(lessonIndex, starsFor(correctCount, exercises.length));
      hapticSuccess();
      setDone(true);
    }
  }

  if (done) {
    const stars = starsFor(correctCount, exercises.length);
    // Без звезды проверка не сдана: следующий урок закрыт, предлагаем повтор.
    const failed = stars < 1 && !passedBefore;
    return (
      <DoneScreen accent={accent} onExit={onExit} t={t} title={failed ? t('quiz_retry') : t('quiz_done')}
        mood={failed ? 'sad' : 'happy'}
        action={failed ? { label: t('quiz_again'), onPress: onRetry } : null}
        badge={<Icon name={failed ? 'refresh' : 'check'} size={56} color={accent} />}>
        {failed && <Text style={styles.doneNote}>{t('quiz_need_star')}</Text>}
        <View style={styles.starsRow}>
          {[0, 1, 2].map((i) => (
            <Icon key={i} name={i < stars ? 'star' : 'starOff'} size={40}
              color={i < stars ? COLORS.warning : 'rgba(255,255,255,0.3)'} style={{ marginHorizontal: 4 }} />
          ))}
        </View>
        <Text style={styles.doneScore}>{correctCount} / {exercises.length}</Text>
      </DoneScreen>
    );
  }

  const arabic = ex.type === 'listen_choose';
  const tileState = (opt) => {
    const isSel = !!selected && optId(selected) === optId(opt);
    if (!checked) return isSel ? 'selected' : 'idle';
    if (optId(opt) === optId(ex.correct)) return 'correct';
    return isSel ? 'wrong' : 'dim';
  };

  // Задание говорит росток. После проверки — его реакция: радуется верному
  // ответу, огорчается ошибке. Реплики чередуются от шага к шагу.
  const say = (key) => { const v = t(key).split('|'); return v[step % v.length]; };
  const speech = !checked ? promptFor(ex.type, t) : isCorrect ? say('sprout_right') : say('sprout_wrong');
  const mood = !checked ? 'idle' : isCorrect ? 'happy' : 'sad';

  // Подпись плашки при ошибке: какой ответ был верным.
  let detail = null;
  let detailAr = null;
  if (checked && !isCorrect) {
    if (ex.type === 'listen_choose') { detail = t('answer_was'); detailAr = ex.correct.ar; }
    if (ex.type === 'name_choose') detail = `${t('answer_was')} ${letterName(ex.correct, lang)}`;
    if (ex.type === 'match_pairs') detail = t('match_had_mistakes');
  }

  return (
    <LessonBg>
      <TopBar title={`${t('lesson')} ${lessonIndex + 1} · ${t('alphabet_quiz')}`} step={step} total={exercises.length} onExit={onExit} accent={accent} />

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        <SproutSays text={speech} mood={mood} talkKey={`${step}:${checked}`} cheerKey={step} style={styles.says} />

        {/* Кнопка записи для «услышь и выбери» */}
        {ex.type === 'listen_choose' && (
          <TouchableOpacity onPress={() => playKey(promptKey)} activeOpacity={0.7} style={styles.speakerWrap}>
            <GlassView blur clip radius={44} azure noBorder={false} style={styles.speaker}>
              <Icon name="speakerHi" size={38} color={COLORS.white} />
            </GlassView>
            <Text style={styles.speakerHint}>{t('tap_to_repeat')}</Text>
          </TouchableOpacity>
        )}

        {/* Буква на карточке для вопроса про имя */}
        {ex.type === 'name_choose' && (
          <TouchableOpacity onPress={() => playKey(promptKey)} activeOpacity={0.85}>
            <GlassView azure radius={RADIUS.lg} style={styles.promptCard}>
              <Text style={styles.promptAr}>{ex.correct.ar}</Text>
              <Hint text={t('tap_to_hear_q')} />
            </GlassView>
          </TouchableOpacity>
        )}

        {ex.type === 'match_pairs' ? (
          <MatchPairs key={step} ex={ex} lang={lang} accent={accent} tint={tint} onDone={onMatched} />
        ) : (
          // Сетка 2×2 одинаковых плиток вместо стопки полос во всю ширину.
          <View style={styles.grid}>
            {ex.options.map((opt) => {
              const state = tileState(opt);
              return (
                <View key={optId(opt)} style={styles.gridCell}>
                  <AnswerTile state={state} accent={accent} tint={tint} disabled={checked}
                    height={arabic ? 104 : 68}
                    onPress={() => { hapticLight(); setSelected(opt); if (arabic) playKey(opt.key); }}>
                    {arabic ? (
                      <ArabicFitText style={styles.tileAr} base={AR_TILE} min={24}>{opt.ar}</ArabicFitText>
                    ) : (
                      <Text style={styles.tileName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                        {letterName(opt, lang)}
                      </Text>
                    )}
                  </AnswerTile>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {checked ? (
        <ResultBanner key={step} ok={isCorrect} title={isCorrect ? t('correct') : t('incorrect')}
          detail={detail} detailAr={detailAr} buttonLabel={t('continue_btn')} onPress={onContinue} />
      ) : ex.type === 'match_pairs' ? (
        <View style={styles.footer}>
          <Text style={styles.matchHint}>{t('match_hint')}</Text>
        </View>
      ) : (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: accent }, !selected && styles.btnDisabled]}
            disabled={!selected}
            onPress={onCheck}>
            <Text style={styles.primaryText}>{t('check')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </LessonBg>
  );
}

function promptFor(type, t) {
  return { listen_choose: t('ex_listen'), name_choose: t('ex_name'), match_pairs: t('ex_match') }[type];
}

// Пары «буква — имя» теми же плитками. Верная пара на миг зеленеет и гаснет,
// неверная краснеет и вздрагивает. Ошибки считаются: упражнение засчитано,
// только если пары собраны без них.
function MatchPairs({ ex, lang, accent, tint, onDone }) {
  const [picks, setPicks] = useState({}); // id соединённых букв
  const [activeLeft, setActiveLeft] = useState(null); // id выбранной буквы
  const [flash, setFlash] = useState(null); // { left, right, ok }
  const mistakes = useRef(0);
  // Защита от двойного нажатия до перерисовки и таймеры, которые нужно
  // снять, если проверку закрыли посреди вспышки.
  const busy = useRef(false);
  const finished = useRef(false);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };
  const rights = React.useMemo(() => [...ex.items].sort(() => Math.random() - 0.5), [ex]);

  function pickLeft(it) {
    if (picks[it.id] || busy.current) return;
    hapticLight();
    setActiveLeft(it.id);
  }
  function pickRight(rt) {
    if (!activeLeft || picks[rt.id] || busy.current) return;
    busy.current = true;
    const ok = activeLeft === rt.id;
    setFlash({ left: activeLeft, right: rt.id, ok });
    if (ok) hapticLight(); else { mistakes.current += 1; hapticError(); }
    later(() => {
      busy.current = false;
      setFlash(null);
      setActiveLeft(null);
      if (!ok) return;
      const next = { ...picks, [rt.id]: true };
      setPicks(next);
      if (Object.keys(next).length === ex.items.length && !finished.current) {
        finished.current = true;
        later(() => onDone(mistakes.current), 200);
      }
    }, ok ? 380 : 520);
  }

  const stateOf = (id, side) => {
    if (flash && flash[side] === id) return flash.ok ? 'correct' : 'wrong';
    if (picks[id]) return 'dim';
    if (side === 'left' && activeLeft === id) return 'selected';
    return 'idle';
  };

  return (
    <View style={styles.matchRow}>
      <View style={styles.matchCol}>
        {ex.items.map((it) => {
          const state = stateOf(it.id, 'left');
          return (
            <AnswerTile key={it.id} state={state} accent={accent} tint={tint} height={64}
              disabled={!!picks[it.id]} onPress={() => pickLeft(it)}>
              <Text style={[styles.matchAr]}>{it.ar}</Text>
            </AnswerTile>
          );
        })}
      </View>
      <View style={styles.matchCol}>
        {rights.map((it) => {
          const state = stateOf(it.id, 'right');
          return (
            <AnswerTile key={it.id} state={state} accent={accent} tint={tint} height={64}
              disabled={!!picks[it.id]} onPress={() => pickRight(it)}>
              <Text style={[styles.tileName]}>
                {letterName(it, lang)}
              </Text>
            </AnswerTile>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBarWrap: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm },
  closeBtn: { padding: 6 },
  topMid: { flex: 1, marginHorizontal: SPACING.sm },
  topTitle: { ...TYPE.caption, color: COLORS.text, fontWeight: '700', marginBottom: SPACING.xs },
  progressTrack: { flexDirection: 'row', gap: 3 },
  progressCell: { flex: 1, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.16)' },
  // Сплошная полоса для длинных шагов: заливка растёт слева направо.
  progressSolid: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden', alignItems: 'stretch' },
  progressBar: { height: 6, borderRadius: 3 },
  counter: { ...TYPE.caption, color: COLORS.textMuted, minWidth: 44, textAlign: 'right', marginRight: SPACING.xs },
  says: { marginBottom: SPACING.lg },
  speakerWrap: { alignSelf: 'center', alignItems: 'center', marginBottom: SPACING.lg },
  speaker: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  speakerHint: { ...TYPE.caption, color: COLORS.textMuted, marginTop: SPACING.sm },
  // Варианты ответа: сетка 2×2 одинаковых плиток.
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -SPACING.xs },
  gridCell: { width: '50%', padding: SPACING.xs },
  tile: { borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: SPACING.sm },
  tileAr: { fontSize: 34, lineHeight: 62, color: COLORS.white, fontFamily: FONTS.arabic },
  tileName: { ...TYPE.subhead, color: COLORS.white, fontWeight: '700' },
  tileBadge: { position: 'absolute', top: 7, right: 7, width: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  // Плашка результата.
  banner: { marginHorizontal: SPACING.md, marginBottom: SPACING.xl, borderRadius: RADIUS.lg, padding: SPACING.md },
  bannerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  bannerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center' },
  bannerText: { flex: 1, marginLeft: SPACING.md },
  bannerTitle: { ...TYPE.heading, color: COLORS.white },
  bannerDetail: { ...TYPE.callout, color: 'rgba(255,255,255,0.92)', marginTop: SPACING.xxs },
  // Арабский при равном кегле заметно мельче кириллицы — берём крупнее строки.
  bannerAr: { fontSize: 24, fontFamily: FONTS.arabic, color: COLORS.white },
  bannerBtn: { backgroundColor: COLORS.white, borderRadius: RADIUS.pill, minHeight: 50,
    alignItems: 'center', justifyContent: 'center' },
  bannerBtnText: { ...TYPE.subhead, fontWeight: '800' },
  starsRow: { flexDirection: 'row', marginTop: SPACING.md, marginBottom: SPACING.sm },
  promptCard: { alignItems: 'center', paddingVertical: SPACING.lg, marginBottom: SPACING.lg, marginHorizontal: SPACING.xl },
  promptAr: { ...ARABIC.xl, color: COLORS.white, fontFamily: FONTS.arabic },
  tapHint: { ...TYPE.caption, color: COLORS.textMuted, marginLeft: SPACING.xs, flexShrink: 1, textAlign: 'center' },
  tapHintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm,
    paddingHorizontal: SPACING.sm },
  kindChip: { alignSelf: 'center', borderWidth: 1, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs, marginBottom: SPACING.md },
  kindText: { ...TYPE.overline },
  textCard: { padding: SPACING.lg, marginBottom: SPACING.lg },
  dialogText: { ...TYPE.subhead, color: COLORS.text, fontWeight: '400', lineHeight: 26 },
  stepTitle: { ...TYPE.heading, color: COLORS.white, marginBottom: SPACING.sm },
  points: { marginTop: SPACING.xs, gap: SPACING.sm },
  pointRow: { flexDirection: 'row', alignItems: 'flex-start' },
  pointDot: { width: 6, height: 6, borderRadius: 3, marginTop: 9, marginRight: SPACING.sm },
  pointText: { ...TYPE.body, color: COLORS.text, lineHeight: 23, flex: 1 },
  marksCard: { marginBottom: SPACING.lg, paddingHorizontal: SPACING.md },
  markRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.xs },
  markDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.hairline },
  markAr: { fontSize: 34, lineHeight: 64, width: 52, textAlign: 'center', color: COLORS.white, fontFamily: FONTS.arabic },
  markMid: { flex: 1, marginLeft: SPACING.sm },
  markName: { ...TYPE.callout, color: COLORS.white, fontWeight: '700' },
  markWhere: { ...TYPE.caption, color: COLORS.textMuted, marginTop: SPACING.xxs },
  markSound: { ...TYPE.heading, minWidth: 32, textAlign: 'center' },
  infoCard: { padding: SPACING.md, marginBottom: SPACING.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.md },
  chip: { borderWidth: 1, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  chipMuted: { borderColor: COLORS.hairline, backgroundColor: 'rgba(255,255,255,0.05)' },
  chipText: { ...TYPE.caption, color: COLORS.text, fontWeight: '600' },
  infoLabel: { ...TYPE.overline, color: COLORS.textMuted, marginBottom: SPACING.xxs },
  infoSound: { ...TYPE.subhead, color: COLORS.white, fontWeight: '700' },
  infoDivider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.hairline, marginVertical: SPACING.md },
  infoText: { ...TYPE.body, color: COLORS.text, lineHeight: 23 },
  // Читаемый элемент — главное на экране: крупно и по центру карточки.
  arCard: { alignItems: 'center', justifyContent: 'center', minHeight: 240, paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  arCardText: { fontSize: 64, lineHeight: 120, color: COLORS.white, fontFamily: FONTS.arabic, alignSelf: 'stretch', textAlign: 'center' },
  letterCard: { alignItems: 'center', paddingVertical: SPACING.xl, marginBottom: SPACING.lg },
  bigLetter: { fontSize: 96, lineHeight: 150, color: COLORS.white, fontFamily: FONTS.arabic },
  letterNameText: { ...TYPE.heading, color: COLORS.white, marginTop: SPACING.xs },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md },
  matchCol: { flex: 1, gap: SPACING.sm },
  matchHint: { ...TYPE.callout, color: COLORS.textMuted, textAlign: 'center', paddingVertical: SPACING.md },
  matchAr: { ...ARABIC.md, color: COLORS.white, fontFamily: FONTS.arabic },
  footer: { padding: SPACING.lg, paddingBottom: SPACING.xl, borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.surfaceStrong },
  footerRow: { flexDirection: 'row', gap: SPACING.sm },
  primaryBtn: { borderRadius: RADIUS.pill, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl,
    alignItems: 'center', justifyContent: 'center', minHeight: 54, width: '100%' },
  // В ряду кнопок «Назад» уже, «Дальше» занимает остаток.
  secondaryBtn: { borderRadius: RADIUS.pill, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg,
    alignItems: 'center', justifyContent: 'center', minHeight: 54, flex: 1,
    backgroundColor: COLORS.surfaceStrong },
  rowPrimary: { borderRadius: RADIUS.pill, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg,
    alignItems: 'center', justifyContent: 'center', minHeight: 54, flex: 2 },
  // Цвета схем светлые, поэтому текст на основной кнопке тёмный, как в тасбихе.
  primaryText: { ...TYPE.subhead, color: COLORS.navy, fontWeight: '800', textAlign: 'center' },
  secondaryText: { ...TYPE.subhead, color: COLORS.white, fontWeight: '700', textAlign: 'center' },
  textBtn: { paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, marginTop: SPACING.xs },
  btnDisabled: { opacity: 0.4 },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  bigCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, alignItems: 'center',
    justifyContent: 'center', marginBottom: SPACING.lg },
  doneLetter: { fontSize: 64, lineHeight: 100, fontFamily: FONTS.arabic },
  doneTitle: { ...TYPE.title, color: COLORS.white, fontWeight: '800', textAlign: 'center' },
  doneScore: { ...TYPE.body, color: COLORS.textMuted, marginTop: SPACING.xs },
  doneNote: { ...TYPE.callout, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.sm, maxWidth: 300 },
});

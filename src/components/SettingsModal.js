import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import Text from './AppText';
import Icon from './Icon';
import DraggableSheet from './DraggableSheet';
import ColorPicker from './ColorPicker';
import { COLORS, SPACING, RADIUS, TYPE } from '../constants/theme';
import { useLang } from '../i18n/LanguageContext';
import { useAppSettings, NOTIF_SOUNDS, SOUND_ASSETS } from '../utils/AppSettingsContext';
import { useAppearance, makeScheme } from '../utils/AppearanceContext';
import { ADHAN_SOUNDS } from '../utils/adhan';
import { ASR_SCHOOLS } from '../constants/calcMethods';
import { getFajrAlarmSettings, setFajrAlarmEnabled, setFajrAlarmInterval, cancelFajrAlarm } from '../utils/fajrAlarm';
import { describeAutoSource } from '../utils/prayerSource';
import { useTablesVersion } from '../utils/useOfficialTables';
import { useLocation } from '../utils/LocationContext';
import { PRAYER_NAMES } from '../constants/prayerNames';
import { playUrl, playAsset, stopAudio } from '../utils/audioPlayer';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}


// Отметка выбора. Галочка в списке из десяти строк читается плохо: она
// одного веса с текстом и теряется среди букв. Точка в кольце заметна
// периферийным зрением и сразу говорит «выбрано одно из многих».
function Pick({ active, color }) {
  return (
    <View style={[styles.pick, active && { borderColor: color }]}>
      {active && <View style={[styles.pickDot, { backgroundColor: color }]} />}
    </View>
  );
}

function Opt({ label, active, onPress, activeBg, accent }) {
  return (
    <TouchableOpacity style={[styles.row, active && styles.rowActive, active && activeBg]} onPress={onPress}>
      <Text style={[styles.rowText, active && styles.rowTextActive, { flex: 1 }]}>{label}</Text>
      <Pick active={active} color={accent} />
    </TouchableOpacity>
  );
}

// Строка звука: выбор слева, прослушивание справа. Без прослушивания выбор
// вслепую — название ничего не говорит, пока не услышишь. У системного звука
// кнопки нет: его файла в приложении нет.
function SoundRow({ item, lang, active, activeBg, playing, onPreview, onPick, accent }) {
  return (
    <View style={[styles.row, active && styles.rowActive, active && activeBg]}>
      <TouchableOpacity style={{ flex: 1 }} onPress={onPick}>
        <Text style={[styles.rowText, active && styles.rowTextActive]}>
          {lang === 'ru' ? item.label_ru : item.label_en}
        </Text>
      </TouchableOpacity>
      {item.file ? (
        <TouchableOpacity onPress={onPreview} style={styles.previewBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name={playing ? 'pause' : 'play'} size={16} color={COLORS.accentSoft} />
        </TouchableOpacity>
      ) : null}
      <Pick active={active} color={accent} />
    </View>
  );
}

// Иконка в заголовке даёт разделу опознавательный знак: список из четырёх
// одинаковых строк с шевроном справа читается заметно хуже.
function Section({ id, icon, title, open, onToggle, children }) {
  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHead} onPress={() => onToggle(id)} activeOpacity={0.8}>
        <Icon name={icon} size={19} color={COLORS.accentSoft} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <Icon name={open ? "up" : "down"} size={20} color={COLORS.accentSoft} />
      </TouchableOpacity>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

// Группы тем в настройках: «Без рисунка» стоит среди картин.
const PATTERN_GROUPS = [
  { kind: 'live', kinds: ['live'], title: 'themes_live' },
  { kind: 'scene', kinds: ['none', 'scene'], title: 'themes_scenes' },
];

// Сетка в три колонки: кнопки одной ширины встают ровными рядами, а не
// «лесенкой» из чипов разной длины.
function Grid({ children }) {
  return <View style={styles.grid}>{children}</View>;
}

// Поправка к времени одного намаза, в минутах: не дальше получаса в любую
// сторону — больше уже не «под мечеть», а другой график.
const TUNE_MAX = 30;
const TUNE_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// «+2 мин», «−1 мин», «0»: настоящий минус (U+2212) одной ширины с плюсом.
function tuneLabel(minutes, unit) {
  if (!minutes) return '0';
  return `${minutes > 0 ? '+' : '\u2212'}${Math.abs(minutes)} ${unit}`;
}

// Круглая кнопка поправки. Размер задан жёстко, чтобы «−» и «+» не отличались
// ни высотой, ни шириной; на краю диапазона кнопка гаснет.
function TuneBtn({ icon, onPress, disabled }) {
  return (
    <TouchableOpacity style={[styles.tuneBtn, disabled && styles.tuneBtnOff]} onPress={onPress}
      disabled={disabled} activeOpacity={0.7} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
      <Icon name={icon} size={18} color={COLORS.white} />
    </TouchableOpacity>
  );
}

// Подпись в ячейке всегда в одну строку: длинная («Свой цвет», «Без рисунка»)
// чуть ужимается, а не переносится — перенос делал кнопку выше соседних.
const FIT = { numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.7 };

function Cell({ active, onPress, style, children }) {
  return (
    <View style={styles.cell}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}
        style={[styles.cellBtn, active && styles.cellBtnActive, style]}>
        {children}
      </TouchableOpacity>
    </View>
  );
}

export default function SettingsModal({ visible, onClose, onFajrAlarmChange }) {
  const { t, lang, setLang } = useLang();
  const { adhanSound, chooseAdhan, notifSound, chooseNotifSound,
    adhanNotifSound, chooseAdhanNotifSound, hijriOffset, chooseHijriOffset,
    asrSchool, chooseAsrSchool, tune, setTuneFor, resetTune } = useAppSettings();
  const { coords } = useLocation();
  const tablesVersion = useTablesVersion();
  const { pattern, choosePattern, PATTERNS, scheme, chooseScheme, SCHEMES,
    customColor, chooseCustomColor,
    uiFont, chooseUiFont, UI_FONTS, parallax, toggleParallax,
    tint, accent } = useAppearance();
  const tintRgb = tint || '180,215,230';
  const accentColor = accent || COLORS.accent;
  const activeBg = { backgroundColor: `rgba(${tintRgb},0.18)` };
  const [previewing, setPreviewing] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  // Все разделы свёрнуты при открытии: развёрнутый первый занимал экран
  // и прятал остальные за прокруткой.
  const [openSection, setOpenSection] = useState(null);
  const [alarmOn, setAlarmOn] = useState(false);
  const [alarmInt, setAlarmInt] = useState(5);

  // Источник времени не выбирается: график духовного управления региона и
  // ближайшего к месту пункта, а где его нет — метод. Здесь только сказать,
  // откуда сейчас время; пересчитываем при смене места и новых графиках.
  const autoInfo = useMemo(() => (coords
    ? describeAutoSource({ lat: coords.lat, lng: coords.lng, region: coords.region, country: coords.country }, new Date())
    : null),
  // tablesVersion — не значение, а сигнал: пришли новые графики, описание устарело.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [coords, tablesVersion]);
  const sourceNote = useMemo(() => {
    if (!autoInfo) return null;
    const info = autoInfo;
    const name = (lang === 'ru' ? info.authorityName : info.authorityNameEn) || info.authorityName || '';
    const fill = (key) => t(key).replace('{name}', name).replace('{place}', info.placeName || '').replace('{year}', String(info.year));
    if (info.mode === 'table') return fill(info.placeName ? 'src_now_table' : 'src_now_table_bare');
    if (info.mode === 'previousYear') return fill('src_now_prev_year');
    if (info.mode === 'fallback') return fill('src_now_fallback');
    return fill('src_now_country');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoInfo, lang]);
  // Мазхаб Асра важен только для расчёта методом: в официальном графике Аср
  // уже посчитан так, как принято у управления.
  const byMethod = !autoInfo || autoInfo.mode === 'fallback' || autoInfo.mode === 'country';
  const tuned = TUNE_PRAYERS.some((key) => tune?.[key]);
  React.useEffect(() => { (async () => {
    const st = await getFajrAlarmSettings(); setAlarmOn(st.enabled); setAlarmInt(st.interval);
  })(); }, [visible]);

  function toggle(id) {
    // Короткая и без масштабирования новых элементов: пресет на 300 мс с
    // scaleXY подёргивал всё содержимое шторки.
    LayoutAnimation.configureNext({
      duration: 220,
      update: { type: 'easeInEaseOut' },
      create: { type: 'easeInEaseOut', property: 'opacity' },
      delete: { type: 'easeInEaseOut', property: 'opacity' },
    });
    setOpenSection((cur) => (cur === id ? null : id));
  }

  // Три состояния вместо двух: удалённый файл сначала грузится, и раньше
  // кнопка сразу показывала «пауза», хотя ничего ещё не звучало. При сбое
  // сети состояние залипало навсегда — ошибка глушилась молча.
  async function preview(item) {
    if (!item.url) return;
    if (previewing === item.id || loadingId === item.id) {
      await stopAudio();
      setPreviewing(null);
      setLoadingId(null);
      return;
    }
    setLoadingId(item.id);
    const ok = await playUrl(item.url, () => setPreviewing(null));
    setLoadingId(null);
    setPreviewing(ok ? item.id : null);
  }
  // Звук из бандла грузить не нужно, поэтому и промежуточного состояния нет.
  // Ключ с приставкой: один и тот же файл стоит в обоих списках, и без
  // приставки нажатие в одном подсвечивало бы кнопку и в другом.
  async function previewAsset(key, soundId) {
    if (previewing === key) {
      await stopAudio();
      setPreviewing(null);
      return;
    }
    const mod = SOUND_ASSETS[soundId];
    if (!mod) return;
    const ok = await playAsset(mod, () => setPreviewing(null));
    setPreviewing(ok ? key : null);
  }
  function close() { stopAudio(); setPreviewing(null); setLoadingId(null); onClose(); }

  return (
    <DraggableSheet visible={visible} onClose={close} title={t('general_settings')}>
      {/* ===== PRAYER ===== */}
        <Section id="prayer" icon="prayer" title={t("sec_prayer")} open={openSection === 'prayer'} onToggle={toggle}>
          <Text style={styles.label}>{t('time_source')}</Text>
          <Text style={styles.hintText}>{sourceNote || t('src_need_place')}</Text>

          {byMethod && <Text style={styles.label}>{t('asr_method')}</Text>}
          {byMethod && ASR_SCHOOLS.map((m) => (
            <Opt key={m.id} label={lang === 'ru' ? m.label_ru : m.label_en}
              active={asrSchool === m.id} onPress={() => chooseAsrSchool(m.id)} activeBg={activeBg} accent={accentColor} />
          ))}

          {/* Поправка под мечеть: минуты к времени каждого намаза поверх любого
              источника. Мечети читают азан не всегда минута в минуту с графиком. */}
          <Text style={styles.label}>{t('tune_title')}</Text>
          {TUNE_PRAYERS.map((key) => {
            const value = tune?.[key] || 0;
            return (
              <View key={key} style={styles.tuneRow}>
                <Text style={styles.tuneName}>{lang === 'ru' ? PRAYER_NAMES[key].ru : PRAYER_NAMES[key].en}</Text>
                <View style={styles.tuneCtrl}>
                  <TuneBtn icon="remove" disabled={value <= -TUNE_MAX} onPress={() => setTuneFor(key, Math.max(-TUNE_MAX, value - 1))} />
                  <Text style={styles.tuneVal} numberOfLines={1} adjustsFontSizeToFit>{tuneLabel(value, t('min_short'))}</Text>
                  <TuneBtn icon="add" disabled={value >= TUNE_MAX} onPress={() => setTuneFor(key, Math.min(TUNE_MAX, value + 1))} />
                </View>
              </View>
            );
          })}
          <Text style={[styles.hintText, { marginTop: SPACING.xs }]}>{t('tune_hint')}</Text>
          {tuned && (
            <TouchableOpacity style={[styles.intChip, styles.tuneReset]} onPress={resetTune} activeOpacity={0.8}>
              <Text style={styles.intText}>{t('tune_reset')}</Text>
            </TouchableOpacity>
          )}

          {/* Два набора звуков вместо одного: напоминание «за N минут» и само
              наступление времени — разные события, и звучать они должны
              по-разному. Азан здесь не участвует: в уведомление iOS пускает
              только короткий файл из бандла, а записи азанов лежат в сети. */}
          <Text style={styles.label}>{t('notif_sound')}</Text>
          {NOTIF_SOUNDS.map((sn) => (
            <SoundRow key={sn.id} item={sn} lang={lang} activeBg={activeBg}
              active={notifSound === sn.id} onPick={() => chooseNotifSound(sn.id)}
              playing={previewing === 'n:' + sn.id}
              onPreview={() => previewAsset('n:' + sn.id, sn.id)} accent={accentColor} />
          ))}

          <Text style={styles.label}>{t('at_time_sound')}</Text>
          {NOTIF_SOUNDS.map((sn) => (
            <SoundRow key={sn.id} item={sn} lang={lang} activeBg={activeBg}
              active={adhanNotifSound === sn.id} onPick={() => chooseAdhanNotifSound(sn.id)}
              playing={previewing === 'a:' + sn.id}
              onPreview={() => previewAsset('a:' + sn.id, sn.id)} accent={accentColor} />
          ))}

          <Text style={styles.label}>{t('adhan_sound')}</Text>
          {ADHAN_SOUNDS.map((a) => (
            <View key={a.id} style={[styles.row, adhanSound === a.id && styles.rowActive, adhanSound === a.id && activeBg]}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => chooseAdhan(a.id)}>
                <Text style={[styles.rowText, adhanSound === a.id && styles.rowTextActive]}>
                  {lang === 'ru' ? a.label_ru : a.label_en}
                </Text>
              </TouchableOpacity>
              {a.url && (
                <TouchableOpacity onPress={() => preview(a)} style={styles.previewBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  {loadingId === a.id
                    ? <ActivityIndicator size="small" color={COLORS.accentSoft} />
                    : <Icon name={previewing === a.id ? 'pause' : 'play'}
                        size={16} color={COLORS.accentSoft} />}
                </TouchableOpacity>
              )}
              <Pick active={adhanSound === a.id} color={accentColor} />
            </View>
          ))}

          {/* Smart Fajr alarm */}
          <Text style={styles.subhead}>{t('fajr_alarm')}</Text>
          <View style={styles.row}>
            <TouchableOpacity style={{ flex: 1 }}
              onPress={async () => {
                const v = !alarmOn; setAlarmOn(v); await setFajrAlarmEnabled(v);
                if (!v) await cancelFajrAlarm();
                onFajrAlarmChange && onFajrAlarmChange();
              }}>
              <Text style={styles.rowText}>{t('fajr_alarm')}</Text>
              <Text style={styles.hintText}>{t('fajr_alarm_hint')}</Text>
            </TouchableOpacity>
            {alarmOn && <Icon name="check" size={17} color={COLORS.white} />}
          </View>
          {alarmOn && (
            <View style={styles.intervalRow}>
              <Text style={styles.hintText}>{t('fajr_interval')}: </Text>
              {[3, 5, 10, 15].map((m) => (
                <TouchableOpacity key={m}
                  style={[styles.intChip, alarmInt === m && styles.intChipActive]}
                  onPress={async () => { setAlarmInt(m); await setFajrAlarmInterval(m); onFajrAlarmChange && onFajrAlarmChange(); }}>
                  <Text style={[styles.intText, alarmInt === m && styles.intTextActive]}>{m} {t('min_short')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Section>

        {/* ===== APPEARANCE ===== */}
        <Section id="appearance" icon="options" title={t("sec_appearance")}
          open={openSection === 'appearance'} onToggle={toggle}>

          {/* Темы по группам: живые отдельно от картин. Общего заголовка
              «Узор» над ними нет — узоров в приложении больше нет, а группы
              и так подписаны. */}
          {PATTERN_GROUPS.map((g) => (
            <View key={g.kind}>
              <Text style={styles.label}>{t(g.title)}</Text>
              <Grid>
                {PATTERNS.filter((p) => g.kinds.includes(p.kind)).map((p) => (
                  <Cell key={p.id} active={pattern === p.id} onPress={() => choosePattern(p.id)}
                    style={pattern === p.id && activeBg}>
                    <Text style={[styles.cellText, pattern === p.id && styles.cellTextActive]} {...FIT}>
                      {lang === "ru" ? p.label_ru : p.label_en}
                    </Text>
                  </Cell>
                ))}
              </Grid>
            </View>
          ))}

          {/* Параллакс касается только картин: живые темы движутся сами.
              Выключатель нужен потому, что движущийся фон переносят не все,
              а при «Уменьшении движения» в iOS он и так не работает. */}
          <TouchableOpacity style={styles.row}
            onPress={() => toggleParallax(!parallax)} activeOpacity={0.8}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText}>{t('parallax')}</Text>
              <Text style={styles.hintText}>{t('parallax_hint')}</Text>
            </View>
            {parallax && <Icon name="check" size={17} color={COLORS.white} />}
          </TouchableOpacity>

          {/* Кнопка схемы окрашена её же фоном: подпись без образца ничего не
              говорит. «Свой цвет» — такой же, только фон собран из выбранного
              цвета; по нажатию открывается палитра. */}
          <Text style={styles.label}>{t("color_scheme")}</Text>
          <Grid>
            {SCHEMES.map((s) => (
              <Cell key={s.id} active={scheme === s.id} onPress={() => chooseScheme(s.id)}
                style={[styles.schemeCell, { backgroundColor: s.bg[0], borderColor: scheme === s.id ? s.accent : 'rgba(255,255,255,0.12)' }]}>
                <View style={[styles.schemeDot, { backgroundColor: s.accent }]} />
                <Text style={[styles.cellText, scheme === s.id && styles.cellTextActive]} {...FIT}>
                  {lang === "ru" ? s.label_ru : s.label_en}
                </Text>
              </Cell>
            ))}
            <Cell active={scheme === 'custom'} onPress={() => setPickerOpen(true)}
              style={[styles.schemeCell, { backgroundColor: makeScheme(customColor).bg[0],
                borderColor: scheme === 'custom' ? customColor : 'rgba(255,255,255,0.12)' }]}>
              <View style={[styles.schemeDot, { backgroundColor: customColor }]} />
              <Text style={[styles.cellText, scheme === 'custom' && styles.cellTextActive]} {...FIT}>
                {t('custom_color')}
              </Text>
            </Cell>
          </Grid>

          <ColorPicker visible={pickerOpen} value={customColor} t={t}
            onCancel={() => setPickerOpen(false)}
            onDone={(hex) => { setPickerOpen(false); chooseCustomColor(hex); }} />

          {/* Шрифт интерфейса; шрифт для чтения выбирается в настройках чтения.
              Образец набран самим шрифтом. */}
          <Text style={styles.label}>{t("font_ui")}</Text>
          <Grid>
            {UI_FONTS.map((f) => (
              <Cell key={f.id} active={uiFont === f.id} onPress={() => chooseUiFont(f.id)}
                style={[styles.fontCell, uiFont === f.id && activeBg]}>
                <Text style={[styles.fontSample, { fontFamily: f.family }]} numberOfLines={1} adjustsFontSizeToFit>Аа 12</Text>
                <Text style={[styles.fontName, { fontFamily: f.family }, uiFont === f.id && styles.cellTextActive]} {...FIT}>
                  {lang === "ru" ? f.label_ru : f.label_en}
                </Text>
              </Cell>
            ))}
          </Grid>

        </Section>

        {/* ===== GENERAL ===== */}
        <Section id="general" icon="settings" title={t("sec_general")}
          open={openSection === 'general'} onToggle={toggle}>
          <Text style={styles.label}>{t('language')}</Text>
          <Opt label="English" active={lang === 'en'} onPress={() => setLang('en')} activeBg={activeBg} accent={accentColor} />
          <Opt label="Русский" active={lang === 'ru'} onPress={() => setLang('ru')} activeBg={activeBg} accent={accentColor} />

          {/* Поправка хиджры: месяц начинают по наблюдению молодого месяца,
              а таблица считает арифметикой, поэтому расхождение в день-другой
              — норма, а не сбой. Пусть человек выровняет по своей мечети. */}
          <Text style={styles.label}>{t('hijri_offset')}</Text>
          <View style={styles.intervalRow}>
            {[-2, -1, 0, 1, 2].map((v) => (
              <TouchableOpacity key={v}
                style={[styles.intChip, hijriOffset === v && styles.intChipActive]}
                onPress={() => chooseHijriOffset(v)}>
                <Text style={[styles.intText, hijriOffset === v && styles.intTextActive]}>
                  {v > 0 ? '+' + v : String(v)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

      <TouchableOpacity style={styles.doneBtn} onPress={close}>
        <Text style={styles.doneText}>{t('save')}</Text>
      </TouchableOpacity>
    </DraggableSheet>
  );
}

const styles = StyleSheet.create({
  title: { ...TYPE.title, color: COLORS.text, fontWeight: '800', marginBottom: SPACING.md },
  section: { marginBottom: SPACING.sm, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' },
  // gap разводит иконку, заголовок и шеврон; заголовок тянется и прижимает
  // шеврон к правому краю без space-between, который ломался с тремя детьми.
  sectionHead: { flexDirection: 'row', alignItems: 'center',
    gap: SPACING.sm, padding: SPACING.md },
  sectionTitle: { ...TYPE.subhead, color: COLORS.white, fontWeight: "700", flex: 1 },
  sectionBody: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  label: { ...TYPE.overline, color: COLORS.accentSoft,
    marginTop: SPACING.md, marginBottom: SPACING.sm },

  segment: { flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill, padding: 3, marginBottom: SPACING.sm },
  segBtn: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: RADIUS.pill },
  segBtnActive: { backgroundColor: COLORS.surfaceActive },
  segText: { ...TYPE.caption, color: COLORS.textMuted, fontWeight: '600' },
  segTextActive: { color: COLORS.white, fontWeight: '700' },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface },
  rowActive: { backgroundColor: COLORS.surfaceActive },
  // Кольцо с точкой вместо галочки: в списке из десяти строк галочка одного
  // веса с текстом и теряется среди букв.
  pick: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center',
    marginLeft: SPACING.sm },
  pickDot: { width: 9, height: 9, borderRadius: 4.5 },
  rowText: { ...TYPE.body, color: COLORS.text },
  rowTextActive: { color: COLORS.white, fontWeight: '700' },
  check: { ...TYPE.subhead, color: COLORS.white, fontWeight: '900', marginLeft: SPACING.sm },

  // Круглая кнопка вместо подписи «Прослушать»: значка достаточно,
  // а квадрат 34 точки удобнее попадается пальцем, чем текстовая плашка.
  previewBtn: { width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surfaceStrong },
  previewText: { ...TYPE.caption, color: COLORS.accentSoft, fontWeight: '600' },

  goalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  goalChip: { width: 50, height: 50, borderRadius: 25, alignItems: 'center',
    justifyContent: 'center', backgroundColor: COLORS.surface },
  goalChipActive: { backgroundColor: COLORS.accent },
  goalText: { ...TYPE.body, color: COLORS.text, fontWeight: '700' },
  goalTextActive: { color: COLORS.navy },

  tuneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: SPACING.xs },
  tuneName: { ...TYPE.body, color: COLORS.text },
  tuneCtrl: { flexDirection: 'row', alignItems: 'center' },
  tuneBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceStrong,
    alignItems: 'center', justifyContent: 'center' },
  tuneBtnText: { ...TYPE.heading, color: COLORS.white, fontWeight: '700' },
  tuneBtnOff: { opacity: 0.35 },
  // Ширина под самое длинное значение («+30 мин»): число между кнопками не
  // двигает «+» и «−», цифры одной ширины (mono).
  tuneVal: { ...TYPE.body, ...TYPE.mono, color: COLORS.white, width: 76, textAlign: 'center' },
  tuneReset: { alignSelf: 'flex-start', marginTop: SPACING.sm },

  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -SPACING.xs / 2 - 1, marginBottom: SPACING.md },
  cell: { width: '33.33%', padding: SPACING.xs / 2 + 1 },
  // Высота задана жёстко, а не минимумом: все кнопки сетки одного роста,
  // что бы ни было внутри — точка схемы, подпись короткая или длинная.
  // Рамка одной толщины у выбранной и обычной: иначе выбор сдвигал подпись.
  cellBtn: { height: 46, borderRadius: RADIUS.md, paddingHorizontal: SPACING.sm,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)' },
  cellBtnActive: { borderColor: 'rgba(255,255,255,0.55)' },
  // Пиксельный шрифт моноширинный и на треть шире системного: длинная
  // подпись ужимается (FIT), но не переносится и не обрезается многоточием.
  cellText: { ...TYPE.caption, fontSize: 13, color: COLORS.text, textAlign: 'center', flexShrink: 1 },
  cellTextActive: { color: COLORS.white, fontWeight: '700' },
  schemeCell: { flexDirection: 'row', justifyContent: 'flex-start', gap: SPACING.xs },
  fontCell: { height: 64 },
  fontSample: { fontSize: 17, color: COLORS.white },
  fontName: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 2 },
  themeChip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill, backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent' },
  themeChipActive: { backgroundColor: COLORS.surfaceActive, borderColor: COLORS.glassBorder },
  themeText: { ...TYPE.callout, color: COLORS.text },
  themeTextActive: { color: COLORS.white, fontWeight: '700' },
  // Чип схемы показывает сам цвет: подпись без образца ничего не говорит.
  schemeChip: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill, borderWidth: StyleSheet.hairlineWidth },
  schemeChipActive: { borderWidth: 2 },
  schemeDot: { width: 8, height: 8, borderRadius: 4 },

  opacityRow: { flexDirection: 'row', gap: SPACING.sm },
  opacityDot: { width: 46, height: 46, borderRadius: 23, alignItems: 'center',
    justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.glassBorder },
  opacityDotActive: { borderColor: COLORS.white, borderWidth: 2 },
  opacityNum: { ...TYPE.caption, color: COLORS.text, fontWeight: '700' },

  doneBtn: { backgroundColor: COLORS.accent, borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.lg },
  doneText: { ...TYPE.subhead, color: COLORS.navy, fontWeight: '800' },

  subhead: { ...TYPE.overline, color: COLORS.textMuted,
    marginTop: SPACING.md, marginBottom: SPACING.xs },
  hintText: { ...TYPE.caption, color: COLORS.textMuted, marginTop: SPACING.xxs },

  intervalRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    gap: SPACING.sm, marginTop: SPACING.xs, marginBottom: SPACING.xs },
  intChip: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: 14,
    backgroundColor: COLORS.surfaceStrong, borderWidth: 1, borderColor: COLORS.hairline },
  intChipActive: { backgroundColor: 'rgba(255,255,255,0.22)', borderColor: 'rgba(255,255,255,0.5)' },
  intText: { ...TYPE.caption, color: COLORS.textMuted },
  intTextActive: { color: COLORS.white, fontWeight: '700' },
});

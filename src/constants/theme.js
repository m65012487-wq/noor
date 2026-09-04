// Дизайн-система приложения.
//
// Правило: экраны не изобретают значения. Кегли, отступы, радиусы и цвета
// берутся отсюда — иначе интерфейс расползается, как это уже было:
// двадцать два разных размера шрифта и девять цветов мимо палитры.

export const COLORS = {
  // Акценты — мягкое серебро и лазурь, без золота.
  accent: '#e8eef2',
  accentSoft: '#bcd3e0',
  accentDeep: '#8fb8cd',

  azure: '#7fb4cc',
  azureDeep: '#3d6b85',
  cream: '#f3efe6',
  white: '#ffffff',
  navy: '#16263b',
  navyDeep: '#0e1a2a',

  // Текст
  textOnDark: '#f3efe6',
  text: '#eef4f7',
  textMuted: '#a8bcc8',
  textFaint: 'rgba(238,244,247,0.55)',

  // Состояния. Раньше эти цвета были вписаны прямо в экраны.
  success: '#4caf72',
  warning: '#ffce5a',
  danger: '#ff6b6b',
  dangerDeep: '#c0563f',

  // Стеклянные поверхности. Одно значение на роль, а не десять близких.
  glassTint: 'rgba(180, 215, 230, 0.10)',
  glassBorder: 'rgba(255, 255, 255, 0.22)',
  glassBorderSoft: 'rgba(255, 255, 255, 0.14)',
  surface: 'rgba(255,255,255,0.06)',
  surfaceStrong: 'rgba(255,255,255,0.10)',
  surfaceActive: 'rgba(180,215,230,0.18)',
  hairline: 'rgba(255,255,255,0.15)',
  scrim: 'rgba(14,26,42,0.55)',
};

export const SPACING = { xxs: 2, xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const RADIUS = { sm: 10, md: 20, lg: 28, pill: 999 };

// Типографическая шкала. Восемь ролей вместо двадцати двух кеглей.
// Экраны подмешивают их через spread: { ...TYPE.caption, color: ... }.
export const TYPE = {
  hero:     { fontSize: 46, fontWeight: '800', letterSpacing: -0.5 },
  display:  { fontSize: 36, fontWeight: '800', letterSpacing: -0.3 },
  title:    { fontSize: 28, fontWeight: '700' },
  heading:  { fontSize: 22, fontWeight: '700' },
  subhead:  { fontSize: 18, fontWeight: '600' },
  body:     { fontSize: 16, fontWeight: '400' },
  callout:  { fontSize: 14, fontWeight: '400' },
  caption:  { fontSize: 12, fontWeight: '400', letterSpacing: 0.3 },
  // Надзаголовок: разрядка и капитель. Часто использовался вручную.
  overline: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  // Цифры времени: моноширинные, чтобы не прыгали при обратном отсчёте.
  mono:     { fontVariant: ['tabular-nums'] },
};

// Арабский требует собственных кеглей и щедрого межстрочного:
// диакритика не должна цепляться за соседнюю строку.
export const ARABIC = {
  sm:  { fontSize: 24, lineHeight: 46 },
  md:  { fontSize: 30, lineHeight: 56 },
  lg:  { fontSize: 34, lineHeight: 64 },
  xl:  { fontSize: 44, lineHeight: 80 },
};

// Арабский рисуется системным шрифтом: на iOS это SF Arabic.
// Если положить Amiri-Regular.ttf и Amiri-Bold.ttf в assets/fonts и загрузить
// их в App.js, достаточно вернуть сюда 'Amiri' — остальной код не изменится.
export const FONTS = { arabic: undefined, arabicBold: undefined };

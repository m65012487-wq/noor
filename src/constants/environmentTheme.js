// bg — тёмные тона неба (верх) и земли (низ), снятые с самих фоновых картин:
// затемнение для читаемости тогда сливается с картиной, а не ложится вуалью.
// Three environment themes, each with the same family of four daytime phases.
// Only the palette changes between themes; the shape stays identical to the
// old LIGHT_STATES so every consumer (gradients, veils, atmosphere tints)
// keeps working unchanged.
export const THEMES = {
  winter: {
    label_ru: 'Сад Тасбиха · Зима', label_en: 'Tasbih garden · Winter',
    phases: {
      dawn: { bg: ['#273644', '#25302f'], tint: '209,224,230', accent: '#f3e5c9', atmosphere: '#d5b79b', imageOpacity: 1, veil: 0.12, light: 0.12 },
      day: { bg: ['#203749', '#243834'], tint: '205,227,231', accent: '#e5f1ed', atmosphere: '#b5d5df', imageOpacity: 1, veil: 0.10, light: 0.08 },
      sunset: { bg: ['#30303d', '#283332'], tint: '229,217,208', accent: '#f2dfbd', atmosphere: '#c29a7c', imageOpacity: 1, veil: 0.15, light: 0.18 },
      night: { bg: ['#071b30', '#112632'], tint: '184,211,228', accent: '#daeaf2', atmosphere: '#22486a', imageOpacity: 1, veil: 0.18, light: 0.06 },
    },
  },
  garden: {
    label_ru: 'Тихий сад', label_en: 'Quiet garden',
    phases: {
      dawn: { bg: ['#2f282c', '#1b1a18'], tint: '188,209,194', accent: '#e5d8bd', atmosphere: '#9f9275', imageOpacity: 0.72, veil: 0.20, light: 0.16 },
      day: { bg: ['#1f3138', '#1c1b17'], tint: '193,215,192', accent: '#e1ead3', atmosphere: '#8aa28c', imageOpacity: 0.80, veil: 0.12, light: 0.09 },
      sunset: { bg: ['#292e2e', '#1c1a17'], tint: '211,202,174', accent: '#ead9b6', atmosphere: '#b69b72', imageOpacity: 0.68, veil: 0.24, light: 0.20 },
      night: { bg: ['#11222c', '#0f1314'], tint: '160,192,181', accent: '#d3e1d6', atmosphere: '#153b3c', imageOpacity: 0.42, veil: 0.46, light: 0.04 },
    },
  },
  oasis: {
    label_ru: 'Оазис', label_en: 'Oasis',
    phases: {
      dawn: { bg: ['#28282f', '#1d1816'], tint: '223,204,168', accent: '#f0d9a0', atmosphere: '#c9a26a', imageOpacity: 0.74, veil: 0.20, light: 0.18 },
      day: { bg: ['#1e2d39', '#1e1915'], tint: '196,224,214', accent: '#dff2e6', atmosphere: '#7fb6ac', imageOpacity: 0.82, veil: 0.10, light: 0.08 },
      sunset: { bg: ['#232d34', '#1e1815'], tint: '232,196,150', accent: '#f2c98a', atmosphere: '#c67d43', imageOpacity: 0.70, veil: 0.26, light: 0.22 },
      night: { bg: ['#11212c', '#111212'], tint: '170,195,210', accent: '#d7e4ef', atmosphere: '#1c3550', imageOpacity: 0.42, veil: 0.48, light: 0.05 },
    },
  },
  highlands: {
    label_ru: 'Горный сад', label_en: 'Highlands',
    phases: {
      dawn: { bg: ['#362721', '#1d1f14'], tint: '200,214,206', accent: '#dfe8d8', atmosphere: '#8fa08f', imageOpacity: 0.72, veil: 0.22, light: 0.15 },
      day: { bg: ['#282e2f', '#1d1f14'], tint: '205,222,212', accent: '#e5efdf', atmosphere: '#8fae9c', imageOpacity: 0.80, veil: 0.11, light: 0.08 },
      sunset: { bg: ['#3a2d1d', '#1d1f14'], tint: '220,200,180', accent: '#ecd8b8', atmosphere: '#b48f6c', imageOpacity: 0.68, veil: 0.24, light: 0.19 },
      night: { bg: ['#14222a', '#0f1511'], tint: '160,190,195', accent: '#cfe1e2', atmosphere: '#16333c', imageOpacity: 0.40, veil: 0.48, light: 0.04 },
    },
  },
};

// Kept as an alias so old callers that reached for the garden palette directly
// keep working; new code should go through THEMES[theme].phases instead.
export const LIGHT_STATES = THEMES.garden.phases;

export const THEME_BACKGROUNDS = {
  winter: {
    dawn: require('../../assets/tasbih/winter/winter_morning.jpg'),
    day: require('../../assets/tasbih/winter/winter_day.jpg'),
    sunset: require('../../assets/tasbih/winter/winter_evening.jpg'),
    night: require('../../assets/tasbih/winter/winter_night.jpg'),
  },
  garden: {
    dawn: require('../../assets/tasbih/themes/garden/dawn.jpg'),
    day: require('../../assets/tasbih/themes/garden/day.jpg'),
    sunset: require('../../assets/tasbih/themes/garden/sunset.jpg'),
    night: require('../../assets/tasbih/themes/garden/night.jpg'),
  },
  oasis: {
    dawn: require('../../assets/tasbih/themes/oasis/dawn.jpg'),
    day: require('../../assets/tasbih/themes/oasis/day.jpg'),
    sunset: require('../../assets/tasbih/themes/oasis/sunset.jpg'),
    night: require('../../assets/tasbih/themes/oasis/night.jpg'),
  },
  highlands: {
    dawn: require('../../assets/tasbih/themes/highlands/dawn.jpg'),
    day: require('../../assets/tasbih/themes/highlands/day.jpg'),
    sunset: require('../../assets/tasbih/themes/highlands/sunset.jpg'),
    night: require('../../assets/tasbih/themes/highlands/night.jpg'),
  },
};

export function lightStateAt(date = new Date()) {
  const hour = date.getHours();
  return hour >= 4 && hour < 7 ? 'dawn' : hour >= 7 && hour < 17 ? 'day' : hour >= 17 && hour < 20 ? 'sunset' : 'night';
}
export const ENVIRONMENT = {
  treeAnchor: { x: 0.5, y: 0.90 },
  gateWidthRatio: 0.24,
  stageTransitionMs: 1600,
  gateTransitionMs: 1800,
  debug: false,
};
export const GLASS_MATERIAL = { tintOpacity: 0.10, borderOpacity: 0.19, highlightOpacity: 0.22 };
export const GARDEN_COLORS = { stone: '#a8aca0', stoneDark: '#626f64', iron: '#284139', ironLight: '#9aa996', leaf: '#6f876a', leafLight: '#a4b19a', earth: '#39493a', path: '#aaa993', light: '#e5ce9a' };

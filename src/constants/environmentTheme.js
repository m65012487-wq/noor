// One family of materials; only the atmosphere changes during the day.
export const LIGHT_STATES = {
  dawn: { bg: ['#243f3b', '#142824'], tint: '188,209,194', accent: '#e5d8bd', atmosphere: '#9f9275', imageOpacity: 0.72, veil: 0.20, light: 0.16 },
  day: { bg: ['#294b44', '#172f28'], tint: '193,215,192', accent: '#e1ead3', atmosphere: '#8aa28c', imageOpacity: 0.80, veil: 0.12, light: 0.09 },
  sunset: { bg: ['#33433a', '#1c2c25'], tint: '211,202,174', accent: '#ead9b6', atmosphere: '#b69b72', imageOpacity: 0.68, veil: 0.24, light: 0.20 },
  night: { bg: ['#102a29', '#091b19'], tint: '160,192,181', accent: '#d3e1d6', atmosphere: '#153b3c', imageOpacity: 0.42, veil: 0.46, light: 0.04 },
};
export function lightStateAt(date = new Date()) {
  const hour = date.getHours();
  return hour >= 4 && hour < 7 ? 'dawn' : hour >= 7 && hour < 17 ? 'day' : hour >= 17 && hour < 20 ? 'sunset' : 'night';
}
export const ENVIRONMENT = {
  treeAnchor: { x: 0.5, y: 0.90 },
  gateWidthRatio: 0.18,
  stageTransitionMs: 1600,
  gateTransitionMs: 1400,
  debug: false,
};
export const GLASS_MATERIAL = { tintOpacity: 0.10, borderOpacity: 0.19, highlightOpacity: 0.22 };
export const GARDEN_COLORS = { stone: '#a8aca0', stoneDark: '#626f64', iron: '#284139', ironLight: '#9aa996', leaf: '#6f876a', leafLight: '#a4b19a', earth: '#39493a', path: '#aaa993', light: '#e5ce9a' };

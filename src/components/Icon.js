import React from 'react';
import { Platform } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';

// Единый словарь значков приложения.
//
// До этого значки жили тремя разными способами: PNG-глифы в панели вкладок,
// Ionicons на экранах и тонированные картинки в списках. Размеры и оптический
// вес не совпадали, и панель выглядела чужой рядом с содержимым.
//
// На iOS рисуем системными SF Symbols: они совпадают по весу с системным
// шрифтом, поддерживают анимацию и на iOS 26 корректно сидят на Liquid Glass.
// На Android остаётся Ionicons — соответствие подобрано по смыслу, а не по виду.
export const ICONS = {
  // Вкладки
  prayer:    { sf: 'moon.stars',        ion: 'moon-outline' },
  qibla:     { sf: 'safari',            ion: 'compass-outline' },
  quran:     { sf: 'book.closed',       ion: 'book-outline' },
  read:      { sf: 'flame',             ion: 'flame-outline' },

  // Действия
  settings:  { sf: 'gearshape',         ion: 'settings-outline' },
  close:     { sf: 'xmark',             ion: 'close' },
  back:      { sf: 'chevron.left',      ion: 'chevron-back' },
  forward:   { sf: 'chevron.right',     ion: 'chevron-forward' },
  down:      { sf: 'chevron.down',      ion: 'chevron-down' },
  up:        { sf: 'chevron.up',        ion: 'chevron-up' },
  search:    { sf: 'magnifyingglass',   ion: 'search' },
  location:  { sf: 'location',          ion: 'location-outline' },
  bookmark:  { sf: 'bookmark',          ion: 'bookmark-outline' },
  play:      { sf: 'play.fill',         ion: 'play' },
  pause:     { sf: 'pause.fill',        ion: 'pause' },
  speaker:   { sf: 'speaker.wave.2',    ion: 'volume-medium-outline' },
  bell:      { sf: 'bell',              ion: 'notifications-outline' },
  bellOff:   { sf: 'bell.slash',        ion: 'notifications-off-outline' },
  check:     { sf: 'checkmark',         ion: 'checkmark' },
  star:      { sf: 'star.fill',         ion: 'star' },
  download:  { sf: 'arrow.down.circle', ion: 'download-outline' },
  refresh:   { sf: 'arrow.clockwise',   ion: 'refresh' },
  info:      { sf: 'info.circle',       ion: 'information-circle-outline' },
};

const IS_IOS = Platform.OS === 'ios';

export default function Icon({
  name, size = 22, color, weight = 'regular', style, animate,
}) {
  const entry = ICONS[name];
  if (!entry) return null;

  if (IS_IOS) {
    return (
      <SymbolView
        name={entry.sf}
        size={size}
        tintColor={color}
        weight={weight}
        resizeMode="scaleAspectFit"
        animationSpec={animate ? { effect: { type: animate } } : undefined}
        style={[{ width: size, height: size }, style]}
      />
    );
  }

  return <Ionicons name={entry.ion} size={size} color={color} style={style} />;
}

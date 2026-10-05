// Нативная цель WidgetKit. React Native виджеты не рисует: iOS требует
// отдельное расширение на SwiftUI, поэтому оно живёт здесь и собирается
// вместе с приложением при prebuild.
//
// App Group взята из профиля подписи: расширение и приложение обмениваются
// данными только через общий контейнер, и его идентификатор обязан входить
// в оба provisioning-профиля.
module.exports = {
  type: 'widget',
  // Имя обязано отличаться от имени приложения: при совпадении Xcode
  // получает две команды, порождающие один и тот же промежуточный файл,
  // и сборка падает на «Multiple commands produce».
  name: 'NoorWidget',
  entitlements: {
    'com.apple.security.application-groups': ['group.95233b59e7e45aab.1'],
  },
  // Фон на всю площадь (containerBackground) и отсчёт до намаза — iOS 17.
  deploymentTarget: '17.0',
  // Силуэты горизонта Krea-2 (scripts/tasbih_assets/build_v5.py): белые с
  // альфой, SwiftUI красит их цветом схемы приложения. Пути — от этой папки.
  images: {
    horizonWide: '../../assets/widget/horizon-wide.png',
    horizonSquare: '../../assets/widget/horizon-square.png',
  },
};

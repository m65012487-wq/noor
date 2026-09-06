// Нативная цель WidgetKit. React Native виджеты не рисует: iOS требует
// отдельное расширение на SwiftUI, поэтому оно живёт здесь и собирается
// вместе с приложением при prebuild.
//
// App Group взята из профиля подписи: расширение и приложение обмениваются
// данными только через общий контейнер, и его идентификатор обязан входить
// в оба provisioning-профиля.
module.exports = {
  type: 'widget',
  name: 'Noor',
  entitlements: {
    'com.apple.security.application-groups': ['group.95233b59e7e45aab.1'],
  },
};

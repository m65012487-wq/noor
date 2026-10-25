Pod::Spec.new do |s|
  s.name           = 'NoorAlarm'
  s.version        = '1.0.0'
  s.summary        = 'AlarmKit bridge for the Noor Fajr alarm'
  s.description    = 'Schedules system alarms (iOS 26 AlarmKit) for the Fajr wake-up.'
  s.author         = 'Noor'
  s.homepage       = 'https://github.com/m65012487-wq/noor'
  s.license        = 'MIT'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # AlarmKit есть только с iOS 26: слабая ссылка, чтобы на старых системах
  # приложение запускалось, а модуль просто сообщал, что не поддерживается.
  s.weak_frameworks = 'AlarmKit'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
  s.source_files = '**/*.{h,m,swift}'
end

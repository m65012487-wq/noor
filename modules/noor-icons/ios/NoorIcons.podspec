Pod::Spec.new do |s|
  s.name = 'NoorIcons'
  s.version = '1.0.0'
  s.summary = 'Alternate Home Screen icons for Noor'
  s.author = 'Noor'
  s.homepage = 'https://github.com/m65012487-wq/noor'
  s.license = 'MIT'
  s.platforms = { :ios => '15.1' }
  s.source = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
end

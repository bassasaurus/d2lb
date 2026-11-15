Pod::Spec.new do |s|
  s.name = 'TailnumberOcr'
  s.version = '1.0.0'
  s.summary = 'Offline registration recognition'
  s.description = 'On-device Apple Vision text recognition for Direct2Logbook.'
  s.license = { :type => 'UNLICENSED' }
  s.author = 'Direct2Logbook'
  s.homepage = 'https://direct2logbook.com'
  s.source = { :git => 'https://github.com/bassasaurus/d2lb.git' }
  s.platform = :ios, '16.4'
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Vision', 'UIKit', 'ImageIO'
  s.source_files = '**/*.swift'
end

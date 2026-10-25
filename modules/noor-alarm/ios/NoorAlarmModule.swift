import ExpoModulesCore
#if canImport(AlarmKit)
import AlarmKit
import ActivityKit
import SwiftUI
#endif

// Настоящий будильник для Фаджра через AlarmKit (iOS 26): звенит в беззвучном
// режиме и в фокусе «Сон», показывает экран будильника с кнопкой «Стоп», как
// штатные «Часы». Обратного отсчёта нет, поэтому Live Activity не нужна.
//
// Будильники Noor — только будильники на Фаджр, поэтому «снять все» снимает
// все будильники приложения в AlarmKit.

#if canImport(AlarmKit)
@available(iOS 26.0, *)
struct NoorAlarmData: AlarmMetadata {}

@available(iOS 26.0, *)
enum NoorAlarmKit {
  static func authorize() async -> String {
    let manager = AlarmManager.shared
    switch manager.authorizationState {
    case .authorized: return "authorized"
    case .denied: return "denied"
    case .notDetermined:
      do {
        let state = try await manager.requestAuthorization()
        return state == .authorized ? "authorized" : "denied"
      } catch {
        return "denied"
      }
    @unknown default: return "denied"
    }
  }

  static func schedule(at date: Date, title: String, stop: String, sound: String?) async throws -> String {
    let id = UUID()
    let stopButton = AlarmButton(
      text: LocalizedStringResource(stringLiteral: stop),
      textColor: .white,
      systemImageName: "sun.horizon.fill")
    let alert = AlarmPresentation.Alert(
      title: LocalizedStringResource(stringLiteral: title),
      stopButton: stopButton)
    let attributes = AlarmAttributes<NoorAlarmData>(
      presentation: AlarmPresentation(alert: alert),
      tintColor: Color(red: 0.78, green: 1.0, blue: 0.51))
    let alertSound: AlertConfiguration.AlertSound = sound.map { .named($0) } ?? .default
    let configuration = AlarmManager.AlarmConfiguration<NoorAlarmData>(
      schedule: .fixed(date),
      attributes: attributes,
      sound: alertSound)
    _ = try await AlarmManager.shared.schedule(id: id, configuration: configuration)
    return id.uuidString
  }

  static func cancel(_ ids: [String]) {
    for raw in ids {
      guard let id = UUID(uuidString: raw) else { continue }
      try? AlarmManager.shared.cancel(id: id)
    }
  }

  static func cancelAll() {
    let alarms = (try? AlarmManager.shared.alarms) ?? []
    for alarm in alarms {
      try? AlarmManager.shared.cancel(id: alarm.id)
    }
  }

  static func count() -> Int {
    ((try? AlarmManager.shared.alarms) ?? []).count
  }
}
#endif

public class NoorAlarmModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NoorAlarm")

    Function("isSupported") { () -> Bool in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) { return true }
      #endif
      return false
    }

    // "authorized" | "denied" | "unsupported"
    AsyncFunction("authorize") { () async -> String in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) { return await NoorAlarmKit.authorize() }
      #endif
      return "unsupported"
    }

    // Один будильник на момент timeMs (миллисекунды Unix). Возвращает id.
    AsyncFunction("schedule") { (timeMs: Double, title: String, stop: String, sound: String?) async throws -> String in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        return try await NoorAlarmKit.schedule(
          at: Date(timeIntervalSince1970: timeMs / 1000), title: title, stop: stop, sound: sound)
      }
      #endif
      throw NSError(domain: "NoorAlarm", code: 1, userInfo: [NSLocalizedDescriptionKey: "AlarmKit needs iOS 26"])
    }

    Function("cancel") { (ids: [String]) in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) { NoorAlarmKit.cancel(ids) }
      #endif
    }

    Function("cancelAll") {
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) { NoorAlarmKit.cancelAll() }
      #endif
    }

    Function("count") { () -> Int in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) { return NoorAlarmKit.count() }
      #endif
      return 0
    }
  }
}

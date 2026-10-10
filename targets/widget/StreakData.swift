import Foundation
import SwiftUI

// Снимок ударного режима, который кладёт приложение (widgetBridge.publishStreak).
// Решение «горит ли огонёк» виджет принимает сам, по своим часам: снимок может
// пролежать в контейнере, пока человек не откроет приложение.
struct StreakData: Codable {
    let count: Int
    let lastGoalDay: String?
    let today: String
    let read: Int
    let goal: Int
    let history: [String]
    // Брони серии: каждая продлевает жизнь серии ещё на сутки (streakFreeze.js).
    // Поле необязательное: снимок от прежней версии приложения его не содержит.
    let freezes: Int?

    static func load() -> StreakData? {
        guard
            let defaults = UserDefaults(suiteName: PrayerDay.appGroup),
            let raw = defaults.string(forKey: "streak:v1"),
            let data = raw.data(using: .utf8)
        else { return nil }
        return try? JSONDecoder().decode(StreakData.self, from: data)
    }

    // Пример для галереи виджетов: огонёк горит 12 дней, сегодня 3 из 5. Даты
    // считаются от «сейчас»: иначе from() признал бы пример погасшим.
    static var placeholder: StreakData {
        let now = Date()
        let day = { (offset: Int) in dayKey(Calendar.current.date(byAdding: .day, value: -offset, to: now) ?? now) }
        return StreakData(count: 12, lastGoalDay: day(1), today: day(0), read: 3, goal: 5,
                          history: [1, 2, 4, 5, 6].map(day), freezes: 1)
    }
}

// Что показывать. Правило то же, что в приложении (ReadingScreen.countAyah):
// цель засчитывается, если с прошлого выполненного дня прошло не больше двух
// суток плюс по суткам на каждую бронь; иначе огонёк сгорает и счёт начинается
// заново.
struct StreakStatus {
    let days: Int          // сколько дней горит огонёк сейчас (0 — погас)
    let readToday: Int
    let goal: Int
    let doneToday: Bool
    let lastChance: Bool   // сегодня последний день, чтобы не сгорел
    let lost: Bool         // был огонёк, но сгорел
    let week: [Bool]       // семь дней, последний — сегодня

    var progress: Double { goal > 0 ? min(1, Double(readToday) / Double(goal)) : 0 }

    static func from(_ data: StreakData?, now: Date) -> StreakStatus {
        let today = dayKey(now)
        guard let data else {
            return StreakStatus(days: 0, readToday: 0, goal: 5, doneToday: false, lastChance: false, lost: false,
                                week: Array(repeating: false, count: 7))
        }
        let gap = data.lastGoalDay.flatMap { daysBetween($0, now) }
        // Правило то же, что в приложении (streakFreeze.js): двое суток бесплатно,
        // дальше — по одной броне на лишние сутки.
        let limit = 2 + min(2, max(0, data.freezes ?? 0))
        let alive = gap.map { $0 <= limit } ?? false
        let done = data.lastGoalDay == today
        let week = (0..<7).reversed().map { offset -> Bool in
            guard let date = Calendar.current.date(byAdding: .day, value: -offset, to: now) else { return false }
            return data.history.contains(dayKey(date))
        }
        return StreakStatus(
            days: alive ? data.count : 0,
            readToday: data.today == today ? data.read : 0,
            goal: max(1, data.goal),
            doneToday: done,
            lastChance: !done && gap == limit,
            lost: data.count > 0 && !alive && data.lastGoalDay != nil,
            week: week
        )
    }
}

func dayKey(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.string(from: date)
}

// Целые дни от даты-ключа до сегодняшнего дня по местному календарю.
func daysBetween(_ key: String, _ now: Date) -> Int? {
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "yyyy-MM-dd"
    guard let date = formatter.date(from: key) else { return nil }
    let calendar = Calendar.current
    return calendar.dateComponents([.day], from: calendar.startOfDay(for: date), to: calendar.startOfDay(for: now)).day
}

// Цвета схемы приложения и язык (widgetBridge.publishTheme).
struct ThemeData: Codable {
    let top: String
    let bottom: String
    let accent: String
    let lang: String?

    static func load() -> ThemeData {
        guard
            let defaults = UserDefaults(suiteName: PrayerDay.appGroup),
            let raw = defaults.string(forKey: "theme:v1"),
            let data = raw.data(using: .utf8),
            let theme = try? JSONDecoder().decode(ThemeData.self, from: data)
        else { return .fallback }
        return theme
    }

    static let fallback = ThemeData(top: "#1b2430", bottom: "#0d131b", accent: "#c8d6e2", lang: "ru")

    var ru: Bool { (lang ?? "ru") == "ru" }
    var topColor: Color { Color(hex: top) }
    var bottomColor: Color { Color(hex: bottom) }
    var accentColor: Color { Color(hex: accent) }
}

extension Color {
    init(hex: String) {
        let clean = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var value: UInt64 = 0
        Scanner(string: clean).scanHexInt64(&value)
        let r = Double((value >> 16) & 0xff) / 255
        let g = Double((value >> 8) & 0xff) / 255
        let b = Double(value & 0xff) / 255
        self.init(red: r, green: g, blue: b)
    }
}

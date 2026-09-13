import Foundation

// Срез расписания, который приложение кладёт в общий контейнер.
// Виджет ничего не вычисляет сам: время намаза зависит от метода расчёта,
// координат и ручных поправок, и дублировать эту логику на Swift значило бы
// заводить второй источник правды, который однажды разойдётся с первым.
struct PrayerEntryData: Codable {
    let key: String
    let name: String
    let time: String
}

struct PrayerDay: Codable {
    let date: String
    let city: String
    let times: [PrayerEntryData]
    let nextKey: String?
    var timezone: String? = nil
    var tomorrowTimes: [PrayerEntryData]? = nil

    static let appGroup = "group.95233b59e7e45aab.1"
    static let storageKey = "prayerDay"

    static func load(at date: Date = Date()) -> PrayerDay? {
        guard
            let defaults = UserDefaults(suiteName: appGroup),
            let raw = defaults.string(forKey: "prayerWindow:v2"),
            let data = raw.data(using: .utf8)
        else { return nil }
        guard let days = try? JSONDecoder().decode([PrayerDay].self, from: data) else { return nil }
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        let key = formatter.string(from: date)
        guard var day = days.first(where: { $0.date == key }),
              day.timezone == nil || day.timezone == TimeZone.current.identifier else { return nil }
        if let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: date) {
            day.tomorrowTimes = days.first(where: { $0.date == formatter.string(from: tomorrow) })?.times
        }
        return day
    }

    static let empty = PrayerDay(date: "", city: "Noor", times: [], nextKey: nil)

    // Показывается, пока приложение ни разу не записало расписание —
    // и в галерее виджетов, где реальных данных нет по определению.
    static let placeholder = PrayerDay(
        date: "",
        city: "—",
        times: [
            PrayerEntryData(key: "Fajr", name: "Фаджр", time: "04:12"),
            PrayerEntryData(key: "Sunrise", name: "Восход", time: "05:48"),
            PrayerEntryData(key: "Dhuhr", name: "Зухр", time: "12:30"),
            PrayerEntryData(key: "Asr", name: "Аср", time: "16:05"),
            PrayerEntryData(key: "Maghrib", name: "Магриб", time: "19:12"),
            PrayerEntryData(key: "Isha", name: "Иша", time: "20:42"),
        ],
        nextKey: "Dhuhr"
    )
}

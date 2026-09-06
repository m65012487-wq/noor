import WidgetKit
import SwiftUI

struct PrayerEntry: TimelineEntry {
    let date: Date
    let day: PrayerDay
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> PrayerEntry {
        PrayerEntry(date: Date(), day: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) {
        let day = context.isPreview ? PrayerDay.placeholder : (PrayerDay.load() ?? .placeholder)
        completion(PrayerEntry(date: Date(), day: day))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
        let day = PrayerDay.load() ?? .placeholder
        let now = Date()

        // Точки обновления — сами времена намазов: между ними виджету нечего
        // пересчитывать, а лишние пробуждения система всё равно урежет.
        var dates: [Date] = []
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        formatter.timeZone = TimeZone.current
        let calendar = Calendar.current

        for item in day.times {
            guard let parsed = formatter.date(from: item.time) else { continue }
            let parts = calendar.dateComponents([.hour, .minute], from: parsed)
            guard let at = calendar.date(
                bySettingHour: parts.hour ?? 0, minute: parts.minute ?? 0, second: 0, of: now
            ), at > now else { continue }
            dates.append(at)
        }

        // Хвост на завтра: без него виджет замер бы после последнего намаза.
        if let tomorrow = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: now)) {
            dates.append(tomorrow)
        }

        let entries = ([now] + dates.sorted()).map { PrayerEntry(date: $0, day: day) }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

// Ближайший намаз по времени. Восход в счёт не идёт: он не молитва,
// а конец времени фаджра, и подписывать его как «следующий намаз» неверно.
func upcoming(in day: PrayerDay, now: Date = Date()) -> PrayerEntryData? {
    let formatter = DateFormatter()
    formatter.dateFormat = "HH:mm"
    let calendar = Calendar.current

    for item in day.times where item.key != "Sunrise" {
        guard let parsed = formatter.date(from: item.time) else { continue }
        let parts = calendar.dateComponents([.hour, .minute], from: parsed)
        guard let at = calendar.date(
            bySettingHour: parts.hour ?? 0, minute: parts.minute ?? 0, second: 0, of: now
        ) else { continue }
        if at > now { return item }
    }
    return day.times.first { $0.key != "Sunrise" }
}

// Ближайшие несколько молитв подряд, с переходом на завтра.
// Без переноса вечером список обрывался: после ночной молитвы в сутках
// ничего не остаётся, и виджет показывал одну строку.
func upcomingList(in day: PrayerDay, count: Int, now: Date = Date()) -> [PrayerEntryData] {
    let prayers = day.times.filter { $0.key != "Sunrise" }
    guard !prayers.isEmpty else { return [] }

    let formatter = DateFormatter()
    formatter.dateFormat = "HH:mm"
    let calendar = Calendar.current

    var startIndex = 0
    for (index, item) in prayers.enumerated() {
        guard let parsed = formatter.date(from: item.time) else { continue }
        let parts = calendar.dateComponents([.hour, .minute], from: parsed)
        guard let at = calendar.date(
            bySettingHour: parts.hour ?? 0, minute: parts.minute ?? 0, second: 0, of: now
        ) else { continue }
        if at > now { startIndex = index; break }
        startIndex = (index + 1) % prayers.count
    }

    return (0..<min(count, prayers.count)).map { prayers[(startIndex + $0) % prayers.count] }
}

// MARK: - Экран блокировки

// accessoryRectangular — единственное семейство на locked-экране, где помещается
// связный текст: примерно три строки. Показываем три ближайшие молитвы, первую
// выделяя: виджет должен отвечать на вопрос «когда», а не просто называть время.
struct LockView: View {
    let day: PrayerDay

    var body: some View {
        let items = upcomingList(in: day, count: 3)
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(items.enumerated()), id: \.offset) { index, item in
                HStack(spacing: 4) {
                    if index == 0 {
                        Image(systemName: "moon.stars")
                            .font(.caption2)
                    }
                    Text(item.name)
                        .font(index == 0 ? .headline : .caption)
                    Spacer(minLength: 2)
                    Text(item.time)
                        .font(index == 0 ? .headline : .caption)
                        .monospacedDigit()
                }
                .opacity(index == 0 ? 1 : 0.7)
            }
        }
        .widgetURL(URL(string: "noor://prayer"))
    }
}

// MARK: - Домашний экран

struct HomeView: View {
    let day: PrayerDay
    @Environment(\.widgetFamily) private var family

    var body: some View {
        let next = upcoming(in: day)

        // Все времена помещаются и в малый квадрат: шесть строк мелким
        // кеглем читаются, а виджет с одним намазом заставляет открывать
        // приложение ради остальных — то есть не выполняет свою работу.
        VStack(spacing: family == .systemSmall ? 1 : 3) {
            if family != .systemSmall {
                HStack {
                    Text(day.city)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                    Spacer(minLength: 0)
                }
                .padding(.bottom, 2)
            }

            ForEach(day.times, id: \.key) { item in
                let isNext = item.key == next?.key
                HStack(spacing: 4) {
                    Text(item.name)
                        .font(family == .systemSmall
                              ? .system(size: 12, design: .rounded)
                              : .system(.subheadline, design: .rounded))
                        .fontWeight(isNext ? .bold : .regular)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                    Spacer(minLength: 4)
                    Text(item.time)
                        .font(family == .systemSmall
                              ? .system(size: 12, design: .rounded)
                              : .system(.subheadline, design: .rounded))
                        .fontWeight(isNext ? .bold : .regular)
                        .monospacedDigit()
                }
                // Восход приглушён: он в списке для ориентира,
                // а не как время молитвы.
                .foregroundStyle(item.key == "Sunrise" ? .secondary : .primary)
            }
        }
    }
}

struct NoorWidget: Widget {
    let kind = "NoorWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            Group {
                if #available(iOS 16.0, *) {
                    WidgetFamilySwitch(day: entry.day)
                } else {
                    HomeView(day: entry.day)
                }
            }
            .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Namaz")
        .description("Prayer times for the day.")
        .supportedFamilies(supported())
    }

    private func supported() -> [WidgetFamily] {
        if #available(iOS 16.0, *) {
            return [.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular]
        }
        return [.systemSmall, .systemMedium, .systemLarge]
    }
}

// Разводит семейства: на locked-экране своя вёрстка, на домашнем своя.
@available(iOS 16.0, *)
struct WidgetFamilySwitch: View {
    let day: PrayerDay
    @Environment(\.widgetFamily) private var family

    var body: some View {
        if family == .accessoryRectangular {
            LockView(day: day)
        } else {
            HomeView(day: day)
        }
    }
}

@main
struct NoorWidgetBundle: WidgetBundle {
    var body: some Widget {
        NoorWidget()
    }
}

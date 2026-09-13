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
        let day = context.isPreview ? PrayerDay.placeholder : (PrayerDay.load() ?? .empty)
        completion(PrayerEntry(date: Date(), day: day))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
        let now = Date()
        let calendar = Calendar.current
        var dates = [now]
        for offset in 0..<8 {
            guard let date = calendar.date(byAdding: .day, value: offset, to: calendar.startOfDay(for: now)) else { continue }
            if date > now { dates.append(date) }
            guard let day = PrayerDay.load(at: date) else { continue }
            for item in day.times {
                let parts = item.time.split(separator: ":").compactMap { Int($0) }
                guard parts.count == 2,
                      let at = calendar.date(bySettingHour: parts[0], minute: parts[1], second: 0, of: date),
                      at > now else { continue }
                dates.append(at)
            }
        }
        let entries = dates.sorted().map { PrayerEntry(date: $0, day: PrayerDay.load(at: $0) ?? .empty) }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

// Ближайший намаз по времени. Восход в счёт не идёт: он не молитва,
// а конец времени фаджра, и подписывать его как «следующий намаз» неверно.
func upcoming(in day: PrayerDay, now: Date = Date()) -> PrayerEntryData? {
    upcomingList(in: day, count: 1, now: now).first
}

func upcomingList(in day: PrayerDay, count: Int, now: Date = Date()) -> [PrayerEntryData] {
    let calendar = Calendar.current
    let remaining = day.times.filter { item in
        guard item.key != "Sunrise" else { return false }
        let parts = item.time.split(separator: ":").compactMap { Int($0) }
        guard parts.count == 2,
              let at = calendar.date(bySettingHour: parts[0], minute: parts[1], second: 0, of: now) else { return false }
        return at > now
    }
    let tomorrow = (day.tomorrowTimes ?? []).filter { $0.key != "Sunrise" }
    return Array((remaining + tomorrow).prefix(count))
}

// MARK: - Экран блокировки

// accessoryRectangular — единственное семейство на locked-экране, где помещается
// связный текст: примерно три строки. Показываем три ближайшие молитвы, первую
// выделяя: виджет должен отвечать на вопрос «когда», а не просто называть время.
struct LockView: View {
    let day: PrayerDay
    let now: Date

    var body: some View {
        let items = upcomingList(in: day, count: 3, now: now)
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
    let now: Date
    @Environment(\.widgetFamily) private var family

    var body: some View {
        let next = upcoming(in: day, now: now)

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
                if entry.day.times.isEmpty {
                    Text("Откройте Noor, чтобы обновить расписание")
                        .font(.caption)
                        .widgetURL(URL(string: "noor://prayer"))
                } else {
                if #available(iOS 16.0, *) {
                    WidgetFamilySwitch(day: entry.day, now: entry.date)
                } else {
                    HomeView(day: entry.day, now: entry.date)
                }
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
    let now: Date
    @Environment(\.widgetFamily) private var family

    var body: some View {
        if family == .accessoryRectangular {
            LockView(day: day, now: now)
        } else {
            HomeView(day: day, now: now)
        }
    }
}

@main
struct NoorWidgetBundle: WidgetBundle {
    var body: some Widget {
        NoorWidget()
    }
}

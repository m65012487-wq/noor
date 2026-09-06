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

// MARK: - Экран блокировки

// accessoryRectangular — единственное семейство на locked-экране, где помещается
// связный текст: примерно три строки. Показываем ближайший намаз и две
// соседние строки расписания, чтобы виджет отвечал на вопрос «когда»,
// а не просто называл время.
struct LockView: View {
    let day: PrayerDay

    var body: some View {
        let next = upcoming(in: day)
        VStack(alignment: .leading, spacing: 1) {
            HStack(spacing: 4) {
                Image(systemName: "moon.stars")
                    .font(.caption2)
                Text(next?.name ?? "—")
                    .font(.headline)
                Spacer(minLength: 0)
                Text(next?.time ?? "--:--")
                    .font(.headline)
                    .monospacedDigit()
            }
            ForEach(rest(), id: \.key) { item in
                HStack(spacing: 4) {
                    Text(item.name)
                        .font(.caption2)
                    Spacer(minLength: 0)
                    Text(item.time)
                        .font(.caption2)
                        .monospacedDigit()
                }
            }
        }
        .widgetURL(URL(string: "noor://prayer"))
    }

    // Две ближайшие строки после текущей: больше на экране блокировки
    // не помещается, а обрезанный список читается как сбой.
    private func rest() -> [PrayerEntryData] {
        guard let next = upcoming(in: day),
              let index = day.times.firstIndex(where: { $0.key == next.key })
        else { return [] }
        let tail = day.times.dropFirst(index + 1)
        return Array(tail.prefix(2))
    }
}

// MARK: - Домашний экран

struct HomeView: View {
    let day: PrayerDay
    @Environment(\.widgetFamily) private var family

    var body: some View {
        let next = upcoming(in: day)

        if family == .systemSmall {
            VStack(alignment: .leading, spacing: 2) {
                Text(next?.name ?? "—")
                    .font(.system(.headline, design: .rounded))
                Text(next?.time ?? "--:--")
                    .font(.system(size: 34, weight: .light, design: .rounded))
                    .monospacedDigit()
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
                Spacer(minLength: 0)
                Text(day.city)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        } else {
            // Средний и большой размеры показывают весь день целиком:
            // ради этого виджет и ставят на домашний экран.
            VStack(spacing: 3) {
                ForEach(day.times, id: \.key) { item in
                    let isNext = item.key == next?.key
                    HStack {
                        Text(item.name)
                            .font(.system(.subheadline, design: .rounded))
                            .fontWeight(isNext ? .bold : .regular)
                        Spacer(minLength: 8)
                        Text(item.time)
                            .font(.system(.subheadline, design: .rounded))
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

import WidgetKit
import SwiftUI

// Виджет Noor: ближайший намаз с обратным отсчётом и ударный режим чтения.
// Цвета — схемы приложения (ThemeData), фон — силуэт горизонта Krea-2,
// окрашенный цветом схемы, как сцены на обоях в самом приложении.

struct NoorEntry: TimelineEntry {
    let date: Date
    let day: PrayerDay
    let streak: StreakStatus
    let theme: ThemeData
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> NoorEntry {
        NoorEntry(date: Date(), day: .placeholder, streak: .from(.placeholder, now: Date()), theme: .fallback)
    }

    func getSnapshot(in context: Context, completion: @escaping (NoorEntry) -> Void) {
        let now = Date()
        if context.isPreview {
            completion(placeholder(in: context))
            return
        }
        completion(NoorEntry(date: now, day: PrayerDay.load() ?? .empty,
                             streak: .from(StreakData.load(), now: now), theme: ThemeData.load()))
    }

    // Записи — на каждое время намаза и на каждую полночь: в полночь меняется
    // и день расписания, и состояние огонька (цель на новый день ещё не выполнена).
    func getTimeline(in context: Context, completion: @escaping (Timeline<NoorEntry>) -> Void) {
        let now = Date()
        let calendar = Calendar.current
        let streak = StreakData.load()
        let theme = ThemeData.load()
        var dates = [now]
        // С вчерашнего дня: Иша после полуночи записана в его строке, а
        // наступает сегодня. Прошедшее отсекает проверка at > now ниже.
        for offset in -1..<8 {
            guard let date = calendar.date(byAdding: .day, value: offset, to: calendar.startOfDay(for: now)) else { continue }
            if date > now { dates.append(date) }
            guard let day = PrayerDay.load(at: date) else { continue }
            for item in day.times {
                guard let at = clock(item.time, on: date, shift: item.dayShift), at > now else { continue }
                dates.append(at)
            }
        }
        let entries = dates.sorted().map { date in
            NoorEntry(date: date, day: PrayerDay.load(at: date) ?? .empty,
                      streak: .from(streak, now: date), theme: theme)
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

// «HH:mm» в дату заданного дня; shift сдвигает сутки (−1, 0, +1) для времён,
// которые график записал за полуночью своей строки.
func clock(_ time: String, on day: Date, shift: Int = 0) -> Date? {
    let parts = time.split(separator: ":").compactMap { Int($0) }
    guard parts.count == 2 else { return nil }
    let base = shift == 0 ? day : (Calendar.current.date(byAdding: .day, value: shift, to: day) ?? day)
    return Calendar.current.date(bySettingHour: parts[0], minute: parts[1], second: 0, of: base)
}

struct UpcomingPrayer {
    let item: PrayerEntryData
    let at: Date
}

// Ближайшие намазы по времени, с завтрашними за полночью. Восход в счёт не
// идёт: он не молитва, а конец времени фаджра.
func upcomingPrayers(in day: PrayerDay, count: Int, now: Date) -> [UpcomingPrayer] {
    let calendar = Calendar.current
    let today = day.times.compactMap { item -> UpcomingPrayer? in
        guard item.key != "Sunrise", let at = clock(item.time, on: now, shift: item.dayShift), at > now else { return nil }
        return UpcomingPrayer(item: item, at: at)
    }
    let tomorrowDate = calendar.date(byAdding: .day, value: 1, to: now) ?? now
    let tomorrow = (day.tomorrowTimes ?? []).compactMap { item -> UpcomingPrayer? in
        guard item.key != "Sunrise", let at = clock(item.time, on: tomorrowDate, shift: item.dayShift) else { return nil }
        return UpcomingPrayer(item: item, at: at)
    }
    let yesterdayDate = calendar.date(byAdding: .day, value: -1, to: now) ?? now
    let yesterday = (day.yesterdayTimes ?? []).compactMap { item -> UpcomingPrayer? in
        guard item.key != "Sunrise", item.dayShift > 0,
              let at = clock(item.time, on: yesterdayDate, shift: item.dayShift), at > now else { return nil }
        return UpcomingPrayer(item: item, at: at)
    }
    // Со сдвигом суток порядок строк уже не совпадает с порядком времени.
    return Array((yesterday + today + tomorrow).sorted { $0.at < $1.at }.prefix(count))
}

// MARK: - Строки

struct Words {
    let ru: Bool
    var next: String { ru ? "Следующий" : "Next" }
    var daysInRow: String { ru ? "дней подряд" : "day streak" }
    var goalDone: String { ru ? "Цель на сегодня выполнена" : "Today's goal is done" }
    var lastChance: String { ru ? "Последний день — не дайте огоньку погаснуть" : "Last day to keep the flame alive" }
    var lost: String { ru ? "Огонёк погас — начните заново" : "The flame went out — start again" }
    var openApp: String { ru ? "Откройте Noor, чтобы обновить расписание" : "Open Noor to update prayer times" }
    func today(_ read: Int, _ goal: Int) -> String {
        ru ? "Сегодня \(read) из \(goal) аятов" : "Today \(read) of \(goal) ayahs"
    }
}

// MARK: - Детали

let ember = Color(red: 0.95, green: 0.64, blue: 0.37)

struct Backdrop: View {
    let theme: ThemeData
    let wide: Bool
    let strength: Double

    var body: some View {
        ZStack(alignment: .bottom) {
            LinearGradient(colors: [theme.topColor, theme.bottomColor], startPoint: .top, endPoint: .bottom)
            Image(wide ? "horizonWide" : "horizonSquare")
                .resizable()
                .renderingMode(.template)
                .aspectRatio(contentMode: .fit)
                .foregroundStyle(theme.accentColor.opacity(strength))
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
        }
    }
}

// Огонёк: горит янтарём, когда цель на сегодня выполнена; цветом схемы, когда
// счёт жив, но сегодня ещё не читали; бледный, когда погас.
struct Flame: View {
    let streak: StreakStatus
    let theme: ThemeData
    let size: CGFloat

    var body: some View {
        Image(systemName: streak.days > 0 || streak.doneToday ? "flame.fill" : "flame")
            .font(.system(size: size, weight: .semibold))
            .foregroundStyle(streak.doneToday ? ember : (streak.days > 0 ? theme.accentColor : Color.white.opacity(0.45)))
            .widgetAccentable()
    }
}

struct Ring: View {
    let progress: Double
    let color: Color
    let line: CGFloat

    var body: some View {
        ZStack {
            Circle().stroke(Color.white.opacity(0.16), lineWidth: line)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(color, style: StrokeStyle(lineWidth: line, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
    }
}

// Огонёк в кольце сегодняшней цели.
struct FlameRing: View {
    let streak: StreakStatus
    let theme: ThemeData
    let diameter: CGFloat

    var body: some View {
        ZStack {
            Ring(progress: streak.progress, color: streak.doneToday ? ember : theme.accentColor, line: diameter * 0.1)
            Flame(streak: streak, theme: theme, size: diameter * 0.42)
        }
        .frame(width: diameter, height: diameter)
    }
}

struct WeekDots: View {
    let streak: StreakStatus
    let theme: ThemeData
    let dot: CGFloat

    var body: some View {
        HStack(spacing: dot * 0.55) {
            ForEach(Array(streak.week.enumerated()), id: \.offset) { index, done in
                let isToday = index == streak.week.count - 1
                Circle()
                    .fill(done ? (isToday ? ember : theme.accentColor) : Color.white.opacity(0.14))
                    .overlay(Circle().stroke(isToday && !done ? theme.accentColor : .clear, lineWidth: 1.2))
                    .frame(width: dot, height: dot)
            }
        }
    }
}

struct StatusLine: View {
    let streak: StreakStatus
    let theme: ThemeData
    let words: Words

    var body: some View {
        Text(text)
            .font(.system(.caption2, design: .rounded).weight(streak.lastChance ? .semibold : .regular))
            .foregroundStyle(streak.lastChance ? ember : Color.white.opacity(0.72))
            .lineLimit(2)
            .minimumScaleFactor(0.85)
    }

    private var text: String {
        if streak.doneToday { return words.goalDone }
        if streak.lastChance { return words.lastChance }
        if streak.lost { return words.lost }
        return words.today(streak.readToday, streak.goal)
    }
}

// Text(timerInterval:) занимает всю доступную ширину, поэтому край, к которому
// прижаты цифры, задаём явно.
struct Countdown: View {
    let to: Date
    let now: Date
    let theme: ThemeData
    var alignment: Alignment = .leading

    var body: some View {
        if to > now {
            Text(timerInterval: now...to, countsDown: true)
                .font(.system(.caption, design: .rounded).weight(.medium))
                .monospacedDigit()
                .foregroundStyle(theme.accentColor)
                .multilineTextAlignment(alignment == .trailing ? .trailing : .leading)
                .frame(maxWidth: .infinity, alignment: alignment)
        }
    }
}

// MARK: - Размеры

struct SmallView: View {
    let entry: NoorEntry
    var words: Words { Words(ru: entry.theme.ru) }

    var body: some View {
        let next = upcomingPrayers(in: entry.day, count: 1, now: entry.date).first
        VStack(alignment: .leading, spacing: 0) {
            if let next {
                Text(next.item.name)
                    .font(.system(.subheadline, design: .rounded).weight(.semibold))
                    .foregroundStyle(Color.white.opacity(0.85))
                    .lineLimit(1)
                Text(next.item.time)
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.white)
                    .minimumScaleFactor(0.7)
                Countdown(to: next.at, now: entry.date, theme: entry.theme)
            }
            Spacer(minLength: 0)
            HStack(spacing: 7) {
                FlameRing(streak: entry.streak, theme: entry.theme, diameter: 30)
                VStack(alignment: .leading, spacing: -2) {
                    Text("\(entry.streak.days)")
                        .font(.system(.title3, design: .rounded).weight(.bold))
                        .foregroundStyle(.white)
                    Text(words.daysInRow)
                        .font(.system(size: 10, design: .rounded))
                        .foregroundStyle(Color.white.opacity(0.7))
                        .lineLimit(1)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct MediumView: View {
    let entry: NoorEntry
    var words: Words { Words(ru: entry.theme.ru) }

    var body: some View {
        let list = upcomingPrayers(in: entry.day, count: 3, now: entry.date)
        HStack(alignment: .top, spacing: 14) {
            VStack(alignment: .leading, spacing: 1) {
                if let next = list.first {
                    Text("\(words.next) · \(next.item.name)")
                        .font(.system(.caption, design: .rounded).weight(.semibold))
                        .foregroundStyle(Color.white.opacity(0.8))
                        .lineLimit(1)
                    Text(next.item.time)
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.white)
                    Countdown(to: next.at, now: entry.date, theme: entry.theme)
                }
                Spacer(minLength: 4)
                ForEach(Array(list.dropFirst().enumerated()), id: \.offset) { _, item in
                    HStack {
                        Text(item.item.name).lineLimit(1)
                        Spacer(minLength: 4)
                        Text(item.item.time).monospacedDigit()
                    }
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(Color.white.opacity(0.75))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    FlameRing(streak: entry.streak, theme: entry.theme, diameter: 34)
                    VStack(alignment: .leading, spacing: -2) {
                        Text("\(entry.streak.days)")
                            .font(.system(.title2, design: .rounded).weight(.bold))
                            .foregroundStyle(.white)
                        Text(words.daysInRow)
                            .font(.system(size: 10, design: .rounded))
                            .foregroundStyle(Color.white.opacity(0.7))
                    }
                }
                WeekDots(streak: entry.streak, theme: entry.theme, dot: 9)
                StatusLine(streak: entry.streak, theme: entry.theme, words: words)
                Spacer(minLength: 0)
            }
            .frame(width: 128, alignment: .leading)
        }
    }
}

struct LargeView: View {
    let entry: NoorEntry
    var words: Words { Words(ru: entry.theme.ru) }

    var body: some View {
        let next = upcomingPrayers(in: entry.day, count: 1, now: entry.date).first
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text(entry.day.city)
                    .font(.system(.caption, design: .rounded).weight(.semibold))
                    .foregroundStyle(Color.white.opacity(0.75))
                    .lineLimit(1)
                if let next {
                    Countdown(to: next.at, now: entry.date, theme: entry.theme, alignment: .trailing)
                }
            }

            VStack(spacing: 3) {
                ForEach(entry.day.times, id: \.key) { item in
                    let isNext = item.key == next?.item.key
                    HStack {
                        Text(item.name).lineLimit(1)
                        Spacer(minLength: 4)
                        Text(item.time).monospacedDigit()
                    }
                    .font(.system(isNext ? .headline : .subheadline, design: .rounded).weight(isNext ? .bold : .regular))
                    .foregroundStyle(item.key == "Sunrise" ? Color.white.opacity(0.55) : .white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, isNext ? 5 : 3)
                    .background(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(isNext ? entry.theme.accentColor.opacity(0.22) : Color.clear)
                    )
                }
            }

            Spacer(minLength: 0)

            HStack(spacing: 10) {
                FlameRing(streak: entry.streak, theme: entry.theme, diameter: 40)
                VStack(alignment: .leading, spacing: 2) {
                    HStack(alignment: .firstTextBaseline, spacing: 5) {
                        Text("\(entry.streak.days)")
                            .font(.system(.title2, design: .rounded).weight(.bold))
                            .foregroundStyle(.white)
                        Text(words.daysInRow)
                            .font(.system(.caption, design: .rounded))
                            .foregroundStyle(Color.white.opacity(0.7))
                    }
                    StatusLine(streak: entry.streak, theme: entry.theme, words: words)
                }
                Spacer(minLength: 4)
                WeekDots(streak: entry.streak, theme: entry.theme, dot: 10)
            }
            .padding(10)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Color.black.opacity(0.22))
            )
        }
    }
}

// Экран блокировки: три строки — намаз со временем, отсчёт, огонёк с прогрессом.
struct LockRectangularView: View {
    let entry: NoorEntry

    var body: some View {
        let next = upcomingPrayers(in: entry.day, count: 1, now: entry.date).first
        VStack(alignment: .leading, spacing: 0) {
            if let next {
                HStack(spacing: 4) {
                    Image(systemName: "moon.stars.fill").font(.caption2)
                    Text(next.item.name).font(.headline).lineLimit(1)
                    Spacer(minLength: 2)
                    Text(next.item.time).font(.headline).monospacedDigit()
                }
                if next.at > entry.date {
                    Text(timerInterval: entry.date...next.at, countsDown: true)
                        .font(.caption)
                        .monospacedDigit()
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            HStack(spacing: 3) {
                Image(systemName: entry.streak.days > 0 ? "flame.fill" : "flame")
                Text("\(entry.streak.days)")
                Text("· \(entry.streak.readToday)/\(entry.streak.goal)")
                    .opacity(0.75)
            }
            .font(.caption)
        }
    }
}

struct LockCircularView: View {
    let entry: NoorEntry

    var body: some View {
        Gauge(value: entry.streak.progress) {
            Image(systemName: "flame.fill")
        } currentValueLabel: {
            Text("\(entry.streak.days)")
        }
        .gaugeStyle(.accessoryCircular)
    }
}

struct NoorEntryView: View {
    let entry: NoorEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        content
            .widgetURL(URL(string: "noor://prayer"))
            .containerBackground(for: .widget) {
                switch family {
                case .accessoryRectangular, .accessoryCircular, .accessoryInline:
                    Color.clear
                case .systemLarge:
                    Backdrop(theme: entry.theme, wide: true, strength: 0.32)
                case .systemMedium:
                    Backdrop(theme: entry.theme, wide: true, strength: 0.34)
                default:
                    Backdrop(theme: entry.theme, wide: false, strength: 0.42)
                }
            }
    }

    @ViewBuilder
    private var content: some View {
        switch family {
        case .accessoryCircular:
            LockCircularView(entry: entry)
        case .accessoryRectangular:
            if entry.day.times.isEmpty {
                Text(Words(ru: entry.theme.ru).openApp).font(.caption)
            } else {
                LockRectangularView(entry: entry)
            }
        default:
            if entry.day.times.isEmpty {
                Text(Words(ru: entry.theme.ru).openApp)
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(.white)
            } else if family == .systemSmall {
                SmallView(entry: entry)
            } else if family == .systemLarge {
                LargeView(entry: entry)
            } else {
                MediumView(entry: entry)
            }
        }
    }
}

struct NoorWidget: Widget {
    let kind = "NoorWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            NoorEntryView(entry: entry)
        }
        .configurationDisplayName("Noor")
        .description("Prayer times and your reading streak.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryCircular])
    }
}

@main
struct NoorWidgetBundle: WidgetBundle {
    var body: some Widget {
        NoorWidget()
    }
}

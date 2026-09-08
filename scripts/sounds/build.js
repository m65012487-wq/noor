// Генератор коротких звуков уведомлений.
//
//   node scripts/sounds/build.js
//
// Звуки синтезируются, а не скачиваются: у файлов из сети неясная лицензия,
// а нужный тембр описывается несколькими строками математики.
//
// Колокол — не одна частота: у него набор негармоничных обертонов, и высокие
// затухают быстрее низких. Именно это отличает колокольчик от писка.
const fs = require('fs');
const path = require('path');

const RATE = 44100;
const OUT = path.join(__dirname, '..', '..', 'assets', 'sounds');

function wav(samples, rate = RATE) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => {
    const clamped = Math.max(-1, Math.min(1, v));
    data.writeInt16LE(Math.round(clamped * 32767), i * 2);
  });

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);   // PCM
  header.writeUInt16LE(1, 22);   // моно
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

/**
 * @param {number}   seconds
 * @param {number[]} partials   отношения частот к основной
 * @param {number[]} decays     скорость затухания каждого обертона
 * @param {number}   base       основная частота, Гц
 * @param {number}   [delay]    задержка второго удара, сек
 */
function bell(seconds, base, partials, decays, delay = 0) {
  const n = Math.floor(RATE * seconds);
  const out = new Float32Array(n);

  const strike = (offset) => {
    for (let i = 0; i < n; i += 1) {
      const t = i / RATE - offset;
      if (t < 0) continue;
      let v = 0;
      partials.forEach((ratio, k) => {
        v += Math.sin(2 * Math.PI * base * ratio * t) * Math.exp(-decays[k] * t) / (k + 1.6);
      });
      // Мягкая атака в первые 4 мс: без неё щелчок в начале слышен отчётливо.
      const attack = Math.min(1, t / 0.004);
      out[i] += v * attack * 0.55;
    }
  };

  strike(0);
  if (delay > 0) strike(delay);
  return Array.from(out);
}

// Будильник. Не колокол, а настойчивый повтор: разбудить должен звук, который
// не сливается с обычным уведомлением и не кончается через две секунды.
//
// iOS обрывает звук уведомления на тридцатой секунде, поэтому длина взята
// впритык — 29 секунд. Частота дискретизации 22 050 вместо 44 100: для двух
// синусоид этого хватает с запасом, а файл выходит вдвое легче.
function alarm() {
  const rate = 22050;
  const seconds = 29;
  const n = Math.floor(rate * seconds);
  const out = new Float32Array(n);
  const cycle = 1.4;      // период всей группы
  const beep = 0.13;      // длительность одного писка
  const gap = 0.09;       // пауза между писками в группе
  const tones = [880, 1174.66, 880];

  for (let i = 0; i < n; i += 1) {
    const t = i / rate;
    const inCycle = t % cycle;
    const idx = Math.floor(inCycle / (beep + gap));
    if (idx >= tones.length) continue;
    const local = inCycle - idx * (beep + gap);
    if (local > beep) continue;
    // Скругление краёв: прямоугольная огибающая даёт щелчок на каждом писке.
    const env = Math.min(1, local / 0.008, (beep - local) / 0.008);
    const f = tones[idx];
    out[i] = (Math.sin(2 * Math.PI * f * t) * 0.8
      + Math.sin(2 * Math.PI * f * 2 * t) * 0.2) * env * 0.85;
  }
  return { samples: Array.from(out), rate };
}

const SOUNDS = {
  // Спокойный двойной удар — основной вариант.
  chime: () => bell(2.0, 880, [1, 2.01, 2.98, 4.12], [3.2, 4.4, 6.0, 8.5], 0.16),
  // Одиночный низкий колокол, глуше и длиннее.
  bell: () => bell(2.4, 523.25, [1, 2.4, 3.2, 5.1], [2.2, 3.4, 4.8, 7.0]),
  // Короткий тихий сигнал для тех, кому колокол избыточен.
  soft: () => bell(1.1, 659.25, [1, 2.0], [5.0, 7.5]),
};

for (const [name, make] of Object.entries(SOUNDS)) {
  const file = path.join(OUT, `${name}.wav`);
  fs.writeFileSync(file, wav(make()));
  const kb = (fs.statSync(file).size / 1024).toFixed(0);
  console.log(name.padEnd(8), kb + ' КБ');
}

// Будильник пишется отдельно: у него своя частота дискретизации.
{
  const { samples, rate } = alarm();
  const file = path.join(OUT, 'alarm.wav');
  fs.writeFileSync(file, wav(samples, rate));
  console.log('alarm'.padEnd(8), (fs.statSync(file).size / 1024).toFixed(0) + ' КБ');
}

// Балафон: западноафриканский ксилофон с деревянными брусками над тыквенными
// резонаторами. Отличается от металлического ксилофона двумя вещами: обертоны
// у бруска негармоничные (примерно 3 и 6 к основному тону, а не 2 и 3), и
// резонатор затянут плёнкой, которая слегка дребезжит. Без дребезга получается
// маримба, без негармоничности — колокольчик.
function balafon() {
  const rate = 44100;
  // Пентатоника: на балафоне она и есть основной строй.
  const notes = [523.25, 622.25, 783.99, 932.33, 1046.5];
  const order = [0, 2, 1, 3, 4];
  const gap = 0.17;
  const seconds = gap * order.length + 1.2;
  const n = Math.floor(rate * seconds);
  const out = new Float32Array(n);

  order.forEach((idx, k) => {
    const f = notes[idx];
    const start = k * gap;
    const partials = [1, 3.0, 5.9];
    const decays = [7, 13, 22];
    for (let i = Math.floor(start * rate); i < n; i += 1) {
      const t = i / rate - start;
      if (t < 0) continue;
      let v = 0;
      partials.forEach((ratio, p) => {
        v += Math.sin(2 * Math.PI * f * ratio * t) * Math.exp(-decays[p] * t) / (p + 1.5);
      });
      // Дребезг плёнки на резонаторе: слабая модуляция, только у верхов.
      v *= 1 + 0.12 * Math.sin(2 * Math.PI * 63 * t) * Math.exp(-9 * t);
      // Стук колотушки: короткий шум в первые пять миллисекунд.
      if (t < 0.005) v += (Math.random() * 2 - 1) * 0.35 * (1 - t / 0.005);
      out[i] += v * Math.min(1, t / 0.002) * 0.5;
    }
  });
  return { samples: Array.from(out), rate };
}

// Птичья трель. Щебет — это быстрый свип частоты, а трель — чередование двух
// близких тонов. Ровный синус на одной частоте звучит писком будильника,
// поэтому каждая фраза начинается свипом и заканчивается трелью.
function birds() {
  const rate = 44100;
  const seconds = 4.2;
  const n = Math.floor(rate * seconds);
  const out = new Float32Array(n);

  const chirp = (start, dur, f0, f1, amp) => {
    for (let i = Math.floor(start * rate); i < Math.min(n, (start + dur) * rate); i += 1) {
      const t = i / rate - start;
      const x = t / dur;
      const f = f0 + (f1 - f0) * x;
      // Огибающая-колокол: резкие края дают щелчок вместо щебета.
      const env = Math.sin(Math.PI * x) ** 1.4;
      out[i] += (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t))
        * env * amp;
    }
  };
  const trill = (start, dur, fa, fb, rateHz, amp) => {
    for (let i = Math.floor(start * rate); i < Math.min(n, (start + dur) * rate); i += 1) {
      const t = i / rate - start;
      const x = t / dur;
      const f = (Math.sin(2 * Math.PI * rateHz * t) > 0) ? fa : fb;
      const env = Math.sin(Math.PI * x) ** 1.2;
      out[i] += Math.sin(2 * Math.PI * f * t) * env * amp;
    }
  };

  chirp(0.05, 0.09, 2600, 3900, 0.30);
  chirp(0.20, 0.07, 3100, 2300, 0.26);
  trill(0.40, 0.34, 3300, 2800, 26, 0.24);
  chirp(0.95, 0.10, 2200, 3600, 0.28);
  trill(1.15, 0.28, 3600, 3050, 30, 0.22);
  chirp(1.70, 0.08, 3000, 2400, 0.24);
  chirp(1.86, 0.08, 2500, 3400, 0.24);
  trill(2.10, 0.40, 3200, 2700, 24, 0.26);
  chirp(2.75, 0.11, 2400, 3800, 0.26);
  trill(2.98, 0.30, 3500, 2900, 28, 0.22);
  chirp(3.45, 0.09, 2900, 2200, 0.22);
  chirp(3.62, 0.12, 2300, 3500, 0.20);
  return { samples: Array.from(out), rate };
}

// Рассвет: мягкий аккорд с медленным нарастанием и редкими далёкими птицами.
// Для Фаджра резкий сигнал не годится — будит рывком, а не будит.
function dawn() {
  const rate = 44100;
  const seconds = 6;
  const n = Math.floor(rate * seconds);
  const out = new Float32Array(n);
  const chord = [261.63, 392.0, 523.25, 659.25];
  for (let i = 0; i < n; i += 1) {
    const t = i / rate;
    let v = 0;
    chord.forEach((f, k) => {
      const enter = k * 0.55;
      if (t < enter) return;
      const u = t - enter;
      v += Math.sin(2 * Math.PI * f * u) * Math.exp(-0.45 * u) / (k + 2);
    });
    out[i] = v * Math.min(1, t / 0.35) * Math.min(1, (seconds - t) / 1.2) * 0.5;
  }
  const chirp = (start, dur, f0, f1, amp) => {
    for (let i = Math.floor(start * rate); i < Math.min(n, (start + dur) * rate); i += 1) {
      const t = i / rate - start;
      const x = t / dur;
      out[i] += Math.sin(2 * Math.PI * (f0 + (f1 - f0) * x) * t) * Math.sin(Math.PI * x) * amp;
    }
  };
  chirp(1.6, 0.09, 2700, 3500, 0.10);
  chirp(2.9, 0.08, 3100, 2500, 0.09);
  chirp(4.3, 0.10, 2500, 3300, 0.08);
  return { samples: Array.from(out), rate };
}

for (const [name, make] of Object.entries({ balafon, birds, dawn })) {
  const { samples, rate } = make();
  const file = path.join(OUT, name + '.wav');
  fs.writeFileSync(file, wav(samples, rate));
  console.log(name.padEnd(8), (fs.statSync(file).size / 1024).toFixed(0) + ' КБ');
}

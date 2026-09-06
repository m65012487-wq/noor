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

function wav(samples) {
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
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
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

const path = require('node:path');
const { Buffer } = require('node:buffer');
const sharp = require('sharp');

// Keep the symbols large enough to recognise at Home Screen size.
const designs = {
  Crescent: ['#233a57', '#101b31', '#e6f3ff', '<path d="M548 242a275 275 0 1 0 233 418A253 253 0 0 1 548 242Z"/><path d="m702 286 21 55 55 21-55 21-21 55-21-55-55-21 55-21Z"/>'],
  Arch: ['#744737', '#382324', '#ffdeaf', '<path fill-rule="evenodd" d="M252 770V546c0-130 94-217 260-310 166 93 260 180 260 310v224H252Zm61-61h398V546c0-94-64-166-199-242-135 76-199 148-199 242v163Z"/><path d="m512 425 21 63 63 21-63 21-21 63-21-63-63-21 63-21Z"/>'],
  Olive: ['#375c48', '#152c27', '#e2efd1', '<path fill="none" stroke="currentColor" stroke-width="39" stroke-linecap="round" d="M315 745c144-76 266-199 385-467"/><path d="M474 625c-124 9-180-72-182-174 101 17 167 72 182 174Zm89-90c-59-99-29-181 62-246 35 96 18 181-62 246Zm-25 94c70-99 154-126 253-88-64 89-156 118-253 88Zm116-171c33-98 96-143 181-143-28 91-92 135-181 143Z"/>'],
};

async function main() {
  for (const [name, [top, bottom, ink, artwork]] of Object.entries(designs)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
      <defs><linearGradient id="bg" x2="0" y2="1">
        <stop stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/>
      </linearGradient></defs>
      <rect width="1024" height="1024" fill="url(#bg)"/>
      <g fill="${ink}" color="${ink}">${artwork}</g>
    </svg>`;
    await sharp(Buffer.from(svg)).flatten({ background: bottom }).png()
      .toFile(path.join(__dirname, '../../assets', `Noor${name}.png`));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });

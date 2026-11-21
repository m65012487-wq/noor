const path = require('node:path');
const { Buffer } = require('node:buffer');
const sharp = require('sharp');

// Keep the symbols large enough to recognise at Home Screen size.
const designs = {
  Crescent: ['#233a57', '#101b31', '#e6f3ff', '<path d="M548 242a275 275 0 1 0 233 418A253 253 0 0 1 548 242Z"/><path d="m702 286 21 55 55 21-55 21-21 55-21-55-55-21 55-21Z"/>'],
  // Keep the existing icon identifiers so iOS preserves a user's choice on update.
  // Arch now renders the Minaret and Olive renders the Qibla compass.
  Arch: ['#40456a', '#1c2038', '#e5ddbc', `
    <g transform="scale(4.876190476)">
      <path d="M62 155h86v10H62zM77 145v-41l11-14v55zm45 0V62l7-13 7 13v83z"/>
      <path d="M89 145v-27c0-12 6-21 16-28 10 7 16 16 16 28v27z" opacity=".76"/>
      <path d="M0-14 4-4 14 0 4 4 0 14-4 4-14 0-4-4Z" transform="translate(81 62) scale(.72)"/>
    </g>`],
  Olive: ['#2a4863', '#172333', '#e4ce9a', `
    <g transform="scale(4.876190476)">
      <circle cx="105" cy="105" r="56" fill="none" stroke="#9db5c4" stroke-width="3"/>
      <path d="m123 69-8 45-29 27 9-45z"/>
      <path d="m86 141 9-45 20 18z" fill="#8eaecc"/>
      <path d="M105 42v13m0 100v13M42 105h13m100 0h13" stroke="#dce8ee" stroke-width="4" stroke-linecap="round"/>
    </g>`],
};

async function main() {
  for (const [name, [top, bottom, ink, artwork]] of Object.entries(designs)) {
    if (process.argv.length > 2 && !process.argv.slice(2).includes(name)) continue;
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

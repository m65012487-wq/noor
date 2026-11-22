const { Buffer } = require('node:buffer');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '../..');
const masters = path.join(root, 'docs/design/tasbih-trees');
const output = path.join(root, 'assets/tasbih/trees5');
const sheets = [
  {
    file: 'orchard.png',
    rows: [
      { species: 'apricot', top: 0, bottom: 265, heights: [30, 46, 78, 105, 119, 130, 135, 138], edges: [0, 170, 310, 450, 606, 823, 1099, 1431, 1774] },
      { species: 'almond', top: 270, bottom: 560, edges: [0, 170, 310, 437, 615, 817, 1099, 1431, 1774] },
      { species: 'mulberry', top: 570, bottom: 865, heights: [30, 46, 78, 108, 124, 135, 141, 143], edges: [0, 170, 310, 440, 606, 802, 1080, 1420, 1774] },
    ],
  },
  {
    file: 'conifers.png',
    rows: [
      { species: 'spruce', top: 0, bottom: 345, edges: [0, 210, 421, 620, 842, 1070, 1308, 1538, 1774],
        heights: [30, 46, 78, 118, 166, 203, 241, 246] },
      { species: 'sequoia', top: 355, bottom: 870, edges: [0, 210, 421, 615, 824, 1040, 1280, 1520, 1774],
        heights: [30, 46, 78, 128, 174, 218, 253, 259] },
    ],
  },
];

const density = 4;
const canvas = { width: 240 * density, height: 300 * density, rootX: 120 * density, groundY: 276 * density };
const defaultHeights = [30, 46, 78, 118, 158, 192, 222, 236];
const maxWidths = [76, 70, 78, 125, 174, 197, 218, 228];

function alphaFromInk(red, green, blue) {
  const luma = 0.213 * red + 0.715 * green + 0.072 * blue;
  // Cream paper stays clear. The ink density carries the foliage layers.
  return Math.round(Math.max(0, Math.min(1, (230 - luma) / 174)) * 255);
}

async function buildStage(source, row, stage) {
  const width = row.edges[stage + 1] - row.edges[stage];
  const height = row.bottom - row.top;
  const pixels = await sharp(source).extract({ left: row.edges[stage], top: row.top, width, height })
    .removeAlpha().raw().toBuffer();
  const pixelsWithAlpha = Buffer.alloc(width * height * 4, 255);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const alpha = alphaFromInk(pixels[index * 3], pixels[index * 3 + 1], pixels[index * 3 + 2]);
      pixelsWithAlpha[index * 4 + 3] = alpha;
      if (alpha >= 26) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < minX) throw new Error(`Empty drawing for ${row.species}/${stage}`);
  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  if (minX < 1 || maxX >= width - 1 || maxY >= height - 1) {
    throw new Error(`Drawing touches crop boundary for ${row.species}/${stage}`);
  }

  // Estimate the trunk centre just above the ground. Narrow stages share the
  // same root location even as their leaves or branches extend to one side.
  const rootRow = maxY - Math.max(2, Math.round(cropHeight * .05));
  let totalAlpha = 0, weightedX = 0;
  for (let x = minX; x <= maxX; x += 1) {
    const alpha = pixelsWithAlpha[(rootRow * width + x) * 4 + 3];
    if (alpha >= 100) { totalAlpha += alpha; weightedX += x * alpha; }
  }
  const rootOffset = stage > 1 && totalAlpha ? weightedX / totalAlpha - minX + .5 : cropWidth / 2;
  const scale = Math.min(
    (row.heights || defaultHeights)[stage] * density / cropHeight,
    maxWidths[stage] * density / cropWidth,
    (canvas.rootX - 4 * density) / Math.max(rootOffset, cropWidth - rootOffset),
  );
  const newWidth = Math.round(cropWidth * scale);
  const newHeight = Math.round(cropHeight * scale);
  const left = Math.round(canvas.rootX - rootOffset * scale);
  const top = canvas.groundY - newHeight;
  const silhouette = await sharp(pixelsWithAlpha, { raw: { width, height, channels: 4 } })
    .extract({ left: minX, top: minY, width: cropWidth, height: cropHeight })
    .resize(newWidth, newHeight, { fit: 'fill' }).png().toBuffer();
  const file = `${row.species}_${stage}.png`;
  await sharp({ create: { width: canvas.width, height: canvas.height, channels: 4, background: '#00000000' } })
    .composite([{ input: silhouette, left, top }])
    .png({ palette: true, colours: 128, dither: 0, compressionLevel: 9 })
    .toFile(path.join(output, file));
  return { file, bounds: { x: left / density, y: top / density, width: newWidth / density, height: newHeight / density } };
}

async function build() {
  const art = [], bounds = [];
  for (const sheet of sheets) {
    const source = fs.readFileSync(path.join(masters, sheet.file));
    const { width, height } = await sharp(source).metadata();
    if (width !== 1774 || height !== 887) throw new Error(`Unexpected sheet size: ${sheet.file}`);
    for (const row of sheet.rows) {
      const images = await Promise.all(row.edges.slice(1).map((_, stage) => buildStage(source, row, stage)));
      const imports = images.map(({ file }) => `    require('../../assets/tasbih/trees5/${file}'),`);
      art.push(`  ${row.species}: [\n${imports.join('\n')}\n  ],`);
      bounds.push(`  ${row.species}: ${JSON.stringify(images.map(image => image.bounds)).replaceAll('"', '')},`);
    }
  }
  fs.writeFileSync(path.join(root, 'src/tasbih/extraTreeArt.js'),
    `// Generated by scripts/tasbih_assets/build-extra-trees.js.\nexport const EXTRA_TREE_ART = {\n${art.join('\n')}\n};\nexport const EXTRA_TREE_BOUNDS = {\n${bounds.join('\n')}\n};\n`);
}
build().catch(error => { console.error(error); process.exitCode = 1; });

"""Validate real files, alpha and the arch opening; create QA-only contact sheets."""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
manifest = json.loads((ROOT / 'tasbih_garden_assets.json').read_text(encoding='utf-8'))
for entry in manifest['files']:
    path = ROOT / entry['file']
    assert path.is_file(), path
    with Image.open(path) as im:
        im.load()
        assert im.size == (entry['width'], entry['height']), path
        assert ('A' in im.getbands()) == entry['alpha'], path
        if entry['alpha']:
            a = im.getchannel('A')
            assert a.getextrema()[0] == 0 and a.getextrema()[1] > 200, path
        if 'arch_winter' in path.name:
            # Safe interior rectangle must be entirely clear, not a painted scene.
            box = (int(im.width*.33), int(im.height*.42), int(im.width*.67), int(im.height*.91))
            # Allow only quantization noise (1/255), never visible scenery.
            assert im.getchannel('A').crop(box).getextrema()[1] <= 1, 'Blocked doorway'
            for xy in [(0, 0), (im.width-1, 0), (0, im.height-1), (im.width-1, im.height-1)]:
                assert im.getchannel('A').getpixel(xy) == 0
olive = [e for e in manifest['files'] if e['role'] == 'runtime-reused']
assert len(olive) == 8 and len({(e['width'], e['height']) for e in olive}) == 1
out = ROOT / 'docs/design/tasbih-winter/qa'
out.mkdir(parents=True, exist_ok=True)
sheet = Image.new('RGB', (960, 600), '#d1d6d0')
for i, entry in enumerate(olive):
    im = Image.open(ROOT / entry['file']).convert('RGBA')
    im.thumbnail((240, 280))
    x, y = (i % 4)*240, (i // 4)*300
    sheet.paste(im, (x+(240-im.width)//2, y), im)
    ImageDraw.Draw(sheet).text((x+8, y+282), f'Stage {i}', fill='black')
sheet.save(out / 'olive-stages.jpg', quality=90)
arch = Image.open(ROOT / 'assets/tasbih/winter/arch_winter.png').convert('RGBA')
arch.thumbnail((300, 450))
sheet = Image.new('RGB', (600, 450), '#edf0ee')
ImageDraw.Draw(sheet).rectangle((300, 0, 600, 450), fill='#132a3c')
sheet.paste(arch, (0, 0), arch)
sheet.paste(arch, (300, 0), arch)
sheet.save(out / 'arch-alpha.jpg', quality=92)
runtime = sum(e['bytes'] for e in manifest['files'] if e['role'] == 'runtime')
print(f'PASS: {len(manifest["files"])} files; clear arch opening; 8 shared olive canvases; new runtime {runtime:,} bytes')

"""Package built-in imagegen masters; never retouch artwork or replace alpha.

Usage: python scripts/tasbih_assets/package_winter.py <generated_images_directory>
"""
import json
import shutil
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCES = {
    'winter_day': 'exec-c861bea9-919a-4718-8911-2cc0f24d77d4.png',
    'winter_morning': 'exec-be1b63d8-03da-4284-88d4-3684d6300943.png',
    'winter_evening': 'exec-ca5464b2-734e-4708-aae7-02076093aba9.png',
    'winter_night': 'exec-bc9cfd01-c926-4423-9e3b-f3e3868d0d5a.png',
    'garden_winter': 'exec-0a9d1ed5-c3b8-41b1-998e-84bf10b5ab2e.png',
    'arch_winter': 'exec-98ef759f-b440-40c9-b880-10637bd631d8.png',
    'olive_ground': 'exec-4aa9c403-09fe-4cfa-b9b0-b9db034083b9.png',
}

def describe(path, role, **extra):
    with Image.open(path) as image:
        image.load()
        return dict(file=str(path.relative_to(ROOT)).replace('\\', '/'),
                    width=image.width, height=image.height, format=image.format,
                    alpha='A' in image.getbands(), bytes=path.stat().st_size,
                    role=role, **extra)

def main():
    generated = Path(sys.argv[1])
    dest = ROOT / 'assets/tasbih/winter'
    masters = ROOT / 'docs/design/tasbih-winter/masters'
    dest.mkdir(parents=True, exist_ok=True)
    masters.mkdir(parents=True, exist_ok=True)
    entries = []
    for name, filename in SOURCES.items():
        master = masters / (name + '.png')
        if master.exists():
            assert master.read_bytes() == (generated / filename).read_bytes(), 'Refuse overwrite'
        else:
            shutil.copyfile(generated / filename, master)
        entries.append(describe(master, 'master', season='winter'))
        with Image.open(master) as image:
            if name in ('arch_winter', 'olive_ground'):
                assert image.mode == 'RGBA'
                out = dest / (name + '.png')
                image.save(out, optimize=True)
            else:
                out = dest / (name + '.jpg')
                image.convert('RGB').save(out, quality=91, optimize=True, progressive=True)
        entries.append(describe(out, 'runtime', season='winter'))
    for index in range(1, 9):
        entries.append(describe(ROOT / f'assets/tasbih/trees/olive/stage_{index}.png',
                                'runtime-reused', stage=index - 1, anchor=[0.5, 0.9]))
    manifest = dict(version=1, generator='built-in imagegen',
                    seasons={'winter': 'ready', 'spring': 'not generated',
                             'summer': 'not generated', 'autumn': 'not generated'},
                    phaseMap={'dawn': 'morning', 'day': 'day', 'sunset': 'evening', 'night': 'night'},
                    files=entries)
    (ROOT / 'tasbih_garden_assets.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8')
    for item in entries:
        print(item['file'], item['width'], item['height'], item['bytes'])

if __name__ == '__main__':
    main()

"""v4: листья-вход по породам и лейка полива — из кадров Krea-2 (промпты — prompts_v4.py, сырьё E:\\AI\\noor_gen\\v4).

python build_v4.py sheet   — лист выбора: все кандидаты, вырезанные, на тёмном фоне приложения
python build_v4.py build   — выбранные кадры (LEAVES, CAN ниже) → assets/tasbih/*.png и src/tasbih/{leafArt,canArt}.js

Запускать python'ом ComfyUI (там scipy): E:\\AI\\ComfyUI_windows_portable\\python_embeded\\python.exe
"""
import sys, pathlib
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from cutout import cutout

RAW = pathlib.Path(r"E:\AI\noor_gen\v4")
ROOT = pathlib.Path(__file__).resolve().parents[2]
ASSETS = ROOT / "assets" / "tasbih"
SRC = ROOT / "src" / "tasbih"

# Выбор: порода → (кадр, поворот в градусах против часовой). Лист в приложении
# стоит черенком вниз, кончиком вверх — поворот это выправляет.
# Цветные листья v4 заменены силуэтами в цвет темы — их собирает build_v5.py.
LEAVES = {}
CAN = 'copper_4202'   # имя кадра лейки (носик влево)
LEAF_LONG_PX = 240    # длинная сторона листа в файле (на экране ≤ 60 pt, 3x с запасом)
CAN_W_PX = 420        # ширина лейки в файле (на экране ≤ 122 pt)
APP_BG = (16, 26, 38)


def trim(im, pad=6):
    a = np.asarray(im.getchannel("A")) > 8
    ys, xs = np.nonzero(a)
    box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + 1 + pad), min(im.height, ys.max() + 1 + pad))
    return im.crop(box)


def sheet():
    files = sorted(RAW.glob("*/*.png"))
    cells = []
    for f in files:
        im = trim(cutout(Image.open(f)))
        im.thumbnail((300, 300), Image.LANCZOS)
        cell = Image.new("RGB", (320, 340), APP_BG)
        cell.paste(im, ((320 - im.width) // 2, (320 - im.height) // 2), im)
        ImageDraw.Draw(cell).text((8, 322), f"{f.parent.name}/{f.stem}", fill=(200, 210, 220))
        cells.append(cell)
    cols = 6
    rows = (len(cells) + cols - 1) // cols
    out = Image.new("RGB", (cols * 320, rows * 340), APP_BG)
    for i, c in enumerate(cells):
        out.paste(c, ((i % cols) * 320, (i // cols) * 340))
    target = RAW / "sheet.jpg"
    out.save(target, quality=88)
    print(target)


def leaf(name, turn):
    im = cutout(Image.open(RAW / "leaf" / f"{name}.png"))
    if turn:
        im = im.rotate(turn, resample=Image.BICUBIC, expand=True)
    im = trim(im)
    k = LEAF_LONG_PX / max(im.size)
    return im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)


# Ситечко — самая левая часть лейки: центр альфы в крайних слева 7% ширины.
def rose_of(im):
    a = np.asarray(im.getchannel("A")) > 128
    cols = np.nonzero(a.any(axis=0))[0]
    band = a[:, cols[0]:cols[0] + max(4, int(im.width * 0.07))]
    ys, xs = np.nonzero(band)
    return float(cols[0] + xs.mean()), float(ys.mean())


# Ось наклона — центр масс корпуса (правее середины ширины, где нет носика).
def body_of(im):
    a = np.asarray(im.getchannel("A")) > 128
    x0 = int(im.width * 0.45)
    ys, xs = np.nonzero(a[:, x0:])
    return float(x0 + xs.mean()), float(ys.mean())


def build():
    ASSETS.mkdir(parents=True, exist_ok=True)
    lines = ["// Сгенерировано scripts/tasbih_assets/build_v4.py — не править руками.",
             "// Листья-вход по породам (Krea-2): черенком вниз, aspect — ширина к высоте.",
             "export const LEAF_ART = {"]
    for species, (name, turn) in LEAVES.items():
        im = leaf(name, turn)
        im.save(ASSETS / "leaves" / f"{species}.png", optimize=True)
        lines.append(f"  {species}: {{ source: require('../../assets/tasbih/leaves/{species}.png'), "
                     f"aspect: {im.width / im.height:.3f} }},")
        print(species, im.size)
    lines.append("};")
    if LEAVES:
        (SRC / "leafArt.js").write_text("\n".join(lines) + "\n", encoding="utf-8")

    can = trim(cutout(Image.open(RAW / "can" / f"{CAN}.png")))
    k = CAN_W_PX / can.width
    can = can.resize((CAN_W_PX, round(can.height * k)), Image.LANCZOS)
    can.save(ASSETS / "can.png", optimize=True)
    rx, ry = rose_of(can)
    bx, by = body_of(can)
    # Ось — на целых процентах холста: RN разбирает transformOrigin-строку
    # регэкспом \d+(?:%|px), дробные проценты читаются неверно.
    px = round(bx / can.width * 100) * can.width / 100
    py = round(by / can.height * 100) * can.height / 100
    (SRC / "canArt.js").write_text("\n".join([
        "// Сгенерировано scripts/tasbih_assets/build_v4.py — не править руками.",
        "// Лейка (Krea-2), носик влево. Координаты — в пикселях файла: rose — центр",
        "// ситечка, pivot — ось наклона (центр корпуса на целых процентах холста).",
        "export const CAN_ART = {",
        "  source: require('../../assets/tasbih/can.png'),",
        f"  width: {can.width}, height: {can.height},",
        f"  rose: {{ x: {rx:.1f}, y: {ry:.1f} }},",
        f"  pivot: {{ x: {px:.1f}, y: {py:.1f} }},",
        "};",
    ]) + "\n", encoding="utf-8")
    print("can", can.size, "rose", (round(rx, 1), round(ry, 1)), "pivot", (round(px, 1), round(py, 1)))


if __name__ == "__main__":
    {"sheet": sheet, "build": build}[sys.argv[1]]()

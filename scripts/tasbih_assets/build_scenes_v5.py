"""v5: сцены-обои из кадров Krea-2 (prompts_scenes_v5.py, сырьё E:\\AI\\noor_gen\\v5\\scene).

Кадр — пейзаж в трёх тонах серого на белом. Тон пикселя говорит, к какому плану
он принадлежит: светло-серое — дальний, средне-серое — средний, почти чёрное —
ближний. Каждый план — белый силуэт с альфой (цвет даёт схема через tintColor,
как у «Пустыни» и «Полумесяца»). Планы вложены: средний содержит и ближний,
дальний — оба, поэтому при сдвиге параллакса между ними не открывается дыр,
а наложение даёт ближнему плану самую плотную заливку.

python build_scenes_v5.py sheet   — превью всех кандидатов на фоне схемы
python build_scenes_v5.py build   — выбранные (SCENES ниже) → assets/scenes/<id>-1..3.png
"""
import sys, pathlib
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from build_v5 import alpha_of

RAW = pathlib.Path(r"E:\AI\noor_gen\v5\scene")
OUT = pathlib.Path(__file__).resolve().parents[2] / "assets" / "scenes"
SIZE = (900, 1950)
# Прозрачность планов от дальнего к ближнему — по «Пустыне» (0.07–0.15, ~0.25, до 0.45).
# Ближний план у новых сцен шире, чем у «Пустыни», и лежит под строками
# расписания, поэтому плотность чуть ниже.
LAYER_ALPHA = (0.10, 0.18, 0.26)
SOFT = 0.07            # ширина мягкого края между тонами

# id сцены → кадр.
SCENES = {
    "caravan": "caravan_5602", "horses": "horses_5601", "cedars": "cedars_5601", "rocks": "rocks_5601",
    "olives": "olives_5601",
    "almond": "almond_5602", "tulips": "tulips_5601", "roses": "roses_5601", "lilies": "lilies_5601",
}

BG = ((27, 36, 48), (13, 19, 27))
TINT = (190, 205, 220)


def thresholds(d):
    """Границы между тремя тонами: k-средние по тёмности пикселей рисунка."""
    v = d[d > 0.08]
    c = np.percentile(v, [15, 50, 90])
    for _ in range(20):
        lab = np.argmin(np.abs(v[:, None] - c[None, :]), axis=1)
        c = np.array([v[lab == k].mean() if (lab == k).any() else c[k] for k in range(3)])
    c.sort()
    return (c[0] + c[1]) / 2, (c[1] + c[2]) / 2


def layers(path):
    # Медиана снимает зерно, которое Krea иногда кладёт на заливки (песок):
    # без неё мягкая граница тона рябит по всему ближнему плану.
    d = ndimage.median_filter(alpha_of(path), size=7)
    t1, t2 = thresholds(d)
    soft = lambda t: np.clip((d - t) / SOFT + 0.5, 0, 1)
    masks = [np.clip(d / 0.12, 0, 1), soft(t1), soft(t2)]
    out = []
    for m, a in zip(masks, LAYER_ALPHA):
        rgba = np.zeros(d.shape + (4,), np.uint8)
        rgba[..., :3] = 255
        rgba[..., 3] = np.round(m * a * 255).astype(np.uint8)
        out.append(Image.fromarray(rgba, "RGBA").resize(SIZE, Image.LANCZOS))
    return out


def composite(planes, size=(300, 650)):
    h = size[1]
    grad = np.linspace(0, 1, h)[:, None]
    top, bot = np.array(BG[0]), np.array(BG[1])
    bg = (top * (1 - grad[..., None]) + bot * grad[..., None]).repeat(size[0], axis=1).astype(np.uint8)
    canvas = Image.fromarray(bg, "RGB").convert("RGBA")
    for p in planes:
        a = p.resize(size, Image.LANCZOS).getchannel("A").point(lambda v: int(v * 0.85))
        col = Image.new("RGBA", size, TINT + (255,))
        col.putalpha(a)
        canvas.alpha_composite(col)
    return canvas.convert("RGB")


def sheet():
    files = sorted(RAW.glob("*.png"))
    cols = 6
    out = Image.new("RGB", (cols * 300, ((len(files) + cols - 1) // cols) * 670), (10, 14, 20))
    for i, f in enumerate(files):
        cell = composite(layers(f))
        ImageDraw.Draw(cell).text((6, 6), f.stem, fill=(220, 230, 240))
        out.paste(cell, ((i % cols) * 300, (i // cols) * 670))
    target = RAW.parent / "sheet_scenes.jpg"
    out.save(target, quality=88)
    print(target)


def build():
    for sid, name in SCENES.items():
        for i, plane in enumerate(layers(RAW / f"{name}.png"), start=1):
            plane.save(OUT / f"{sid}-{i}.png", optimize=True)
        print(sid, name)


if __name__ == "__main__":
    {"sheet": sheet, "build": build}[sys.argv[1]]()

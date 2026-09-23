"""Собирает ассеты приложения из сырых генераций E:\\AI\\noor_gen.

  trees  — raw/trees/<sp>/stage_N.png → вырезка → общий холст → assets/tasbih/trees
  seeds  — raw/seeds/<sp>.png → вырезка → 256×256 → assets/tasbih/seeds
  themes — themes/<t>/<phase>.png → 1080×1920 JPEG → assets/tasbih/themes
  gate   — gate/arch_empty.png + gate/arch_closed.png → arch/door_left/door_right/glow

Запуск (python ComfyUI, там есть scipy): python build_assets.py trees seeds themes gate
"""
import sys, pathlib
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from cutout import cutout
from normalize import place

RAW = pathlib.Path(r"E:\AI\noor_gen")
APP = pathlib.Path(__file__).resolve().parents[2] / "assets" / "tasbih"
SPECIES = ["olive", "date_palm", "pomegranate", "fig", "sidr"]
PHASES = ["dawn", "day", "sunset", "night"]


def trees():
    for sp in SPECIES:
        (APP / "trees" / sp).mkdir(parents=True, exist_ok=True)
        for n in range(1, 9):
            src = RAW / "raw" / "trees" / sp / f"stage_{n}.png"
            if not src.exists():
                print("missing", src); continue
            img = place(cutout(Image.open(src)), n - 1)
            img.save(APP / "trees" / sp / f"stage_{n}.png", optimize=True)
        print("trees", sp)


def seeds():
    (APP / "seeds").mkdir(parents=True, exist_ok=True)
    for sp in SPECIES:
        src = RAW / "raw" / "seeds" / f"{sp}.png"
        if not src.exists():
            print("missing", src); continue
        im = cutout(Image.open(src))
        im = im.crop(im.getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox())
        im.thumbnail((224, 224), Image.LANCZOS)
        canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
        canvas.alpha_composite(im, ((256 - im.width) // 2, (256 - im.height) // 2))
        canvas.save(APP / "seeds" / f"{sp}.png", optimize=True)
    print("seeds")


def night_grade(im):
    """img2img оставляет ночь светлой, как сумерки. Уводим тон вниз и в синеву,
    но яркие точки (звёзды, луна) сохраняем — по ним ночь и читается."""
    a = np.asarray(im).astype(np.float32) / 255
    lum = a.mean(-1, keepdims=True)
    dark = (a ** 1.6) * 0.62
    dark = dark * np.array([0.78, 0.92, 1.12]) + np.array([0.012, 0.03, 0.05])
    hi = np.clip((lum - 0.78) / 0.15, 0, 1)          # звёзды и луна
    out = dark * (1 - hi) + a * hi
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))


def themes():
    for t in ["garden", "oasis", "highlands"]:
        (APP / "themes" / t).mkdir(parents=True, exist_ok=True)
        for p in PHASES:
            src = RAW / "themes" / t / f"{p}.png"
            if not src.exists():
                print("missing", src); continue
            im = Image.open(src).convert("RGB")
            if p == "night":
                im = night_grade(im)
            # Холст 1024×1792 (4:7) → 1080×1920 (9:16): подгоняем по ширине, режем верх неба.
            scale = 1080 / im.width
            im = im.resize((1080, round(im.height * scale)), Image.LANCZOS)
            top = max(0, im.height - 1920)
            im = im.crop((0, top // 3, 1080, top // 3 + 1920)) if im.height >= 1920 else im.resize((1080, 1920), Image.LANCZOS)
            im.save(APP / "themes" / t / f"{p}.jpg", quality=84, optimize=True, progressive=True)
        print("themes", t)


def gate():
    """Всё из закрытого варианта: створки — тёмное дерево в проёме, арка — остальное.

    Пустая арка служила только образцом для правки; правка слегка сдвигает кладку,
    поэтому маску проёма берём из того же кадра, где нарисованы створки.
    """
    W, H = 600, 720
    closed = Image.open(RAW / "gate" / "arch_closed.png").convert("RGB")
    rgb = np.asarray(closed).astype(int)
    lum = rgb.mean(-1)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    wood = ndimage.binary_opening((lum < 88) & (r > g) & (g >= b - 4), iterations=2)
    lab, _ = ndimage.label(wood)
    h0, w0 = lum.shape
    doors = lab == lab[int(h0 * 0.58), w0 // 2]
    doors = ndimage.binary_fill_holes(ndimage.binary_closing(doors, iterations=8))
    doors = ndimage.binary_opening(doors, iterations=4)
    oy, ox = np.nonzero(doors)
    # Шов между створками — самая тёмная вертикаль у середины проёма.
    mid = int(ox.mean())
    band = lum[oy.min() + 40:oy.max() - 40, mid - 30:mid + 30].mean(0)
    split = mid - 30 + int(np.argmin(band))

    arch = cutout(closed)
    a = np.asarray(arch.getchannel("A")).copy()
    a[ndimage.binary_erosion(doors, iterations=1)] = 0
    arch.putalpha(Image.fromarray(a))

    def leaf(mask):
        m = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
        out = closed.convert("RGBA"); out.putalpha(m); return out

    left = doors.copy(); left[:, split:] = False
    right = doors.copy(); right[:, :split] = False
    ab = np.asarray(arch.getchannel("A")) > 40
    ys, xs = np.nonzero(ab | doors)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    bbox = (x0, y0, x1 + 1, y1 + 1)
    bw, bh = x1 + 1 - x0, y1 + 1 - y0
    scale = min(W * 0.98 / bw, H / bh)
    size = (round(bw * scale), round(bh * scale))
    off = ((W - size[0]) // 2, H - size[1])

    def frame(img):
        c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        c.alpha_composite(img.crop(bbox).resize(size, Image.LANCZOS), off)
        return c

    out = APP / "gate"
    frame(arch).save(out / "arch.png", optimize=True)
    frame(leaf(left)).save(out / "door_left.png", optimize=True)
    frame(leaf(right)).save(out / "door_right.png", optimize=True)
    dist = ndimage.distance_transform_edt(doors)
    gl = np.clip(dist / (dist.max() * 0.55), 0, 1) ** 0.7
    glow = np.zeros((*doors.shape, 4), np.uint8)
    glow[..., 0], glow[..., 1], glow[..., 2] = 255, 228, 170
    glow[..., 3] = (gl * 240).astype(np.uint8)
    frame(Image.fromarray(glow, "RGBA").filter(ImageFilter.GaussianBlur(5))).save(out / "glow.png", optimize=True)
    to = lambda x, y: (((x - x0) * scale + off[0]) / W, ((y - y0) * scale + off[1]) / H)
    l, t = to(ox.min(), oy.min()); rr, bb = to(ox.max(), oy.max()); sx, _ = to(split, 0)
    print(f"gate opening left={l:.3f} right={rr:.3f} top={t:.3f} bottom={bb:.3f} split={sx:.3f}")


if __name__ == "__main__":
    for step in sys.argv[1:]:
        globals()[step]()

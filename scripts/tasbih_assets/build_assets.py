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


GATE_PICK = {"garden": 2, "oasis": 1, "highlands": 1}   # какой из двух вариантов арки взят


# Светлые створки не отделить по цвету от стены — тогда проём берём из пустой арки
# (правка сохраняет композицию почти пиксель в пиксель, запас в пару пикселей закрывает сдвиг).
MASK_FROM = {"oasis": "empty", "highlands": "empty"}


def opening_from_empty(theme, size):
    empty = Image.open(RAW / "v3" / "gate" / theme / f"empty_{GATE_PICK[theme]}.png").convert("RGB").resize(size, Image.LANCZOS)
    a = np.asarray(cutout(empty).getchannel("A")) > 128
    ys, xs = np.nonzero(a)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    inside = np.zeros_like(a)
    inside[y0:y1 + 1, x0:x1 + 1] = ~a[y0:y1 + 1, x0:x1 + 1]
    lab, _ = ndimage.label(inside)
    cx = int(xs.mean())
    column = lab[y0:int(y0 + (y1 - y0) * 0.75), cx]
    sub = lab[y0:y1 + 1, x0:x1 + 1]
    edge = set(np.unique(np.concatenate([sub[0], sub[-1], sub[:, 0], sub[:, -1]])))
    # Проём — компонента на средней вертикали, не касающаяся рамки силуэта
    # (фон над стенами тоже попадает в рамку и бывает крупнее проёма).
    ids = [i for i in np.unique(column) if i and i not in edge] or [i for i in np.unique(column) if i]
    best = max(ids, key=lambda i: (lab == i).sum())
    opening = lab == best
    # Проём открыт к земле: снизу компонента растекается по фону вдоль основания — срезаем
    # по нижней точке косяков (где ширина проёма ещё не выросла).
    rows = opening.sum(1)
    top = np.nonzero(rows)[0].min()
    ref = np.median(rows[top + (np.nonzero(rows)[0].max() - top) // 2: np.nonzero(rows)[0].max()][:40])
    for y in range(top, opening.shape[0]):
        if rows[y] > ref * 1.35:
            opening[y:] = False
            break
    return ndimage.binary_dilation(opening, iterations=9)


def gates():
    """Ворота каждой темы: створки — тёмное дерево в проёме закрытого варианта, арка — остальное.

    Холст 720 по ширине, высота по пропорции силуэта (у ворот со стенами он шире, чем высок).
    Печатает геометрию для GATE_THEMES в src/tasbih/assets.js.
    """
    for theme in GATE_PICK:
        gate(theme)


def gate(theme):
    W = 720
    closed = Image.open(RAW / "v3" / "gate" / theme / "closed.png").convert("RGB")
    rgb = np.asarray(closed).astype(int)
    lum = rgb.mean(-1)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    if MASK_FROM.get(theme) == "empty":
        doors = opening_from_empty(theme, closed.size)
    else:
        wood = ndimage.binary_opening((lum < 88) & (r > g) & (g >= b - 4), iterations=2)
        lab, _ = ndimage.label(wood)
        arch_a = np.asarray(cutout(closed).getchannel("A")) > 40
        ys, xs = np.nonzero(arch_a)
        # Створки — самая крупная тёмная область у середины силуэта.
        cx, cy = int(xs.mean()), int(ys.min() + (ys.max() - ys.min()) * 0.6)
        ids, counts = np.unique(lab[max(0, cy - 150):cy + 150, cx - 60:cx + 60], return_counts=True)
        cand = [(c, i) for i, c in zip(ids, counts) if i]
        doors = lab == max(cand)[1]
        doors = ndimage.binary_fill_holes(ndimage.binary_closing(doors, iterations=8))
        doors = ndimage.binary_opening(doors, iterations=4)
    oy, ox = np.nonzero(doors)
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
    H = round(W * bh / bw)
    scale = W / bw

    def frame(img):
        return img.crop(bbox).resize((W, H), Image.LANCZOS)

    out = APP / "gates" / theme
    out.mkdir(parents=True, exist_ok=True)
    frame(arch).save(out / "arch.png", optimize=True)
    frame(leaf(left)).save(out / "door_left.png", optimize=True)
    frame(leaf(right)).save(out / "door_right.png", optimize=True)
    dist = ndimage.distance_transform_edt(doors)
    gl = np.clip(dist / (dist.max() * 0.55), 0, 1) ** 0.7
    glow = np.zeros((*doors.shape, 4), np.uint8)
    glow[..., 0], glow[..., 1], glow[..., 2] = 255, 228, 170
    glow[..., 3] = (gl * 240).astype(np.uint8)
    frame(Image.fromarray(glow, "RGBA").filter(ImageFilter.GaussianBlur(5))).save(out / "glow.png", optimize=True)
    fx = lambda x: (x - x0) / bw
    fy = lambda y: (y - y0) / bh
    print(f"{theme}: aspect={H / W:.3f} hingeLeft={fx(ox.min()):.3f} hingeRight={fx(ox.max()):.3f} "
          f"opening={{left:{fx(ox.min()):.3f}, right:{fx(ox.max()):.3f}, top:{fy(oy.min()):.3f}, bottom:{fy(oy.max()):.3f}}} split={fx(split):.3f}")


def winter_grade(im):
    """Зелень поляны img2img не перекрашивает — уводим её в снег, кадр слегка охлаждаем."""
    a = np.asarray(im).astype(np.float32)
    h = a.shape[0]
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = np.clip((g - b - 12) / 35, 0, 1) * (r <= g + 18)   # зелёная и оливковая трава
    ramp = np.clip((np.arange(h) / h - 0.5) / 0.15, 0, 1)[:, None]      # только земля
    snow = np.array([234, 239, 246], np.float32)
    k = (green * ramp * 0.85)[..., None]
    out = a * (1 - k) + snow * k
    grey = out.mean(-1, keepdims=True)
    out = out * 0.8 + grey * 0.2                                          # чуть меньше цвета
    out = out * np.array([0.97, 0.99, 1.04])                              # и холоднее
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def garden():
    """Сезонный сад тасбиха: v3/garden/<сезон>.png → assets/tasbih/garden/<сезон>.jpg (1080×1920)."""
    (APP / "garden").mkdir(parents=True, exist_ok=True)
    for season in ["spring", "summer", "autumn", "winter"]:
        src = RAW / "v3" / "garden" / f"{season}.png"
        if not src.exists():
            print("missing", src); continue
        im = Image.open(src).convert("RGB")
        if season == "winter":
            im = winter_grade(im)
        im = im.resize((1080, round(im.height * 1080 / im.width)), Image.LANCZOS)
        top = max(0, im.height - 1920)
        im = im.crop((0, top // 3, 1080, top // 3 + 1920)) if im.height >= 1920 else im.resize((1080, 1920), Image.LANCZOS)
        im.save(APP / "garden" / f"{season}.jpg", quality=88, optimize=True, progressive=True)
    print("garden")


if __name__ == "__main__":
    for step in sys.argv[1:]:
        globals()[step]()

"""v5: силуэты деревьев, веточек-входа и лейки из кадров Krea-2 (prompts_v5.py, сырьё E:\\AI\\noor_gen\\v5).

Кадр — тёмный силуэт в оттенках серого на белом. Цвет выбрасывается: тёмность
пикселя становится его непрозрачностью, а цвет в приложении даёт тема
(Image tintColor), как у сцен на обоях. Светло-серые дальние слои выходят
полупрозрачными — это и есть глубина.

python build_v5.py sheet [subdir]  — лист выбора: кандидаты, тонированные цветом темы на её фоне
python build_v5.py build           — выбранные кадры (TREES, TWIGS, CAN) → assets/tasbih/{trees5,twigs,can.png}
                                     и src/tasbih/{treeArt,twigArt,canArt}.js

Запускать python'ом ComfyUI (там scipy).
"""
import sys, pathlib
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

RAW = pathlib.Path(r"E:\AI\noor_gen\v5")
ROOT = pathlib.Path(__file__).resolve().parents[2]
ASSETS = ROOT / "assets" / "tasbih"
SRC = ROOT / "src" / "tasbih"

# Холст дерева — как у прежних SVG-силуэтов: эффекты (полив, листья) считают
# от тех же корня и рамок. Высота силуэта по стадиям растёт монотонно.
CANVAS = (240, 300)
BASE = (120, 270)
HEIGHT = [30, 46, 78, 118, 158, 192, 222, 236]
MAX_W = 228
SCALE = 4              # пикселей файла на единицу холста
GROUND_DROP = 6        # низ холмика ниже точки корня

# Выбор: порода → 8 имён кадров по стадиям; листья — список имён кадров.
# Зерно и росток у всех пород общие (prompts_v5.py small).
TREES = {
    'olive': ['small/s0_5302', 'small/s1_5301'] + [f'tree/olive_{st}_5101' for st in range(2, 8)],
    'fig': ['small/s0_5302', 'small/s1_5301'] + [f'tree/fig_{st}_5101' for st in range(2, 8)],
    'pomegranate': ['small/s0_5302', 'small/s1_5301'] + [f'tree/pomegranate_{st}_5101' for st in range(2, 8)],
    'date_palm': ['small/s0_5302', 'small/s1_5301'] + [f'tree/date_palm_{st}_5101' for st in range(2, 8)],
    'sidr': ['small/s0_5302', 'small/s1_5301'] + [f'tree/sidr_{st}_5101' for st in range(2, 8)],
}
# Вход на главном — веточка справа (листья-вход v5 заменены): имена кадров twig/*.
TWIGS = ["olive_5502", "fig_5501", "grape_5501", "almond_5502", "pomegranate_5502", "mulberry_5502", "sidr_5502", "laurel_5501"]
TWIG_LONG_PX = 420     # ширина веточки в файле (на экране ~130 pt)
CAN = "can2/can_5402"  # кадр лейки (носик влево)
CAN_W_PX = 420         # ширина лейки в файле (на экране ≤ 122 pt)

APP_BG = (22, 32, 46)
TINT = (150, 200, 225)


def alpha_of(path):
    """Альфа из тёмности: белый фон → 0, почти чёрный → 1, серые слои — между."""
    lum = np.asarray(Image.open(path).convert("L")).astype(np.float32)
    border = np.concatenate([lum[:8].ravel(), lum[-8:].ravel(), lum[:, :8].ravel(), lum[:, -8:].ravel()])
    bg = float(np.median(border))
    ink = float(np.percentile(lum[lum < bg - 30], 3)) if (lum < bg - 30).any() else 0.0
    a = np.clip((bg - lum) / max(1.0, bg - ink), 0, 1)
    a[a < 0.04] = 0
    # Мелкий мусор по фону — прочь: оставляем связные пятна заметного размера.
    solid = a > 0.08
    lab, n = ndimage.label(solid)
    if n:
        sizes = ndimage.sum(solid, lab, range(1, n + 1))
        big = max(sizes)
        keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= max(80, big * 0.002)])
        a = np.where(keep | ~solid, a, 0)
        a = np.where(ndimage.binary_dilation(keep, iterations=2), a, 0)
    return a


def to_image(a):
    h, w = a.shape
    rgba = np.zeros((h, w, 4), np.uint8)
    rgba[..., :3] = 255
    rgba[..., 3] = np.round(a * 255).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def bbox(a, thr=0.1):
    ys, xs = np.nonzero(a > thr)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def tinted(im, size):
    im = im.copy()
    im.thumbnail(size, Image.LANCZOS)
    cell = Image.new("RGBA", size, APP_BG + (255,))
    col = Image.new("RGBA", im.size, TINT + (255,))
    col.putalpha(im.getchannel("A"))
    cell.alpha_composite(col, ((size[0] - im.width) // 2, (size[1] - im.height) // 2))
    return cell.convert("RGB")


def sheet(sub=""):
    files = sorted((RAW / sub).rglob("*.png")) if sub else sorted(RAW.rglob("*.png"))
    cells = []
    for f in files:
        a = alpha_of(f)
        x0, y0, x1, y1 = bbox(a)
        cell = tinted(to_image(a[y0:y1, x0:x1]), (300, 320))
        ImageDraw.Draw(cell).text((6, 304), f"{f.parent.name}/{f.stem}", fill=(200, 210, 220))
        cells.append(cell)
    cols = 6
    out = Image.new("RGB", (cols * 300, ((len(cells) + cols - 1) // cols) * 320), APP_BG)
    for i, c in enumerate(cells):
        out.paste(c, ((i % cols) * 300, (i // cols) * 320))
    target = RAW / f"sheet{('_' + sub.replace('/', '_')) if sub else ''}.jpg"
    out.save(target, quality=88)
    print(target)


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


def cut_tree(path):
    """Силуэт без полей и его ось — середина нижней полосы (холмик, комель)."""
    a = alpha_of(path)
    x0, y0, x1, y1 = bbox(a)
    a = a[y0:y1, x0:x1]
    h, w = a.shape
    band = a[int(h * 0.94):] > 0.3
    xs = np.nonzero(band.any(axis=0))[0]
    axis = (xs.min() + xs.max() + 1) / 2 if len(xs) else w / 2
    return a, axis


def target_heights(cuts):
    """Высоты стадий: HEIGHT, но не шире холста. Широкая взрослая крона упирается
    в ширину и выходит ниже — тогда ранние стадии ужимаются до неё, чтобы
    дерево с ростом не становилось ниже."""
    hs = [min(HEIGHT[i], MAX_W * a.shape[0] / a.shape[1]) for i, (a, _) in enumerate(cuts)]
    for i in range(len(hs) - 2, -1, -1):
        hs[i] = min(hs[i], hs[i + 1])
    return hs


def place_tree(a, axis, height):
    """Силуэт на холст дерева: низ холмика — под корнем, ось — по центру."""
    h, w = a.shape
    k = height / h * SCALE
    im = to_image(a).resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS[0] * SCALE, CANVAS[1] * SCALE), (255, 255, 255, 0))
    left = round(BASE[0] * SCALE - axis * k)
    left = max(0, min(canvas.width - im.width, left))
    top = round((BASE[1] + GROUND_DROP) * SCALE - im.height)
    canvas.alpha_composite(im, (left, top))
    ca = np.asarray(canvas.getchannel("A")) / 255.0
    bx0, by0, bx1, by1 = bbox(ca)
    bounds = {"x": round(float(bx0) / SCALE, 1), "y": round(float(by0) / SCALE, 1),
              "width": round(float(bx1 - bx0) / SCALE, 1), "height": round(float(by1 - by0) / SCALE, 1)}
    return canvas, bounds


def build():
    lines = ["// Сгенерировано scripts/tasbih_assets/build_v5.py — не править руками.",
             "// Силуэты деревьев (Krea-2): белый с альфой, цвет даёт тема через tintColor.",
             "// Холст и корень — как у прежних SVG-силуэтов; bounds — рамка силуэта в единицах холста.",
             f"export const TREE_CANVAS = {{ width: {CANVAS[0]}, height: {CANVAS[1]}, baseX: {BASE[0]}, baseY: {BASE[1]} }};",
             "export const TREE_ART = {"]
    bounds_all = {}
    if TREES:
        (ASSETS / "trees5").mkdir(parents=True, exist_ok=True)
    for sp, names in TREES.items():
        lines.append(f"  {sp}: [")
        bounds_all[sp] = []
        cuts = [cut_tree(RAW / f"{name}.png") for name in names]
        for stage, ((a, axis), height) in enumerate(zip(cuts, target_heights(cuts))):
            canvas, b = place_tree(a, axis, height)
            canvas.save(ASSETS / "trees5" / f"{sp}_{stage}.png", optimize=True)
            lines.append(f"    require('../../assets/tasbih/trees5/{sp}_{stage}.png'),")
            bounds_all[sp].append(b)
            print(sp, stage, b)
        lines.append("  ],")
    lines.append("};")
    lines.append("export const TREE_BOUNDS = {")
    for sp, bs in bounds_all.items():
        lines.append(f"  {sp}: [" + ", ".join(
            f"{{ x: {b['x']}, y: {b['y']}, width: {b['width']}, height: {b['height']} }}" for b in bs) + "],")
    lines.append("};")
    if TREES:
        (SRC / "treeArt.js").write_text("\n".join(lines) + "\n", encoding="utf-8")

    if TWIGS:
        (ASSETS / "twigs").mkdir(parents=True, exist_ok=True)
        out = ["// Сгенерировано scripts/tasbih_assets/build_v5.py — не править руками.",
               "// Веточки-вход: белый силуэт с альфой (цвет — тема), срез стебля у правого края.",
               "// aspect — ширина к высоте; stem — высота среза в долях высоты (ось качания).",
               "export const TWIG_ART = ["]
        for i, name in enumerate(TWIGS):
            a = alpha_of(RAW / "twig" / f"{name}.png")
            x0, y0, x1, y1 = bbox(a, 0.05)
            # Справа поля нет: срез стебля должен лечь ровно в край экрана.
            a = a[max(0, y0 - 4):y1 + 4, max(0, x0 - 4):x1]
            im = to_image(a)
            k = TWIG_LONG_PX / im.width
            im = im.resize((TWIG_LONG_PX, round(im.height * k)), Image.LANCZOS)
            im.save(ASSETS / "twigs" / f"twig_{i}.png", optimize=True)
            # Срез — центр альфы в крайних справа 3% ширины, в целых процентах высоты.
            edge = a[:, -max(3, a.shape[1] * 3 // 100):] > 0.3
            ys = np.nonzero(edge.any(axis=1))[0]
            stem = round(float(ys.mean()) / a.shape[0] * 100) if len(ys) else 50
            out.append(f"  {{ source: require('../../assets/tasbih/twigs/twig_{i}.png'), "
                       f"aspect: {im.width / im.height:.3f}, stem: {stem} }},")
            print("twig", i, name, im.size, "stem", stem)
        out.append("];")
        (SRC / "twigArt.js").write_text("\n".join(out) + "\n", encoding="utf-8")

    if CAN:
        # Корпус средне-серый — без подъёма плотности сквозь лейку просвечивало
        # бы дерево; степень < 1 уплотняет полутона, не трогая края и тёмное.
        a = alpha_of(RAW / f"{CAN}.png") ** 0.55
        x0, y0, x1, y1 = bbox(a, 0.05)
        can = to_image(a[max(0, y0 - 4):y1 + 4, max(0, x0 - 4):x1 + 4])
        can = can.resize((CAN_W_PX, round(can.height * CAN_W_PX / can.width)), Image.LANCZOS)
        can.save(ASSETS / "can.png", optimize=True)
        rx, ry = rose_of(can)
        bx, by = body_of(can)
        # Ось — на целых процентах холста: RN разбирает transformOrigin-строку
        # регэкспом \d+(?:%|px), дробные проценты читаются неверно.
        px = round(bx / can.width * 100) * can.width / 100
        py = round(by / can.height * 100) * can.height / 100
        (SRC / "canArt.js").write_text("\n".join([
            "// Сгенерировано scripts/tasbih_assets/build_v5.py — не править руками.",
            "// Лейка — белый силуэт с альфой (цвет — тема), носик влево. Координаты — в пикселях",
            "// файла: rose — центр ситечка, pivot — ось наклона (центр корпуса на целых процентах).",
            "export const CAN_ART = {",
            "  source: require('../../assets/tasbih/can.png'),",
            f"  width: {can.width}, height: {can.height},",
            f"  rose: {{ x: {rx:.1f}, y: {ry:.1f} }},",
            f"  pivot: {{ x: {px:.1f}, y: {py:.1f} }},",
            "};",
        ]) + "\n", encoding="utf-8")
        print("can", can.size, "rose", (round(rx, 1), round(ry, 1)), "pivot", (round(px, 1), round(py, 1)))


if __name__ == "__main__":
    if sys.argv[1] == "sheet":
        sheet(sys.argv[2] if len(sys.argv) > 2 else "")
    else:
        build()

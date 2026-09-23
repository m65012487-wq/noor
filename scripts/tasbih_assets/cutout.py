"""Вырезка объекта с однотонного светлого фона без нейросети.

Генерации заказываются на ровном светло-сером фоне. Цвет фона оценивается
по рамке кадра; альфа — по расстоянию до него, но фоном считается только то,
что связано с краем кадра (заливка), поэтому светлые блики внутри кроны
не выгрызаются. Цвет полупрозрачных краёв очищается от примеси фона
(un-premultiply), иначе на тёмной сцене вокруг листьев остаётся серая кайма.

Запуск: python cutout.py <src.png> <dst.png>
"""
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

LOW, HIGH = 14.0, 46.0      # расстояние до фона: ниже — фон, выше — объект


def cutout(src):
    rgb = np.asarray(src.convert("RGB")).astype(np.float32)
    h, w, _ = rgb.shape
    border = np.concatenate([rgb[:6].reshape(-1, 3), rgb[-6:].reshape(-1, 3),
                             rgb[:, :6].reshape(-1, 3), rgb[:, -6:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(-1))
    # Фон — только связная с краем область «похожего на фон».
    near = dist < HIGH
    labels, _ = ndimage.label(near)
    edge = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))) - {0}
    background = np.isin(labels, list(edge))
    # Замкнутые просветы между ветками: не касаются края, но по цвету — чистый фон.
    core = dist < LOW * 0.8
    clab, cn = ndimage.label(core & ~background)
    if cn:
        sizes = ndimage.sum(np.ones_like(dist), clab, range(1, cn + 1))
        holes = [i + 1 for i, s in enumerate(sizes) if s >= 120]
        if holes:
            grown = ndimage.binary_dilation(np.isin(clab, holes), iterations=3) & near
            background |= grown
    alpha = np.clip((dist - LOW) / (HIGH - LOW), 0, 1)
    alpha = np.where(background, alpha, 1.0)
    # Мелкий мусор-островки на фоне убираем.
    solid = alpha > 0.5
    lab, n = ndimage.label(solid)
    if n:
        sizes = ndimage.sum(solid, lab, range(1, n + 1))
        keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 60])
        alpha = np.where(solid & ~keep, 0, alpha)
    a = alpha[..., None]
    fg = np.where(a > 0.02, (rgb - (1 - a) * bg) / np.maximum(a, 0.02), rgb)
    fg = np.clip(fg, 0, 255)
    out = np.dstack([fg, alpha * 255]).astype(np.uint8)
    im = Image.fromarray(out, "RGBA")
    # Лёгкое сглаживание только альфы — убирает лесенку на границе.
    r, g, b, al = im.split()
    al = al.filter(ImageFilter.GaussianBlur(0.6))
    return Image.merge("RGBA", (r, g, b, al))


if __name__ == "__main__":
    cutout(Image.open(sys.argv[1])).save(sys.argv[2])

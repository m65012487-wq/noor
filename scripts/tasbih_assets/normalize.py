"""Приводит вырезанные деревья к общему холсту 768×960 с корнем в (384, 864).

Генератор рисует каждую стадию в своём масштабе, поэтому масштаб задаём сами:
у каждой стадии своя целевая высота силуэта, а низ силуэта (земля у корня)
ставится на одну линию. Так рост читается честно, без ручных коэффициентов.

Запуск: python normalize.py <raw_dir> <species> <out_dir>
raw_dir/<species>/stage_<n>.png — RGBA после RMBG.
"""
import sys, pathlib
from PIL import Image

W, H = 768, 960
ROOT_X, GROUND_Y = 384, 880          # низ земляного холмика чуть ниже якоря 0.9
HEIGHTS = [135, 205, 290, 390, 500, 610, 720, 745]
MAX_W = 720


def clean_alpha(im):
    """Убирает почти прозрачную дымку, которую иногда оставляет вырезка."""
    r, g, b, a = im.split()
    a = a.point(lambda v: 0 if v < 18 else v)
    return Image.merge("RGBA", (r, g, b, a))


def place(src, stage):
    im = clean_alpha(src.convert("RGBA"))
    bbox = im.getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox()
    im = im.crop(bbox)
    scale = HEIGHTS[stage] / im.height
    if im.width * scale > MAX_W:
        scale = MAX_W / im.width
    im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
    # Центр по горизонтали — по массе нижней пятой части (ствол), а не по кроне:
    # у кривых деревьев крона смещена, а стоять дерево должно на корне.
    a = im.getchannel("A")
    band = a.crop((0, int(im.height * 0.8), im.width, im.height))
    cols = [sum(band.crop((x, 0, x + 1, band.height)).getdata()) for x in range(band.width)]
    total = sum(cols) or 1
    cx = sum(x * c for x, c in enumerate(cols)) / total
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    x = round(ROOT_X - cx)
    x = min(max(x, 0), W - im.width)
    canvas.alpha_composite(im, (x, GROUND_Y - im.height))
    return canvas


if __name__ == "__main__":
    raw, species, out = pathlib.Path(sys.argv[1]), sys.argv[2], pathlib.Path(sys.argv[3])
    (out / species).mkdir(parents=True, exist_ok=True)
    for n in range(1, 9):
        src = raw / species / f"stage_{n}.png"
        if src.exists():
            place(Image.open(src), n - 1).save(out / species / f"stage_{n}.png", optimize=True)
            print(species, n)

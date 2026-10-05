"""v5: фоны виджета (targets/widget) — силуэт горизонта в оттенках серого.

python prompts_widget_v5.py > jobs.json; затем comfy_gen.py jobs.json и build_widget_v5.py.

Картинка в виджете — белый силуэт с альфой, который SwiftUI красит цветом
схемы приложения (renderingMode template), как сцены на обоях. Рисунок —
только полосой внизу и месяц в углу: на остальном месте текст и цифры.
"""
import json

STYLE = ("Minimal elegant flat layered paper-cut silhouette, strictly monochrome grayscale: distant layers light grey, "
         "middle layers mid grey, nearest layer near-black, crisp clean smooth shapes, no outlines, no texture, no noise, "
         "no gradients, no colour, pure white background, no text, no frame")
WIDE = ("A wide panoramic night horizon: low layered sand dunes along the bottom quarter, a few date palms at the left, "
        "a tiny distant camel caravan on a ridge; a thin crescent moon and three small stars in the upper right corner; "
        "everything else is empty white sky")
SQUARE = ("A square composition: low layered sand dunes along the bottom fifth with two small date palms at the right; "
          "a thin crescent moon and two small stars in the upper right corner; everything else is empty white sky")


def jobs():
    out = [{"name": f"v5/widget/wide_{seed}", "seed": seed, "w": 1536, "h": 704, "prompt": f"{WIDE}. {STYLE}."}
           for seed in (5901, 5902, 5903)]
    out += [{"name": f"v5/widget/square_{seed}", "seed": seed, "w": 1024, "h": 1024, "prompt": f"{SQUARE}. {STYLE}."}
            for seed in (5901, 5902, 5903)]
    return out


if __name__ == "__main__":
    print(json.dumps(jobs(), ensure_ascii=False, indent=1))

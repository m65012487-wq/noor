"""v5: детальные обои под раскладку главного экрана — «Всадник» и «Цветение».

python prompts_wall_v5.py > jobs.json; затем comfy_gen.py jobs.json; планы режет build_scenes_v5.py.

Композиция подогнана под экран 390×844: сверху заголовок и дата (там только
пара бледных звёзд), в середине кольцо отсчёта и строка расписания (пусто),
главный рисунок — внизу и левее, правый нижний угол над таб-баром спокойный:
туда входит веточка-вход. Второй проход (hires) даёт мелкие детали.
"""
import json

LAYOUT = ("Tall vertical phone wallpaper composition: the upper sixty percent is open calm empty sky, completely plain "
          "except a few tiny faint stars near the top; the middle of the picture is empty; all the scenery sits in the "
          "lower forty percent; the main subject stands in the lower left third; the lower right corner is calm low "
          "ground with nothing tall in it")
STYLE = ("Elegant highly detailed flat silhouette illustration, layered paper-cut style, strictly monochrome grayscale: "
         "distant layers in light grey, middle layers in mid grey, the nearest layer and the main subject in near-black "
         "with fine delicate light grey inner details, crisp clean shapes, no outlines, no texture, no noise, no gradients, "
         "no colour, pure white background sky, no text, no frame")

WALLS = {
    "rider": "A lone Arabian horseman in a flowing cloak and headscarf riding a graceful horse with a long flowing mane "
             "along the crest of a sand dune, layered dunes and a distant line of date palms and a far caravan behind",
    "blossom": "Delicate flowering almond branches with many small blossoms arching in from the lower left, two small "
               "songbirds perched on a branch, soft rolling meadow hills with tiny wildflowers and a few petals "
               "drifting gently",
}


def jobs():
    return [{"name": f"v5/wall/{name}_{seed}", "seed": seed, "w": 832, "h": 1792, "hires": True,
             "prompt": f"{text}. {LAYOUT}. {STYLE}."}
            for name, text in WALLS.items() for seed in (5701, 5702, 5703, 5704)]


if __name__ == "__main__":
    print(json.dumps(jobs(), ensure_ascii=False, indent=1))

"""v5: детальные обои под раскладку главного экрана — «Всадник» и «Цветение».

python prompts_wall_v5.py [garden|riders|bearded] > jobs.json; затем comfy_gen.py jobs.json; планы режет build_scenes_v5.py.

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


# Фон экрана тасбиха — свой сад, не обои главного экрана. В середине стоит
# дерево тасбиха, сверху поминание и счётчик: сцена только по краям и внизу,
# линия земли — на уровне холмика дерева (около 88% высоты экрана).
GARDEN = ("A serene enclosed garden seen from inside: slender cypress trees and flowering shrubs only at the far left "
          "and far right edges, a low distant garden wall with a row of small pointed arches along the horizon, a calm "
          "open lawn in front; the whole centre of the picture is completely empty open space")
GARDEN_LAYOUT = ("Tall vertical phone wallpaper composition: the upper half is empty plain sky; the scenery is framed at "
                 "the left and right edges and along the bottom; the ground line is low, at about eighty-five percent of "
                 "the height; nothing at all in the centre")


# Ещё варианты в духе «Всадника»: всадники, кони и сабли. Та же раскладка и тот же стиль.
RIDERS = {
    "rider_sword": "A lone Arabian horseman in a flowing cloak and headscarf on a graceful horse, holding a curved "
                   "scimitar raised high, standing on the crest of a sand dune, layered dunes and distant date palms behind",
    "riders_gallop": "Two Arabian horsemen galloping side by side across the dunes, cloaks and long manes streaming in "
                     "the wind, a light trail of sand behind them, distant palms on the horizon",
    "rearing": "A proud Arabian stallion rearing up on its hind legs on a rocky ridge, its rider in a flowing cloak "
               "holding a long pennant banner, distant layered mountains",
    "herd": "A herd of wild Arabian horses galloping across a desert plain with flowing manes and tails, low dunes "
            "and a few distant date palms",
    "warrior_rest": "A desert warrior in a long cloak standing beside his horse at rest, a curved sword at his belt, the "
                    "horse gently lowering its head, a lone date palm and soft dunes",
    "swords": "Two ornate crossed scimitars planted in the sand at the top of a dune, a draped cloak and a tall spear "
              "with a small pennant beside them, a distant desert fortress on the horizon",
}


def riders_jobs():
    return [{"name": f"v5/wall/{name}_{seed}", "seed": seed, "w": 832, "h": 1792, "hires": True,
             "prompt": f"{text}. {LAYOUT}. {STYLE}."}
            for name, text in RIDERS.items() for seed in (6101, 6102, 6103)]


# Те же сцены с людьми, но мужчины бородатые. В силуэте борода видна только в
# профиль и без закрывающего лицо платка, поэтому — чалма и голова в профиль.
BEARD = ("a bearded man wearing a turban, his head shown in clear side profile with a long full thick beard "
         "plainly visible in the silhouette")
BEARDED = {
    "rider_b": f"A lone Arabian horseman, {BEARD}, in a flowing cloak riding a graceful horse with a long flowing mane "
               "along the crest of a sand dune, layered dunes and a distant line of date palms and a far caravan behind",
    "rider_sword_b": f"A lone Arabian horseman, {BEARD}, in a flowing cloak on a graceful horse, holding a curved "
                     "scimitar raised high, standing on the crest of a sand dune, layered dunes and distant date palms behind",
    "riders_gallop_b": "Two Arabian horsemen galloping side by side across the dunes, both bearded men wearing turbans "
                       "with long full thick beards plainly visible in side profile, cloaks and long manes streaming in "
                       "the wind, a light trail of sand behind them, distant palms on the horizon",
    "rearing_b": f"A proud Arabian stallion rearing up on its hind legs on a rocky ridge, its rider {BEARD}, in a "
                 "flowing cloak holding a long pennant banner, distant layered mountains",
    "warrior_rest_b": f"A desert warrior, {BEARD}, in a long cloak standing beside his horse at rest, a curved sword at "
                      "his belt, the horse gently lowering its head, a lone date palm and soft dunes",
}


def bearded_jobs():
    return [{"name": f"v5/wall/{name}_{seed}", "seed": seed, "w": 832, "h": 1792, "hires": True,
             "prompt": f"{text}. {LAYOUT}. {STYLE}."}
            for name, text in BEARDED.items() for seed in (6201, 6202, 6203)]


def garden_jobs():
    return [{"name": f"v5/wall/garden_{seed}", "seed": seed, "w": 832, "h": 1792, "hires": True,
             "prompt": f"{GARDEN}. {GARDEN_LAYOUT}. {STYLE}."} for seed in (5801, 5802, 5803, 5804)]


def jobs():
    return [{"name": f"v5/wall/{name}_{seed}", "seed": seed, "w": 832, "h": 1792, "hires": True,
             "prompt": f"{text}. {LAYOUT}. {STYLE}."}
            for name, text in WALLS.items() for seed in (5701, 5702, 5703, 5704)]


if __name__ == "__main__":
    import sys
    mode = sys.argv[1] if sys.argv[1:] else ""
    pick = {"garden": garden_jobs, "riders": riders_jobs, "bearded": bearded_jobs}.get(mode, jobs)
    print(json.dumps(pick(), ensure_ascii=False, indent=1))

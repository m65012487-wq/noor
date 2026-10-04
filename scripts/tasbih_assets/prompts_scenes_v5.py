"""v5: сцены-обои силуэтами Krea-2 — три тона серого → три плана параллакса (build_scenes_v5.py).

python prompts_scenes_v5.py > jobs.json; затем comfy_gen.py jobs.json. Сырьё — E:\\AI\\noor_gen\\v5\\scene.
Сцены «Горы», «Оазис», «Сад», «Мечеть у воды» и «Город» пользователь уже отверг — не повторять.
"""
import json

STYLE = ("Minimal flat layered paper-cut silhouette landscape poster, strictly monochrome grayscale in exactly three "
         "flat tones: the most distant layer light grey, the middle layer mid grey, the nearest foreground layer "
         "near-black. The whole landscape occupies only the bottom third of the picture; the upper two thirds are "
         "completely empty pure white sky with nothing in it, no sun, no moon, no clouds, no birds. Crisp clean smooth "
         "shapes, no outlines, no texture, no gradients, no colour, no people close up, no text, no frame")

SCENES = {
    "caravan": "Rolling sand dunes in three ridges, a small camel caravan walking along the far ridge, two small date palms "
               "on the near dune",
    "olives": "Gentle rolling hills covered with rows of round olive trees, a small stone well on the nearest hill",
    "rocks": "A desert canyon with tall weathered sandstone rock towers and a natural stone arch, flat sand in front",
    "cedars": "Layered hills with a forest of tall cedar and pine trees, the nearest trees large at the sides",
    # Вторая партия: ещё одна «мужская» и четыре «для девушек».
    "horses": "Two Arabian horses galloping across low sand dunes, manes flying, distant dune ridges behind",
    "almond": "Blossoming almond tree branches arching in from both lower corners over a soft meadow, small blossoms "
              "and a few petals drifting low",
    "tulips": "A gentle field of tulips on rolling hills, the nearest tulips large and elegant in the foreground",
    "roses": "Climbing rose bushes in full bloom along a low garden wall, roses and leaves in the foreground",
    "lilies": "A calm pond with water lilies, lotus flowers and tall reeds at the sides, distant soft hills",
}
FIRST = ("caravan", "olives", "rocks", "cedars")


def jobs(names=None):
    return [{"name": f"v5/scene/{name}_{seed}", "seed": seed, "w": 768, "h": 1664, "prompt": f"{text}. {STYLE}."}
            for name, text in SCENES.items() if names is None or name in names for seed in (5601, 5602)]


if __name__ == "__main__":
    import sys
    rest = [n for n in SCENES if n not in FIRST]
    print(json.dumps(jobs(rest if sys.argv[1:] == ["second"] else None), ensure_ascii=False, indent=1))

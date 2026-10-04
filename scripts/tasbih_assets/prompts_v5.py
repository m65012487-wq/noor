"""v5: деревья и листья-вход силуэтами в стиле тем (монохром, слои серого → альфа, цвет даёт тема).

python prompts_v5.py test|trees|small|leaves > jobs.json; затем comfy_gen.py jobs.json и build_v5.py.
Сырьё — E:\\AI\\noor_gen\\v5.
"""
import json, sys

# Стиль тем: плоские слоистые силуэты одного цвета, глубина — тоном, без контуров и текстур.
STYLE = ("flat minimal vector silhouette illustration, layered paper-cut style, strictly monochrome grayscale: "
         "far foliage in light grey, middle layers in mid grey, trunk and nearest foliage in near-black, "
         "crisp clean smooth shapes, no outlines, no texture, no gradients, no shading lines, no colour, "
         "isolated on a pure white background, centered, whole subject visible with generous margins, "
         "no text, no frame")
STYLE_B = ("elegant flat silhouette illustration in the style of a minimalist poster, monochrome grayscale with three "
           "flat tones (light grey, mid grey, near-black) giving depth, crisp smooth edges, no outlines, no texture, "
           "no colour, isolated on a pure white background, centered, whole subject visible with generous margins, "
           "no text, no frame")

SPECIES = {
    "olive": ("an olive tree with a gnarled twisted trunk and a soft rounded crown of narrow leaves", "small olives"),
    "fig": ("a fig tree with a short trunk, spreading branches and broad lobed leaves", "ripe figs"),
    "pomegranate": ("a pomegranate tree with several slender trunks and a bushy crown of small leaves",
                    "round pomegranates with little crowns"),
    "date_palm": ("a date palm with a tall slender ringed trunk and a crown of long arching feathery fronds",
                  "hanging clusters of dates"),
    "sidr": ("a sidr (Ziziphus) tree with a short sturdy trunk and a dense wide umbrella-shaped crown of tiny round leaves",
             "small round jujube fruits"),
}

GROUND = "standing on a small low mound of earth"
STAGES = [
    lambda d, f: f"a single seed half-buried in a small low mound of earth, tiny, nothing growing yet",
    lambda d, f: f"a tiny sprout with two small rounded seed leaves on a thin stem rising from a small low mound of earth",
    lambda d, f: f"a young shoot with a thin stem and four small leaves rising from a small low mound of earth",
    lambda d, f: f"a small sapling of {d.split(' with ')[0][2:].strip()} with a slender stem and a few sparse leafy twigs, {GROUND}",
    lambda d, f: f"a young tree: {d}, still small and thin with a modest crown, {GROUND}",
    lambda d, f: f"a growing tree: {d}, with a fuller crown, {GROUND}",
    lambda d, f: f"a mature tree: {d}, with a broad lush crown, {GROUND}",
    lambda d, f: f"a mature fruiting tree: {d}, with a broad lush crown hung with {f} shown as small round shapes, {GROUND}",
]

LEAVES = {
    "olive": "a single narrow lance-shaped olive leaf",
    "fig": "a single fig leaf with five rounded lobes",
    "pomegranate": "a single slender oblong pomegranate leaf",
    "sidr": "a single small oval jujube leaf with three veins from the base",
    "date_palm": "a small sprig of a date palm frond with five long narrow pointed leaflets",
    "grape": "a single grape vine leaf with five pointed lobes",
    "almond": "a single slender almond leaf with a finely serrated edge",
    "mulberry": "a single heart-shaped mulberry leaf with a serrated edge",
}
LEAF_STYLE = ("flat minimal vector silhouette, two flat tones: the left half of the blade near-black, the right half "
              "dark grey, the midrib and a few side veins as thin white lines, short stem at the bottom, the leaf upright "
              "with its tip pointing up, crisp clean edges, no texture, no gradients, no colour, isolated on a pure white "
              "background, centered with generous margins, no text, no frame")


def tree_job(sp, stage, seed, style=STYLE, tag=""):
    d, f = SPECIES[sp]
    return {"name": f"v5/tree{tag}/{sp}_{stage}_{seed}", "seed": seed, "w": 896, "h": 1152,
            "prompt": f"{STAGES[stage](d, f).capitalize()}. {style}."}


# Зерно и росток: в общем стиле слова о кроне и стволе сбивали модель на целое
# дерево — у малых стадий свой короткий стиль и прямой запрет на деревья.
SMALL_STYLE = ("flat minimal vector silhouette illustration, monochrome grayscale with two or three flat tones, crisp "
               "clean smooth shapes, no outlines, no texture, no gradients, no colour, isolated on a pure white "
               "background, centered, small subject in the lower middle, nothing else in the picture, no trees, "
               "no bushes, no text, no frame")
SMALL = [
    "A small low rounded mound of earth with a single oval seed resting on top of it, half sunk into the soil",
    "A tiny seedling: a short thin curved stem with exactly two small rounded seed leaves, "
    "growing out of a small low rounded mound of earth",
]


def small_job(stage, seed):
    return {"name": f"v5/small/s{stage}_{seed}", "seed": seed, "w": 896, "h": 1152,
            "prompt": f"{SMALL[stage]}. {SMALL_STYLE}."}


def leaf_job(name, seed):
    return {"name": f"v5/leaf/{name}_{seed}", "seed": seed, "w": 768, "h": 768,
            "prompt": f"{LEAVES[name].capitalize()}. {LEAF_STYLE}."}


if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "test":
        jobs = [tree_job("olive", s, 5101) for s in (2, 5, 7)] + [tree_job("olive", s, 5101, STYLE_B, "_b") for s in (2, 5, 7)]
        jobs += [leaf_job(n, 5201) for n in ("olive", "fig", "grape")]
    elif mode == "small":
        jobs = [small_job(st, seed) for st in (0, 1) for seed in (5301, 5302, 5303)]
    elif mode == "trees":
        jobs = [tree_job(sp, st, seed) for sp in SPECIES for st in range(8) for seed in (5101,)]
    else:
        jobs = [leaf_job(n, seed) for n in LEAVES for seed in (5201, 5202)]
    print(json.dumps(jobs, ensure_ascii=False, indent=1))

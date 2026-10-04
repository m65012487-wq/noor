"""v4: листья-вход по породам и лейка полива.

python prompts_v4.py → v4_jobs.json рядом; затем comfy_gen.py v4_jobs.json и build_v4.py.
"""
import json, pathlib

BG = ("isolated on a plain flat uniform light grey background, centered, whole object fully visible with generous margins, "
      "no shadow, no text, no frame, no signature")
PAINT = "refined botanical illustration, delicate gouache painting, crisp clean edges, soft natural shading, fine detail"

LEAVES = {
    "olive": "A single narrow lance-shaped olive leaf, deep sage green upper surface with a faint silvery sheen along the edge, "
             "fine central vein, short stem at the bottom, the leaf standing upright with its tip pointing up",
    "fig": "A single fresh fig leaf with five rounded lobes, rich green with pale yellow-green veins radiating from the stalk, "
           "short stalk at the bottom, upright",
    "pomegranate": "A single glossy oblong pomegranate leaf, bright fresh green, slightly wavy edge, thin central vein, "
                   "short reddish stalk at the bottom, upright",
    "date_palm": "A small sprig of a date palm frond: a short green midrib with five long narrow pointed leaflets fanning upward, "
                 "upright",
    "sidr": "A single small oval jujube leaf (sidr, Ziziphus) with three prominent veins running from the base, glossy green, "
            "short stalk at the bottom, upright",
}

CANS = {
    "copper": "A small elegant vintage copper watering can seen exactly from the side, slender long spout pointing to the left "
              "and slightly up, ending with a round sprinkler rose head, an arched handle over the top and a curved handle at the back, "
              "warm polished copper with soft highlights and a thin brass band",
    "sage": "A small elegant enamel watering can in soft sage green seen exactly from the side, slender long spout pointing to the "
            "left and slightly up, ending with a round brass sprinkler rose head, an arched handle over the top and a curved handle "
            "at the back, brass rim details",
    "brass": "A small elegant antique brass watering can seen exactly from the side, slender long spout pointing to the left and "
             "slightly up, ending with a round sprinkler rose head, an arched handle over the top and a curved handle at the back, "
             "warm golden brass with soft highlights",
}

jobs = []
for sp, text in LEAVES.items():
    for seed in (4101, 4102, 4103):
        jobs.append({"name": f"v4/leaf/{sp}_{seed}", "seed": seed, "w": 1024, "h": 1024,
                     "prompt": f"{text}. {PAINT}, {BG}."})
for kind, text in CANS.items():
    for seed in ((4201, 4202, 4203, 4204) if kind == "copper" else (4211, 4212)):
        jobs.append({"name": f"v4/can/{kind}_{seed}", "seed": seed, "w": 1280, "h": 896,
                     "prompt": f"{text}. {PAINT}, {BG}, no water, no plants."})
out = pathlib.Path(__file__).with_name("v4_jobs.json")
out.write_text(json.dumps(jobs, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(jobs), out)

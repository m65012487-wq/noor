"""Фоны тем и ворота. python prompts_scenes.py day|phases|gate > jobs.json"""
import json, sys

STYLE = ("Storybook gouache painting, soft painterly brushwork, calm serene atmosphere, muted harmonious colors, "
         "gentle depth, no people, no animals, no text, no frame")
LAYOUT = ("Tall vertical view. The horizon sits at about 55% of the height. The lower-center foreground is an open, "
          "empty, softly lit clearing with nothing standing in it, framed by vegetation at the left and right edges.")
SCENES = {
    "garden": "A quiet walled Islamic garden: a soft grassy clearing with a pale gravel path, slender cypress trees and "
              "flowering jasmine and rose shrubs at the sides, a low sandstone wall with a distant turquoise-tiled arch, "
              "gentle hills beyond",
    "oasis": "A desert oasis: a sandy clearing near a calm turquoise pool reflecting the sky, clusters of date palms at the "
             "left and right sides, soft golden dunes rolling into the distance, a faint silhouette of a small domed "
             "mosque with a slender minaret far away on the horizon",
    "highlands": "A Caucasus mountain meadow: a green alpine clearing with scattered wildflowers, a few pines and old apple "
                 "trees at the sides, a winding stream, forested slopes and majestic snow-capped twin peaks of Elbrus in the "
                 "distance",
}
PHASES = {
    "dawn": "at early dawn before sunrise: soft rose-pink and pale lavender sky, first warm glow on the horizon, "
            "light mist lying low over the ground, cool soft shadows",
    "sunset": "at golden sunset: warm amber and coral sky, long soft shadows, golden rim light on the foliage",
    "night": "on a calm moonlit night: deep teal-blue sky full of soft stars, a thin crescent moon, cool silver "
             "moonlight on the scene, gentle darkness but the clearing is still readable",
}
KEEP = " Keep the composition, every object, and the painting style exactly the same."


def day():
    return [{"name": f"themes/{t}/day", "seed": 300 + i, "w": 1024, "h": 1792,
             "prompt": f"{desc}, in soft clear morning daylight with a pale blue sky. {LAYOUT} {STYLE}."}
            for i, (t, desc) in enumerate(SCENES.items())]


def phases():
    # img2img по дневному кадру: тот же вид, другой свет. Сила 0.62 — ниже небо
    # не успевает перекраситься, выше начинает переписываться композиция.
    return [{"name": f"themes/{t}/{p}", "seed": 400, "w": 1024, "h": 1792, "init": f"themes/{t}/day.png",
             "denoise": 0.62, "prompt": f"{desc}, {text}. {LAYOUT} {STYLE}."}
            for t, desc in SCENES.items() for p, text in PHASES.items()]


GATE = ("A symmetrical ornate Islamic garden gateway seen straight from the front: a tall pointed horseshoe arch of "
        "carved warm sandstone with a band of turquoise and white geometric zellige tiles, slender columns at both sides, "
        "small climbing jasmine at the base")


def gate():
    return [
        {"name": "gate/arch_empty", "seed": 501, "w": 1024, "h": 1216,
         "prompt": f"{GATE}. The arch opening is completely empty and open, no doors, you see the plain flat background "
                   f"through it. Storybook gouache painting, clean elegant silhouette. Isolated on a plain flat light grey "
                   f"background, no ground, no shadow, no text."},
    ]


def gate_doors():
    return [{"name": "gate/arch_closed", "seed": 502, "w": 1024, "h": 1216, "ref": "gate/arch_empty.png",
             "prompt": "Fill the arch opening exactly with two tall closed double wooden doors meeting in the middle, dark "
                       "walnut wood with a carved eight-pointed star geometric lattice and small brass studs, their top "
                       "following the pointed arch shape." + KEEP}]


if __name__ == "__main__":
    print(json.dumps({"day": day, "phases": phases, "gate": gate, "doors": gate_doors}[sys.argv[1]](), ensure_ascii=False, indent=1))

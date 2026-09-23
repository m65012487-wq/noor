"""v3: сезонный сад тасбиха и ворота для каждой темы.

python prompts_v3.py garden|seasons|gates|doors > jobs.json
"""
import json, sys

STYLE = ("Storybook gouache painting, soft painterly brushwork, calm serene atmosphere, muted harmonious colors, "
         "gentle depth, no people, no animals, no text, no frame, no signature")
GARDEN = ("Inside an enclosed Persian paradise garden: a soft open clearing of short grass in the lower-center "
          "foreground with nothing standing in it, a pale stone path leading back to a small tiled fountain, flowerbeds, "
          "slender cypresses and fruit trees along the sides, high warm stone walls with arched niches around the garden. "
          "Tall vertical view, the horizon of the walls at about 50% of the height")
SEASONS = {
    "summer": "in high summer: lush deep green foliage, blooming roses, warm clear daylight, pale blue sky",
    "spring": "in early spring: fresh light-green young leaves, almond and apricot trees in pink and white blossom, "
              "petals drifting, soft fresh daylight",
    "autumn": "in golden autumn: foliage turned amber, orange and crimson, fallen leaves scattered on the grass and "
              "path, warm low golden light",
    "winter": "in quiet winter: a light blanket of fresh snow on the ground, walls and branches, bare fruit trees, "
              "dark green cypresses dusted with snow, soft cool pale light, the clearing covered in snow",
}


def garden():
    return [{"name": "v3/garden/summer", "seed": 610, "w": 1024, "h": 1792,
             "prompt": f"{GARDEN}, {SEASONS['summer']}. {STYLE}."}]


def seasons():
    return [{"name": f"v3/garden/{s}", "seed": 611, "w": 1024, "h": 1792, "init": "v3/garden/summer.png",
             "denoise": 0.64, "prompt": f"{GARDEN}, {text}. {STYLE}."}
            for s, text in SEASONS.items() if s != "summer"]


ISO = ("Seen straight from the front, symmetrical, standing on its own small patch of ground that fades out softly at "
       "the edges. The arch opening is completely empty and open, no doors, you see the plain flat background through "
       "it. Storybook gouache painting, clean elegant silhouette. Isolated on a plain flat light grey background, "
       "no sky, no shadow on the background, no text.")
GATES = {
    "garden": "A Moorish garden gateway set in a short segment of warm sandstone garden wall: a pointed horseshoe arch "
              "with a band of turquoise zellige tiles, climbing jasmine and pink roses over the wall, a low bed of grass "
              "and flowers at its base",
    "oasis": "A desert oasis gateway of smooth sun-baked adobe mud brick with a tall rounded arch, simple carved "
             "geometric relief, a short adobe wall at both sides, young date palm fronds and desert shrubs at its base "
             "on a patch of golden sand",
    "highlands": "An old mountain garden gateway of rough grey fieldstone with a rounded arch, overgrown with ivy and "
                 "moss, low dry-stone walls at both sides, wildflowers, ferns and mossy rocks at its base on a patch of "
                 "green meadow grass",
}
DOORS = {
    "garden": "two tall closed double wooden doors of dark walnut with a carved eight-pointed star lattice and small "
              "brass studs",
    "oasis": "two tall closed double doors of dark weathered palm wood with carved geometric panels and iron studs",
    "highlands": "two tall closed double doors of dark oak planks with forged black iron hinges and a ring handle",
}


def gates():
    return [{"name": f"v3/gate/{t}/empty_{v}", "seed": 700 + i * 10 + v, "w": 1024, "h": 1216,
             "prompt": f"{desc}. {ISO}"} for i, (t, desc) in enumerate(GATES.items()) for v in (1, 2)]


def doors(pick):
    """pick: {"garden": 1, ...} — какой из двух вариантов арки взят."""
    return [{"name": f"v3/gate/{t}/closed", "seed": 720, "w": 1024, "h": 1216, "ref": f"v3/gate/{t}/empty_{pick[t]}.png",
             "prompt": f"Fill the arch opening exactly with {DOORS[t]} meeting in the middle, their top following the "
                       f"arch shape. Keep the composition, every object, and the painting style exactly the same."}
            for t in GATES]


if __name__ == "__main__":
    what = sys.argv[1]
    jobs = doors(json.loads(sys.argv[2])) if what == "doors" else globals()[what]()
    print(json.dumps(jobs, ensure_ascii=False, indent=1))

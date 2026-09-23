"""Промпты ассетов тасбиха. Запуск: python prompts.py <style_key> > jobs.json"""
import json, sys

STYLES = {
    "A": "Storybook gouache painting, soft painterly brushwork, gentle warm light from upper left, elegant clean silhouette",
    "B": "Stylized 3D miniature diorama render, soft matte clay materials, subtle ambient occlusion, soft studio lighting, calm and elegant",
    "C": "Refined Persian miniature illustration, delicate fine linework, flat muted colors with subtle gold leaf accents, ornamental elegance",
    "D": "Luminous botanical watercolor illustration with fine ink details, crisp edges, soft muted natural palette",
}
ISOLATE = ("The whole plant fully visible and centered with generous margin, standing upright, "
           "isolated on a plain flat light grey background, no shadow on the background, no glow, no border, no text.")

MOUND = "on a small round mound of dark rich earth"
SPECIES = {
    "olive": {
        "look": "olive tree (Olea europaea) with silvery grey-green narrow leaves and a gnarled silver-brown trunk",
        "stages": [
            "A single olive pit seed half buried in a tiny mound of dark rich earth, one tiny green shoot tip just peeking out",
            "A tiny olive sprout with two small silvery-green leaves on a thin stem, " + MOUND,
            "A small olive seedling with a slender stem and a few pairs of narrow silvery-green leaves, " + MOUND,
            "A young olive sapling with a thin straight trunk and a few small leafy branches, " + MOUND,
            "A young olive tree with a slim slightly twisting trunk and a small rounded canopy of silvery-green leaves, " + MOUND,
            "A growing olive tree with a thicker gently twisting trunk and a fuller rounded canopy of silvery-green leaves, " + MOUND,
            "A mature ancient olive tree with a thick gnarled twisting trunk and a broad rounded canopy of silvery-green leaves, " + MOUND,
            "A mature ancient olive tree with a thick gnarled twisting trunk and a broad canopy of silvery-green leaves heavy with clusters of ripe dark purple and green olives, " + MOUND,
        ],
    },
    "date_palm": {
        "look": "date palm (Phoenix dactylifera) with long arching feathery green fronds and a textured diamond-patterned trunk",
        "stages": [
            "A single date seed half buried in a tiny mound of sandy earth, one tiny green shoot tip just peeking out",
            "A tiny date palm sprout, a single thin grass-like green leaf, on a small mound of sandy earth",
            "A small date palm seedling with three narrow folded green leaves, on a small mound of sandy earth",
            "A young date palm with a short fan of stiff arching green fronds and no visible trunk yet, on a small mound of sandy earth",
            "A young date palm with a short thick textured trunk and a crown of arching feathery green fronds, on a small mound of sandy earth",
            "A growing date palm with a medium tall textured trunk and a full crown of long arching feathery fronds, on a small mound of sandy earth",
            "A tall mature date palm with a tall slender diamond-textured trunk and a lush crown of long arching feathery fronds, on a small mound of sandy earth",
            "A tall mature date palm with a tall slender diamond-textured trunk, a lush crown of arching fronds and heavy hanging clusters of ripe golden-orange dates, on a small mound of sandy earth",
        ],
    },
    "pomegranate": {
        "look": "pomegranate tree (Punica granatum) with glossy small bright green leaves and a slender multi-stemmed trunk",
        "stages": [
            "A single pomegranate seed, a small ruby-red aril, half buried in a tiny mound of dark rich earth, one tiny green shoot tip just peeking out",
            "A tiny pomegranate sprout with two small glossy green leaves on a thin reddish stem, " + MOUND,
            "A small pomegranate seedling with a thin reddish stem and several pairs of small glossy green leaves, " + MOUND,
            "A young pomegranate sapling with a thin trunk and a few small leafy branches, " + MOUND,
            "A young pomegranate tree with a slim trunk and a small rounded canopy of glossy green leaves with a few red-orange flower buds, " + MOUND,
            "A growing pomegranate tree with a slender branching trunk, a fuller canopy of glossy green leaves and bright red-orange trumpet flowers, " + MOUND,
            "A mature pomegranate tree with an elegant multi-stemmed trunk and a lush rounded canopy of glossy green leaves with red-orange flowers, " + MOUND,
            "A mature pomegranate tree with an elegant multi-stemmed trunk and a lush canopy of glossy green leaves hanging with many large ripe crimson pomegranate fruits, " + MOUND,
        ],
    },
    "fig": {
        "look": "fig tree (Ficus carica) with large lobed bright green leaves and smooth pale grey bark",
        "stages": [
            "A single tiny fig seed half buried in a tiny mound of dark rich earth, one tiny green shoot tip just peeking out",
            "A tiny fig sprout with two small rounded green leaves on a thin stem, " + MOUND,
            "A small fig seedling with a thin stem and a few small lobed green leaves, " + MOUND,
            "A young fig sapling with a thin smooth grey trunk and several large lobed green leaves, " + MOUND,
            "A young fig tree with a smooth pale grey trunk and a small spreading canopy of large lobed green leaves, " + MOUND,
            "A growing fig tree with a smooth pale grey branching trunk and a wide spreading canopy of large lobed green leaves, " + MOUND,
            "A mature fig tree with a thick smooth pale grey branching trunk and a broad lush spreading canopy of large lobed green leaves, " + MOUND,
            "A mature fig tree with a thick smooth pale grey branching trunk and a broad lush canopy of large lobed green leaves with many ripe purple figs, " + MOUND,
        ],
    },
    "sidr": {
        "look": "sidr lote tree (Ziziphus spina-christi) with small oval glossy leaves and a graceful dark twisting trunk, touched with soft golden light",
        "stages": [
            "A single small sidr seed glowing faintly golden, half buried in a tiny mound of dark rich earth, one tiny green shoot tip just peeking out",
            "A tiny sidr sprout with two small oval glossy leaves on a thin stem with a faint golden glint, " + MOUND,
            "A small sidr seedling with a thin zigzag stem and several small oval glossy leaves, " + MOUND,
            "A young sidr sapling with a thin dark zigzag trunk and a few small leafy branches, " + MOUND,
            "A young sidr tree with a slim dark trunk and a small rounded canopy of small glossy leaves with tiny pale golden blossoms, " + MOUND,
            "A growing sidr tree with a graceful dark twisting trunk and a fuller canopy of small glossy leaves with pale golden blossoms, " + MOUND,
            "A majestic mature sidr lote tree with a graceful dark twisting trunk and a wide dome-shaped canopy of small glossy leaves dusted with pale golden blossoms, " + MOUND,
            "A majestic mature sidr lote tree with a graceful dark twisting trunk and a wide dome-shaped canopy of small glossy leaves with many small round golden-amber fruits, softly luminous, " + MOUND,
        ],
    },
}

SEEDS = {
    "olive": "a single glossy olive pit seed, oval, warm brown with fine ridges",
    "date_palm": "a single date seed, elongated with a groove, warm tan",
    "pomegranate": "a single glossy ruby-red pomegranate aril seed, translucent jewel-like",
    "fig": "a small ripe halved fig showing pink seedy interior",
    "sidr": "a single small round sidr seed glowing with soft golden light, precious",
}


def trees(style, seed=100, species=None):
    jobs = []
    for sp, data in SPECIES.items():
        if species and sp not in species:
            continue
        for i, stage in enumerate(data["stages"], 1):
            # Описание взрослой породы (ствол, крона) на ранних стадиях сбивает модель:
            # вместо ростка она рисует маленькое дерево. Там — только «крошечное растение».
            about = (f"The plant is a {data['look']}." if i >= 4 else
                     "Close-up view of a tiny delicate young plant only: it is NOT a tree, it has no trunk, "
                     "no bark and no branches.")
            jobs.append({"name": f"trees/{sp}/stage_{i}", "seed": seed + i,
                         "prompt": f"{stage}. {about} {STYLES[style]}. {ISOLATE}",
                         "w": 1024, "h": 1280, "cutout": False})
    return jobs


def seeds(style):
    return [{"name": f"seeds/{sp}", "seed": 7, "w": 1024, "h": 1024, "cutout": False,
             "prompt": f"A game item icon: {desc}, centered, seen from a slight angle. {STYLES[style]}. "
                       "Isolated on a plain flat light grey background, no shadow, no text."}
            for sp, desc in SEEDS.items()]


if __name__ == "__main__":
    style = sys.argv[1]
    which = sys.argv[2] if len(sys.argv) > 2 else "trees"
    jobs = trees(style, species=sys.argv[3].split(",") if len(sys.argv) > 3 else None) if which == "trees" else seeds(style)
    print(json.dumps(jobs, ensure_ascii=False, indent=1))

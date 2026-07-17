# NoorDot — dot-matrix font generator

`assets/fonts/NoorDot.ttf` is a dot-matrix display font used by the flat
"Dot" theme (headings, prayer times, countdown). It covers digits, Latin and
full Cyrillic (upper + lower map to the same uppercase shapes).

## How it's made
It is generated, not hand-drawn: each glyph of **PT Sans Bold** is rasterized
onto a 9-row cap-height grid (with 1 row above for Й/Ё and 2 below for Ц/Щ/Д
tails), then every "on" cell becomes a round dot. Output is a normal TTF built
with `opentype.js`.

## Regenerate
```
cd scripts/font
npm init -y && npm install opentype.js@1.3.4
# download the source face next to the scripts:
curl -sL "https://raw.githubusercontent.com/google/fonts/main/ofl/ptsans/PT_Sans-Web-Bold.ttf" -o ptsans-bold.ttf
node generate.js            # writes NoorDot.ttf here; copy it to assets/fonts/
node raster.js "АБВ..."     # ASCII preview of any letters
```

## License
Derived from PT Sans (© ParaType, SIL Open Font License 1.1). The license text
is kept alongside the font at `assets/fonts/NoorDot-OFL.txt`. "PT Sans" is a
reserved name under the OFL; this derivative is renamed "NoorDot".

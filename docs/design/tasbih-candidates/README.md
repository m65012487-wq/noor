# Generated olive originals

Update: at the user's explicit request these five images are now copied to
`assets/tasbih/tree/olive_stage_01.png` through `olive_stage_05.png` and registered
in `src/tasbih/assets.js`. Per-stage scale aligns their visual growth. The soft
translucent edges remain part of the supplied artwork. The review below is
historical; SVGs remain available for the separate garden prototype.

Built-in imagegen generated five botanical PNGs, 1024×1536, numbered seed → sprout → young plant → juvenile tree → mature tree. These are stored here as design candidates, not referenced by Metro or shipped in the IPA.

QA rejected them for integration: colored translucent halos outside the silhouette; young stages larger and woodier than requested; inconsistent physical scale/root placement. Alpha exists, but alpha alone does not mean a clean cutout. A targeted background-extraction generation still retained haze, so it was not substituted.

The working five SVG stages in `assets/garden/plants/olive/` remain authoritative. Do not blindly replace them with these PNGs. Clean silhouettes, consistent canvas/root and approved style are prerequisites.

## Prompts

Tool: built-in imagegen, no external API/CLI.

Mature: production transparent PNG botanical cutout for Noor calm premium mobile Tasbih environment. Single mature small olive tree, slender naturally curved gray brown trunk splitting into delicate curved branches, compact irregular airy crown of grouped silver sage and muted olive leaves, restrained painterly botanical realism. Soft neutral diffuse light upper left. Transparent alpha including spaces among branches. No sky, scenery, soil, pot, shadow plate, UI or text. Portrait 1024×1536; root x50% y90%, crown y18%, foliage x15–85%, generous padding.

Young/juvenile: mature image as style reference only, preserve palette and lighting, transparent PNG, no haze/halo/glow/background/ground. Same full canvas and root x50% y90%. Young: slender bending stem, four short branches, sparse lanceolate leaves, x40–60%, top y62%. Juvenile: three curved major branches, small loose crown, x28–72%, top y38%.

Seed: single tiny natural olive stone, muted brown oval tapered botanical illustration. Transparent alpha, no glow/haze/shadow/ground/scenery/text. Portrait 1024×1536, x50% y89%, width7%, height3%, all other pixels fully transparent; not fruit/tree.

Sprout: delicate newly germinated olive, thin green stem, exactly four narrow silver-green leaves, no woody trunk/bark/big branches/exposed roots. Matte botanical illustration. Transparent alpha, crisp edges, no halo/haze/shadow/soil/background/UI/text. Portrait 1024×1536, base x50% y90%, top y76%, width12%, empty transparent space above.

Extraction retry: remove all diffuse colored halo, keep only four solid leaves/thin stem and crisp antialiased cutout; outside silhouette alpha zero, no black paint/translucent green; preserve canvas and position. Retry rejected, original candidate kept.

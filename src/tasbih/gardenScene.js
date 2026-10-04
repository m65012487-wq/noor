// Свой фон экрана тасбиха — сад, а не обои главного экрана: кипарисы и кусты
// по краям и внизу, середина пустая под дерево, верх — под поминание и счётчик.
// Три плана параллакса, белые с альфой; цвет даёт схема, как всем сценам.
// Рисунок — Krea-2 (scripts/tasbih_assets/prompts_wall_v5.py garden),
// планы режет build_scenes_v5.py.
export const GARDEN_SCENE = [
  require('../../assets/scenes/tasbih-garden-1.png'),
  require('../../assets/scenes/tasbih-garden-2.png'),
  require('../../assets/scenes/tasbih-garden-3.png'),
];

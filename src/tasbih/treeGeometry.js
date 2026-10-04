import { TREE_BOUNDS, TREE_CANVAS } from './treeArt';

// Силуэт дерева — картинка холста 240×300 с resizeMode contain: холст вписан
// в область по центру, масштаб один на обе оси.
// Эффекты поверх дерева (листья, полив) живут в координатах области, поэтому
// переводят точки холста тем же способом.
const FALLBACK = { x: 98, y: 240, width: 44, height: 39 };

// area — размер области дерева в пикселях ({ width, height }); до первого
// onLayout он нулевой, и тогда геометрии ещё нет.
export function treeGeometry(species, stage, area) {
  const width = area?.width || 0;
  const height = area?.height || 0;
  if (!(width > 0 && height > 0)) return null;
  const scale = Math.min(width / TREE_CANVAS.width, height / TREE_CANVAS.height);
  const left = (width - TREE_CANVAS.width * scale) / 2;
  const top = (height - TREE_CANVAS.height * scale) / 2;
  const b = TREE_BOUNDS[species]?.[stage] || FALLBACK;
  return {
    width, height, scale,
    // Корень дерева — точка, куда падает вода и от которой дерево «вздыхает».
    root: { x: left + TREE_CANVAS.baseX * scale, y: top + TREE_CANVAS.baseY * scale },
    // Центр кроны: чуть выше середины силуэта, там листва гуще всего.
    crown: {
      x: left + (b.x + b.width / 2) * scale,
      y: top + (b.y + b.height * 0.35) * scale,
      width: b.width * scale,
      height: b.height * scale,
    },
    // Верхний край силуэта.
    top: top + b.y * scale,
    // Зерно: кроны нет, всё происходит у земли.
    seed: stage === 0,
  };
}

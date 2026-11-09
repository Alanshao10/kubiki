// Кубики — песочница от первого лица для планшета.
// Мир, текстуры и управление сделаны «как в Minecraft», но крупно и просто.

import * as THREE from "three";

// ------------------------------------------------------------------ блоки

const TILE = 16;
const COLS = 4;
const ROWS = 4;

// индексы плиток в атласе
const T = {
  grassTop: 0, grassSide: 1, dirt: 2, stone: 3,
  sand: 4, woodTop: 5, woodSide: 6, leaves: 7,
  brick: 8, water: 9, planksTex: 10, cobble: 11, torch: 12, glass: 13,
};

const TYPES = [
  { name: "трава",  top: T.grassTop, side: T.grassSide, bottom: T.dirt, inPalette: true },
  { name: "земля",  top: T.dirt, side: T.dirt, bottom: T.dirt, inPalette: true },
  { name: "камень", top: T.stone, side: T.stone, bottom: T.stone, inPalette: true },
  { name: "песок",  top: T.sand, side: T.sand, bottom: T.sand, inPalette: true },
  { name: "дерево", top: T.woodTop, side: T.woodSide, bottom: T.woodTop, inPalette: true },
  { name: "листва", top: T.leaves, side: T.leaves, bottom: T.leaves, inPalette: true },
  { name: "кирпич", top: T.brick, side: T.brick, bottom: T.brick, inPalette: true },
  { name: "доски",  top: T.planksTex, side: T.planksTex, bottom: T.planksTex, inPalette: true },
  { name: "вода",   top: T.water, side: T.water, bottom: T.water, inPalette: false },
  { name: "факел",  top: T.torch, side: T.torch, bottom: T.torch, inPalette: false },
];

const GRASS = 0, DIRT = 1, STONE = 2, SAND = 3, WOOD = 4, LEAF = 5, BRICK = 6, PLANKS = 7, WATER = 8, TORCH = 9;

// ------------------------------------------------------------------ атлас текстур

function rnd(min, max) { return min + Math.random() * (max - min); }

function paintTile(ctx, ox, oy, painter) {
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const c = painter(x, y);
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

const hsl = (h, s, l) => `hsl(${h}, ${s}%, ${l}%)`;

function buildAtlas() {
  const canvas = document.createElement("canvas");
  canvas.width = COLS * TILE;
  canvas.height = ROWS * TILE;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const pos = (tile) => ({ x: (tile % COLS) * TILE, y: Math.floor(tile / COLS) * TILE });

  const paint = (tile, fn) => {
    const p = pos(tile);
    paintTile(ctx, p.x, p.y, fn);
  };

  // трава сверху
  paint(T.grassTop, () => hsl(96 + rnd(-8, 8), 52 + rnd(-6, 6), 38 + rnd(-5, 6)));
  // земля
  paint(T.dirt, () => hsl(27 + rnd(-4, 4), 38 + rnd(-5, 5), 30 + rnd(-4, 5)));
  // бок травы: сверху зелёная кромка, ниже земля
  paint(T.grassSide, (x, y) => {
    const edge = 3 + Math.floor(rnd(0, 2));
    if (y < edge) return hsl(96 + rnd(-8, 8), 52, 38 + rnd(-4, 5));
    if (y === edge) return hsl(90, 40, 30 + rnd(-3, 3));
    return hsl(27 + rnd(-4, 4), 38, 30 + rnd(-4, 5));
  });
  // камень
  paint(T.stone, (x, y) => {
    const r = Math.random();
    if (r > 0.92) return hsl(210, 5, 42);
    if (r > 0.84) return hsl(210, 5, 64);
    return hsl(210, 4, 52 + rnd(-4, 4));
  });
  // песок
  paint(T.sand, () => hsl(47 + rnd(-4, 4), 55, 72 + rnd(-4, 4)));
  // торец дерева — кольца
  paint(T.woodTop, (x, y) => {
    const d = Math.abs(x - 7.5) + Math.abs(y - 7.5);
    return hsl(30, 42, d < 2 ? 46 : d < 4 ? 38 : d < 6 ? 42 : 34);
  });
  // кора
  paint(T.woodSide, (x, y) => {
    if (x % 4 === 0) return hsl(26, 38, 24);
    return hsl(28 + rnd(-3, 3), 36, 32 + rnd(-4, 4));
  });
  // листва с дырками
  paint(T.leaves, () => {
    if (Math.random() < 0.12) return null;
    return hsl(104 + rnd(-10, 10), 45 + rnd(-8, 8), 26 + rnd(-6, 8));
  });
  // кирпич
  paint(T.brick, (x, y) => {
    const row = Math.floor(y / 4);
    const shift = row % 2 === 0 ? 0 : 4;
    if (y % 4 === 3) return hsl(30, 12, 78);
    if ((x + shift) % 8 === 7) return hsl(30, 12, 78);
    return hsl(6 + rnd(-3, 3), 46, 44 + rnd(-4, 4));
  });
  // вода
  paint(T.water, (x, y) => {
    if ((x + y * 2) % 11 === 0) return hsl(205, 70, 66);
    return hsl(208 + rnd(-4, 4), 65, 52 + rnd(-4, 4));
  });
  // доски
  paint(T.planksTex, (x, y) => {
    if (y % 5 === 0) return hsl(28, 35, 34);
    return hsl(31 + rnd(-3, 3), 38, 44 + rnd(-3, 3));
  });
  // факел: светящееся пламя
  paint(T.torch, (x, y) => {
    const d = Math.hypot(x - 7.5, y - 7.5);
    if (d < 2.6) return hsl(52, 100, 88);
    if (d < 4.2) return hsl(42, 100, 70);
    if (d < 5.6) return hsl(32, 95, 56);
    return hsl(28, 60, 34);
  });
  // булыжник
  paint(T.cobble, (x, y) => {
    const r = Math.random();
    if (r > 0.9) return hsl(210, 4, 38);
    return hsl(210, 4, 50 + rnd(-6, 6));
  });

  return canvas;
}

// ------------------------------------------------------------------ мир

const BOUND = { x: 30, y: 20, z: 30 };
const world = new Map();

const key = (x, y, z) => `${x},${y},${z}`;
const inside = (x, y, z) =>
  x >= -BOUND.x && x <= BOUND.x && z >= -BOUND.z && z <= BOUND.z && y >= -10 && y <= BOUND.y;

function setBlock(x, y, z, type) {
  if (!inside(x, y, z)) return false;
  world.set(key(x, y, z), type);
  return true;
}
function delBlock(x, y, z) { world.delete(key(x, y, z)); }
function isSolid(x, y, z) {
  return world.has(key(Math.floor(x), Math.floor(y), Math.floor(z)));
}

function terrainHeight(x, z) {
  const h =
    Math.sin(x * 0.16) * 1.6 +
    Math.cos(z * 0.14) * 1.4 +
    Math.sin((x + z) * 0.07) * 2.2;
  return Math.max(0, Math.round(2.4 + h));
}

function plantTree(x, z) {
  const base = terrainHeight(x, z) + 1;
  const h = 4 + Math.floor(Math.random() * 2);
  for (let i = 0; i < h; i++) setBlock(x, base + i, z, WOOD);
  const top = base + h;
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      for (let dy = -2; dy <= 1; dy++) {
        const d = Math.abs(dx) + Math.abs(dz) + Math.abs(dy);
        if (d <= 3 && !(dx === 0 && dz === 0 && dy < 1)) {
          const yy = top + dy;
          if (!world.has(key(x + dx, yy, z + dz))) setBlock(x + dx, yy, z + dz, LEAF);
        }
      }
    }
  }
}


// ------------------------------------------------------------------ город

function fillArea(x1, y1, z1, x2, y2, z2, type) {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) setBlock(x, y, z, type);
    }
  }
}

function clearArea(x1, y1, z1, x2, y2, z2) {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) delBlock(x, y, z);
    }
  }
}

function flattenArea(x1, z1, x2, z2, level) {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) {
      clearArea(x, level + 1, z, x, BOUND.y, z);
      setBlock(x, level, z, GRASS);
      setBlock(x, level - 1, z, DIRT);
      setBlock(x, level - 2, z, STONE);
    }
  }
}

function buildHouse(x, z, w, d, h, level, wall, roof) {
  fillArea(x, level, z, x + w - 1, level, z + d - 1, PLANKS);

  for (let y = 1; y <= h; y++) {
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < d; j++) {
        const edge = i === 0 || j === 0 || i === w - 1 || j === d - 1;
        if (edge) setBlock(x + i, level + y, z + j, wall);
      }
    }
  }

  // дверной проём
  clearArea(x + Math.floor(w / 2), level + 1, z + d - 1, x + Math.floor(w / 2), level + 2, z + d - 1);

  // окна
  for (let i = 2; i < w - 2; i += 3) {
    clearArea(x + i, level + 2, z, x + i, level + 2, z);
    clearArea(x + i, level + 2, z + d - 1, x + i, level + 2, z + d - 1);
  }

  // крыша
  fillArea(x - 1, level + h + 1, z - 1, x + w, level + h + 1, z + d, roof);
  fillArea(x, level + h + 2, z, x + w - 1, level + h + 2, z + d - 1, roof);
}

function buildHall(x, z, w, d, h, level) {
  flattenArea(x - 2, z - 2, x + w + 1, z + d + 1, level);
  fillArea(x, level, z, x + w - 1, level, z + d - 1, STONE);

  // стены с колоннами и окнами
  for (let y = 1; y <= h; y++) {
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < d; j++) {
        const edge = i === 0 || j === 0 || i === w - 1 || j === d - 1;
        if (!edge) continue;
        const pillar = i % 3 === 0 && j % 3 === 0;
        if (pillar || y === h) {
          setBlock(x + i, level + y, z + j, STONE);
        } else if (y === 2 || y === 3) {
          setBlock(x + i, level + y, z + j, BRICK);
        } else {
          setBlock(x + i, level + y, z + j, STONE);
        }
      }
    }
  }

  // окна над дверью и по бокам
  for (let i = 1; i < w - 1; i++) {
    if (i % 3 === 0) continue;
    clearArea(x + i, level + 4, z, x + i, level + 4, z);
    clearArea(x + i, level + 4, z + d - 1, x + i, level + 4, z + d - 1);
  }

  // широкий вход
  const doorX = Math.floor(w / 2);
  clearArea(x + doorX - 1, level + 1, z + d - 1, x + doorX + 1, level + 3, z + d - 1);

  // второй этаж с отверстием под лестницу
  fillArea(x + 1, level + 5, z + 1, x + w - 2, level + 5, z + d - 2, PLANKS);
  clearArea(x + 2, level + 5, z + 2, x + 5, level + 5, z + 5);

  // лестница на второй этаж
  for (let s = 0; s < 5; s++) {
    setBlock(x + 2 + s, level + 1 + s, z + 2, STONE);
    setBlock(x + 2 + s, level + 1 + s, z + 3, STONE);
  }

  // крыша
  fillArea(x - 1, level + h + 1, z - 1, x + w, level + h + 1, z + d, BRICK);
  fillArea(x + 1, level + h + 2, z + 1, x + w - 2, level + h + 2, z + d - 2, BRICK);
  fillArea(x + 3, level + h + 3, z + 3, x + w - 4, level + h + 3, z + d - 4, BRICK);
}

function buildLamp(x, z, level) {
  setBlock(x, level + 1, z, WOOD);
  setBlock(x, level + 2, z, WOOD);
  setBlock(x, level + 3, z, TORCH);
}

function buildFountain(x, z, level) {
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      const d = Math.hypot(dx, dz);
      if (d < 1.6) setBlock(x + dx, level, z + dz, WATER);
      else if (d < 3.2) setBlock(x + dx, level, z + dz, STONE);
      if (d >= 2.4 && d < 3.2) setBlock(x + dx, level + 1, z + dz, STONE);
    }
  }
}

function buildCity() {
  const level = 4;

  // площадь и улицы
  flattenArea(-16, -8, 16, 16, level);
  fillArea(-2, level, -8, 2, level, 16, STONE);

  // главное здание — в него можно зайти
  buildHall(-13, -6, 12, 9, 7, level);

  // дома
  buildHouse(4, -6, 6, 5, 3, level, BRICK, BRICK);
  buildHouse(12, -6, 5, 5, 3, level, WOOD, BRICK);
  buildHouse(4, 4, 5, 5, 3, level, PLANKS, BRICK);
  buildHouse(12, 4, 6, 5, 4, level, STONE, BRICK);
  buildHouse(-6, 6, 5, 5, 3, level, BRICK, PLANKS);

  // фонтан в центре
  buildFountain(9, 11, level);

  // магазин с продавцом
  buildShop(-10, 12, level);

  // комнаты внутри домов
  furnish(4, -6, 6, 5, level, 3);
  furnish(12, -6, 5, 5, level, 3);
  furnish(4, 4, 5, 5, level, 3);
  furnish(12, 4, 6, 5, level, 4);
  furnish(-6, 6, 5, 5, level, 3);

  // фонари вдоль улицы
  for (let z = -6; z <= 14; z += 5) {
    buildLamp(-3, z, level);
    buildLamp(3, z, level);
  }
}



// ------------------------------------------------------------------ магазин и загон

function buildShop(x, z, level) {
  const w = 6;
  const d = 4;

  flattenArea(x - 1, z - 1, x + w, z + d + 1, level);
  fillArea(x, level, z, x + w - 1, level, z + d - 1, PLANKS);

  // задняя и боковые стены
  for (let y = 1; y <= 3; y++) {
    for (let i = 0; i < w; i++) setBlock(x + i, level + y, z, BRICK);
    for (let j = 0; j < d; j++) {
      setBlock(x, level + y, z + j, PLANKS);
      setBlock(x + w - 1, level + y, z + j, PLANKS);
    }
  }

  // прилавок
  for (let i = 1; i < w - 1; i++) {
    setBlock(x + i, level + 1, z + d - 1, WOOD);
  }

  // витрина: цветные блоки на прилавке
  setBlock(x + 1, level + 2, z + d - 1, SAND);
  setBlock(x + 2, level + 2, z + d - 1, BRICK);
  setBlock(x + 3, level + 2, z + d - 1, PLANKS);
  setBlock(x + 4, level + 2, z + d - 1, LEAF);

  // навес
  fillArea(x - 1, level + 3, z + d, x + w, level + 3, z + d + 1, BRICK);

  // фонари у входа
  setBlock(x - 1, level + 1, z + d + 1, WOOD);
  setBlock(x - 1, level + 2, z + d + 1, TORCH);
  setBlock(x + w, level + 1, z + d + 1, WOOD);
  setBlock(x + w, level + 2, z + d + 1, TORCH);
}

function buildPen(x, z, level) {
  const w = 11;
  const d = 9;

  flattenArea(x - 1, z - 1, x + w, z + d, level);

  // изгородь
  for (let i = 0; i < w; i++) {
    for (let y = 1; y <= 2; y++) {
      setBlock(x + i, level + y, z, WOOD);
      setBlock(x + i, level + y, z + d - 1, WOOD);
    }
  }
  for (let j = 0; j < d; j++) {
    for (let y = 1; y <= 2; y++) {
      setBlock(x, level + y, z + j, WOOD);
      setBlock(x + w - 1, level + y, z + j, WOOD);
    }
  }

  // ворота
  for (let y = 1; y <= 2; y++) {
    delBlock(x + 5, level + y, z + d - 1);
    delBlock(x + 6, level + y, z + d - 1);
  }

  // поилка и кормушка
  for (let i = 2; i <= 3; i++) setBlock(x + i, level, z + 2, WATER);
  setBlock(x + w - 3, level, z + 2, SAND);
  setBlock(x + w - 4, level, z + 2, SAND);
}

function furnish(x, z, w, d, level, h) {
  const midX = x + Math.floor(w / 2);

  // перегородка с проходом
  if (w >= 5) {
    for (let y = 1; y <= h; y++) {
      for (let j = 1; j < d - 1; j++) {
        if (j === Math.floor(d / 2)) continue;
        setBlock(midX, level + y, z + j, PLANKS);
      }
    }
  }

  // кровать
  for (let i = 1; i <= 2; i++) setBlock(x + i, level + 1, z + 1, BRICK);
  setBlock(x + 1, level + 1, z + 1, SAND);

  // стол и стул
  setBlock(x + w - 2, level + 1, z + 2, WOOD);
  setBlock(x + w - 2, level + 2, z + 2, TORCH);
  setBlock(x + w - 3, level + 1, z + 2, PLANKS);

  // сундук
  setBlock(x + w - 2, level + 1, z + d - 2, BRICK);
  setBlock(x + w - 2, level + 2, z + d - 2, WOOD);
}

// ------------------------------------------------------------------ пещера

function buildCave(level) {
  const ex = -20;   // вход
  const ez = -9;
  const cx = ex;    // центр зала
  const cz = ez - 13;

  // каменная гора
  fillArea(ex - 6, level - 10, ez - 22, ex + 6, level + 4, ez + 4, STONE);

  // площадка перед входом
  flattenArea(ex - 3, ez - 1, ex + 3, ez + 4, level);

  // арка
  for (let dx = -2; dx <= 2; dx++) setBlock(ex + dx, level + 3, ez, STONE);
  for (let y = level + 1; y <= level + 2; y++) {
    setBlock(ex - 2, y, ez, STONE);
    setBlock(ex + 2, y, ez, STONE);
  }

  // фонари у входа
  setBlock(ex - 3, level + 1, ez + 1, WOOD);
  setBlock(ex - 3, level + 2, ez + 1, TORCH);
  setBlock(ex + 3, level + 1, ez + 1, WOOD);
  setBlock(ex + 3, level + 2, ez + 1, TORCH);

  // дорожка от города к пещере
  for (let x = ex + 4; x <= -15; x++) {
    for (let dz = 0; dz <= 2; dz++) setBlock(x, level, ez + dz, STONE);
  }

  // лестница вниз
  let y = level - 1;
  for (let i = 0; i < 9; i++) {
    const z = ez - i;
    clearArea(ex - 2, y + 1, z, ex + 2, y + 3, z);
    for (let dx = -2; dx <= 2; dx++) setBlock(ex + dx, y, z, STONE);
    y -= 1;
  }

  // зал
  clearArea(cx - 5, y + 1, cz - 5, cx + 5, y + 4, cz + 5);
  fillArea(cx - 6, y, cz - 6, cx + 6, y, cz + 6, STONE);
  fillArea(cx - 6, y + 5, cz - 6, cx + 6, y + 5, cz + 6, STONE);

  for (let x = cx - 6; x <= cx + 6; x++) {
    for (let z = cz - 6; z <= cz + 6; z++) {
      const edge = x === cx - 6 || x === cx + 6 || z === cz - 6 || z === cz + 6;
      if (!edge) continue;
      for (let yy = y + 1; yy <= y + 4; yy++) setBlock(x, yy, z, STONE);
    }
  }

  // коридор от лестницы в зал
  for (let z = cz + 6; z <= ez - 9; z++) {
    clearArea(cx - 2, y + 1, z, cx + 2, y + 3, z);
  }

  // факелы
  for (const [fx, fz] of [
    [cx - 4, cz - 5], [cx + 4, cz - 5], [cx - 4, cz + 5], [cx + 4, cz + 5],
    [cx - 5, cz - 2], [cx - 5, cz + 2], [cx + 5, cz - 2], [cx + 5, cz + 2],
  ]) {
    setBlock(fx, y + 2, fz, TORCH);
  }

  // сокровище
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      if (Math.abs(dx) + Math.abs(dz) > 2) continue;
      setBlock(cx + dx, y + 1, cz - 4 + dz, BRICK);
    }
  }
  setBlock(cx, y + 2, cz - 4, SAND);
  setBlock(cx, y + 2, cz - 5, TORCH);
  setBlock(cx - 3, y + 2, cz - 4, TORCH);
  setBlock(cx + 3, y + 2, cz - 4, TORCH);

  // подземное озеро
  for (let dx = 2; dx <= 4; dx++) {
    for (let dz = 1; dz <= 3; dz++) {
      delBlock(cx + dx, y, cz + dz);
      setBlock(cx + dx, y, cz + dz, WATER);
    }
  }
}

function generateWorld() {
  world.clear();

  // рельеф
  for (let x = -26; x <= 26; x++) {
    for (let z = -26; z <= 26; z++) {
      const h = terrainHeight(x, z);
      setBlock(x, h, z, GRASS);
      for (let y = h - 1; y >= Math.max(0, h - 3); y--) setBlock(x, y, z, y === h - 1 ? DIRT : STONE);
      if (h - 3 > 0) setBlock(x, 0, z, STONE);
    }
  }

  // озеро
  for (let x = 7; x <= 14; x++) {
    for (let z = -12; z <= -5; z++) {
      const d = Math.hypot(x - 10.5, z + 8.5);
      if (d < 3.2) {
        const h = terrainHeight(x, z);
        for (let y = 0; y <= h; y++) delBlock(x, y, z);
        setBlock(x, h - 1, z, WATER);
        setBlock(x, h - 2, z, WATER);
      } else if (d < 4.1) {
        const h = terrainHeight(x, z);
        for (let y = 0; y <= h; y++) delBlock(x, y, z);
        setBlock(x, h, z, SAND);
      }
    }
  }

  // домик у точки появления
  const hx = -8, hz = 4, hy = terrainHeight(hx, hz) + 1;
  for (let y = 0; y < 3; y++) {
    for (let x = hx; x < hx + 5; x++) {
      for (let z = hz; z < hz + 5; z++) {
        const wall = x === hx || x === hx + 4 || z === hz || z === hz + 4;
        if (y === 0) setBlock(x, hy, z, PLANKS);
        else if (wall) setBlock(x, hy + y, z, BRICK);
      }
    }
  }
  delBlock(hx + 2, hy + 1, hz + 4);
  delBlock(hx + 2, hy + 2, hz + 4);
  delBlock(hx, hy + 2, hz + 2);
  delBlock(hx + 4, hy + 2, hz + 2);

  for (let x = hx - 1; x <= hx + 5; x++) {
    for (let z = hz - 1; z <= hz + 5; z++) setBlock(x, hy + 3, z, BRICK);
  }
  for (let x = hx; x <= hx + 4; x++) {
    for (let z = hz; z <= hz + 4; z++) setBlock(x, hy + 4, z, BRICK);
  }
  for (let x = hx + 1; x <= hx + 3; x++) {
    for (let z = hz + 1; z <= hz + 3; z++) setBlock(x, hy + 5, z, BRICK);
  }

  buildCity();
  buildPen(20, 6, 4);
  buildCave(4);

  // деревья
  const spots = [[20, -12], [-20, 12], [18, 18], [-22, -18], [22, 4], [-8, 20], [16, -20],
    [-18, -2], [6, -14], [-8, 24], [24, -2], [-24, 6], [12, 20], [-20, 22]];
  for (const [x, z] of spots) plantTree(x, z);

  // дорожка от дома
  for (let z = hz + 5; z <= hz + 12; z++) {
    const h = terrainHeight(hx + 2, z);
    setBlock(hx + 2, h, z, SAND);
  }
}

// ------------------------------------------------------------------ графика

const canvasEl = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fc7ff);
scene.fog = new THREE.Fog(0xa9d4ff, 45, 110);

const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 400);

const hemi = new THREE.HemisphereLight(0xffffff, 0x9aa79a, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 0.75);
sun.position.set(30, 60, 20);
scene.add(sun);

// облака
// ---------- небо, день и ночь ----------
const DAY_MS = 180000; // полный круг — три минуты

const skyDay = new THREE.Color(0x8fc7ff);
const skyNight = new THREE.Color(0x0b1330);
const fogDay = new THREE.Color(0xa9d4ff);
const fogNight = new THREE.Color(0x0b1330);

const starGeo = new THREE.BufferGeometry();
const starPositions = new Float32Array(420 * 3);
for (let i = 0; i < 420; i++) {
  const a = Math.random() * Math.PI * 2;
  const b = Math.random() * Math.PI * 0.5 + 0.05;
  const r = 170;
  starPositions[i * 3] = Math.cos(a) * Math.cos(b) * r;
  starPositions[i * 3 + 1] = Math.sin(b) * r;
  starPositions[i * 3 + 2] = Math.sin(a) * Math.cos(b) * r;
}
starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
  color: 0xffffff, size: 1.6, transparent: true, opacity: 0, depthWrite: false, fog: false,
}));
stars.frustumCulled = false;
scene.add(stars);

function updateSky(timeMs) {
  const phase = typeof window.__dayPhase === "number"
    ? window.__dayPhase
    : (timeMs % DAY_MS) / DAY_MS;

  const height = Math.sin(phase * Math.PI * 2);
  const day = Math.max(0, height);

  scene.background.copy(skyNight).lerp(skyDay, day);
  scene.fog.color.copy(fogNight).lerp(fogDay, day);

  const wet = typeof weather !== 'undefined' ? weather.rainFactor || 0 : 0;
  sun.intensity = (0.12 + 0.75 * day) * (1 - wet * 0.45);
  hemi.intensity = (0.3 + 0.85 * day) * (1 - wet * 0.3);
  stars.material.opacity = Math.max(0, 1 - day * 1.6);

  const a = phase * Math.PI * 2;
  sun.position.set(Math.cos(a) * 45, Math.max(-10, Math.sin(a) * 55), 20);
}

const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
const clouds = new THREE.Group();
for (let i = 0; i < 10; i++) {
  const g = new THREE.Group();
  const parts = 2 + Math.floor(Math.random() * 3);
  for (let p = 0; p < parts; p++) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(6 + Math.random() * 6, 1.6, 4 + Math.random() * 4),
      cloudMat,
    );
    m.position.set((p - parts / 2) * 5, Math.random(), Math.random() * 3);
    g.add(m);
  }
  g.position.set(-70 + Math.random() * 140, 42 + Math.random() * 10, -70 + Math.random() * 140);
  clouds.add(g);
}
scene.add(clouds);

// ------------------------------------------------------------------ животные

const animalGroup = new THREE.Group();
scene.add(animalGroup);
const animals = [];

const matCache = new Map();
function mat(color) {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshLambertMaterial({ color }));
  return matCache.get(color);
}

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z);
  return m;
}

function addEyes(g, x, y, spread, size = 0.06) {
  for (const s of [-spread, spread]) g.add(box(size, size * 1.2, size, 0x22262b, x, y, s));
}

function legs(g, color, w, h, dx, dz) {
  for (const sx of [-dx, dx]) {
    for (const sz of [-dz, dz]) g.add(box(w, h, w, color, sx, h / 2, sz));
  }
}

const BUILDERS = {
  pig(g) {
    g.add(box(1.05, 0.55, 0.7, 0xf0a0ab, 0, 0.62, 0));
    g.add(box(0.5, 0.5, 0.5, 0xf7b5be, 0.72, 0.68, 0));
    g.add(box(0.14, 0.22, 0.28, 0xe0899a, 0.99, 0.64, 0));
    addEyes(g, 0.92, 0.76, 0.11, 0.06);
    for (const s of [-0.11, 0.11]) g.add(box(0.1, 0.12, 0.16, 0xf0a0ab, 0.62, 0.95, s));
    legs(g, 0xd98d9a, 0.16, 0.42, 0.32, 0.22);
  },

  cow(g) {
    g.add(box(1.4, 0.8, 0.9, 0xf3f1ea, 0, 0.8, 0));
    for (const [sx, sz] of [[-0.35, 0.2], [0.25, -0.25], [0.45, 0.22]]) {
      g.add(box(0.34, 0.34, 0.34, 0x2f3338, sx, 0.95, sz));
    }
    g.add(box(0.55, 0.55, 0.55, 0xf3f1ea, 0.9, 0.85, 0));
    g.add(box(0.2, 0.26, 0.5, 0xe8b7b0, 1.18, 0.72, 0));
    addEyes(g, 1.12, 0.98, 0.15, 0.07);
    for (const s of [-0.18, 0.18]) g.add(box(0.08, 0.16, 0.1, 0xd8d3c6, 0.78, 1.16, s));
    legs(g, 0x3b4046, 0.18, 0.55, 0.45, 0.3);
  },

  sheep(g) {
    g.add(box(1.1, 0.85, 0.95, 0xf6f4ee, 0, 0.85, 0));
    g.add(box(1.15, 0.5, 1.0, 0xffffff, 0, 1.2, 0));
    g.add(box(0.45, 0.42, 0.45, 0x4a4f55, 0.72, 0.98, 0));
    addEyes(g, 0.92, 1.06, 0.12, 0.06);
    for (const s of [-0.16, 0.16]) g.add(box(0.1, 0.2, 0.12, 0x4a4f55, 0.62, 1.2, s));
    legs(g, 0x4a4f55, 0.16, 0.45, 0.36, 0.28);
  },

  chicken(g) {
    g.add(box(0.55, 0.5, 0.45, 0xfaf7f0, 0, 0.6, 0));
    g.add(box(0.32, 0.32, 0.3, 0xfaf7f0, 0.32, 0.9, 0));
    g.add(box(0.12, 0.1, 0.1, 0xf2b632, 0.52, 0.86, 0));
    g.add(box(0.1, 0.14, 0.22, 0xd94b4b, 0.3, 1.09, 0));
    addEyes(g, 0.46, 0.98, 0.11, 0.05);
    for (const s of [-0.12, 0.12]) g.add(box(0.08, 0.06, 0.14, 0xfaf7f0, 0, 0.55, s));
    for (const s of [-0.1, 0.1]) g.add(box(0.07, 0.32, 0.07, 0xf2b632, 0, 0.17, s));
  },

  chick(g) {
    g.add(box(0.3, 0.28, 0.26, 0xffe066, 0, 0.32, 0));
    g.add(box(0.22, 0.22, 0.2, 0xffe066, 0.18, 0.5, 0));
    g.add(box(0.09, 0.07, 0.07, 0xf28b32, 0.32, 0.48, 0));
    addEyes(g, 0.3, 0.55, 0.08, 0.04);
    for (const s of [-0.07, 0.07]) g.add(box(0.05, 0.18, 0.05, 0xf28b32, 0, 0.1, s));
  },

  cat(g) {
    g.add(box(0.75, 0.4, 0.36, 0xf0a04a, 0, 0.42, 0));
    g.add(box(0.38, 0.36, 0.36, 0xf5ad5c, 0.46, 0.56, 0));
    for (const s of [-0.12, 0.12]) g.add(box(0.1, 0.14, 0.08, 0xf0a04a, 0.44, 0.78, s));
    addEyes(g, 0.6, 0.62, 0.1, 0.05);
    g.add(box(0.08, 0.08, 0.1, 0xe07b7b, 0.63, 0.52, 0));
    g.add(box(0.5, 0.08, 0.08, 0xf0a04a, -0.6, 0.62, 0));
    legs(g, 0xe08f3f, 0.11, 0.24, 0.24, 0.12);
  },

  dog(g) {
    g.add(box(0.95, 0.5, 0.42, 0x9c6b3f, 0, 0.55, 0));
    g.add(box(0.44, 0.42, 0.42, 0xa87748, 0.58, 0.68, 0));
    g.add(box(0.2, 0.16, 0.24, 0x6f4a2a, 0.82, 0.6, 0));
    for (const s of [-0.15, 0.15]) g.add(box(0.1, 0.18, 0.1, 0x7a5230, 0.5, 0.94, s));
    addEyes(g, 0.78, 0.74, 0.12, 0.06);
    g.add(box(0.45, 0.08, 0.08, 0x9c6b3f, -0.66, 0.78, 0));
    legs(g, 0x8a5f37, 0.14, 0.34, 0.3, 0.14);
  },
  steve(g) {
    const skin = 0xe0ac69, shirt = 0x00a9a9, pants = 0x3a3ab0, hair = 0x442b18;

    g.add(box(0.5, 0.62, 0.28, shirt, 0, 1.0, 0));
    g.add(box(0.42, 0.42, 0.4, skin, 0, 1.63, 0));
    g.add(box(0.44, 0.14, 0.42, hair, 0, 1.86, 0));
    g.add(box(0.06, 0.30, 0.42, hair, -0.2, 1.66, 0));
    g.add(box(0.06, 0.30, 0.42, hair, 0.2, 1.66, 0));
    addEyes(g, 0.21, 1.66, 0.1, 0.06);
    g.add(box(0.1, 0.03, 0.02, 0x8b4a3a, 0.21, 1.52, 0));

    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(0, 1.34, s * 0.2);
      arm.add(box(0.14, 0.5, 0.14, shirt, 0, -0.25, 0));
      arm.add(box(0.14, 0.14, 0.14, skin, 0, -0.54, 0));
      arm.rotation.x = s * 0.12;
      g.add(arm);
      if (s === 1) g.userData.arm = arm;
      else g.userData.armL = arm;
    }

    legs(g, pants, 0.16, 0.7, 0.13, 0.06);
  },


  seller(g) {
    const skin = 0xd9a066, shirt = 0xf3f1ea, apron = 0x2f8f5b, pants = 0x3b3b46, hair = 0x2b2119;

    g.add(box(0.5, 0.6, 0.28, shirt, 0, 1.0, 0));
    g.add(box(0.5, 0.42, 0.3, apron, 0, 0.86, 0.02));
    g.add(box(0.42, 0.42, 0.4, skin, 0, 1.63, 0));
    g.add(box(0.44, 0.12, 0.42, hair, 0, 1.86, 0));
    g.add(box(0.5, 0.08, 0.46, 0x2f8f5b, 0, 1.93, 0));
    addEyes(g, 0.21, 1.66, 0.1, 0.06);
    g.add(box(0.1, 0.03, 0.02, 0x8b4a3a, 0.21, 1.52, 0));

    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(0, 1.34, s * 0.2);
      arm.add(box(0.14, 0.5, 0.14, shirt, 0, -0.25, 0));
      arm.add(box(0.14, 0.14, 0.14, skin, 0, -0.54, 0));
      arm.rotation.x = s * 0.12;
      g.add(arm);
      if (s === 1) g.userData.arm = arm;
      else g.userData.armL = arm;
    }

    legs(g, pants, 0.16, 0.7, 0.13, 0.06);
  },

  girl(g) {
    const skin = 0xf0c8a0, shirt = 0x7ba45c, pants = 0x8b5a2b, hair = 0xb35f1e;

    g.add(box(0.48, 0.6, 0.27, shirt, 0, 0.99, 0));
    g.add(box(0.42, 0.42, 0.4, skin, 0, 1.62, 0));
    g.add(box(0.44, 0.16, 0.42, hair, 0, 1.86, 0));
    g.add(box(0.1, 0.62, 0.42, hair, -0.21, 1.58, 0));
    g.add(box(0.1, 0.62, 0.42, hair, 0.21, 1.58, 0));
    g.add(box(0.12, 0.44, 0.14, hair, 0, 1.44, -0.22));
    addEyes(g, 0.21, 1.65, 0.1, 0.06);
    g.add(box(0.1, 0.03, 0.02, 0xc2557a, 0.21, 1.51, 0));

    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(0, 1.33, s * 0.2);
      arm.add(box(0.13, 0.5, 0.13, shirt, 0, -0.25, 0));
      arm.add(box(0.13, 0.13, 0.13, skin, 0, -0.54, 0));
      arm.rotation.x = s * 0.12;
      g.add(arm);
      if (s === 1) g.userData.arm = arm;
      else g.userData.armL = arm;
    }

    legs(g, pants, 0.15, 0.68, 0.13, 0.06);
  },
};

const ANIMAL_SIZE = {
  pig: 1, cow: 1.1, sheep: 1.05, chicken: 1, chick: 0.85, cat: 0.85, dog: 0.95,
  steve: 1, girl: 0.95, seller: 1,
};

function animalSound(kind) {
  switch (kind) {
    case "cow":
      blip(140, 0.35, "sawtooth", 0.07);
      setTimeout(() => blip(110, 0.3, "sawtooth", 0.05), 180);
      break;
    case "chicken":
      blip(900, 0.07, "square", 0.04);
      setTimeout(() => blip(1150, 0.06, "square", 0.035), 90);
      setTimeout(() => blip(950, 0.05, "square", 0.03), 170);
      break;
    case "chick":
      blip(1500, 0.05, "sine", 0.03);
      setTimeout(() => blip(1650, 0.05, "sine", 0.025), 80);
      break;
    case "sheep":
      blip(420, 0.16, "sawtooth", 0.05);
      setTimeout(() => blip(380, 0.18, "sawtooth", 0.045), 150);
      break;
    case "cat":
      blip(620, 0.12, "sine", 0.05);
      setTimeout(() => blip(820, 0.16, "sine", 0.04), 110);
      break;
    case "dog":
      blip(220, 0.09, "square", 0.06);
      setTimeout(() => blip(190, 0.1, "square", 0.05), 140);
      break;
    case "steve":
    case "girl":
    case "seller":
      blip(523, 0.1, "sine", 0.05);
      setTimeout(() => blip(659, 0.1, "sine", 0.045), 110);
      setTimeout(() => blip(784, 0.14, "sine", 0.04), 220);
      break;
    default:
      blip(320, 0.09, "sawtooth", 0.05);
      setTimeout(() => blip(260, 0.1, "sawtooth", 0.04), 90);
  }
}

function makeAnimal(kind, x, z, follow) {
  const g = new THREE.Group();
  BUILDERS[kind](g);
  g.scale.setScalar(ANIMAL_SIZE[kind] || 1);
  g.position.set(x + 0.5, terrainHeight(x, z) + 1, z + 0.5);
  animalGroup.add(g);

  animals.push({
    kind,
    group: g,
    arm: g.userData.arm || null,
    wave: 0,
    greetIn: 2 + Math.random() * 4,
    tx: x + 0.5,
    tz: z + 0.5,
    speed: kind === "chick" ? 1.3 : kind === "cow" ? 0.4 : kind === "sheep" ? 0.5 : 0.8 + Math.random() * 0.5,
    phase: Math.random() * 6.28,
    hop: 0,
    follow: follow || null,
    offset: follow ? (Math.random() - 0.5) * 1.6 : 0,
    homeX: x + 0.5,
    homeZ: z + 0.5,
  });
}

function spawnAnimals() {
  while (animalGroup.children.length) animalGroup.remove(animalGroup.children[0]);
  animals.length = 0;

  makeAnimal("pig", 3, 12);
  makeAnimal("pig", -4, 11);
  makeAnimal("pig", 9, 5);

  makeAnimal("cow", -12, 6);
  makeAnimal("cow", 12, -6);

  makeAnimal("sheep", -8, -4);
  makeAnimal("sheep", 6, -9);

  makeAnimal("chicken", -2, 10);
  const hen = animals[animals.length - 1];
  makeAnimal("chick", -2.4, 10.6, hen);
  makeAnimal("chick", -1.4, 10.4, hen);
  makeAnimal("chick", -2.1, 9.4, hen);

  makeAnimal("cat", 1, 6);
  makeAnimal("dog", 7, 13);

  // друзья появляются рядом с игроком, на его высоте
  const px = Number.isFinite(player.x) ? player.x : 0.5;
  const pz = Number.isFinite(player.z) ? player.z : 8.5;
  const baseY = player.y - 1;

  const spotNear = (minD, maxD) => {
    for (let i = 0; i < 80; i++) {
      const ang = Math.random() * Math.PI * 2;
      const d = minD + Math.random() * (maxD - minD);
      const x = Math.round(px + Math.cos(ang) * d);
      const z = Math.round(pz + Math.sin(ang) * d);
      if (Math.abs(terrainHeight(x, z) - baseY) <= 1) return [x, z];
    }
    return [Math.round(px) + 2, Math.round(pz) - 2];
  };

  // ставим друзей прямо перед игроком
  const ahead = (dist, side) => {
    const a = player.yaw + side;
    return [Math.round(px + Math.sin(a) * dist), Math.round(pz + Math.cos(a) * dist)];
  };
  const [fx, fz] = ahead(5, 0.18);
  const [gx, gz] = ahead(3.5, -0.3);
  makeAnimal("steve", fx, fz);
  makeAnimal("girl", gx, gz);
  makeAnimal("seller", -8, 14);
}

function updateAnimals(dt, time) {
  if (callTimer > 0) callTimer -= dt;

  for (const a of animals) {
    const g = a.group;

    if (a.kind === "dog") {
      if (ballSpeed() > 1.2) {
        a.tx = ball.x;
        a.tz = ball.z;
      } else {
        const dxp = player.x - g.position.x;
        const dzp = player.z - g.position.z;
        const far = Math.hypot(dxp, dzp);
        if (far > 7) {
          a.tx = player.x;
          a.tz = player.z;
        } else if (far < 4) {
          a.tx = g.position.x - dxp * 2;
          a.tz = g.position.z - dzp * 2;
        }
      }
    } else if (callTimer > 0 && (a.kind === "steve" || a.kind === "girl" || a.kind === "seller")) {
      a.tx = player.x + (a.kind === "steve" ? 1.5 : -1.5);
      a.tz = player.z + 1.5;
    } else if (a.follow) {
      a.tx = a.follow.group.position.x + a.offset;
      a.tz = a.follow.group.position.z + a.offset * 0.6;
    }

    const dx = a.tx - g.position.x;
    const dz = a.tz - g.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.5) {
      if (!a.follow && a.kind !== "dog") {
        const isPerson = a.kind === "steve" || a.kind === "girl" || a.kind === "seller";
        const radius = isPerson ? 3 : 8;
        const cx = isPerson ? a.homeX : g.position.x;
        const cz = isPerson ? a.homeZ : g.position.z;
        a.tx = THREE.MathUtils.clamp(cx - radius + Math.random() * radius * 2, -17, 17);
        a.tz = THREE.MathUtils.clamp(cz - radius + Math.random() * radius * 2, -17, 17);
      }
    } else {
      const step = Math.min(a.speed * dt, dist);
      g.position.x += (dx / dist) * step;
      g.position.z += (dz / dist) * step;
      g.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
    }

    const ground = terrainHeight(Math.floor(g.position.x), Math.floor(g.position.z)) + 1;
    const bob = Math.abs(Math.sin(time * 5 + a.phase)) * 0.07;
    g.position.y += (ground + bob - g.position.y) * Math.min(1, dt * 8);

    if (a.hop > 0) {
      a.hop -= dt;
      g.position.y += Math.sin((1 - a.hop) * Math.PI) * 0.5;
    }

    // машут рукой: по тапу и когда игрок рядом
    const nearPlayer = Math.hypot(player.x - g.position.x, player.z - g.position.z) < 5;
    if (a.kind === "steve" || a.kind === "girl" || a.kind === "seller") {
      a.greetIn -= dt;
      if (nearPlayer && a.greetIn <= 0 && a.wave <= 0) {
        a.wave = 1.1;
        a.greetIn = 7 + Math.random() * 6;
        if (Math.random() < 0.5) animalSound(a.kind);
      }
    }

    if (a.arm) {
      if (a.wave > 0) {
        a.wave -= dt;
        a.arm.rotation.z = -1.5 + Math.sin(a.wave * 16) * 0.35;
      } else {
        a.arm.rotation.z = 0;
      }
    }
  }

  window.__dbg = Object.assign(window.__dbg || {}, { animals: animals.length, kinds: animals.map((a) => a.kind).join(','), people: animals.filter((a) => a.kind === 'steve' || a.kind === 'girl').map((a) => [Math.round(a.group.position.x), Math.round(a.group.position.z), Math.round(Math.hypot(a.group.position.x - player.x, a.group.position.z - player.z))]) });
}

const atlasTexture = new THREE.CanvasTexture(buildAtlas());
atlasTexture.magFilter = THREE.NearestFilter;
atlasTexture.minFilter = THREE.NearestFilter;
atlasTexture.generateMipmaps = false;
atlasTexture.colorSpace = THREE.SRGBColorSpace;

const blockMaterial = new THREE.MeshLambertMaterial({
  map: atlasTexture,
  alphaTest: 0.35,
});

const torchMaterial = new THREE.MeshLambertMaterial({
  map: atlasTexture,
  alphaTest: 0.35,
  emissive: new THREE.Color(0xffb347),
  emissiveIntensity: 0.85,
});

// геометрия кубика с UV под атлас
function blockGeometry(topTile, sideTile, bottomTile) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const uv = geo.attributes.uv;
  const faces = [sideTile, sideTile, topTile, bottomTile, sideTile, sideTile];

  for (let f = 0; f < 6; f++) {
    const tile = faces[f];
    const tx = tile % COLS;
    const ty = Math.floor(tile / COLS);
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      const u0 = uv.getX(i);
      const v0 = uv.getY(i);
      uv.setXY(i, (tx + u0) / COLS, (ROWS - ty - 1 + v0) / ROWS);
    }
  }
  uv.needsUpdate = true;
  return geo;
}

const MAX_PER_TYPE = 20000;
const meshes = [];
const indexByType = [];

for (let t = 0; t < TYPES.length; t++) {
  const def = TYPES[t];
  const geo = blockGeometry(def.top, def.side, def.bottom);
  const mesh = new THREE.InstancedMesh(geo, t === TORCH ? torchMaterial : blockMaterial, MAX_PER_TYPE);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.count = 0;
  scene.add(mesh);
  meshes.push(mesh);
  indexByType.push([]);
}

const dummy = new THREE.Object3D();

function rebuild() {
  for (const arr of indexByType) arr.length = 0;

  for (const [k, type] of world) {
    arr(type).push(k);
  }

  for (let t = 0; t < TYPES.length; t++) {
    const list = indexByType[t];
    const mesh = meshes[t];
    const n = Math.min(list.length, MAX_PER_TYPE);
    for (let i = 0; i < n; i++) {
      const [x, y, z] = list[i].split(",").map(Number);
      dummy.position.set(x + 0.5, y + 0.5, z + 0.5);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
  }

  window.__dbg = Object.assign(window.__dbg || {}, { blocks: world.size });
  window.__probe = (x, y, z) => (world.has(key(x, y, z)) ? world.get(key(x, y, z)) : -1);
}

function arr(t) { return indexByType[t]; }

// рамка цели
const highlight = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.006, 1.006, 1.006)),
  new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 }),
);
highlight.visible = false;
scene.add(highlight);

// частицы
const PART_MAX = 40;
const particles = new THREE.InstancedMesh(
  new THREE.BoxGeometry(0.22, 0.22, 0.22),
  new THREE.MeshLambertMaterial(),
  PART_MAX,
);
particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
particles.frustumCulled = false;
scene.add(particles);
const parts = Array.from({ length: PART_MAX }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }));
particles.count = PART_MAX;

for (let i = 0; i < PART_MAX; i++) {
  dummy.position.set(0, -200, 0);
  dummy.scale.setScalar(0.001);
  dummy.updateMatrix();
  particles.setMatrixAt(i, dummy.matrix);
}
particles.instanceMatrix.needsUpdate = true;

function burst(x, y, z, color) {
  let n = 0;
  for (const p of parts) {
    if (p.life > 0 || n > 12) continue;
    p.life = 0.5 + Math.random() * 0.3;
    p.x = x + 0.5; p.y = y + 0.5; p.z = z + 0.5;
    p.vx = (Math.random() - 0.5) * 4;
    p.vy = 2 + Math.random() * 3;
    p.vz = (Math.random() - 0.5) * 4;
    n++;
  }
  particles.material.color.set(color);
}

function updateParticles(dt) {
  let dirty = false;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.life <= 0) continue;
    p.life -= dt;
    p.vy -= 14 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    dummy.position.set(p.x, p.y, p.z);
    dummy.scale.setScalar(Math.max(0.001, Math.min(1, p.life * 2.4)));
    dummy.updateMatrix();
    particles.setMatrixAt(i, dummy.matrix);
    dirty = true;
  }
  if (dirty) particles.instanceMatrix.needsUpdate = true;
}


// ------------------------------------------------------------------ дождь

const RAIN_COUNT = 420;
const rainPositions = new Float32Array(RAIN_COUNT * 3);
const rainSpeed = new Float32Array(RAIN_COUNT);

for (let i = 0; i < RAIN_COUNT; i++) {
  rainPositions[i * 3] = (Math.random() - 0.5) * 40;
  rainPositions[i * 3 + 1] = Math.random() * 22;
  rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 40;
  rainSpeed[i] = 14 + Math.random() * 8;
}

const rainGeo = new THREE.BufferGeometry();
rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));

const rain = new THREE.Points(
  rainGeo,
  new THREE.PointsMaterial({
    color: 0xbcdcff,
    size: 0.3,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    fog: false,
  }),
);
rain.frustumCulled = false;
rain.visible = false;
scene.add(rain);

const weather = { raining: false, until: 25, rainFactor: 0 };

function updateWeather(dt) {
  weather.until -= dt;

  if (weather.until <= 0) {
    weather.raining = !weather.raining;
    weather.until = weather.raining ? 25 + Math.random() * 15 : 60 + Math.random() * 40;
    rain.visible = weather.raining;
  }

  window.__dbg = Object.assign(window.__dbg || {}, { rain: weather.raining });

  const target = weather.raining ? 1 : 0;
  weather.rainFactor += (target - weather.rainFactor) * Math.min(1, dt * 0.8);

  if (!weather.raining && weather.rainFactor < 0.02) {
    rain.visible = false;
    return;
  }

  const pos = rainGeo.attributes.position.array;
  for (let i = 0; i < RAIN_COUNT; i++) {
    pos[i * 3 + 1] -= rainSpeed[i] * dt;
    if (pos[i * 3 + 1] < player.y - 6) {
      pos[i * 3] = player.x + (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = player.y + 16 + Math.random() * 8;
      pos[i * 3 + 2] = player.z + (Math.random() - 0.5) * 40;
    }
  }
  rainGeo.attributes.position.needsUpdate = true;
}

// ------------------------------------------------------------------ звук

let audio = null;
let soundOn = true;

function ensureAudio() {
  if (!audio) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audio = new Ctx();
  }
  if (audio && audio.state === "suspended") audio.resume();
}

function blip(freq, dur = 0.1, type = "sine", gain = 0.07) {
  if (!soundOn || !audio) return;
  const t0 = audio.currentTime;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.7), t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  osc.connect(g).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}


// ------------------------------------------------------------------ мяч

const ballMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.36, 14, 12),
  new THREE.MeshLambertMaterial({ color: 0xff5a5a }),
);
scene.add(ballMesh);

const ball = { x: 2.5, y: 8, z: 6.5, vx: 0, vy: 0, vz: 0 };

function resetBall() {
  ball.x = player.x + 2;
  ball.z = player.z + 2;
  ball.y = terrainHeight(Math.floor(ball.x), Math.floor(ball.z)) + 2;
  ball.vx = ball.vy = ball.vz = 0;
}

function updateBall(dt) {
  ball.vy -= 22 * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.z += ball.vz * dt;

  const ground = terrainHeight(Math.floor(ball.x), Math.floor(ball.z)) + 1.36;
  if (ball.y < ground) {
    ball.y = ground;
    ball.vy = -ball.vy * 0.45;
    ball.vx *= 0.86;
    ball.vz *= 0.86;
    if (Math.abs(ball.vy) < 0.7) ball.vy = 0;
  }

  ball.vx *= 1 - dt * 0.9;
  ball.vz *= 1 - dt * 0.9;

  ballMesh.position.set(ball.x, ball.y, ball.z);
  ballMesh.rotation.x += ball.vz * dt * 1.6;
  ballMesh.rotation.z -= ball.vx * dt * 1.6;

  if (Math.abs(ball.x) > BOUND.x || Math.abs(ball.z) > BOUND.z) resetBall();
}

function ballSpeed() {
  return Math.hypot(ball.vx, ball.vz);
}

function hitBall(clientX, clientY) {
  const rect = canvasEl.getBoundingClientRect();
  tapNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  tapNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  tapRay.setFromCamera(tapNdc, camera);
  return tapRay.intersectObject(ballMesh, false).length > 0;
}

function kickBall() {
  const dir = lookDirection();
  ball.vx = dir.x * 8;
  ball.vy = 5.2;
  ball.vz = dir.z * 8;
  blip(240, 0.09, "square", 0.06);
  burst(Math.floor(ball.x), Math.floor(ball.y), Math.floor(ball.z), 0xff8a8a);
}

// ------------------------------------------------------------------ клич

let callTimer = 0;

function callFriends() {
  callTimer = 8;
  blip(660, 0.12, "sine", 0.06);
  setTimeout(() => blip(880, 0.14, "sine", 0.05), 130);
  for (const a of animals) {
    if (a.kind === "steve" || a.kind === "girl" || a.kind === "dog") a.hop = 0.5;
  }
}

// ------------------------------------------------------------------ игрок

const player = {
  x: 0, y: 0, z: 0,
  vy: 0,
  yaw: 0,
  pitch: 0,
  onGround: false,
  eye: 1.62,
};

const RADIUS = 0.3;
const HEIGHT = 1.75;
const WALK = 4.6;
const GRAVITY = 26;
const JUMP = 8.4;

function hits(x, y, z) {
  const y0 = y + 0.06;
  const y1 = y + HEIGHT;
  for (const dx of [-RADIUS, RADIUS]) {
    for (const dz of [-RADIUS, RADIUS]) {
      if (isSolid(x + dx, y0, z + dz)) return true;
      if (isSolid(x + dx, y1, z + dz)) return true;
    }
  }
  return false;
}

function moveAxis(axis, amount) {
  if (!amount) return;
  const sign = Math.sign(amount);
  let left = Math.abs(amount);
  while (left > 1e-4) {
    const step = Math.min(left, 0.06);
    const nx = axis === "x" ? player.x + sign * step : player.x;
    const nz = axis === "z" ? player.z + sign * step : player.z;
    if (hits(nx, player.y, nz)) {
      // авто-шаг: если впереди ступенька высотой в кубик — поднимаемся
      if (player.onGround && !hits(nx, player.y + 1.02, nz)) {
        player.y += 1.02;
        player.x = nx; player.z = nz;
        left -= step;
        continue;
      }
      break;
    }
    player.x = nx; player.z = nz;
    left -= step;
  }
}

function moveVertical(dt) {
  player.vy -= GRAVITY * dt;
  let left = Math.abs(player.vy * dt);
  const sign = Math.sign(player.vy);
  player.onGround = false;
  while (left > 1e-4) {
    const step = Math.min(left, 0.06);
    const ny = player.y + sign * step;
    if (hits(player.x, ny, player.z)) {
      if (player.vy < 0) player.onGround = true;
      player.vy = 0;
      break;
    }
    player.y = ny;
    left -= step;
  }
}

function clearSpot(x, z) {
  const h = terrainHeight(x, z);
  for (let dy = 1; dy <= 12; dy++) {
    if (world.has(key(x, h + dy, z))) return -1;
  }
  return h;
}

function spawnPlayer() {
  let best = null;

  // сначала пробуем площадь города
  for (const [px, pz] of [[0, 6], [0, 10], [4, 8], [-4, 8]]) {
    const h = clearSpot(px, pz);
    if (h >= 0) { best = { x: px, z: pz, h }; break; }
  }

  for (let r = 0; r <= 10 && !best; r++) {
    for (let dx = -r; dx <= r && !best; dx++) {
      for (let dz = -r; dz <= r && !best; dz++) {
        const x = dx;
        const z = 6 + dz;
        const h = clearSpot(x, z);
        if (h >= 0) best = { x, z, h };
      }
    }
  }

  if (!best) best = { x: 0, z: 8, h: terrainHeight(0, 8) };

  player.x = best.x + 0.5;
  player.z = best.z + 0.5;
  player.y = best.h + 1.2;
  player.vy = 0;

  // смотрим на домик
  player.yaw = Math.atan2(-5.5 - player.x, 6.5 - player.z);
  player.pitch = -0.08;
}

// ------------------------------------------------------------------ наведение

const tmpVec = new THREE.Vector3();
const dirVec = new THREE.Vector3();

function lookDirection() {
  const cp = Math.cos(player.pitch);
  return dirVec.set(
    Math.sin(player.yaw) * cp,
    Math.sin(player.pitch),
    Math.cos(player.yaw) * cp,
  ).normalize();
}

function raycastFrom(dir, ox, oy, oz, maxDist = 6) {
  let px = 0, py = 0, pz = 0;

  for (let t = 0; t < maxDist; t += 0.04) {
    const x = ox + dir.x * t;
    const y = oy + dir.y * t;
    const z = oz + dir.z * t;
    const cx = Math.floor(x), cy = Math.floor(y), cz = Math.floor(z);
    if (isSolid(x, y, z)) {
      return { hit: { x: cx, y: cy, z: cz }, prev: { x: px, y: py, z: pz }, type: world.get(key(cx, cy, cz)) };
    }
    px = cx; py = cy; pz = cz;
  }
  return null;
}

function raycastBlock(maxDist = 6) {
  return raycastFrom(lookDirection(), player.x, player.y + player.eye, player.z, maxDist);
}

// луч через точку касания — так ребёнку не нужно целиться прицелом
const tapRay = new THREE.Raycaster();
const tapNdc = new THREE.Vector2();

function raycastAt(clientX, clientY) {
  const rect = canvasEl.getBoundingClientRect();
  tapNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  tapNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  tapRay.setFromCamera(tapNdc, camera);
  const d = tapRay.ray.direction;
  return raycastFrom(new THREE.Vector3(d.x, d.y, d.z).normalize(),
    player.x, player.y + player.eye, player.z, 7);
}

function hitAnimal(clientX, clientY) {
  const rect = canvasEl.getBoundingClientRect();
  tapNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  tapNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  tapRay.setFromCamera(tapNdc, camera);
  const hits = tapRay.intersectObjects(animalGroup.children, true);
  if (!hits.length) return null;
  let obj = hits[0].object;
  while (obj && obj.parent !== animalGroup) obj = obj.parent;
  return animals.find((a) => a.group === obj) || null;
}

// ------------------------------------------------------------------ инструменты

function toolBurst(x, y, z, color) {
  burst(x, y, z, color);
  blip(480 + Math.random() * 120, 0.08, "sine", 0.05);
}

function hammerAt(target) {
  const { hit, prev } = target;
  const nx = prev.x - hit.x, ny = prev.y - hit.y, nz = prev.z - hit.z;
  let placed = 0;

  for (let a = -1; a <= 1; a++) {
    for (let b = -1; b <= 1; b++) {
      let x = prev.x, y = prev.y, z = prev.z;
      if (nx !== 0) { y += a; z += b; }
      else if (ny !== 0) { x += a; z += b; }
      else { x += a; y += b; }

      if (!inside(x, y, z)) continue;
      if (world.has(key(x, y, z))) continue;
      setBlock(x, y, z, state.type);
      placed++;
    }
  }

  if (!placed) return;

  // если стена встала вокруг игрока — поднимаем его наверх
  if (hits(player.x, player.y, player.z)) {
    let guard = 0;
    while (hits(player.x, player.y, player.z) && guard < 6) {
      player.y += 1;
      guard++;
    }
    player.vy = 0;
  }

  undoStack.push({ op: "bulk", cells: [] });
  burst(prev.x, prev.y, prev.z, colorOf(state.type));
  blip(320, 0.14, "triangle", 0.07);
  progress.placed += placed;
  checkMilestones();
  rebuild();
  scheduleSave();
  hideHint();
}

function paintAt(target) {
  const { x, y, z } = target.hit;
  if (!world.has(key(x, y, z))) return;
  world.set(key(x, y, z), state.type);
  burst(x, y, z, colorOf(state.type));
  blip(660, 0.1, "sine", 0.06);
  rebuild();
  scheduleSave();
  hideHint();
}

function torchAt(target) {
  const { x, y, z } = target.prev;
  if (!inside(x, y, z) || world.has(key(x, y, z))) return;
  setBlock(x, y, z, TORCH);
  burst(x, y, z, 0xffb347);
  blip(880, 0.12, "sine", 0.06);
  rebuild();
  scheduleSave();
  hideHint();
}

// ------------------------------------------------------------------ действия

const undoStack = [];

function act(clientX, clientY) {
  if (hitBall(clientX, clientY)) {
    kickBall();
    return;
  }

  const animal = hitAnimal(clientX, clientY);
  if (animal) {
    animal.hop = 0.45;
    animalSound(animal.kind);
    burst(
      Math.floor(animal.group.position.x),
      Math.floor(animal.group.position.y),
      Math.floor(animal.group.position.z),
      0xff7fb0,
    );
    return;
  }

  const target = raycastAt(clientX, clientY) || raycastBlock();
  window.__acts = Object.assign(window.__acts || {}, { calls: (window.__acts?.calls || 0) + 1, hit: !!target, at: [Math.round(clientX || 0), Math.round(clientY || 0)] });
  if (!target) return;

  if (state.tool === "hammer") { hammerAt(target); return; }
  if (state.tool === "paint") { paintAt(target); return; }
  if (state.tool === "torch") { torchAt(target); return; }

  if (state.mode === "dig") {
    const { x, y, z } = target.hit;
    const type = world.get(key(x, y, z));
    if (type === undefined) return;
    if (y <= 0 && Math.abs(x) >= BOUND.x - 1) return;
    delBlock(x, y, z);
    undoStack.push({ op: "del", x, y, z, type });
    burst(x, y, z, colorOf(type));
    blip(180 + Math.random() * 40, 0.09, "square", 0.05);
  } else {
    const { x, y, z } = target.prev;
    if (!inside(x, y, z)) return;
    if (world.has(key(x, y, z))) return;
    setBlock(x, y, z, state.type);

    // если кубик оказался внутри игрока — поднимаем его на этот кубик
    const dx = player.x - (x + 0.5), dz = player.z - (z + 0.5);
    if (Math.abs(dx) < 0.55 && Math.abs(dz) < 0.55 && y + 1 > player.y && y < player.y + HEIGHT) {
      player.y = Math.max(player.y, y + 1.0);
      player.vy = 0;
    }
    undoStack.push({ op: "add", x, y, z });
    burst(x, y, z, colorOf(state.type));
    blip(420 + state.type * 25, 0.08, "sine", 0.06);
  }

  if (undoStack.length > 100) undoStack.shift();

  if (state.mode === "build") {
    progress.placed++;
    checkMilestones();
  }

  rebuild();
  scheduleSave();
  hideHint();
}

function colorOf(type) {
  const hex = [0x6ab04c, 0x8a5a2b, 0x8f8f8f, 0xe8d79a, 0xb8863f, 0x3f7f24, 0xa4433a, 0xb08a5a, 0x3d7fd6];
  return hex[type] || 0xffffff;
}

function undo() {
  const a = undoStack.pop();
  if (!a) { blip(150, 0.07, "sine", 0.04); return; }
  if (a.op === "add") delBlock(a.x, a.y, a.z);
  else setBlock(a.x, a.y, a.z, a.type);
  rebuild();
  scheduleSave();
  blip(300, 0.08, "sine", 0.05);
}

// ------------------------------------------------------------------ награды

const progress = { placed: 0, stars: 0 };
const MILESTONES = [5, 15, 30, 60, 100];

const starsEl = document.getElementById("starCount");
const awardEl = document.getElementById("award");
let awardTimer = null;

function renderStars() {
  if (starsEl) starsEl.textContent = String(progress.stars);
}

function checkMilestones() {
  const target = MILESTONES[progress.stars];
  if (target === undefined || progress.placed < target) return;
  progress.stars++;
  renderStars();
  showAward(progress.stars);
  save();
}

function showAward(stars) {
  if (!awardEl) return;
  const text = awardEl.querySelector(".award-text");
  if (text) {
    text.textContent = stars === 1 ? "Первая звезда!" : stars >= 4 ? "Ты строитель!" : "Молодец!";
  }
  awardEl.classList.add("show");
  clearTimeout(awardTimer);
  awardTimer = setTimeout(() => awardEl.classList.remove("show"), 2200);

  [523, 659, 784, 1046].forEach((f, i) => {
    setTimeout(() => blip(f, 0.16, "sine", 0.06), i * 110);
  });
}

// ------------------------------------------------------------------ управление

const state = { mode: "build", type: 0, tool: "pick" };

const stickEl = document.getElementById("stick");
const knobEl = document.getElementById("stick-knob");
const pointers = new Map();
let movePointer = null;
let lookPointer = null;
let moveStart = { x: 0, y: 0 };
let moveVec = { x: 0, y: 0 };
let lookStart = { x: 0, y: 0, t: 0, moved: 0 };

canvasEl.addEventListener("pointerdown", (e) => {
  ensureAudio();
  try { canvasEl.setPointerCapture(e.pointerId); } catch (err) { /* браузер может отказать */ }
  const isLeft = e.clientX < window.innerWidth * 0.42;

  if (isLeft && movePointer === null) {
    movePointer = e.pointerId;
    moveStart = { x: e.clientX, y: e.clientY };
    moveVec = { x: 0, y: 0 };
    stickEl.style.left = e.clientX + "px";
    stickEl.style.top = e.clientY + "px";
    stickEl.classList.add("show");
    knobEl.style.transform = "translate(-50%, -50%)";
  } else if (!isLeft && lookPointer === null) {
    lookPointer = e.pointerId;
    lookStart = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: 0 };
  }
});

canvasEl.addEventListener("pointermove", (e) => {
  if (e.pointerId === movePointer) {
    let dx = e.clientX - moveStart.x;
    let dy = e.clientY - moveStart.y;
    const max = 55;
    const len = Math.hypot(dx, dy);
    if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
    moveVec = { x: dx / max, y: dy / max };
    knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  } else if (e.pointerId === lookPointer) {
    const dx = e.clientX - lookStart.x;
    const dy = e.clientY - lookStart.y;
    lookStart.x = e.clientX;
    lookStart.y = e.clientY;
    lookStart.moved += Math.abs(dx) + Math.abs(dy);
    player.yaw -= dx * 0.005;
    player.pitch = THREE.MathUtils.clamp(player.pitch - dy * 0.004, -1.2, 1.2);
  }
});

function endPointer(e) {
  if (e.pointerId === movePointer) {
    movePointer = null;
    moveVec = { x: 0, y: 0 };
    stickEl.classList.remove("show");
  }
  if (lookPointer !== null && e.pointerId !== movePointer) {
    lookPointer = null;
    const dt = performance.now() - lookStart.t;
    if (lookStart.moved < 12 && dt < 320) act(lookStart.sx, lookStart.sy);
  }
}
canvasEl.addEventListener("pointerup", endPointer);
canvasEl.addEventListener("pointercancel", endPointer);

// кнопки
const modeBtn = document.getElementById("btn-mode");
function syncMode() {
  modeBtn.classList.toggle("build", state.mode === "build");
  modeBtn.classList.toggle("dig", state.mode === "dig");
}
modeBtn.addEventListener("click", () => {
  state.mode = state.mode === "build" ? "dig" : "build";
  syncMode();
  blip(state.mode === "build" ? 620 : 300, 0.09, "triangle", 0.05);
  hideHint();
});
syncMode();

const callBtn = document.getElementById("btn-call");
if (callBtn) callBtn.addEventListener("click", callFriends);

const jumpBtn = document.getElementById("btn-jump");
let jumpQueued = false;
jumpBtn.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  jumpQueued = true;
});

document.getElementById("btn-undo").addEventListener("click", undo);

const soundBtn = document.getElementById("btn-sound");
soundBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  soundBtn.classList.toggle("off", !soundOn);
  if (soundOn) { ensureAudio(); blip(600, 0.09); }
});

// инвентарь
const hotbar = document.getElementById("hotbar");
const slotEls = [];

TYPES.forEach((def, i) => {
  if (!def.inPalette) return;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "slot" + (i === 0 ? " active" : "");
  b.setAttribute("aria-label", def.name);

  // превью — боковая плитка блока, увеличенная без сглаживания
  const c = document.createElement("canvas");
  c.width = TILE;
  c.height = TILE;
  const src = buildAtlas(); // отдельный атлас для превью
  const sx = (def.side % COLS) * TILE;
  const sy = Math.floor(def.side / COLS) * TILE;
  c.getContext("2d").drawImage(src, sx, sy, TILE, TILE, 0, 0, TILE, TILE);
  b.style.backgroundImage = `url(${c.toDataURL()})`;
  b.style.imageRendering = "pixelated";

  b.addEventListener("click", () => {
    state.type = i;
    state.mode = "build";
    syncMode();
    slotEls.forEach((el) => el.classList.remove("active"));
    b.classList.add("active");
    blip(480 + i * 25, 0.07, "sine", 0.04);
    hideHint();
  });

  slotEls.push(b);
  hotbar.appendChild(b);
});

// инструменты
const TOOLS = [
  {
    id: "pick",
    name: "Кирка",
    icon: '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l7-7"/><path d="M9 6c3-2 8-1 10 2-3-1-6 0-8 2"/></svg>',
  },
  {
    id: "hammer",
    name: "Молоток",
    icon: '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l7-7"/><rect x="10" y="4" width="9" height="6" rx="1.5"/></svg>',
  },
  {
    id: "paint",
    name: "Краска",
    icon: '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l6-6"/><path d="M11 13l3-9 6 2-3 9z"/><path d="M9 17a2 2 0 1 0 0.01 0"/></svg>',
  },
  {
    id: "torch",
    name: "Факел",
    icon: '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V11"/><path d="M12 3c2.5 2 4 3.6 4 5.5a4 4 0 0 1-8 0C8 6.6 9.5 5 12 3z"/></svg>',
  },
];

const toolsEl = document.getElementById("tools");
const toolBtns = [];

TOOLS.forEach((tool) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "tool" + (tool.id === state.tool ? " active" : "");
  b.innerHTML = tool.icon;
  b.setAttribute("aria-label", tool.name);
  b.addEventListener("click", () => {
    state.tool = tool.id;
    toolBtns.forEach((el) => el.classList.remove("active"));
    b.classList.add("active");
    if (tool.id !== "pick") {
      state.mode = "build";
      syncMode();
    }
    blip(520 + Math.random() * 90, 0.07, "sine", 0.04);
    hideHint();
  });
  toolsEl.appendChild(b);
  toolBtns.push(b);
});

// подсказка
const hintEl = document.getElementById("hint");
let hintTimer = null;
function showHint() {
  hintEl.classList.add("show");
  clearTimeout(hintTimer);
  hintTimer = setTimeout(hideHint, 6000);
}
function hideHint() {
  hintEl.classList.remove("show");
  clearTimeout(hintTimer);
}

// новый мир
const confirmEl = document.getElementById("confirm");
document.getElementById("btn-new").addEventListener("click", () => confirmEl.classList.add("show"));
document.getElementById("confirm-no").addEventListener("click", () => confirmEl.classList.remove("show"));
document.getElementById("confirm-yes").addEventListener("click", () => {
  confirmEl.classList.remove("show");
  undoStack.length = 0;
  generateWorld();
  spawnAnimals();
  spawnPlayer();
  progress.placed = 0;
  progress.stars = 0;
  renderStars();
  rebuild();
  save();
  blip(700, 0.12);
});

// ------------------------------------------------------------------ сохранение

const STORAGE_KEY = "kubiki-world-v1";
let saveTimer = null;

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 400);
}

function save() {
  try {
    const arr2 = [];
    for (const [k, t] of world) {
      const [x, y, z] = k.split(",").map(Number);
      arr2.push([x, y, z, t]);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      blocks: arr2,
      player: { x: player.x, y: player.y, z: player.z, yaw: player.yaw, pitch: player.pitch },
      progress: { placed: progress.placed, stars: progress.stars },
    }));
  } catch (e) { /* переполнение памяти не критично */ }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.blocks) || data.blocks.length < 50) return false;
    world.clear();
    for (const [x, y, z, t] of data.blocks) setBlock(x, y, z, t);
    if (data.player) {
      Object.assign(player, data.player);
    }
    if (data.progress) {
      progress.placed = data.progress.placed || 0;
      progress.stars = data.progress.stars || 0;
    }
    return world.size > 50;
  } catch (e) {
    return false;
  }
}

// ------------------------------------------------------------------ цикл

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => setTimeout(resize, 250));

function updateCamera() {
  window.__dbg = Object.assign(window.__dbg || {}, {
    player: [Number(player.x.toFixed(2)), Number(player.y.toFixed(2)), Number(player.z.toFixed(2))],
    placed: progress.placed,
    stars: progress.stars,
  });
  camera.position.set(player.x, player.y + player.eye, player.z);
  camera.rotation.set(player.pitch, player.yaw, 0, "YXZ");
}

let last = performance.now();
let stepSound = 0;

function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  // движение
  const speed = WALK;
  const forward = -moveVec.y;
  const strafe = moveVec.x;

  if (Math.abs(forward) > 0.08 || Math.abs(strafe) > 0.08) {
    const sy = Math.sin(player.yaw);
    const cy = Math.cos(player.yaw);
    const dx = (sy * -forward + cy * strafe) * speed * dt;
    const dz = (cy * -forward - sy * strafe) * speed * dt;
    moveAxis("x", dx);
    moveAxis("z", dz);

    stepSound -= dt;
    if (player.onGround && stepSound <= 0) {
      blip(120 + Math.random() * 30, 0.05, "triangle", 0.02);
      stepSound = 0.32;
    }
  }

  if (jumpQueued && player.onGround) {
    player.vy = JUMP;
    player.onGround = false;
    blip(520, 0.09, "sine", 0.04);
  }
  jumpQueued = false;

  moveVertical(dt);
  updateCamera();

  // рамка цели
  const target = raycastBlock();
  if (target) {
    const dist = Math.hypot(
      target.hit.x + 0.5 - player.x,
      target.hit.y + 0.5 - (player.y + player.eye),
      target.hit.z + 0.5 - player.z,
    );
    highlight.position.set(target.hit.x + 0.5, target.hit.y + 0.5, target.hit.z + 0.5);
    highlight.visible = dist > 1.4;
  } else {
    highlight.visible = false;
  }

  updateParticles(dt);
  updateBall(dt);
  updateWeather(dt);
  updateAnimals(dt, now / 1000);
  updateSky(now);

  for (let i = 0; i < clouds.children.length; i++) {
    const c = clouds.children[i];
    c.position.x += dt * (0.6 + i * 0.05);
    if (c.position.x > 80) c.position.x = -80;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

// ------------------------------------------------------------------ запуск

if (!load()) {
  generateWorld();
  spawnPlayer();
} else {
  showHint();
}

spawnAnimals();
progress.placed = progress.placed || 0;
renderStars();

rebuild();
resize();
updateCamera();
requestAnimationFrame(tick);

window.addEventListener("pointerdown", ensureAudio, { once: true });

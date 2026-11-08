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
  brick: 8, water: 9, planks: 10, cobble: 11,
};

const TYPES = [
  { name: "трава",  top: T.grassTop, side: T.grassSide, bottom: T.dirt, inPalette: true },
  { name: "земля",  top: T.dirt, side: T.dirt, bottom: T.dirt, inPalette: true },
  { name: "камень", top: T.stone, side: T.stone, bottom: T.stone, inPalette: true },
  { name: "песок",  top: T.sand, side: T.sand, bottom: T.sand, inPalette: true },
  { name: "дерево", top: T.woodTop, side: T.woodSide, bottom: T.woodTop, inPalette: true },
  { name: "листва", top: T.leaves, side: T.leaves, bottom: T.leaves, inPalette: true },
  { name: "кирпич", top: T.brick, side: T.brick, bottom: T.brick, inPalette: true },
  { name: "доски",  top: T.planks, side: T.planks, bottom: T.planks, inPalette: true },
  { name: "вода",   top: T.water, side: T.water, bottom: T.water, inPalette: false },
];

const GRASS = 0, DIRT = 1, STONE = 2, SAND = 3, WOOD = 4, LEAF = 5, BRICK = 6, PLANKS = 7, WATER = 8;

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
  paint(T.planks, (x, y) => {
    if (y % 5 === 0) return hsl(28, 35, 34);
    return hsl(31 + rnd(-3, 3), 38, 44 + rnd(-3, 3));
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

const BOUND = { x: 22, y: 20, z: 22 };
const world = new Map();

const key = (x, y, z) => `${x},${y},${z}`;
const inside = (x, y, z) =>
  x >= -BOUND.x && x <= BOUND.x && z >= -BOUND.z && z <= BOUND.z && y >= 0 && y <= BOUND.y;

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

function generateWorld() {
  world.clear();

  // рельеф
  for (let x = -18; x <= 18; x++) {
    for (let z = -18; z <= 18; z++) {
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

  // деревья
  const spots = [[6, 6], [-3, -8], [9, 9], [-12, -5], [3, -13], [13, 3], [-6, -14], [-15, 8]];
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

scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa79a, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 0.75);
sun.position.set(30, 60, 20);
scene.add(sun);

// облака
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

const pigBodyMat = new THREE.MeshLambertMaterial({ color: 0xf0a0ab });
const pigHeadMat = new THREE.MeshLambertMaterial({ color: 0xf7b5be });
const pigSnoutMat = new THREE.MeshLambertMaterial({ color: 0xe0899a });
const pigLegMat = new THREE.MeshLambertMaterial({ color: 0xd98d9a });
const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2b2b2b });

function makePig(x, z) {
  const g = new THREE.Group();

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.55, 0.7), pigBodyMat);
  body.position.y = 0.62;
  g.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), pigHeadMat);
  head.position.set(0.72, 0.68, 0);
  g.add(head);

  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.28), pigSnoutMat);
  snout.position.set(0.99, 0.64, 0);
  g.add(snout);

  for (const s of [-0.11, 0.11]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.16), pigBodyMat);
    ear.position.set(0.62, 0.95, s);
    g.add(ear);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.06), eyeMat);
    eye.position.set(0.92, 0.76, s);
    g.add(eye);
  }

  const legPos = [[-0.32, 0.22], [-0.32, -0.22], [0.32, 0.22], [0.32, -0.22]];
  for (const [lx, lz] of legPos) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.16), pigLegMat);
    leg.position.set(lx, 0.21, lz);
    g.add(leg);
  }

  g.position.set(x + 0.5, terrainHeight(x, z) + 1, z + 0.5);
  animalGroup.add(g);

  animals.push({
    group: g,
    tx: x, tz: z,
    speed: 0.7 + Math.random() * 0.5,
    phase: Math.random() * 6.28,
    hop: 0,
  });
}

function spawnAnimals() {
  const spots = [[3, 12], [-4, 11], [10, 4], [-11, -3], [7, -3], [-2, -11]];
  for (const [x, z] of spots) makePig(x, z);
}

const animalTarget = new THREE.Vector3();

function updateAnimals(dt, time) {
  for (const a of animals) {
    const g = a.group;
    const dx = a.tx + 0.5 - g.position.x;
    const dz = a.tz + 0.5 - g.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.4) {
      a.tx = THREE.MathUtils.clamp(g.position.x - 8 + Math.random() * 16, -17, 17);
      a.tz = THREE.MathUtils.clamp(g.position.z - 8 + Math.random() * 16, -17, 17);
    } else {
      const step = a.speed * dt;
      g.position.x += (dx / dist) * step;
      g.position.z += (dz / dist) * step;
      g.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
    }

    // держимся поверхности и слегка подпрыгиваем на ходу
    const ground = terrainHeight(Math.floor(g.position.x), Math.floor(g.position.z)) + 1;
    const bob = Math.abs(Math.sin(time * 4 + a.phase)) * 0.06;
    g.position.y += (ground + bob - g.position.y) * Math.min(1, dt * 8);

    if (a.hop > 0) {
      a.hop -= dt;
      g.position.y += Math.sin((1 - a.hop) * Math.PI) * 0.5;
    }
  }
}

function oink() {
  blip(320, 0.09, "sawtooth", 0.05);
  setTimeout(() => blip(260, 0.1, "sawtooth", 0.04), 90);
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

const MAX_PER_TYPE = 6000;
const meshes = [];
const indexByType = [];

for (let t = 0; t < TYPES.length; t++) {
  const def = TYPES[t];
  const geo = blockGeometry(def.top, def.side, def.bottom);
  const mesh = new THREE.InstancedMesh(geo, blockMaterial, MAX_PER_TYPE);
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

function spawnPlayer() {
  const h = terrainHeight(0, 8);
  player.x = 0.5;
  player.z = 8.5;
  player.y = h + 1.2;
  player.yaw = Math.atan2(-5.5 - player.x, 6.5 - player.z);
  player.pitch = -0.1;
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

// ------------------------------------------------------------------ действия

const undoStack = [];

function act(clientX, clientY) {
  const animal = hitAnimal(clientX, clientY);
  if (animal) {
    animal.hop = 0.45;
    oink();
    return;
  }

  const target = raycastAt(clientX, clientY) || raycastBlock();
  window.__acts = Object.assign(window.__acts || {}, { calls: (window.__acts?.calls || 0) + 1, hit: !!target, at: [Math.round(clientX || 0), Math.round(clientY || 0)] });
  if (!target) return;

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

const state = { mode: "build", type: 0 };

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
  updateAnimals(dt, now / 1000);

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

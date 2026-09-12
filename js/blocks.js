const TILE_PIX = 16;
const PAD = 2;
const CELL = TILE_PIX + PAD * 2;

function mkTile() {
  var c = document.createElement('canvas');
  c.width = TILE_PIX; c.height = TILE_PIX;
  return [c, c.getContext('2d')];
}
function px(g, x, y, col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
function randOf(r, arr) { return arr[(r() * arr.length) | 0]; }
function paintNoise(g, r, palette) {
  for (var y = 0; y < TILE_PIX; y++) for (var x = 0; x < TILE_PIX; x++) px(g, x, y, randOf(r, palette));
}
function paintGrassTop(g, r) {
  paintNoise(g, r, ['#5a9e3b', '#559632', '#62aa42', '#4c8a2e', '#6cb548']);
  for (var i = 0; i < 26; i++) px(g, (r() * 16) | 0, (r() * 16) | 0, '#7fc752');
  for (var i = 0; i < 18; i++) px(g, (r() * 16) | 0, (r() * 16) | 0, '#3f7a26');
}
function paintGrassSide(g, r) {
  paintNoise(g, r, ['#77522c', '#845c31', '#6d4a27', '#8a6234']);
  for (var y = 0; y < 4; y++) for (var x = 0; x < 16; x++) {
    var c = randOf(r, ['#5a9e3b', '#559632', '#62aa42', '#6cb548']);
    px(g, x, y, c);
  }
  for (var i = 0; i < 10; i++) px(g, (r() * 16) | 0, (r() * 2) | 0, '#7fc752');
}
function paintDirt(g, r) {
  paintNoise(g, r, ['#77522c', '#845c31', '#6d4a27', '#8a6234', '#7a5628']);
  for (var i = 0; i < 22; i++) px(g, (r() * 16) | 0, (r() * 16) | 0, '#5e3f20');
}
function paintStone(g, r) {
  paintNoise(g, r, ['#8f8f8f', '#9a9a9a', '#828282', '#a5a5a5', '#7d7d7d']);
  for (var i = 0; i < 24; i++) px(g, (r() * 16) | 0, (r() * 16) | 0, '#797979');
}
function paintSand(g, r) {
  paintNoise(g, r, ['#d9c58f', '#e0cd97', '#d2be88', '#e6d5a4']);
}
function paintGravel(g, r) {
  paintNoise(g, r, ['#7f7f7f', '#8d8d8d', '#6e6e6e', '#9b9b9b', '#757575']);
}
function paintBedrock(g, r) {
  paintNoise(g, r, ['#3c3c3c', '#2f2f2f', '#484848', '#262626']);
}
function paintWoodSide(g, r) {
  paintNoise(g, r, ['#6b4a2f', '#74512f', '#63422b', '#7a5735']);
  for (var x = 0; x < 16; x++) if (r() < 0.3) px(g, x, (r() * 16) | 0, '#553822');
  if (r() < 0.5) for (var y = 0; y < 16; y++) px(g, 1, y, '#553822');
  if (r() < 0.5) for (var y = 0; y < 16; y++) px(g, 14, y, '#553822');
}
function paintWoodTop(g, r) {
  paintNoise(g, r, ['#8a6a42', '#90704a', '#7f6140']);
  for (var i = 0; i < 16; i++) px(g, (r() * 16) | 0, (r() * 16) | 0, '#6f5232');
  px(g, 7, 7, '#54391f'); px(g, 8, 7, '#54391f'); px(g, 7, 8, '#54391f'); px(g, 8, 8, '#54391f');
}
function paintLeaves(g, r) {
  paintNoise(g, r, ['#2f6b1f', '#397c26', '#275a1a', '#3d8629']);
  for (var i = 0; i < 20; i++) px(g, (r() * 16) | 0, (r() * 16) | 0, '#4d9c33');
  for (var i = 0; i < 10; i++) px(g, (r() * 16) | 0, (r() * 16) | 0, '#1f4a15');
}
function paintWater(g, r) {
  g.globalAlpha = 0.75;
  paintNoise(g, r, ['#3a5fc4', '#3558b4', '#4068d0', '#31509f']);
  for (var i = 0; i < 16; i++) px(g, (r() * 16) | 0, (r() * 16) | 0, '#6a8fe0');
  g.globalAlpha = 1;
}
function paintGlass(g, r) {
  g.fillStyle = 'rgba(200,230,240,0.25)'; g.fillRect(0, 0, 16, 16);
  g.fillStyle = 'rgba(230,250,255,0.85)';
  for (var i = 0; i < 5; i++) px(g, (r() * 16) | 0, (r() * 16) | 0, '#eaf6ff');
  g.strokeStyle = 'rgba(255,255,255,0.7)';
  g.strokeRect(0.5, 0.5, 15, 15);
}
function paintPlank(g, r) {
  paintNoise(g, r, ['#9c7d4e', '#a5844f', '#947649']);
  for (var y = 0; y < 16; y += 4) {
    g.fillStyle = '#6f5a38';
    g.fillRect(0, y, 16, 1);
    var off = (r() * 16) | 0;
    g.fillRect(off, Math.min(y + 2, 15), 1, 2);
  }
}
function paintCobble(g, r) {
  paintNoise(g, r, ['#8a8a8a', '#959595', '#7f7f7f', '#9c9c9c']);
  g.strokeStyle = '#5b5b5b';
  for (var i = 0; i < 4; i++) {
    var x0 = (r() * 12) | 0, y0 = (r() * 12) | 0, w = 4 + (r() * 4) | 0, h = 4 + (r() * 4) | 0;
    g.strokeRect(x0 + 0.5, y0 + 0.5, w, h);
  }
}
function paintSnow(g, r) {
  paintNoise(g, r, ['#f2f6fa', '#e6ebf2', '#f7fafc', '#dde3ea']);
}
function paintOre(g, r, base, spots) {
  paintStone(g, r);
  for (var i = 0; i < 28; i++) px(g, (r() * 16) | 0, (r() * 16) | 0, randOf(r, spots));
}
function paintBrick(g, r) {
  paintNoise(g, r, ['#a04a38', '#aa5340', '#98402f', '#b25c48']);
  g.fillStyle = '#8a8a8a';
  for (var y = 0; y < 16; y += 4) g.fillRect(0, y, 16, 1);
  g.fillStyle = '#777';
  for (var y = 0; y < 16; y += 4) {
    var shift = (y % 8 === 0) ? 0 : 8;
    for (var x = shift; x < 16; x += 16) g.fillRect(x > 15 ? x - 16 + 16 : x, y, 1, 3);
    g.fillRect(0, y, 1, 3); g.fillRect(15, y, 1, 3);
  }
}
function paintObsidian(g, r) {
  paintNoise(g, r, ['#1a1026', '#241636', '#150d20', '#2b1a43']);
  for (var i = 0; i < 22; i++) px(g, (r() * 16) | 0, (r() * 16) | 0, '#3a2255');
}
function paintCraftingTop(g, r) {
  paintPlank(g, r);
  g.strokeStyle = '#4a3a24';
  for (var x = 0; x <= 16; x += 4) g.strokeRect(x + 0.5, 0.5, 1, 15);
  g.strokeRect(0.5, 0.5, 15, 15);
}
function paintCraftingSide(g, r) {
  paintPlank(g, r);
  g.fillStyle = '#c9b98a';
  g.fillRect(2, 5, 12, 6);
  for (var x = 2; x < 14; x += 2) g.fillStyle = '#5b4a2c', g.fillRect(x, 7, 1, 1);
}
function paintFurnaceFront(g, r) {
  paintCobble(g, r);
  g.fillStyle = '#222';
  g.fillRect(3, 8, 10, 6);
  for (var y = 0; y < 6; y++) for (var x = 0; x < 10; x++) if ((x + y) % 3 === 0) px(g, 3 + x, 8 + y, '#0a0a0a');
  g.fillStyle = '#c96a3a';
  g.fillRect(3, 3, 10, 3);
  for (var x = 3; x < 13; x++) if (r() < 0.4) px(g, x, 4 + ((r() * 3) | 0), '#e8894a');
}
function paintFurnaceSide(g, r) { paintCobble(g, r); }
function paintFurnaceTop(g, r) { paintCobble(g, r); }
function paintBrick2(g, r) { paintBrick(g, r); }
function paintSnowSide(g, r) { paintSnow(g, r); }
function paintFlower(g, r) {
  g.clearRect(0, 0, 16, 16);
  px(g, 7, 15, '#5a9e3b'); px(g, 8, 15, '#5a9e3b');
  px(g, 7, 14, '#5a9e3b'); px(g, 8, 14, '#5a9e3b');
  px(g, 7, 13, '#3f7a26'); px(g, 8, 13, '#3f7a26');
  px(g, 7, 12, '#3f7a26'); px(g, 8, 11, '#3f7a26');
  g.fillStyle = '#ff5a3c'; g.fillRect(7, 10, 2, 2);
  for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
    if ((dx === 0 || dy === 0) && !(dx === 0 && dy === 0)) { px(g, 7 + dx, 9 + dy, '#ff5a3c'); }
  }
  g.fillStyle = '#ffd43c'; px(g, 8, 10, '#ffd43c');
}

var TILE_PAINTERS = [
  paintGrassTop, paintGrassSide, paintDirt, paintStone, paintCobble, paintSand,
  paintGravel, paintBedrock, paintWoodSide, paintWoodTop, paintLeaves, paintWater,
  paintGlass, paintPlank, paintSnow, function (g, r) { paintOre(g, r, '#8f8f8f', ['#3a3a3a', '#2c2c2c']); },
  function (g, r) { paintOre(g, r, '#8f8f8f', ['#c98c6c', '#b57a5a']); },
  function (g, r) { paintOre(g, r, '#8f8f8f', ['#f5d74e', '#e0c03a']); },
  function (g, r) { paintOre(g, r, '#8f8f8f', ['#67e9d8', '#4ecfb8']); },
  paintObsidian, paintBrick, paintCraftingTop, paintCraftingSide, paintFurnaceFront,
  paintFurnaceSide, paintFurnaceTop, paintFlower
];

var TILE_NAMES = [
  'grass_top', 'grass_side', 'dirt', 'stone', 'cobble', 'sand', 'gravel', 'bedrock',
  'wood_side', 'wood_top', 'leaves', 'water', 'glass', 'plank', 'snow',
  'coal', 'iron', 'gold', 'diamond', 'obsidian', 'brick', 'crafting_top',
  'crafting_side', 'furnace_front', 'furnace_side', 'furnace_top', 'flower'
];

var TILE_INDEX = {};
for (var ti = 0; ti < TILE_NAMES.length; ti++) TILE_INDEX[TILE_NAMES[ti]] = ti;

var atlasCanvas = document.createElement('canvas');
atlasCanvas.width = TILE_PAINTERS.length * CELL;
atlasCanvas.height = CELL;
var atlasCtx = atlasCanvas.getContext('2d');
for (var ti2 = 0; ti2 < TILE_PAINTERS.length; ti2++) {
  var t = mkTile();
  TILE_PAINTERS[ti2](t[1], mulberry32((ti2 + 1) * 0x9E3779B9 >>> 0));
  atlasCtx.drawImage(t[0], ti2 * CELL + PAD, PAD);
}
var ATLAS_W = atlasCanvas.width, ATLAS_H = atlasCanvas.height;

function tileUV(tile) {
  var tx = tile % 1; 
  var u0 = (tile * CELL + PAD) / ATLAS_W;
  var v0 = (PAD) / ATLAS_H;
  var u1 = (tile * CELL + CELL - PAD) / ATLAS_W;
  var v1 = (CELL - PAD) / ATLAS_H;
  return [u0, v0, u1, v1];
}

const AIR = 0;
const WATER = 11;

function blockDef(o) {
  o.opaque = (o.opaque !== undefined) ? o.opaque : true;
  o.solid = (o.solid !== undefined) ? o.solid : true;
  o.drop = (o.drop !== undefined) ? o.drop : o.id;
  o.hardness = o.hardness || 1;
  o.toolKind = o.toolKind || 'any';
  return o;
}

var BLOCKS = [
  blockDef({ id: 0, name: 'Воздух', opaque: false, solid: false, hardness: 0 }),
  blockDef({ id: 1, name: 'Трава', top: 'grass_top', side: 'grass_side', bottom: 'dirt', hardness: 0.6, toolKind: 'shovel' }),
  blockDef({ id: 2, name: 'Земля', top: 'dirt', side: 'dirt', bottom: 'dirt', hardness: 0.6, toolKind: 'shovel' }),
  blockDef({ id: 3, name: 'Камень', top: 'stone', side: 'stone', bottom: 'stone', hardness: 1.8, toolKind: 'pick' }),
  blockDef({ id: 4, name: 'Булыжник', top: 'cobble', side: 'cobble', bottom: 'cobble', hardness: 2.0, toolKind: 'pick' }),
  blockDef({ id: 5, name: 'Дерево', top: 'wood_top', side: 'wood_side', bottom: 'wood_top', hardness: 2.0, toolKind: 'axe' }),
  blockDef({ id: 6, name: 'Доски', top: 'plank', side: 'plank', bottom: 'plank', hardness: 1.5, toolKind: 'axe' }),
  blockDef({ id: 7, name: 'Листва', top: 'leaves', side: 'leaves', bottom: 'leaves', opaque: false, hardness: 0.15, drop: null }),
  blockDef({ id: 8, name: 'Песок', top: 'sand', side: 'sand', bottom: 'sand', hardness: 0.6, toolKind: 'shovel' }),
  blockDef({ id: 9, name: 'Гравий', top: 'gravel', side: 'gravel', bottom: 'gravel', hardness: 0.6, toolKind: 'shovel' }),
  blockDef({ id: 10, name: 'Бедрок', top: 'bedrock', side: 'bedrock', bottom: 'bedrock', hardness: 9999, drop: null }),
  blockDef({ id: 11, name: 'Вода', top: 'water', side: 'water', bottom: 'water', opaque: false, solid: false, hardness: 0, drop: null }),
  blockDef({ id: 12, name: 'Стекло', top: 'glass', side: 'glass', bottom: 'glass', opaque: false, hardness: 0.4, drop: 12 }),
  blockDef({ id: 13, name: 'Угольная руда', top: 'coal', side: 'coal', bottom: 'coal', hardness: 1.8, toolKind: 'pick', drop: 202 }),
  blockDef({ id: 14, name: 'Железная руда', top: 'iron', side: 'iron', bottom: 'iron', hardness: 2.0, toolKind: 'pick', drop: 14 }),
  blockDef({ id: 15, name: 'Золотая руда', top: 'gold', side: 'gold', bottom: 'gold', hardness: 2.0, toolKind: 'pick', drop: 15 }),
  blockDef({ id: 16, name: 'Алмазная руда', top: 'diamond', side: 'diamond', bottom: 'diamond', hardness: 2.5, toolKind: 'ironpick', drop: 16 }),
  blockDef({ id: 17, name: 'Верстак', top: 'crafting_top', side: 'crafting_side', bottom: 'plank', hardness: 1.8, toolKind: 'axe' }),
  blockDef({ id: 18, name: 'Печь', top: 'furnace_top', side: 'furnace_side', bottom: 'furnace_top', hardness: 2.5, toolKind: 'pick', drop: 18 }),
  blockDef({ id: 19, name: 'Обсидиан', top: 'obsidian', side: 'obsidian', bottom: 'obsidian', hardness: 12, toolKind: 'diamondpick' }),
  blockDef({ id: 20, name: 'Кирпич', top: 'brick', side: 'brick', bottom: 'brick', hardness: 2.0, toolKind: 'pick' }),
  blockDef({ id: 21, name: 'Снег', top: 'snow', side: 'snow', bottom: 'snow', hardness: 0.4, toolKind: 'shovel' }),
  blockDef({ id: 22, name: 'Цветок', top: 'flower', side: 'flower', bottom: 'flower', opaque: false, solid: false, hardness: 0.05, drop: 22 })
];

const BEDROCK_Y = 0;

var ITEMS = [
  { id: 203, name: 'Палка', stack: 64, icon: 8 },
  { id: 202, name: 'Уголь', stack: 64, icon: 15 },
  { id: 200, name: 'Железный слиток', stack: 64, icon: 16 },
  { id: 201, name: 'Золотой слиток', stack: 64, icon: 17 }
];
var TOOLS = [
  { id: 100, name: 'Деревянная кирка', kind: 'pick', tier: 2, dur: 60, colors: ['#8a6a42', '#5a3d22'] },
  { id: 101, name: 'Каменная кирка', kind: 'pick', tier: 4, dur: 132, colors: ['#8a8a8a', '#5a5a5a'] },
  { id: 102, name: 'Железная кирка', kind: 'pick', tier: 6, dur: 251, colors: ['#d8d8d8', '#e8e8e8'] },
  { id: 103, name: 'Алмазная кирка', kind: 'pick', tier: 8, dur: 1562, colors: ['#67e9d8', '#4ecfb8'] },
  { id: 110, name: 'Деревянный топор', kind: 'axe', tier: 2, dur: 60, colors: ['#8a6a42', '#5a3d22'] },
  { id: 111, name: 'Каменный топор', kind: 'axe', tier: 4, dur: 132, colors: ['#8a8a8a', '#5a5a5a'] },
  { id: 112, name: 'Железный топор', kind: 'axe', tier: 6, dur: 251, colors: ['#d8d8d8', '#e8e8e8'] },
  { id: 120, name: 'Меч', kind: 'sword', tier: 3, dur: 60, colors: ['#8a6a42', '#5a3d22'] },
  { id: 130, name: 'Железный меч', kind: 'sword', tier: 7, dur: 251, colors: ['#d8d8d8', '#e8e8e8'] }
];
TOOLS.forEach(function (t) {
  var c = document.createElement('canvas');
  c.width = TILE_PIX; c.height = TILE_PIX;
  var g = c.getContext('2d');
  g.clearRect(0, 0, 16, 16);
  var a = t.colors[0], b = t.colors[1];
  if (t.kind === 'pick') {
    for (var i = 0; i < 6; i++) { px(g, 4 + i, 14 - i, b); px(g, 4 + i, 15 - i, b); }
    for (var i = 0; i < 3; i++) { px(g, 9, 13 - i, b); px(g, 10, 13 - i, b); }
    px(g, 2, 13, a); px(g, 3, 13, a); px(g, 4, 13, a); px(g, 5, 14, a); px(g, 6, 15, a);
    px(g, 9, 12, a); px(g, 10, 13, a); px(g, 11, 14, a); px(g, 12, 15, a);
    px(g, 8, 13, a); px(g, 9, 13, a); px(g, 10, 13, a); px(g, 11, 13, a);
  } else if (t.kind === 'axe') {
    for (var i = 0; i < 6; i++) { px(g, 4 + i, 14 - i, b); px(g, 4 + i, 15 - i, b); }
    px(g, 3, 12, a); px(g, 4, 12, a); px(g, 5, 12, a); px(g, 6, 12, a); px(g, 7, 12, a);
    px(g, 3, 13, a); px(g, 4, 11, a); px(g, 5, 11, a); px(g, 6, 11, a);
    px(g, 7, 11, a); px(g, 3, 11, a); px(g, 8, 12, a); px(g, 8, 13, a);
  } else if (t.kind === 'sword') {
    px(g, 7, 1, a); px(g, 7, 2, a); px(g, 8, 2, a); px(g, 8, 3, a); px(g, 7, 4, a); px(g, 8, 4, a);
    px(g, 8, 5, a); px(g, 8, 6, a); px(g, 8, 7, a); px(g, 7, 6, a); px(g, 7, 7, a);
    px(g, 6, 8, b); px(g, 7, 8, a); px(g, 8, 8, a); px(g, 9, 8, b);
    px(g, 6, 9, a); px(g, 7, 9, a); px(g, 8, 9, a); px(g, 9, 9, a);
    px(g, 7, 10, b); px(g, 8, 10, b); px(g, 7, 11, a); px(g, 8, 11, a); px(g, 7, 12, a); px(g, 8, 12, a);
  }
  t.iconCanvas = c;
});
function itemMeta(id) {
  if (id > 0 && id < BLOCKS.length) {
    var b = BLOCKS[id];
    return b.drop !== null ? { name: b.name, stack: 64, id: id, kind: 'block' } : null;
  }
  var it = ITEMS.find(function (x) { return x.id === id; });
  if (it) return { name: it.name, stack: it.stack, id: id, kind: 'item', icon: it.icon };
  var tl = TOOLS.find(function (x) { return x.id === id; });
  if (tl) return { name: tl.name, stack: 1, id: id, kind: 'tool', durability: tl.dur };
  return null;
}
function iconFor(id) {
  var m = itemMeta(id);
  if (!m) return null;
  if (m.kind === 'tool') {
    var tl = TOOLS.find(function (x) { return x.id === id; });
    return tl ? tl.iconCanvas : null;
  }
  if (m.kind === 'item') {
    var t2 = m.icon !== undefined ? tileUV(m.icon) : null;
    return { tileIndex: m.icon, uv: t2 };
  }
  var b = BLOCKS[id];
  var tn = b.top || b.side || 'stone';
  return { tileIndex: TILE_INDEX[tn], uv: tileUV(TILE_INDEX[tn]) };
}
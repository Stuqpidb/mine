var RECIPES = [
  { w: 1, h: 1, pat: [5], out: { id: 6, n: 4 }, name: 'Доски' },
  { w: 1, h: 2, pat: [6, 6], out: { id: 203, n: 4 }, name: 'Палки' },
  { w: 2, h: 2, pat: [6, 6, 6, 6], out: { id: 17, n: 1 }, name: 'Верстак' },
  { w: 3, h: 3, pat: [4, 4, 4, 4, 0, 4, 4, 4, 4], out: { id: 18, n: 1 }, name: 'Печь' },
  { w: 3, h: 3, pat: [6, 6, 6, 0, 203, 0, 0, 203, 0], out: { id: 100, n: 1 }, name: 'Деревянная кирка' },
  { w: 3, h: 3, pat: [4, 4, 4, 0, 203, 0, 0, 203, 0], out: { id: 101, n: 1 }, name: 'Каменная кирка' },
  { w: 3, h: 3, pat: [200, 200, 200, 0, 203, 0, 0, 203, 0], out: { id: 102, n: 1 }, name: 'Железная кирка' },
  { w: 3, h: 3, pat: [16, 16, 16, 0, 203, 0, 0, 203, 0], out: { id: 103, n: 1 }, name: 'Алмазная кирка' },
  { w: 3, h: 3, pat: [6, 6, 0, 6, 203, 0, 0, 203, 0], out: { id: 110, n: 1 }, name: 'Деревянный топор' },
  { w: 3, h: 3, pat: [4, 4, 0, 4, 203, 0, 0, 203, 0], out: { id: 111, n: 1 }, name: 'Каменный топор' },
  { w: 3, h: 3, pat: [200, 200, 0, 200, 203, 0, 0, 203, 0], out: { id: 112, n: 1 }, name: 'Железный топор' },
  { w: 3, h: 3, pat: [0, 6, 0, 0, 6, 0, 0, 203, 0], out: { id: 120, n: 1 }, name: 'Меч' },
  { w: 3, h: 3, pat: [0, 200, 0, 0, 200, 0, 0, 203, 0], out: { id: 130, n: 1 }, name: 'Железный меч' }
];

var FURNACE_RECIPES = {
  14: { out: 200, n: 1 },
  15: { out: 201, n: 1 },
  4: { out: 3, n: 1 },
  8: { out: 12, n: 1 },
  5: { out: 202, n: 1 },
  13: { out: 202, n: 1 }
};
var FURNACE_FUEL = { 202: 6, 5: 6, 6: 6 };

var INV = { slots: [], craft2: new Array(4).fill(null), craft3: new Array(9).fill(null), result: null, sel: 0 };
for (var _i = 0; _i < 36; _i++) INV.slots.push(null);

var FURNACE = { input: null, fuel: null, out: null, burn: 0, progress: 0, burning: false };

function itemName(id) { var m = itemMeta(id); return m ? m.name : ''; }

function addItem(id, n) {
  if (!itemMeta(id)) return n;
  var cap = itemMeta(id).stack;
  for (var pass = 0; pass < 2; pass++) {
    for (var i = 0; i < INV.slots.length && n > 0; i++) {
      var s = INV.slots[i];
      if (pass === 0) {
        if (s && s.id === id && s.n < cap) {
          var free = cap - s.n;
          var put = Math.min(free, n);
          s.n += put; n -= put;
        }
      } else {
        if (!s) {
          var put2 = Math.min(cap, n);
          INV.slots[i] = { id: id, n: put2 };
          n -= put2;
        }
      }
    }
  }
  return n;
}

function curItem() {
  var s = INV.slots[INV.sel];
  return s ? s.id : AIR;
}

function toolSpeed(itemId, blockId) {
  var tl = TOOLS.find(function (t) { return t.id === itemId; });
  var def = BLOCKS[blockId];
  if (!tl) return def.toolKind === 'any' ? 1 : 0.5;
  if (tl.kind === 'sword') return def.toolKind === 'any' ? 1.2 : 0.5;
  var pickBlock = def.toolKind === 'pick' || def.toolKind === 'ironpick' || def.toolKind === 'diamondpick';
  if (pickBlock && tl.kind === 'pick') {
    if (blockId === 16 && tl.tier < 6) return 0.2;
    if (blockId === 19 && tl.tier < 8) return 0.2;
    return tl.tier;
  }
  var correct = def.toolKind === tl.kind;
  return correct ? tl.tier : 0.5;
}

function toolDurability(itemId) {
  var tl = TOOLS.find(function (t) { return t.id === itemId; });
  return tl ? tl.dur : 2147483647;
}

function damageTool(slot) {
  if (!slot) return false;
  var m = itemMeta(slot.id);
  if (!m || m.kind !== 'tool') return false;
  slot.dur = (slot.dur === undefined) ? toolDurability(slot.id) : slot.dur;
  slot.dur--;
  if (slot.dur <= 0) {
    var idx = INV.slots.indexOf(slot);
    if (idx >= 0) INV.slots[idx] = null;
    return true;
  }
  return false;
}

function matchRecipe(cells, gw, gh) {
  for (var r = 0; r < RECIPES.length; r++) {
    var rc = RECIPES[r];
    for (var oy = 0; oy <= gh - rc.h; oy++) {
      for (var ox = 0; ox <= gw - rc.w; ox++) {
        var ok = true;
        for (var y = 0; y < gh && ok; y++) for (var x = 0; x < gw && ok; x++) {
          var cell = cells[x + y * gw];
          var pid = (y >= oy && y < oy + rc.h && x >= ox && x < ox + rc.w) ? rc.pat[(x - ox) + (y - oy) * rc.w] : 0;
          var cid = cell ? cell.id : 0;
          if (cid !== pid) ok = false;
        }
        if (ok) return rc;
      }
    }
  }
  return null;
}

function refreshCraft(gw, gh) {
  var cells = gw === 2 ? INV.craft2 : INV.craft3;
  var r = matchRecipe(cells, gw, gh);
  INV.result = r ? { id: r.out.id, n: r.out.n } : null;
  return r;
}

function consumeCraftCells(cells) {
  for (var i = 0; i < cells.length; i++) {
    var c = cells[i];
    if (c) { c.n--; if (c.n <= 0) cells[i] = null; }
  }
}

function doCraft(gw, gh) {
  refreshCraft(gw, gh);
  if (!INV.result) return false;
  var leftover = addItem(INV.result.id, INV.result.n);
  if (leftover > 0) return false;
  var cells = gw === 2 ? INV.craft2 : INV.craft3;
  consumeCraftCells(cells);
  refreshCraft(gw, gh);
  sfxCraft();
  return true;
}

function furnaceTick(dt) {
  var r = FURNACE.input ? FURNACE_RECIPES[FURNACE.input.id] : null;
  if (FURNACE.input && FURNACE.input.n <= 0) FURNACE.input = null;
  if (FURNACE.fuel && FURNACE.fuel.n <= 0) FURNACE.fuel = null;
  var canBurn = FURNACE.input && r && FURNACE.fuel;
  if (canBurn && FURNACE.out && FURNACE.out.id !== r.out) canBurn = false;
  if (canBurn && FURNACE.out && FURNACE.out.n >= itemMeta(FURNACE.out.id).stack) canBurn = false;
  if (canBurn) {
    FURNACE.burning = true;
    FURNACE.burn += dt;
    var fuelDur = FURNACE_FUEL[FURNACE.fuel.id] || 6;
    if (FURNACE.burn >= fuelDur) {
      FURNACE.burn -= fuelDur;
      FURNACE.fuel.n--;
      if (FURNACE.fuel.n <= 0) FURNACE.fuel = null;
    }
    FURNACE.progress += dt;
    var need = 6;
    if (FURNACE.progress >= need) {
      FURNACE.progress -= need;
      FURNACE.input.n--;
      if (FURNACE.input.n <= 0) FURNACE.input = null;
      FURNACE.out = { id: r.out, n: (FURNACE.out ? FURNACE.out.n : 0) + r.n };
      sfxSmelt();
    }
  } else {
    FURNACE.burning = false;
    FURNACE.progress = 0;
  }
}
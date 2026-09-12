var SETTINGS = { dist: 6, sens: 1.0, vol: 0.8, fov: 75 };
var CURSOR = null;
var UI_MODE = 'title';

var uiEls = {};
function uiInit() {
  ['titleScreen','titleNote','settingsScreen','helpScreen','menuScreen','invScreen','furnaceScreen','deadScreen','craftHelpScreen','hud','debug','selName','msg','hurtFlash','saveDot','hearts','hotbar','invCanvas','furnaceCanvas','seedInput','btnPlay','btnContinue','craftHelpBody','settingsBody','helpGrid','craftHint','mcClose','btnCraftHelp'].forEach(function (id) {
    uiEls[id] = document.getElementById(id);
  });
  uiInitHelp();
  uiInitSettings();
}

function uiShowScreen(name) {
  UI_MODE = name;
  ['titleScreen','settingsScreen','helpScreen','menuScreen','invScreen','furnaceScreen','deadScreen','craftHelpScreen'].forEach(function (id) {
    uiEls[id].classList.add('hide');
  });
  if (name === 'play') { uiEls.hud.classList.remove('hide'); return; }
  uiEls.hud.classList.add('hide');
  var map = { title: 'titleScreen', settings: 'settingsScreen', help: 'helpScreen', menu: 'menuScreen', inv: 'invScreen', furnace: 'furnaceScreen', dead: 'deadScreen', craftHelp: 'craftHelpScreen' };
  if (map[name]) uiEls[map[name]].classList.remove('hide');
}

var _msgTimer = null;
function uiToast(text, ms) {
  uiEls.msg.textContent = text;
  uiEls.msg.style.opacity = 1;
  if (_msgTimer) clearTimeout(_msgTimer);
  _msgTimer = setTimeout(function () { uiEls.msg.style.opacity = 0; }, ms || 2200);
}

function uiHurtFlash() {
  uiEls.hurtFlash.style.opacity = 1;
  setTimeout(function () { uiEls.hurtFlash.style.opacity = 0; }, 220);
}

function uiShowDead() {
  uiShowScreen('dead');
  document.exitPointerLock();
}

function uiSetDebug(t) { uiEls.debug.textContent = t; }

function drawTileTo(g, id, x, y, size) {
  var ic = iconFor(id);
  if (!ic) return;
  if (ic instanceof HTMLCanvasElement) {
    g.imageSmoothingEnabled = false;
    g.drawImage(ic, 0, 0, 16, 16, x, y, size, size);
  } else if (ic.tileIndex !== undefined) {
    g.imageSmoothingEnabled = false;
    g.drawImage(atlasCanvas, ic.tileIndex * CELL + PAD, PAD, TILE_PIX, TILE_PIX, x, y, size, size);
  }
}

function drawSlotBg(g, x, y, s, selected) {
  g.fillStyle = '#8b8b8b';
  g.fillRect(x, y, s, s);
  g.fillStyle = '#373737';
  g.fillRect(x, y, s, 3); g.fillRect(x, y, 3, s);
  g.fillStyle = '#ffffff';
  g.fillRect(x, y + s - 3, s, 3); g.fillRect(x + s - 3, y, 3, s);
  if (selected) {
    g.strokeStyle = '#fff';
    g.lineWidth = 3;
    g.strokeRect(x - 2, y - 2, s + 4, s + 4);
  }
}

function drawItemInSlot(g, item, x, y, s) {
  if (!item) return;
  drawTileTo(g, item.id, x + 4, y + 4, s - 8);
  var m = itemMeta(item.id);
  if (item.n > 1) {
    g.font = 'bold 13px monospace';
    g.fillStyle = '#000';
    g.fillText(item.n, x + s - 14 + 1, y + s - 5 + 1);
    g.fillStyle = '#fff';
    g.fillText(item.n, x + s - 14, y + s - 5);
  }
  if (m && m.kind === 'tool' && item.dur !== undefined && item.dur < m.durability) {
    var frac = item.dur / m.durability;
    g.fillStyle = '#222';
    g.fillRect(x + 4, y + s - 5, s - 8, 3);
    g.fillStyle = frac > 0.5 ? '#4c4' : (frac > 0.25 ? '#cc4' : '#c44');
    g.fillRect(x + 4, y + s - 5, (s - 8) * frac, 3);
  }
}

function uiDrawHotbar() {
  var c = uiEls.hotbar.querySelector('canvas');
  var g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  var s = 40, gap = 0;
  for (var i = 0; i < 9; i++) {
    var x = i * (s + gap);
    drawSlotBg(g, x, 2, s, i === INV.sel);
    drawItemInSlot(g, INV.slots[i], x, 2, s);
  }
  var cur = INV.slots[INV.sel];
  uiEls.selName.textContent = cur ? itemName(cur.id) : '';
}

function uiDrawHearts() {
  var c = uiEls.hearts.querySelector('canvas');
  var g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  for (var i = 0; i < 10; i++) {
    var x = i * 18;
    var full = PLAYER.health >= (i + 1) * 2;
    var half = !full && PLAYER.health >= i * 2 + 1;
    g.fillStyle = '#000';
    drawHeart(g, x + 1, 3, full || half ? (full ? '#e02f2f' : '#e07f7f') : '#3a3a3a');
  }
}
function drawHeart(g, x, y, col) {
  g.save();
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(x + 8, y + 14);
  g.bezierCurveTo(x - 2, y + 6, x, y - 2, x + 8, y + 3);
  g.bezierCurveTo(x + 16, y - 2, x + 18, y + 6, x + 8, y + 14);
  g.fill();
  g.strokeStyle = '#000';
  g.lineWidth = 1.5;
  g.stroke();
  g.restore();
}

var CRAFT_MODE = 2;
var UI_SLOTS = [];

function uiOpenInventory(mode) {
  CRAFT_MODE = mode || 2;
  uiShowScreen('inv');
  document.exitPointerLock();
  uiDrawInvScreen();
}

function uiDrawInvScreen() {
  var c = uiEls.invCanvas;
  var g = c.getContext('2d');
  c.width = 480;
  c.height = CRAFT_MODE === 3 ? 360 : 340;
  g.fillStyle = '#c6c6c6';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#555';
  g.fillRect(0, 0, c.width, 2); g.fillRect(0, c.height - 2, c.width, 2);
  g.fillRect(0, 0, 2, c.height); g.fillRect(c.width - 2, 0, 2, c.height);
  UI_SLOTS = [];
  var s = 40, gap = 6;
  var gs = CRAFT_MODE;
  var craftX = 20, craftY = 14;
  for (var y = 0; y < gs; y++) for (var x = 0; x < gs; x++) {
    var idx = x + y * gs;
    var sx = craftX + x * (s + 2), sy = craftY + y * (s + 2);
    drawSlotBg(g, sx, sy, s, false);
    drawItemInSlot(g, INV['craft' + gs][idx], sx, sy, s);
    UI_SLOTS.push({ x: sx, y: sy, kind: 'craft', index: idx });
  }
  var arrowX = craftX + gs * (s + 2) + 10;
  g.fillStyle = '#8b8b8b';
  g.fillRect(arrowX, craftY + gs * (s + 2) / 2 - 2, 30, 8);
  g.beginPath();
  g.moveTo(arrowX + 30, craftY + gs * (s + 2) / 2 - 9);
  g.lineTo(arrowX + 40, craftY + gs * (s + 2) / 2);
  g.lineTo(arrowX + 30, craftY + gs * (s + 2) / 2 + 9);
  g.fill();
  var resX = arrowX + 48;
  var resY = craftY + (gs * (s + 2) - s) / 2;
  drawSlotBg(g, resX, resY, s, !!INV.result);
  drawItemInSlot(g, INV.result, resX, resY, s);
  UI_SLOTS.push({ x: resX, y: resY, kind: 'result', index: 0 });

  var invY = craftY + gs * (s + 2) + 26;
  g.font = 'bold 13px Verdana';
  g.fillStyle = '#3f3f3f';
  g.fillText('Инвентарь', 20, invY - 8);
  for (var row = 0; row < 3; row++) for (var col = 0; col < 9; col++) {
    var idx2 = 9 + col + row * 9;
    var sx2 = 20 + col * (s + 2);
    var sy2 = invY + row * (s + 2);
    drawSlotBg(g, sx2, sy2, s, false);
    drawItemInSlot(g, INV.slots[idx2], sx2, sy2, s);
    UI_SLOTS.push({ x: sx2, y: sy2, kind: 'inv', index: idx2 });
  }
  var hbY = invY + 3 * (s + 2) + 14;
  for (var col2 = 0; col2 < 9; col2++) {
    var sx3 = 20 + col2 * (s + 2);
    drawSlotBg(g, sx3, hbY, s, false);
    drawItemInSlot(g, INV.slots[col2], sx3, hbY, s);
    UI_SLOTS.push({ x: sx3, y: hbY, kind: 'inv', index: col2 });
  }
  if (CURSOR) {
    drawItemInSlot(g, CURSOR, _mouseX - 20, _mouseY - 20, s);
  }
  var hint = CRAFT_MODE === 3 ? 'Открыт верстак: сетка 3×3' : 'Сетка 2×2. Верстак открывает 3×3';
  uiEls.craftHint.textContent = hint + '. ЛКМ — взять/положить стак, ПКМ — по одному.';
}

var _mouseX = 0, _mouseY = 0;

function uiInvClick(mx, my, right) {
  var hit = null;
  for (var i = 0; i < UI_SLOTS.length; i++) {
    var s = UI_SLOTS[i];
    if (mx >= s.x && mx <= s.x + 40 && my >= s.y && my <= s.y + 40) { hit = s; break; }
  }
  if (!hit) return;
  if (hit.kind === 'result') {
    if (!INV.result) return;
    var take = INV.result;
    if (CURSOR && CURSOR.id === take.id) {
      if (CURSOR.n + take.n <= itemMeta(take.id).stack) {
        CURSOR.n += take.n;
        consumeCraftGrid();
      }
    } else if (!CURSOR) {
      CURSOR = { id: take.id, n: take.n };
      consumeCraftGrid();
    }
    sfxCraft();
    uiDrawInvScreen();
    uiDrawHotbar();
    return;
  }
  var arr = hit.kind === 'inv' ? INV.slots : INV['craft' + CRAFT_MODE];
  var slot = arr[hit.index];
  if (CURSOR) {
    if (!slot) {
      if (right) {
        arr[hit.index] = { id: CURSOR.id, n: 1, dur: CURSOR.dur };
        CURSOR.n--;
        if (CURSOR.dur !== undefined) delete CURSOR.dur;
        if (CURSOR.n <= 0) CURSOR = null;
      } else {
        arr[hit.index] = CURSOR; CURSOR = null;
      }
    } else if (slot.id === CURSOR.id) {
      var cap = itemMeta(slot.id).stack;
      if (right) {
        if (slot.n < cap) { slot.n++; CURSOR.n--; if (CURSOR.n <= 0) CURSOR = null; }
      } else {
        var put = Math.min(cap - slot.n, CURSOR.n);
        slot.n += put; CURSOR.n -= put;
        if (CURSOR.n <= 0) CURSOR = null;
      }
    } else {
      var tmp = arr[hit.index];
      arr[hit.index] = CURSOR; CURSOR = tmp;
    }
  } else if (slot) {
    if (right && slot.n > 1) {
      var half = Math.ceil(slot.n / 2);
      CURSOR = { id: slot.id, n: half, dur: slot.dur };
      slot.n -= half;
    } else {
      CURSOR = slot; arr[hit.index] = null;
    }
  }
  refreshCraft(CRAFT_MODE, CRAFT_MODE);
  uiDrawInvScreen();
  uiDrawHotbar();
}

function consumeCraftGrid() {
  consumeCraftCells(INV['craft' + CRAFT_MODE]);
  refreshCraft(CRAFT_MODE, CRAFT_MODE);
}

function uiDropCursor() {
  if (!CURSOR) return;
  addItem(CURSOR.id, CURSOR.n);
  CURSOR = null;
}

var FURN_SLOTS = [];

function uiDrawFurnace() {
  var c = uiEls.furnaceCanvas;
  var g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = '#8b8b8b';
  g.fillRect(0, 0, c.width, c.height);
  var s = 40;
  FURN_SLOTS = [
    { x: 30, y: 8, kind: 'furnIn' },
    { x: 30, y: 64, kind: 'furnFuel' },
    { x: 210, y: 36, kind: 'furnOut' }
  ];
  for (var i = 0; i < FURN_SLOTS.length; i++) {
    drawSlotBg(g, FURN_SLOTS[i].x, FURN_SLOTS[i].y, s, false);
  }
  drawItemInSlot(g, FURNACE.input, 30, 8, s);
  drawItemInSlot(g, FURNACE.fuel, 30, 64, s);
  drawItemInSlot(g, FURNACE.out, 210, 36, s);
  var flameH = Math.min(1, FURNACE.burn / 6) * 22;
  if (FURNACE.burning && flameH > 0) {
    g.fillStyle = '#e8894a';
    g.fillRect(90, 86 - flameH, 14, flameH);
    g.fillStyle = '#ffd43c';
    g.fillRect(93, 86 - flameH * 0.6, 8, flameH * 0.6);
  }
  var pr = Math.min(1, FURNACE.progress / 6);
  g.fillStyle = '#555';
  g.fillRect(120, 48, 60, 8);
  g.fillStyle = '#fff';
  g.fillRect(120, 48, 60 * pr, 8);
  if (CURSOR) drawItemInSlot(g, CURSOR, _mouseX - 20, _mouseY - 20, s);
}

function uiFurnaceClick(mx, my, right) {
  var hit = null;
  for (var i = 0; i < FURN_SLOTS.length; i++) {
    var s = FURN_SLOTS[i];
    if (mx >= s.x && mx <= s.x + 40 && my >= s.y && my <= s.y + 40) { hit = s; break; }
  }
  if (!hit) return;
  var key = hit.kind;
  var slot = FURNACE[key === 'furnIn' ? 'input' : (key === 'furnFuel' ? 'fuel' : 'out')];
  if (key === 'furnOut') {
    if (slot && !CURSOR) { FURNACE.out = null; CURSOR = slot; }
    else if (slot && CURSOR && CURSOR.id === slot.id) {
      var cap = itemMeta(slot.id).stack;
      if (CURSOR.n + slot.n <= cap) { CURSOR.n += slot.n; FURNACE.out = null; }
    }
    uiDrawFurnace();
    return;
  }
  if (CURSOR) {
    if (!slot) {
      if (right) {
        FURNACE[key === 'furnIn' ? 'input' : 'fuel'] = { id: CURSOR.id, n: 1 };
        CURSOR.n--; if (CURSOR.n <= 0) CURSOR = null;
      } else {
        FURNACE[key === 'furnIn' ? 'input' : 'fuel'] = CURSOR; CURSOR = null;
      }
    } else if (slot.id === CURSOR.id) {
      var cap2 = itemMeta(slot.id).stack;
      var put = Math.min(cap2 - slot.n, right ? 1 : CURSOR.n);
      slot.n += put; CURSOR.n -= put;
      if (CURSOR.n <= 0) CURSOR = null;
    } else {
      var k2 = key === 'furnIn' ? 'input' : 'fuel';
      var tmp = FURNACE[k2];
      FURNACE[k2] = CURSOR; CURSOR = tmp;
    }
  } else if (slot) {
    var k3 = key === 'furnIn' ? 'input' : 'fuel';
    CURSOR = slot;
    FURNACE[k3] = null;
  }
  uiDrawFurnace();
}

function uiInitHelp() {
  var rows = [
    ['<span class="kbd">W A S D</span>', 'движение'],
    ['<span class="kbd">Пробел</span>', 'прыжок / вверх в полёте'],
    ['<span class="kbd">Shift</span>', 'красться / вниз в полёте'],
    ['<span class="kbd">Ctrl</span>', 'бег'],
    ['<span class="kbd">F</span>', 'режим полёта (двойной Пробел тоже)'],
    ['<span class="kbd">ЛКМ</span>', 'ломать блок'],
    ['<span class="kbd">ПКМ</span>', 'ставить блок / использовать'],
    ['<span class="kbd">1–9 / колесо</span>', 'выбор слота'],
    ['<span class="kbd">E</span>', 'инвентарь и крафт 2×2'],
    ['<span class="kbd">Esc</span>', 'меню'],
    ['<span class="kbd">F3</span>', 'отладочная информация']
  ];
  var html = '';
  rows.forEach(function (r) { html += '<div>' + r[0] + '</div><div class="lb">' + r[1] + '</div>'; });
  uiEls.helpGrid.innerHTML = html;
}

function uiInitSettings() {
  var body = uiEls.settingsBody;
  body.innerHTML = '';
  function row(label, min, max, step, get, set, fmt) {
    var div = document.createElement('div');
    div.className = 'row';
    var lab = document.createElement('span');
    lab.style.width = '150px';
    var inp = document.createElement('input');
    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step;
    inp.value = get();
    var upd = function () { lab.textContent = label + ': ' + fmt(parseFloat(inp.value)); };
    inp.oninput = function () { set(parseFloat(inp.value)); upd(); };
    upd();
    div.appendChild(lab); div.appendChild(inp);
    body.appendChild(div);
  }
  row('Дальность прорисовки', 3, 10, 1, function () { return SETTINGS.dist; }, function (v) { SETTINGS.dist = v; if (window.GAME_ENSURE) GAME_ENSURE(); }, function (v) { return v + ' чанков'; });
  row('Чувствительность', 0.3, 2.5, 0.1, function () { return SETTINGS.sens; }, function (v) { SETTINGS.sens = v; }, function (v) { return v.toFixed(1); });
  row('Громкость', 0, 1, 0.05, function () { return SETTINGS.vol; }, function (v) { SETTINGS.vol = v; setSoundVolume(v); }, function (v) { return Math.round(v * 100) + '%'; });
  row('Угол обзора (FOV)', 60, 110, 5, function () { return SETTINGS.fov; }, function (v) { SETTINGS.fov = v; if (window.GAME_CAMERA) { GAME_CAMERA.fov = v; GAME_CAMERA.updateProjectionMatrix(); } }, function (v) { return v + '°'; });
}

function uiInitCraftHelp() {
  var body = uiEls.craftHelpBody;
  body.innerHTML = '';
  var h = document.createElement('h2');
  h.textContent = 'Рецепты';
  body.appendChild(h);
  RECIPES.forEach(function (r) {
    var line = document.createElement('div');
    line.className = 'row';
    line.style.fontSize = '12px';
    var cv = document.createElement('canvas');
    cv.width = r.w * 18 + 6;
    cv.height = r.h * 18 + 6;
    var g = cv.getContext('2d');
    for (var y = 0; y < r.h; y++) for (var x = 0; x < r.w; x++) {
      var pid = r.pat[x + y * r.w];
      if (pid) drawTileTo(g, pid, x * 18 + 3, y * 18 + 3, 16);
    }
    var arrow = document.createElement('span');
    arrow.textContent = ' → ';
    arrow.style.fontWeight = 'bold';
    var cv2 = document.createElement('canvas');
    cv2.width = 22; cv2.height = 22;
    drawTileTo(cv2.getContext('2d'), r.out.id, 0, 0, 16);
    var name = document.createElement('span');
    name.textContent = r.out.n + '× ' + itemName(r.out.id) + (r.w === 3 ? ' (верстак)' : '');
    line.appendChild(cv); line.appendChild(arrow); line.appendChild(cv2); line.appendChild(name);
    body.appendChild(line);
  });
  var note = document.createElement('div');
  note.style.cssText = 'font-size:12px;color:#333;margin-top:10px;';
  note.textContent = 'Печь: железная/золотая руда → слитки, булыжник → камень, песок → стекло, дерево → уголь. Топливо: уголь, дерево, доски.';
  body.appendChild(note);
  var back = document.createElement('button');
  back.className = 'mcbtn';
  back.textContent = 'Назад';
  back.onclick = function () { uiShowScreen(CRAFT_MODE === 3 ? 'inv' : 'inv'); };
  body.appendChild(back);
}
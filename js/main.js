var renderer, scene, camera, solidMat, waterMat, atlasTex, sunLight, hemiLight;
var GAME_STATE = 'title';
var WORLD = null;
var CHUNK_MGR = new Map();
var loadQueue = [];
var lastPlayerChunk = null;
var gameTime = 300;
var DAY_LEN = 600;
var fps = 0, frameCount = 0, fpsTimer = 0;
var debugOn = false;
var lastSpaceTime = 0;
var stepTimer = 0;
var saveTimer = 0;
var SAVE_KEY = 'mineclone_save_v1';
var hurtOverlayT = 0;

function init() {
  uiInit();
  atlasTex = new THREE.CanvasTexture(atlasCanvas);
  atlasTex.magFilter = THREE.NearestFilter;
  atlasTex.minFilter = THREE.NearestFilter;
  atlasTex.generateMipmaps = false;

  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game'), antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 30, 160);

  camera = new THREE.PerspectiveCamera(SETTINGS.fov, window.innerWidth / window.innerHeight, 0.1, 1200);
  window.GAME_CAMERA = camera;

  solidMat = new THREE.MeshLambertMaterial({ map: atlasTex, vertexColors: true, alphaTest: 0.5 });
  waterMat = new THREE.MeshLambertMaterial({ map: atlasTex, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });

  sunLight = new THREE.DirectionalLight(0xffffff, 1);
  scene.add(sunLight);
  hemiLight = new THREE.HemisphereLight(0xbfdcff, 0x8b7d6b, 0.6);
  scene.add(hemiLight);

  bindEvents();
  uiInitCraftHelp();
  refreshTitleNote();
  requestAnimationFrame(loop);
}

function lsGet() { try { return localStorage.getItem(SAVE_KEY); } catch (e) { return null; } }
function lsSet(v) { try { localStorage.setItem(SAVE_KEY, v); return true; } catch (e) { return false; } }
function lsDel() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

function refreshTitleNote() {
  var has = lsGet() !== null;
  uiEls.btnContinue.classList.toggle('hide', !has);
  uiEls.titleNote.textContent = has ? 'Найдено сохранение' : 'Введите сид и нажмите «Играть»';
}

function seedFromString(s) {
  s = (s || '').trim();
  if (/^-?\d+$/.test(s)) return Math.abs(parseInt(s, 10)) >>> 0;
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function startNewWorld() {
  var seed = seedFromString(uiEls.seedInput.value);
  lsDel();
  beginGame(seed, null);
}

function continueWorld() {
  var raw = lsGet();
  if (!raw) return startNewWorld();
  var data;
  try { data = JSON.parse(raw); } catch (e) { return startNewWorld(); }
  beginGame(data.seed, data);
}

function beginGame(seed, saveData) {
  WORLD = new World(seed);
  for (var i = 0; i < INV.slots.length; i++) INV.slots[i] = null;
  INV.craft2 = new Array(4).fill(null);
  INV.craft3 = new Array(9).fill(null);
  INV.result = null;
  CURSOR = null;
  FURNACE.input = null; FURNACE.fuel = null; FURNACE.out = null;
  FURNACE.burn = 0; FURNACE.progress = 0; FURNACE.burning = false;
  clearAllChunkMeshes();
  if (saveData) {
    WORLD.loadDiffs(saveData.diffs || []);
    var pl = saveData.player;
    PLAYER.pos = { x: pl.pos[0], y: pl.pos[1], z: pl.pos[2] };
    PLAYER.spawn = { x: pl.spawn[0], y: pl.spawn[1], z: pl.spawn[2] };
    PLAYER.health = pl.health;
    PLAYER.flying = !!pl.flying;
    PLAYER.dead = false;
    PLAYER.vel = { x: 0, y: 0, z: 0 };
    PLAYER.fallPeak = PLAYER.pos.y;
    gameTime = saveData.time || 300;
    (saveData.inv || []).forEach(function (s, idx) {
      if (s && idx < INV.slots.length) INV.slots[idx] = { id: s[0], n: s[1], dur: s[2] };
    });
    if (saveData.furnace) {
      FURNACE.input = saveData.furnace.input ? { id: saveData.furnace.input[0], n: saveData.furnace.input[1] } : null;
      FURNACE.fuel = saveData.furnace.fuel ? { id: saveData.furnace.fuel[0], n: saveData.furnace.fuel[1] } : null;
      FURNACE.out = saveData.furnace.out ? { id: saveData.furnace.out[0], n: saveData.furnace.out[1] } : null;
    }
  } else {
    gameTime = 300;
    PLAYER.health = 20;
    PLAYER.dead = false;
    PLAYER.flying = false;
    var sp = findSpawn(WORLD);
    PLAYER.pos = { x: sp.x, y: sp.y, z: sp.z };
    PLAYER.spawn = { x: sp.x, y: sp.y, z: sp.z };
    PLAYER.vel = { x: 0, y: 0, z: 0 };
    PLAYER.fallPeak = sp.y;
    addItem(6, 16);
    addItem(17, 1);
  }
  INV.sel = 0;
  lastPlayerChunk = null;
  uiShowScreen('play');
  uiDrawHotbar();
  uiDrawHearts();
  ensureAround(true);
  lockPointer();
}

function saveGame() {
  if (!WORLD) return;
  var inv = INV.slots.map(function (s) { return s ? [s.id, s.n, s.dur] : null; });
  var data = {
    v: 1,
    seed: WORLD.seed,
    diffs: WORLD.serialize().diffs,
    player: {
      pos: [PLAYER.pos.x, PLAYER.pos.y, PLAYER.pos.z],
      spawn: [PLAYER.spawn.x, PLAYER.spawn.y, PLAYER.spawn.z],
      health: PLAYER.health,
      flying: PLAYER.flying
    },
    inv: inv,
    furnace: {
      input: FURNACE.input ? [FURNACE.input.id, FURNACE.input.n] : null,
      fuel: FURNACE.fuel ? [FURNACE.fuel.id, FURNACE.fuel.n] : null,
      out: FURNACE.out ? [FURNACE.out.id, FURNACE.out.n] : null
    },
    time: gameTime
  };
  try {
    if (!lsSet(JSON.stringify(data))) uiToast('Не удалось сохранить (нет доступа к localStorage)');
    else {
      uiEls.saveDot.style.opacity = 1;
      setTimeout(function () { uiEls.saveDot.style.opacity = 0; }, 700);
    }
  } catch (e) {
    uiToast('Не удалось сохранить');
  }
}

function toTitle() {
  saveGame();
  GAME_STATE = 'title';
  clearAllChunkMeshes();
  WORLD = null;
  refreshTitleNote();
  uiShowScreen('title');
  document.exitPointerLock();
}

function clearAllChunkMeshes() {
  CHUNK_MGR.forEach(function (entry) {
    disposeChunkEntry(entry);
  });
  CHUNK_MGR = new Map();
  loadQueue = [];
  if (WORLD) { WORLD._lastKey = null; WORLD._lastKey2 = null; }
}

function disposeChunkEntry(entry) {
  if (entry.solid) { scene.remove(entry.solid); entry.solid.geometry.dispose(); }
  if (entry.water) { scene.remove(entry.water); entry.water.geometry.dispose(); }
}

function chunkDist(cx, cz) {
  var pcx = Math.floor(PLAYER.pos.x / CHUNK), pcz = Math.floor(PLAYER.pos.z / CHUNK);
  return Math.max(Math.abs(cx - pcx), Math.abs(cz - pcz));
}

function ensureAround(sync) {
  var R = SETTINGS.dist;
  var pcx = Math.floor(PLAYER.pos.x / CHUNK), pcz = Math.floor(PLAYER.pos.z / CHUNK);
  var need = [];
  for (var dx = -R; dx <= R; dx++) for (var dz = -R; dz <= R; dz++) {
    var cx = pcx + dx, cz = pcz + dz;
    var key = cx + ',' + cz;
    if (!CHUNK_MGR.has(key)) need.push({ cx: cx, cz: cz, d: dx * dx + dz * dz });
  }
  need.sort(function (a, b) { return a.d - b.d; });
  loadQueue = need;
  CHUNK_MGR.forEach(function (entry, key) {
    var p = key.split(',');
    if (Math.max(Math.abs(+p[0] - pcx), Math.abs(+p[1] - pcz)) > R + 1) {
      disposeChunkEntry(entry);
      CHUNK_MGR.delete(key);
      WORLD.chunks.delete(key);
      WORLD._lastKey = null; WORLD._lastKey2 = null;
    }
  });
  if (sync) {
    var budget = 40;
    while (loadQueue.length > 0 && budget-- > 0) loadOneChunk();
  }
}

function loadOneChunk() {
  if (!loadQueue.length) return;
  var job = loadQueue.shift();
  buildChunkEntry(job.cx, job.cz);
}

function buildChunkEntry(cx, cz) {
  if (!WORLD) return;
  var key = cx + ',' + cz;
  WORLD.ensureChunk(cx, cz);
  var entry = CHUNK_MGR.get(key);
  if (entry) disposeChunkEntry(entry);
  var m = buildChunkMesh(WORLD, cx, cz);
  entry = { solid: null, water: null };
  if (m) {
    if (m.solid) {
      var gm = new THREE.BufferGeometry();
      gm.setAttribute('position', new THREE.Float32BufferAttribute(m.solid.pos, 3));
      gm.setAttribute('normal', new THREE.Float32BufferAttribute(m.solid.norm, 3));
      gm.setAttribute('uv', new THREE.Float32BufferAttribute(m.solid.uv, 2));
      gm.setAttribute('color', new THREE.Float32BufferAttribute(m.solid.col, 3));
      gm.setIndex(m.solid.idx);
      var mesh = new THREE.Mesh(gm, solidMat);
      mesh.matrixAutoUpdate = false;
      scene.add(mesh);
      entry.solid = mesh;
    }
    if (m.water) {
      var gw = new THREE.BufferGeometry();
      gw.setAttribute('position', new THREE.Float32BufferAttribute(m.water.pos, 3));
      gw.setAttribute('normal', new THREE.Float32BufferAttribute(m.water.norm, 3));
      gw.setAttribute('uv', new THREE.Float32BufferAttribute(m.water.uv, 2));
      gw.setAttribute('color', new THREE.Float32BufferAttribute(m.water.col, 3));
      gw.setIndex(m.water.idx);
      var wm = new THREE.Mesh(gw, waterMat);
      wm.matrixAutoUpdate = false;
      scene.add(wm);
      entry.water = wm;
    }
  }
  CHUNK_MGR.set(key, entry);
}

function rebuildDirtyChunks() {
  if (!WORLD || WORLD.dirtyKeys.size === 0) return;
  var list = Array.from(WORLD.dirtyKeys);
  WORLD.dirtyKeys.clear();
  for (var i = 0; i < list.length; i++) {
    var p = list[i].split(',');
    buildChunkEntry(+p[0], +p[1]);
  }
}

function markNeighborsDirty(x, y, z) {
  var lx = x & 15, lz = z & 15;
  var cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
  if (lx === 0) WORLD.dirtyKeys.add((cx - 1) + ',' + cz);
  if (lx === 15) WORLD.dirtyKeys.add((cx + 1) + ',' + cz);
  if (lz === 0) WORLD.dirtyKeys.add(cx + ',' + (cz - 1));
  if (lz === 15) WORLD.dirtyKeys.add(cx + ',' + (cz + 1));
}

function breakBlock() {
  var eye = eyePos();
  var dir = lookDir();
  var hit = voxelRaycast(WORLD, eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, 7);
  if (!hit) return;
  var id = WORLD.getBlock(hit.x, hit.y, hit.z);
  if (id === AIR || id === 10 || id === WATER) return;
  var def = BLOCKS[id];
  var speedFactor = toolSpeed(curItem(), id);
  var item = INV.slots[INV.sel];
  var broke = damageTool(item);
  WORLD.setBlock(hit.x, hit.y, hit.z, AIR);
  markNeighborsDirty(hit.x, hit.y, hit.z);
  sfxBreak(def.hardness / Math.max(0.2, speedFactor));
  if (def.drop !== null && def.drop !== undefined) {
    var left = addItem(def.drop, 1);
    if (left > 0) uiToast('Инвентарь полон!');
  }
  if (broke) uiToast('Инструмент сломан');
  uiDrawHotbar();
}

function placeBlock() {
  var eye = eyePos();
  var dir = lookDir();
  var hit = voxelRaycast(WORLD, eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, 7);
  if (!hit) return;
  var targetId = WORLD.getBlock(hit.x, hit.y, hit.z);
  if (targetId === 17) { uiOpenInventory(3); return; }
  if (targetId === 18) { uiShowScreen('furnace'); uiDrawFurnace(); document.exitPointerLock(); return; }
  var tx = hit.px, ty = hit.py, tz = hit.pz;
  var existing = WORLD.getBlock(tx, ty, tz);
  if (existing !== AIR && existing !== WATER && existing !== 22) return;
  var held = INV.slots[INV.sel];
  if (!held) return;
  var meta = itemMeta(held.id);
  if (!meta || meta.kind !== 'block') return;
  var def = BLOCKS[held.id];
  if (def.solid && blockIntersectsPlayer(tx, ty, tz)) return;
  if (WORLD.setBlock(tx, ty, tz, held.id)) {
    markNeighborsDirty(tx, ty, tz);
    held.n--;
    if (held.n <= 0) INV.slots[INV.sel] = null;
    sfxPlace();
    uiDrawHotbar();
  }
}

function blockIntersectsPlayer(bx, by, bz) {
  var p = PLAYER;
  var hw = p.halfWidth;
  return (bx + 1 > p.pos.x - hw && bx < p.pos.x + hw &&
          by + 1 > p.pos.y && by < p.pos.y + p.height &&
          bz + 1 > p.pos.z - hw && bz < p.pos.z + hw);
}

function eyePos() {
  return { x: PLAYER.pos.x, y: PLAYER.pos.y + PLAYER.eyeHeight, z: PLAYER.pos.z };
}
function lookDir() {
  var cp = Math.cos(PLAYER.pitch);
  return {
    x: -Math.sin(PLAYER.yaw) * cp,
    y: Math.sin(PLAYER.pitch),
    z: -Math.cos(PLAYER.yaw) * cp
  };
}

function lockPointer() {
  var canvas = document.getElementById('game');
  if (canvas.requestPointerLock) canvas.requestPointerLock();
}

function bindEvents() {
  var canvas = document.getElementById('game');

  document.getElementById('btnPlay').onclick = function () { startNewWorld(); };
  document.getElementById('btnContinue').onclick = function () { continueWorld(); };
  document.getElementById('btnResume').onclick = function () { uiShowScreen('play'); lockPointer(); };
  document.getElementById('btnSave').onclick = function () { saveGame(); uiToast('Мир сохранён'); };
  document.getElementById('btnOpenSettings').onclick = function () { uiShowScreen('settings'); };
  document.getElementById('btnHelp').onclick = function () { uiShowScreen('help'); };
  document.getElementById('btnToTitle').onclick = function () { toTitle(); };
  document.getElementById('btnSettingsBack').onclick = function () {
    if (WORLD) uiShowScreen('menu'); else { uiShowScreen('title'); refreshTitleNote(); }
  };
  document.getElementById('btnHelpBack').onclick = function () {
    if (WORLD) uiShowScreen('menu'); else { uiShowScreen('title'); refreshTitleNote(); }
  };
  document.getElementById('btnRespawn').onclick = function () {
    respawnPlayer();
    uiShowScreen('play');
    lockPointer();
  };
  document.getElementById('btnFurnaceClose').onclick = function () { closeOverlay(); };
  document.getElementById('btnCraftHelp').onclick = function () { uiInitCraftHelp(); uiShowScreen('craftHelp'); };
  uiEls.mcClose.onclick = function () { closeOverlay(); };

  document.addEventListener('keydown', function (e) {
    if (e.code === 'F3') { debugOn = !debugOn; e.preventDefault(); return; }
    if (UI_MODE === 'inv' && (e.code === 'KeyE' || e.code === 'Escape')) { closeOverlay(); e.preventDefault(); return; }
    if (UI_MODE === 'furnace' && e.code === 'Escape') { closeOverlay(); return; }
    if (UI_MODE === 'craftHelp' && e.code === 'Escape') { uiShowScreen('inv'); return; }
    if (UI_MODE !== 'play') return;
    keys[e.code] = true;
    if (e.code === 'Space') {
      var now = performance.now();
      if (now - lastSpaceTime < 280) { PLAYER.flying = !PLAYER.flying; PLAYER.vel.y = 0; uiToast(PLAYER.flying ? 'Полёт включён' : 'Полёт выключен'); }
      lastSpaceTime = now;
      e.preventDefault();
    }
    if (e.code === 'KeyF') { PLAYER.flying = !PLAYER.flying; PLAYER.vel.y = 0; uiToast(PLAYER.flying ? 'Полёт включён' : 'Полёт выключен'); }
    if (e.code === 'KeyE') { uiOpenInventory(2); return; }
    if (e.code.indexOf('Digit') === 0) {
      var n = parseInt(e.code.charAt(5), 10);
      if (n >= 1 && n <= 9) { INV.sel = n - 1; uiDrawHotbar(); }
    }
  });
  document.addEventListener('keyup', function (e) { keys[e.code] = false; });
  window.addEventListener('blur', function () { keys = {}; });

  document.addEventListener('pointerlockchange', function () {
    var locked = document.pointerLockElement === canvas;
    if (!locked && UI_MODE === 'play' && GAME_STATE === 'play') {
      uiShowScreen('menu');
    }
    if (locked) { GAME_STATE = 'play'; }
  });

  document.addEventListener('mousemove', function (e) {
    if (document.pointerLockElement === canvas) {
      var s = 0.0022 * SETTINGS.sens;
      PLAYER.yaw -= e.movementX * s;
      PLAYER.pitch -= e.movementY * s;
      var lim = Math.PI / 2 - 0.01;
      PLAYER.pitch = Math.max(-lim, Math.min(lim, PLAYER.pitch));
    }
    if (UI_MODE === 'inv') {
      var r = uiEls.invCanvas.getBoundingClientRect();
      _mouseX = (e.clientX - r.left) * (uiEls.invCanvas.width / r.width);
      _mouseY = (e.clientY - r.top) * (uiEls.invCanvas.height / r.height);
      uiDrawInvScreen();
    } else if (UI_MODE === 'furnace') {
      var r2 = uiEls.furnaceCanvas.getBoundingClientRect();
      _mouseX = (e.clientX - r2.left) * (uiEls.furnaceCanvas.width / r2.width);
      _mouseY = (e.clientY - r2.top) * (uiEls.furnaceCanvas.height / r2.height);
      uiDrawFurnace();
    }
  });

  canvas.addEventListener('mousedown', function (e) {
    if (UI_MODE !== 'play') return;
    if (document.pointerLockElement !== canvas) { lockPointer(); return; }
    if (e.button === 0) breakBlock();
    else if (e.button === 2) placeBlock();
  });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  uiEls.invCanvas.addEventListener('mousedown', function (e) {
    var r = uiEls.invCanvas.getBoundingClientRect();
    _mouseX = (e.clientX - r.left) * (uiEls.invCanvas.width / r.width);
    _mouseY = (e.clientY - r.top) * (uiEls.invCanvas.height / r.height);
    uiInvClick(_mouseX, _mouseY, e.button === 2);
    e.preventDefault();
  });
  uiEls.furnaceCanvas.addEventListener('mousedown', function (e) {
    var r = uiEls.furnaceCanvas.getBoundingClientRect();
    _mouseX = (e.clientX - r.left) * (uiEls.furnaceCanvas.width / r.width);
    _mouseY = (e.clientY - r.top) * (uiEls.furnaceCanvas.height / r.height);
    uiFurnaceClick(_mouseX, _mouseY, e.button === 2);
    e.preventDefault();
  });

  window.addEventListener('wheel', function (e) {
    if (UI_MODE !== 'play') return;
    if (e.deltaY > 0) INV.sel = (INV.sel + 1) % 9;
    else INV.sel = (INV.sel + 8) % 9;
    uiDrawHotbar();
  }, { passive: true });

  window.GAME_ENSURE = function () { if (WORLD) ensureAround(false); };

  window.addEventListener('resize', function () {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  window.addEventListener('beforeunload', function () { if (WORLD) saveGame(); });
}

function closeOverlay() {
  if (CURSOR) { uiDropCursor(); }
  refreshCraft(CRAFT_MODE, CRAFT_MODE);
  uiShowScreen('play');
  uiDrawHotbar();
  lockPointer();
}

function updateDayNight(dt) {
  gameTime = (gameTime + dt) % DAY_LEN;
  var t = gameTime / DAY_LEN;
  var theta = t * Math.PI * 2;
  var elev = Math.sin(theta);
  var sunX = Math.cos(theta) * 100, sunY = elev * 100, sunZ = 30;
  sunLight.position.set(sunX, Math.max(sunY, -20), sunZ);
  var dayF = Math.max(0.0, Math.min(1, elev * 2.2 + 0.1));
  sunLight.intensity = 0.15 + dayF * 0.85;
  hemiLight.intensity = 0.2 + dayF * 0.55;
  var skyDay = new THREE.Color(0x87ceeb), skyNight = new THREE.Color(0x060a18);
  var sky = skyNight.clone().lerp(skyDay, dayF);
  if (Math.abs(elev) < 0.25) {
    var sunset = new THREE.Color(0xf2905a);
    sky.lerp(sunset, 0.35 * (1 - Math.abs(elev) / 0.25));
  }
  scene.background.copy(sky);
  scene.fog.color.copy(sky);
  var underwater = WORLD && WORLD.getBlock(Math.floor(PLAYER.pos.x), Math.floor(PLAYER.pos.y + 1.5), Math.floor(PLAYER.pos.z)) === WATER;
  if (underwater) {
    scene.fog.near = 2; scene.fog.far = 22;
    scene.fog.color.setHex(0x1a4a8a);
    scene.background.setHex(0x1a4a8a);
  } else {
    var viewDist = SETTINGS.dist * CHUNK;
    scene.fog.near = viewDist * 0.55;
    scene.fog.far = viewDist * 0.98;
  }
}

function loop(now) {
  requestAnimationFrame(loop);
  var dt = Math.min(0.05, (now - (loop._last || now)) / 1000 || 0);
  loop._last = now;
  if (!WORLD || UI_MODE === 'title') { renderer.render(scene, camera); return; }

  frameCount++; fpsTimer += dt;
  if (fpsTimer >= 0.5) { fps = Math.round(frameCount / fpsTimer); frameCount = 0; fpsTimer = 0; }

  var playing = UI_MODE === 'play';
  if (playing && !PLAYER.dead) updatePlayer(WORLD, dt);
  furnaceTick(dt);
  updateDayNight(playing ? dt : 0);

  camera.position.set(PLAYER.pos.x, PLAYER.pos.y + PLAYER.eyeHeight, PLAYER.pos.z);
  camera.rotation.set(PLAYER.pitch, PLAYER.yaw, 0, 'YXZ');

  var pcx = Math.floor(PLAYER.pos.x / CHUNK), pcz = Math.floor(PLAYER.pos.z / CHUNK);
  var pkey = pcx + ',' + pcz;
  if (pkey !== lastPlayerChunk) {
    lastPlayerChunk = pkey;
    ensureAround(false);
  }
  var budget = 2;
  while (budget-- > 0 && loadQueue.length > 0) loadOneChunk();
  rebuildDirtyChunks();

  if (playing && !PLAYER.dead) {
    stepTimer -= dt;
    var hspeed = Math.sqrt(PLAYER.vel.x * PLAYER.vel.x + PLAYER.vel.z * PLAYER.vel.z);
    if (PLAYER.onGround && hspeed > 2 && stepTimer <= 0) { sfxStep(); stepTimer = 0.38; }
    saveTimer += dt;
    if (saveTimer > 25) { saveTimer = 0; saveGame(); }
  }

  if (debugOn) {
    var bio = WORLD.heightAt(Math.floor(PLAYER.pos.x), Math.floor(PLAYER.pos.z)).biome;
    uiSetDebug(
      'FPS: ' + fps +
      '\nXYZ: ' + PLAYER.pos.x.toFixed(1) + ' / ' + PLAYER.pos.y.toFixed(1) + ' / ' + PLAYER.pos.z.toFixed(1) +
      '\nЧанк: ' + pcx + ',' + pcz + ' · Загружено: ' + CHUNK_MGR.size +
      '\nБиом: ' + bio + ' · Сид: ' + WORLD.seed +
      '\nВремя: ' + Math.round(gameTime / DAY_LEN * 24) + ':00' + (PLAYER.flying ? ' · Полёт' : '')
    );
  } else if (uiEls.debug.textContent) uiSetDebug('');

  renderer.render(scene, camera);
}

init();
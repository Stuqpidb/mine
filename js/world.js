const CHUNK = 16;
const WORLD_H = 128;
const SEA = 31;
const WORLD_LIMIT = 640;

function hash2(a, b, seed) {
  return ((a * 374761393 + b * 668265263 + seed * 2246822519) | 0) >>> 0;
}

function World(seed) {
  this.seed = seed >>> 0;
  this.chunks = new Map();
  this.modified = new Map();
  this.dirtyKeys = new Set();
  this._lastKey = null;
  this._lastData = null;
  this.nCont = createNoise(this.seed);
  this.nDetail = createNoise(this.seed ^ 0x51ab);
  this.nMountain = createNoise(this.seed ^ 0x93de);
  this.nTemp = createNoise(this.seed ^ 0x0d1a);
  this.nHum = createNoise(this.seed ^ 0x7f0e);
  this.nCave = createNoise(this.seed ^ 0xcaf3);
  this.nOre = createNoise(this.seed ^ 0x0fee);
}
World.prototype.wkey = function (cx, cz) { return cx + ',' + cz; };

World.prototype.inBounds = function (x, z) {
  return Math.abs(x) <= WORLD_LIMIT && Math.abs(z) <= WORLD_LIMIT;
};

World.prototype.heightAt = function (x, z) {
  var e = this.nCont.oct(x * 0.0075, 0, z * 0.0075, 4, 0.5, 2.0);
  var e2 = this.nDetail.oct(x * 0.018, 5.7, z * 0.018, 3, 0.5, 2.0);
  var e3 = this.nMountain.oct(x * 0.0045, 1.3, z * 0.0045, 3, 0.5, 2.0);
  var tm = this.nTemp.oct(x * 0.0016, 10.0, z * 0.0016, 3, 0.5, 2.0);
  var hm = this.nHum.oct(x * 0.0013, 20.0, z * 0.0013, 3, 0.5, 2.0);
  var biome;
  if (tm < -0.35) biome = 'snow';
  else if (tm > 0.35 && hm < -0.1) biome = 'desert';
  else if (hm > 0.2) biome = 'forest';
  else biome = 'plains';
  var m;
  if (biome === 'desert') {
    m = 0.55;
  } else {
    m = 1;
  }
  var escal = e + Math.pow(Math.max(0, e - 0.15), 2) * 4.5;
  var h = SEA - 4 + (escal * 40 + e3 * 10) * m + e2 * 4;
  return { h: Math.max(1, Math.min(Math.round(h), WORLD_H - 4)), biome: biome, temp: tm, hum: hm };
};

World.prototype.getChunk = function (cx, cz) {
  var k = this.wkey(cx, cz);
  if (k === this._lastKey) return this._lastData;
  var d = this.chunks.get(k);
  if (d !== undefined) { this._lastKey = k; this._lastData = d; return d; }
  return null;
};

World.prototype.ensureChunk = function (cx, cz) {
  var d = this.getChunk(cx, cz);
  if (d) return d;
  if (!this.inBounds(cx * CHUNK, cz * CHUNK)) return null;
  d = this.generateChunk(cx, cz);
  this.chunks.set(this.wkey(cx, cz), d);
  this._lastKey = null;
  return d;
};

World.prototype.getBlock = function (x, y, z) {
  if (y < 0 || y >= WORLD_H) return AIR;
  var d = this.ensureChunk(Math.floor(x / CHUNK), Math.floor(z / CHUNK));
  if (!d) return AIR;
  var lx = x & 15, lz = z & 15;
  return d[lx + (y << 8) + (lz << 4)];
};

World.prototype.setBlock = function (x, y, z, id) {
  if (y < 0 || y >= WORLD_H || !this.inBounds(x, z)) return false;
  var cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
  var d = this.ensureChunk(cx, cz);
  if (!d) return false;
  var lx = x & 15, lz = z & 15;
  var idx = lx + (y << 8) + (lz << 4);
  var old = d[idx];
  if (old === id) return false;
  d[idx] = id;
  var k = x + ',' + y + ',' + z;
  this.modified.set(k, id);
  this.dirtyKeys.add(this.wkey(cx, cz));
  return true;
};

World.prototype.getTopSolid = function (x, z) {
  var d = this.ensureChunk(Math.floor(x / CHUNK), Math.floor(z / CHUNK));
  if (!d) return 0;
  var lx = x & 15, lz = z & 15;
  for (var y = WORLD_H - 1; y > 0; y--) {
    var id = d[lx + (y << 8) + (lz << 4)];
    if (BLOCKS[id].solid) return y;
  }
  return 0;
};

World.prototype.generateChunk = function (cx, cz) {
  var data = new Uint8Array(CHUNK * WORLD_H * CHUNK);
  var rand = mulberry32(hash2(cx, cz, this.seed));
  var self = this;
  for (var lx = 0; lx < CHUNK; lx++) for (var lz = 0; lz < CHUNK; lz++) {
    var wx = cx * CHUNK + lx, wz = cz * CHUNK + lz;
    var at = self.heightAt(wx, wz);
    var top = at.h;
    if (top < 1) top = 1;
    for (var y = 0; y <= top; y++) {
      var idx = lx + (y << 8) + (lz << 4);
      var cave = false;
      if (y > 5 && y < 64) {
        var cv = self.nCave.noise3(wx * 0.085, y * 0.12, wz * 0.085);
        if (cv > 0.72 + y * 0.003) cave = true;
      }
      var id;
      var surf = (y === top);
      var below3 = (top - y) <= 3;
      if (cave) { id = self._caveFloor(wx, wz, y); }
      else if (y === 0) { id = 10; }
      else if (surf) {
        if (top < SEA) id = 8;
        else if (at.biome === 'desert') id = 8;
        else if (at.biome === 'snow') id = 21;
        else id = 1;
      } else if (below3) {
        if (at.biome === 'desert' && top < SEA + 2) id = 8; else id = 2;
      } else {
        id = 3;
        if (y < 70) {
          var op = self.nOre.noise3(wx * 0.2, y * 0.2, wz * 0.2);
          if (y < 16 && op > 0.72) id = 16;
          else if (y < 30 && op > 0.68) id = 15;
          else if (y < 50 && op > 0.64) id = 14;
          else if (op > 0.62) id = 13;
          else if (op < -0.88) id = 9;
        }
      }
      data[idx] = id;
    }
    if (top < SEA) {
      for (var y2 = top + 1; y2 <= SEA; y2++) data[lx + (y2 << 8) + (lz << 4)] = WATER;
    }
  }
  self._placeTrees(cx, cz, data, rand);
  self._applyDiffs(cx, cz, data);
  return data;
};

World.prototype._caveFloor = function (wx, wz, y) {
  if (y === 0 || y === 1) return 10;
  return AIR;
};

World.prototype._placeTrees = function (cx, cz, data, rand) {
  var self = this;
  for (var lx = 0; lx < CHUNK; lx++) for (var lz = 0; lz < CHUNK; lz++) {
    var wx = cx * CHUNK + lx, wz = cz * CHUNK + lz;
    var at = self.heightAt(wx, wz);
    if (at.h < SEA + 1 || at.h >= WORLD_H - 8) continue;
    if (at.biome !== 'forest' && at.biome !== 'plains') continue;
    var chance = at.biome === 'forest' ? 0.16 : 0.02;
    if (rand() > chance) continue;
    var topId = data[lx + (at.h << 8) + (lz << 4)];
    if (topId !== 1) continue;
    var ty = at.h + 1;
    var th = 4 + ((rand() * 3) | 0);
    if (ty + th + 2 >= WORLD_H) continue;
    var ok = true;
    for (var yy = ty; yy < ty + th; yy++) {
      if (data[lx + (yy << 8) + (lz << 4)] !== AIR) { ok = false; break; }
    }
    if (!ok) continue;
    for (var yy2 = ty; yy2 < ty + th; yy2++) data[lx + (yy2 << 8) + (lz << 4)] = 5;
    var top = ty + th - 1;
    var ly;
    for (var dy = 0; dy <= 2; dy++) {
      var yl = top + 1 + dy;
      var r;
      if (dy === 2) {
        r = 1;
        for (var dx = -r; dx <= r; dx++) for (var dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) + Math.abs(dz) > r) continue;
          self._setLeaf(data, lx + dx, yl, lz + dz);
        }
        continue;
      }
      r = 2;
      for (var dx2 = -r; dx2 <= r; dx2++) for (var dz2 = -r; dz2 <= r; dz2++) {
        if (dx2 * dx2 + dz2 * dz2 > r * r + 1) continue;
        self._setLeaf(data, lx + dx2, yl, lz + dz2);
      }
    }
  }
};

World.prototype._setLeaf = function (data, lx, y, lz) {
  if (lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK) return;
  if (y < 0 || y >= WORLD_H) return;
  var idx = lx + (y << 8) + (lz << 4);
  if (data[idx] === AIR) data[idx] = 7;
};

World.prototype._applyDiffs = function (cx, cz, data) {
  if (this.modified.size === 0) return;
  var minX = cx * CHUNK, minZ = cz * CHUNK;
  var maxX = minX + CHUNK - 1, maxZ = minZ + CHUNK - 1;
  var self = this;
  this.modified.forEach(function (id, key) {
    var parts = key.split(',');
    var x = +parts[0], y = +parts[1], z = +parts[2];
    if (x < minX || x > maxX || z < minZ || z > maxZ) return;
    data[(x & 15) + (y << 8) + ((z & 15) << 4)] = id;
  });
};

World.prototype.serialize = function () {
  var arr = [];
  var self = this;
  this.modified.forEach(function (id, key) {
    var p = key.split(',');
    arr.push(+p[0], +p[1], +p[2], id);
  });
  return { seed: this.seed, diffs: arr };
};

World.prototype.loadDiffs = function (diffs) {
  this.modified = new Map();
  for (var i = 0; i + 3 < diffs.length; i += 4) {
    var x = diffs[i], y = diffs[i + 1], z = diffs[i + 2], id = diffs[i + 3];
    this.modified.set(x + ',' + y + ',' + z, id);
  }
};
var FACES = [
  { n: [1, 0, 0], A: [0, 1, 0], B: [0, 0, 1], ab: [0, 0, 1, 1], bb: [1, 0, 0, 1],
    c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], uv: [[1, 0], [0, 0], [0, 1], [1, 1]] },
  { n: [-1, 0, 0], A: [0, 1, 0], B: [0, 0, 1], ab: [0, 0, 1, 1], bb: [0, 1, 1, 0],
    c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], uv: [[0, 0], [1, 0], [1, 1], [0, 1]] },
  { n: [0, 1, 0], A: [1, 0, 0], B: [0, 0, 1], ab: [0, 1, 1, 0], bb: [1, 1, 0, 0],
    c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], uv: [[0, 0], [1, 0], [1, 1], [0, 1]] },
  { n: [0, -1, 0], A: [1, 0, 0], B: [0, 0, 1], ab: [0, 1, 1, 0], bb: [0, 0, 1, 1],
    c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], uv: [[0, 0], [1, 0], [1, 1], [0, 1]] },
  { n: [0, 0, 1], A: [1, 0, 0], B: [0, 1, 0], ab: [0, 1, 1, 0], bb: [0, 0, 1, 1],
    c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], uv: [[0, 0], [1, 0], [1, 1], [0, 1]] },
  { n: [0, 0, -1], A: [1, 0, 0], B: [0, 1, 0], ab: [1, 0, 0, 1], bb: [0, 1, 1, 0],
    c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], uv: [[0, 0], [1, 0], [1, 1], [0, 1]] }
];
var FACE_TILE = function (id, faceIdx, def) {
  if (faceIdx === 3) return def.bottom || def.side;
  if (faceIdx === 2) return def.top || def.side;
  if (id === 18 && faceIdx === 5) return 'furnace_front';
  return def.side;
};
var AO_BRIGHT = [0.52, 0.68, 0.84, 1.0];

function neighborId(world, cx, cz, x, y, z) {
  if (y < 0 || y >= WORLD_H) return AIR;
  var lx = x - cx * CHUNK, lz = z - cz * CHUNK;
  var d;
  if (lx >= 0 && lx < CHUNK && lz >= 0 && lz < CHUNK) {
    d = world.getChunk(cx, cz);
  } else {
    var cdx = Math.floor(x / CHUNK), cdz = Math.floor(z / CHUNK);
    var k = world.wkey(cdx, cdz);
    if (k === world._lastKey2) d = world._lastData2;
    else { d = world.chunks.get(k); world._lastKey2 = k; world._lastData2 = d; }
    if (!d) return AIR;
    lx = x - cdx * CHUNK; lz = z - cdz * CHUNK;
  }
  if (!d) return AIR;
  return d[lx + (y << 8) + (lz << 4)];
}

function buildChunkMesh(world, cx, cz) {
  var data = world.getChunk(cx, cz);
  if (!data) return null;
  var solid = { pos: [], norm: [], uv: [], col: [], idx: [], vc: 0 };
  var water = { pos: [], norm: [], uv: [], col: [], idx: [], vc: 0 };
  var hasS = false, hasW = false;
  var bx0 = cx * CHUNK, bz0 = cz * CHUNK;
  for (var lz = 0; lz < CHUNK; lz++) for (var y = 0; y < WORLD_H; y++) for (var lx = 0; lx < CHUNK; lx++) {
    var id = data[lx + (y << 8) + (lz << 4)];
    if (id === AIR) continue;
    var w = bx0 + lx, bz = bz0 + lz;
    var isW = (id === WATER);
    var def = BLOCKS[id];
    for (var f = 0; f < 6; f++) {
      var face = FACES[f];
      var nx = w + face.n[0], ny = y + face.n[1], nz = bz + face.n[2];
      var nid = neighborId(world, cx, cz, nx, ny, nz);
      var vis;
      if (isW) {
        if (nid === WATER) continue;
        vis = true;
      } else {
        if (BLOCKS[nid].opaque) continue;
        vis = true;
      }
      var target = isW ? water : solid;
      if (isW) hasW = true; else hasS = true;
      var tileName = FACE_TILE(id, f, def);
      var tile = TILE_INDEX[tileName];
      var tuv = tileUV(tile);
      var ao = isW ? [1, 1, 1, 1] : computeAO(world, cx, cz, w, y, bz, face);
      for (var k = 0; k < 4; k++) {
        var ck = face.c[k];
        var px = w + ck[0], py = (isW && ck[1] === 1) ? (y + 0.88) : (y + ck[1]), pz = bz + ck[2];
        target.pos.push(px, py, pz);
        target.norm.push(face.n[0], face.n[1], face.n[2]);
        var uu = face.uv[k][0], vv = face.uv[k][1];
        target.uv.push(tuv[0] + (tuv[2] - tuv[0]) * uu, tuv[1] + (tuv[3] - tuv[1]) * vv);
        var b = ao[k];
        target.col.push(b, b, b);
      }
      var base = target.vc;
      target.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      target.vc += 4;
    }
  }
  var out = {};
  if (hasS) out.solid = toGeometry(solid);
  if (hasW) out.water = toGeometry(water);
  return out;
}

function computeAO(world, cx, cz, x, y, z, face) {
  var A = face.A, B = face.B;
  var ax = x + face.n[0], ay = y + face.n[1], az = z + face.n[2];
  var res = [];
  for (var k = 0; k < 4; k++) {
    var aB = face.ab[k], bB = face.bb[k];
    var sx1 = ax + A[0] * aB, sy1 = ay + A[1] * aB, sz1 = az + A[2] * aB;
    var sx2 = ax + B[0] * bB, sy2 = ay + B[1] * bB, sz2 = az + B[2] * bB;
    var sxd = ax + A[0] * aB + B[0] * bB, syd = ay + A[1] * aB + B[1] * bB, szd = az + A[2] * aB + B[2] * bB;
    var a = BLOCKS[neighborId(world, cx, cz, sx1, sy1, sz1)].opaque ? 1 : 0;
    var b2 = BLOCKS[neighborId(world, cx, cz, sx2, sy2, sz2)].opaque ? 1 : 0;
    var c = a && b2 ? 1 : (BLOCKS[neighborId(world, cx, cz, sxd, syd, szd)].opaque ? 1 : 0);
    var lvl = (a && b2) ? 0 : (3 - a - b2 - c);
    res.push(AO_BRIGHT[lvl]);
  }
  return res;
}

function toGeometry(buf) {
  return {
    pos: buf.pos, norm: buf.norm, uv: buf.uv, col: buf.col, idx: buf.idx
  };
}

function voxelRaycast(world, ox, oy, oz, dx, dy, dz, maxDist) {
  var x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  var stepX = dx > 0 ? 1 : -1;
  var stepY = dy > 0 ? 1 : -1;
  var stepZ = dz > 0 ? 1 : -1;
  var tMaxX = dx !== 0 ? (dx > 0 ? (x + 1 - ox) / dx : (x - ox) / dx) : Infinity;
  var tMaxY = dy !== 0 ? (dy > 0 ? (y + 1 - oy) / dy : (y - oy) / dy) : Infinity;
  var tMaxZ = dz !== 0 ? (dz > 0 ? (z + 1 - oz) / dz : (z - oz) / dz) : Infinity;
  var tDx = dx !== 0 ? Math.abs(1 / dx) : Infinity;
  var tDy = dy !== 0 ? Math.abs(1 / dy) : Infinity;
  var tDz = dz !== 0 ? Math.abs(1 / dz) : Infinity;
  var px = x, py = y, pz = z;
  var nx = 0, ny = 0, nz = 0;
  var t = 0;
  while (t <= maxDist) {
    var id = world.getBlock(x, y, z);
    if (id !== AIR && BLOCKS[id].solid) {
      return { x: x, y: y, z: z, nx: nx, ny: ny, nz: nz, px: px, py: py, pz: pz };
    }
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      t = tMaxX; tMaxX += tDx; px = x; nx = -stepX; x += stepX;
    } else if (tMaxY < tMaxZ) {
      t = tMaxY; tMaxY += tDy; py = y; ny = -stepY; y += stepY;
    } else {
      t = tMaxZ; tMaxZ += tDz; pz = z; nz = -stepZ; z += stepZ;
    }
  }
  return null;
}
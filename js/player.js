var PLAYER = {
  pos: { x: 0.5, y: 80, z: 0.5 },
  vel: { x: 0, y: 0, z: 0 },
  yaw: 0, pitch: 0,
  onGround: false,
  flying: false,
  sneaking: false,
  sprinting: false,
  health: 20,
  inWater: false,
  halfWidth: 0.3,
  height: 1.8,
  eyeHeight: 1.62,
  fallPeak: 0,
  dead: false,
  spawn: { x: 0.5, y: 80, z: 0.5 }
};

const GRAVITY = 28;
const JUMP_VEL = 8.4;
const WALK_SPEED = 4.3;
const SPRINT_SPEED = 5.8;
const SNEAK_SPEED = 1.4;
const FLY_SPEED = 11;
const SWIM_SPEED = 3.0;
const TERMINAL_VEL = -50;

var keys = {};

function playerAABBCollides(world, px, py, pz) {
  var hw = PLAYER.halfWidth;
  var minX = Math.floor(px - hw), maxX = Math.floor(px + hw);
  var minY = Math.floor(py), maxY = Math.floor(py + PLAYER.height);
  var minZ = Math.floor(pz - hw), maxZ = Math.floor(pz + hw);
  for (var x = minX; x <= maxX; x++)
    for (var y = minY; y <= maxY; y++)
      for (var z = minZ; z <= maxZ; z++) {
        if (y < 0 || y >= WORLD_H) continue;
        var id = world.getBlock(x, y, z);
        if (BLOCKS[id].solid) return true;
      }
  return false;
}

function movePlayerAxis(world, axis, amount) {
  if (amount === 0) return false;
  var p = PLAYER.pos;
  var remaining = amount;
  var collided = false;
  var step = 0.2 * Math.sign(amount);
  while (Math.abs(remaining) > 0) {
    var s = Math.abs(remaining) > Math.abs(step) ? step : remaining;
    var nx = p.x + (axis === 0 ? s : 0);
    var ny = p.y + (axis === 1 ? s : 0);
    var nz = p.z + (axis === 2 ? s : 0);
    if (playerAABBCollides(world, nx, ny, nz)) { collided = true; break; }
    p.x = nx; p.y = ny; p.z = nz;
    remaining -= s;
  }
  return collided;
}

function updatePlayer(world, dt) {
  var p = PLAYER;
  if (p.dead) return;
  var feetBlock = world.getBlock(Math.floor(p.pos.x), Math.floor(p.pos.y), Math.floor(p.pos.z));
  var headBlock = world.getBlock(Math.floor(p.pos.x), Math.floor(p.pos.y + 1.4), Math.floor(p.pos.z));
  p.inWater = (feetBlock === WATER || headBlock === WATER);

  var sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
  var fwdX = -sin, fwdZ = -cos;
  var rightX = cos, rightZ = -sin;
  var ix = 0, iz = 0;
  if (keys['KeyW']) { ix += fwdX; iz += fwdZ; }
  if (keys['KeyS']) { ix -= fwdX; iz -= fwdZ; }
  if (keys['KeyD']) { ix += rightX; iz += rightZ; }
  if (keys['KeyA']) { ix -= rightX; iz -= rightZ; }
  var ilen = Math.sqrt(ix * ix + iz * iz);
  if (ilen > 0) { ix /= ilen; iz /= ilen; }

  p.sneaking = !!keys['ShiftLeft'] && !p.flying;
  p.sprinting = !!keys['ControlLeft'] && !p.sneaking;

  var speed;
  if (p.flying) speed = FLY_SPEED;
  else if (p.inWater) speed = SWIM_SPEED;
  else if (p.sneaking) speed = SNEAK_SPEED;
  else if (p.sprinting) speed = SPRINT_SPEED;
  else speed = WALK_SPEED;

  var accel = p.flying ? 24 : (p.onGround ? 30 : 8);
  var targetX = ix * speed, targetZ = iz * speed;
  p.vel.x += (targetX - p.vel.x) * Math.min(1, accel * dt);
  p.vel.z += (targetZ - p.vel.z) * Math.min(1, accel * dt);
  if (Math.abs(p.vel.x) < 0.01) p.vel.x = 0;
  if (Math.abs(p.vel.z) < 0.01) p.vel.z = 0;

  if (p.flying) {
    var vy = 0;
    if (keys['Space']) vy += FLY_SPEED;
    if (keys['ShiftLeft']) vy -= FLY_SPEED;
    p.vel.y += (vy - p.vel.y) * Math.min(1, 24 * dt);
  } else if (p.inWater) {
    var wTarget = keys['Space'] ? 3.0 : -2.2;
    p.vel.y += (wTarget - p.vel.y) * Math.min(1, 8 * dt);
    p.vel.y = Math.max(p.vel.y, -5);
  } else {
    p.vel.y -= GRAVITY * dt;
    if (p.vel.y < TERMINAL_VEL) p.vel.y = TERMINAL_VEL;
    if (keys['Space'] && p.onGround) {
      p.vel.y = JUMP_VEL;
      p.onGround = false;
      sfxJump();
    }
  }

  var prevVy = p.vel.y;
  if (p.vel.y > 0 || p.flying) p.fallPeak = p.pos.y;
  p.fallPeak = Math.max(p.fallPeak, p.pos.y);

  var yCollided = movePlayerAxis(world, 1, p.vel.y * dt);
  if (yCollided && p.vel.y > 0) p.vel.y = 0;
  var wasFalling = prevVy < -12 && !p.flying && !p.inWater;
  var hitGround = movePlayerAxis(world, 0, p.vel.x * dt);
  var hitCeil = movePlayerAxis(world, 2, p.vel.z * dt);
  if (hitGround || hitCeil) { p.vel.x = 0; p.vel.z = 0; }

  var grounded = false;
  if (p.vel.y <= 0 && !p.flying) {
    grounded = playerAABBCollides(world, p.pos.x, p.pos.y - 0.25, p.pos.z);
    if (grounded) {
      var snap = 0;
      while (snap < 25 && !playerAABBCollides(world, p.pos.x, p.pos.y - 0.01, p.pos.z)) { p.pos.y -= 0.01; snap++; }
    }
  }
  if (grounded) {
    if (wasFalling && !p.onGround) {
      var fallDist = p.fallPeak - p.pos.y;
      if (fallDist > 3.5) {
        var dmg = Math.floor(fallDist - 3);
        damagePlayer(dmg);
      }
    }
    p.onGround = true;
    p.fallPeak = p.pos.y;
    p.vel.y = 0;
  } else {
    p.onGround = false;
  }

  p.pos.x = Math.max(-WORLD_LIMIT + 2, Math.min(WORLD_LIMIT - 2, p.pos.x));
  p.pos.z = Math.max(-WORLD_LIMIT + 2, Math.min(WORLD_LIMIT - 2, p.pos.z));
  if (p.pos.y < -30) { damagePlayer(100); }
}

function damagePlayer(dmg) {
  if (PLAYER.dead || dmg <= 0) return;
  PLAYER.health -= dmg;
  sfxDmg();
  uiHurtFlash();
  if (PLAYER.health <= 0) {
    PLAYER.health = 0;
    PLAYER.dead = true;
    uiShowDead();
  }
  uiDrawHearts();
}

function respawnPlayer() {
  PLAYER.pos.x = PLAYER.spawn.x;
  PLAYER.pos.y = PLAYER.spawn.y;
  PLAYER.pos.z = PLAYER.spawn.z;
  PLAYER.vel = { x: 0, y: 0, z: 0 };
  PLAYER.health = 20;
  PLAYER.dead = false;
  PLAYER.fallPeak = PLAYER.pos.y;
  uiDrawHearts();
}

function findSpawn(world) {
  var x = 8, z = 8;
  world.ensureChunk(0, 0);
  var top = world.getTopSolid(x, z);
  while (top <= SEA && Math.abs(x) < 200) {
    x += 8;
    world.ensureChunk(Math.floor(x / CHUNK), Math.floor(z / CHUNK));
    top = world.getTopSolid(x, z);
  }
  return { x: x + 0.5, y: top + 1.05, z: z + 0.5 };
}
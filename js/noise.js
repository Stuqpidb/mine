function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function createNoise(seed) {
  var rand = mulberry32(seed >>> 0);
  var perm = new Uint8Array(256);
  var p = new Uint8Array(512);
  for (var i = 0; i < 256; i++) perm[i] = i;
  for (var i = 255; i > 0; i--) {
    var j = (rand() * (i + 1)) | 0;
    var t = perm[i]; perm[i] = perm[j]; perm[j] = t;
  }
  for (var i = 0; i < 512; i++) p[i] = perm[i & 255];

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + t * (b - a); }
  function grad(h, x, y, z) {
    h &= 15;
    var u = h < 8 ? x : y;
    var v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  function noise3(x, y, z) {
    var X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    var fx = x - Math.floor(x), fy = y - Math.floor(y), fz = z - Math.floor(z);
    var u = fade(fx), v = fade(fy), w = fade(fz);
    var A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
    var B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    return lerp(
      lerp(lerp(grad(p[AA], fx, fy, fz), grad(p[BA], fx - 1, fy, fz), u),
           lerp(grad(p[AB], fx, fy - 1, fz), grad(p[BB], fx - 1, fy - 1, fz), u), v),
      lerp(lerp(grad(p[AA + 1], fx, fy, fz - 1), grad(p[BA + 1], fx - 1, fy, fz - 1), u),
           lerp(grad(p[AB + 1], fx, fy - 1, fz - 1), grad(p[BB + 1], fx - 1, fy - 1, fz - 1), u), v),
      w);
  }

  function oct(x, y, z, octaves, pers, lac) {
    var amp = 1, freq = 1, sum = 0, norm = 0;
    for (var k = 0; k < octaves; k++) {
      sum += noise3(x * freq, y * freq, z * freq) * amp;
      norm += amp;
      amp *= pers;
      freq *= lac;
    }
    return sum / norm;
  }
  return { noise3: noise3, oct: oct };
}
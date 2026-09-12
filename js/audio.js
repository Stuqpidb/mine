var SOUND_ON = true;
var _actx = null, _master = null, _sndCache = {};

function ensureAudio() {
  if (_actx) return;
  try {
    _actx = new (window.AudioContext || window.webkitAudioContext)();
    _master = _actx.createGain();
    _master.gain.value = SOUND_ON ? 0.35 : 0;
    _master.connect(_actx.destination);
  } catch (e) { _actx = null; }
}
function setSoundVolume(v) {
  if (_master && _actx) _master.gain.value = SOUND_ON ? v * 0.35 : 0;
}
function sndNoise(duration) {
  var k = duration.toFixed(2);
  if (_sndCache[k]) return _sndCache[k];
  var frames = Math.max(1, Math.floor(_actx.sampleRate * duration));
  var buf = _actx.createBuffer(1, frames, _actx.sampleRate);
  var ch = buf.getChannelData(0);
  for (var i = 0; i < frames; i++) ch[i] = (Math.random() * 2 - 1);
  _sndCache[k] = buf;
  return buf;
}
function playNoise(dur, gain, filterFreq, type) {
  if (!_actx) return;
  var src = _actx.createBufferSource();
  src.buffer = sndNoise(dur);
  var f = _actx.createBiquadFilter();
  f.type = type || 'lowpass';
  f.frequency.value = filterFreq;
  f.frequency.linearRampToValueAtTime(filterFreq * 0.3, _actx.currentTime + dur);
  var g = _actx.createGain();
  var t = _actx.currentTime;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f); f.connect(g); g.connect(_master);
  src.start(t); src.stop(t + dur + 0.05);
}
function playTone(freq, dur, gain, type, slide) {
  if (!_actx) return;
  var o = _actx.createOscillator();
  o.type = type || 'square';
  var t = _actx.currentTime;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  var g = _actx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(_master);
  o.start(t); o.stop(t + dur + 0.05);
}
function sfxBreak(hardness) {
  if (!SOUND_ON) return;
  ensureAudio();
  var f = 300 + Math.min(1600, hardness * 500);
  playNoise(hardness > 2 ? 0.28 : 0.18, 0.7, f);
  playTone(Math.max(80, 200 - hardness * 30), 0.06, 0.2, 'square');
}
function sfxPlace() {
  if (!SOUND_ON) return;
  ensureAudio();
  playTone(140, 0.09, 0.5, 'square', 90);
  playNoise(0.05, 0.4, 400);
}
function sfxStep() {
  if (!SOUND_ON) return;
  ensureAudio();
  playNoise(0.05, 0.14, 340);
}
function sfxClick() {
  if (!SOUND_ON) return;
  ensureAudio();
  playTone(640, 0.04, 0.35, 'square');
}
function sfxDmg() {
  if (!SOUND_ON) return;
  ensureAudio();
  playTone(220, 0.22, 0.5, 'sawtooth', 70);
}
function sfxJump() {
  if (!SOUND_ON) return;
  ensureAudio();
  playNoise(0.1, 0.16, 500, 'highpass');
}
function sfxCraft() {
  if (!SOUND_ON) return;
  ensureAudio();
  playTone(660, 0.05, 0.3, 'square');
  playTone(880, 0.06, 0.3, 'square');
}
function sfxSmelt() {
  if (!SOUND_ON) return;
  ensureAudio();
  playTone(440, 0.08, 0.4, 'triangle');
  playTone(660, 0.1, 0.4, 'triangle');
}
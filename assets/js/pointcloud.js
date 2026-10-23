/*
 * pointcloud.js — the PointillViz homepage hero: real cells of four datasets, morphing.
 * An ES module with no dependencies, drawn with WebGL2. Full notes: concepts/hero-demo/README.md.
 *
 * ── Use ──────────────────────────────────────────────────────────────────────
 *
 *   import { PointCloud } from './assets/js/pointcloud.js';
 *
 *   const pc = await PointCloud.mount(canvasOrContainer, {
 *     manifestUrl: 'assets/data/hero/manifest.json',   // required (resolved against the page)
 *     state: '2d',              // first state: '2d' | '3d' | 'tma' | 'multiomics'
 *     particleBudget: 'auto',   // 'auto': 40,000, or the 15,000-particle prefix when the viewport's
 *                               // short side is under 600 px; or a number
 *     background: null,         // CSS colour or 'transparent'; null: the page's --pv-bg, else #06070D
 *     backgroundLift: 0.5,      // 0..1: a faint lighter centre behind the cloud (0 = flat)
 *     frame: { top, right, bottom, left },  // insets the content is fitted into: CSS px, or a
 *                               // fraction of the canvas when between 0 and 1 (default: none)
 *     frames: { <state>: { top, right, bottom, left } },  // per-state insets (default: none);
 *                               // a state with an entry is fitted into its own rect, the others
 *                               // into `frame`, so a switch glides between two rests
 *     liftColors: { <state>: '#rrggbb' },  // tint of the background lift per state (default:
 *                               // the engine's blue-grey)
 *     glide: 1100,              // ms the camera takes to reach a new framing (setView, setFrame)
 *     preload: 'all',           // 'all': the other states load after the first; 'first': they
 *                               // load on pc.prefetch() or when they are asked for
 *     introDuration: null,      // ms of the condense-in (default: 1.1 × duration)
 *     introAlpha: 0,            // 0..1: how visible the mist is when the intro starts
 *     posterHost: null,         // element the fallback still goes in (default: the container)
 *     onReady: (pc) => {},      // first frame drawn, or the poster shown (pc.fallback === true)
 *     onHover: (info) => {},    // { state, index, name, detail, color, x, y } (x, y: CSS px in the
 *                               // canvas) or null; mouse only
 *     onState: (id, phase) => {},  // phase 'start' (the morph to id begins: its particles are
 *                               // here) | 'end'; the intro emits only 'end'
 *     onProgress: (id, p) => {},  // p 0..1 as a state's particles arrive
 *     onFrame: (pc) => {},      // after every drawn frame (keep it light)
 *     interactive: true,        // drag to orbit (touch: horizontal drag; vertical still scrolls)
 *     keyboard: true,           // the canvas takes focus; arrow keys orbit
 *     hover: true,              // hover pick
 *     idle: true,               // gentle idle camera sway
 *     intro: true,              // the cells condense into the first state on load
 *     reducedMotion: 'auto',    // 'auto' follows prefers-reduced-motion; true / false forces it
 *     bloom: 'auto',            // the soft glow; true / false
 *     maxDpr: 2,                // device-pixel-ratio cap
 *     duration: 1600,           // morph length in ms (1200–1800 reads best)
 *     allowSoftwareGL: false,   // false: a software rasteriser (SwiftShader, llvmpipe) gets the poster
 *   });
 *
 *   pc.setState('3d');          // → Promise<boolean>: true when the morph finished, false if
 *                               //   another setState took over; states load lazily, so it may wait
 *   pc.setState('3d', { instant: true });
 *   pc.setView('tma', frame);   // one move: morph to a state and land on a new framing
 *   pc.setBackground('#0A0C18'[, lift]);
 *   pc.setFrame({ left: 0.42 }); // after a layout change (jumps)
 *   pc.setFrame(frame, { frames, glide: 600 });  // new framing, the camera glides to it
 *   pc.setBudget(15000);
 *   pc.setIdle(false);          // hold the idle sway where it is (true resumes it)
 *   pc.prefetch(['3d']);        // load states ahead of a switch (all others when omitted), one
 *                               //   at a time in the background; { first: true } jumps the queue.
 *                               //   A state asked for by setState loads at once and stops a
 *                               //   background download, which starts again after it
 *   pc.loaded('3d'); pc.progress('3d');   // its particles are here; 0..1 while loading, else null
 *   pc.detailReady('tma');      // → Promise<boolean>: its full-detail image is on the GPU (false: none)
 *   pc.setDetail(false);        // hide the full-detail image (true lets it fade in again)
 *   pc.pause(); pc.resume();
 *   pc.destroy();               // frees GL objects, listeners and the canvas it created
 *
 *   pc.state        current state id          pc.states    the manifest's states (label, legend, ...)
 *   pc.manifest     the manifest              pc.fallback  true when the poster is shown instead
 *   pc.umPerPixel() µm per CSS pixel at the centre of the view (for a scale bar), or null
 *   pc.anchors()    tissue array: [{ label, code, x, y }], CSS px of the centre of each tissue's
 *                   cells (for its name); [] in other states
 *   pc.plateAnchors() multi-omics: [{ name, hue, corners: [{ x, y } × 4] }], CSS px of each
 *                   plate's corners (for labels); [] in other states or while morphing
 *
 * mount() rejects only when the manifest cannot be loaded. Without WebGL2, on a software
 * rasteriser, or if WebGL fails to start, the state's WebP poster (manifest.posters: wide, or
 * tall in a portrait container) is shown in place of the canvas and setState swaps posters.
 * The poster blends with mix-blend-mode: lighten, so its dark ground takes the page's colour.
 * Under prefers-reduced-motion states change instantly, the camera holds still and the canvas
 * draws only when something changes. Frames stop when the canvas is off screen or the tab is
 * hidden. The canvas gets role="img" and an aria-label naming the dataset; the page still owns
 * the visible text alternative and the case buttons.
 *
 * ── How it draws ─────────────────────────────────────────────────────────────
 * Every state has the same N particles; particle i of one state flies to particle i of the next.
 * The build (tools/build_hero_data.py) orders particles so that the first 15,000 are a stratified
 * subset (small screens draw only that prefix) and so that neighbours fly to neighbours. The
 * vertex shader moves each particle on its own clock (a sweep across the screen plus jitter), with
 * a strong ease-in-out and a smooth arc of noise, so a morph reads as a flow. A morph interrupted
 * by another is continued from a CPU snapshot of the same maths, so nothing jumps. Points are round
 * and soft, sized in world units from each state's spacing (so they scale with the view, the state
 * and the budget), occluded through a core-only depth pre-pass (no hard edges), depth-cued in 3D,
 * and lifted by a quarter-resolution bloom. The camera blends on its own clock (camAnim), so a
 * new framing (a resize, a layout change) glides instead of jumping, with or without a morph.
 * The tissue array draws fewer cells than N (its manifest entry's drawn / drawnPhone): its other
 * particles take the palette's hidden entry (alpha 0, not pickable) and fade out as they arrive.
 * Its manifest entry also names a full-detail image of every cell (`detail`: WebP, straight RGBA
 * over the state's frame box). It is fetched when the state is asked for or prefetched, never with
 * the first load of another state; the engine takes the smallest file that covers the frame on
 * screen in device px (the smallest when the visitor saves data). It is drawn as a textured quad
 * in the particles' own world coordinates, so the camera's sway, a drag or a resize moves both
 * alike; once the particles land it fades in over them (0.7 s, at once under reduced motion), and
 * a morph that leaves fades it out (0.24 s) as the particles take over.
 *
 * This file merges the homepage concepts' engine changes (2026-10-22): per-state frames
 * (concepts/home-a), the camera clock, setView, liftColors and plateAnchors (concepts/home-b),
 * plus setIdle, prefetch / preload, the intro options and the poster blend.
 */

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
// point diameter as a multiple of the state's mean spacing
const SIZE_K = { section: 1.2, volume: 1.0, array: 1.0, plates: 1.16 };
const LIFT = [0.030, 0.034, 0.060];   // the background lift's default tint

// ── small math ─────────────────────────────────────────────────────────────
function perspective(out, fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  out.fill(0);
  out[0] = f / aspect; out[5] = f;
  out[10] = (far + near) * nf; out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

function lookAt(out, eye, target) {
  let zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
  let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
  // x = up × z with up = +Y
  let xx = zz, xy = 0, xz = -zx;
  l = Math.hypot(xx, xz) || 1; xx /= l; xz /= l;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
  out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
  out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
  out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
  out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
  out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
  out[15] = 1;
  return out;
}

function mul(out, a, b) {           // out = a * b (column-major)
  for (let c = 0; c < 4; c++) {
    const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
    out[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
    out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
    out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
    out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
  }
  return out;
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - 0.5 * Math.pow(2 - 2 * t, 3));

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseColor(c) {
  if (c == null || c === 'transparent') return [0, 0, 0, 0];
  if (Array.isArray(c)) return [c[0], c[1], c[2], c[3] == null ? 1 : c[3]];
  const s = String(c).trim();
  if (s[0] === '#') {
    let h = s.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split('').map((x) => x + x).join('');
    const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
    return [n(0), n(2), n(4), h.length >= 8 ? n(6) : 1];
  }
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    return [p[0] / 255, p[1] / 255, p[2] / 255, p[3] == null ? 1 : p[3]];
  }
  return [0.04, 0.047, 0.094, 1];
}

// ── shaders ────────────────────────────────────────────────────────────────
const VS_POINTS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aP0;
layout(location = 1) in vec4 aC0;
layout(location = 2) in float aS0;
layout(location = 3) in vec3 aP1;
layout(location = 4) in vec4 aC1;
layout(location = 5) in float aS1;
layout(location = 6) in vec4 aR;
uniform mat4 uView;
uniform mat4 uProj;
uniform float uT;
uniform float uSpread;
uniform vec3 uSweepDir;
uniform vec2 uSweep;
uniform float uNoise;
uniform float uLift;
uniform vec2 uBase;
uniform float uFocal;
uniform float uMinPx;
uniform float uMaxPx;
uniform float uAlpha;
uniform float uFog;
uniform vec2 uFogRange;
uniform float uOverlay;
out vec4 vCol;
out float vPx;
float ease(float t) { return t < 0.5 ? 4.0 * t * t * t : 1.0 - 0.5 * pow(2.0 - 2.0 * t, 3.0); }
void main() {
  float sweep = clamp((dot(aP0, uSweepDir) - uSweep.x) * uSweep.y, 0.0, 1.0);
  float delay = uSpread * mix(aR.x, sweep, 0.6);
  float t = clamp((uT - delay) / (1.0 - uSpread), 0.0, 1.0);
  float e = ease(t);
  float arc = sin(3.14159265 * e);
  vec3 m = (aP0 + aP1) * 0.5;
  vec3 q = m * 2.2 + (aR.yzw - 0.5) * 0.9;
  vec3 n = vec3(sin(q.z * 1.7 + q.y * 2.3), sin(q.x * 1.9 - q.z * 1.1), sin(q.y * 1.3 + q.x * 2.1));
  vec3 p = mix(aP0, aP1, e) + arc * (uNoise * n + vec3(0.0, uLift * (0.4 + aR.y), 0.0));
  vec4 c = mix(aC0, aC1, smoothstep(0.15, 0.85, e));
  vec4 vp = uView * vec4(p, 1.0);
  float depth = max(-vp.z, 1e-3);
  if (c.a < 0.5) vp.z += uOverlay;
  gl_Position = uProj * vp;
  float fogK = uFog * clamp((depth - uFogRange.x) / max(uFogRange.y - uFogRange.x, 1e-3), 0.0, 1.0);
  float s = mix(aS0 * uBase.x, aS1 * uBase.y, e) * 2.0;
  float px = s * uFocal / depth * (1.0 - 0.4 * fogK) * (1.0 + 0.3 * arc);
  float a = c.a * uAlpha * (1.0 - 0.5 * fogK);
  if (px < uMinPx) { a *= px / uMinPx; px = uMinPx; }
  px = min(px, uMaxPx);
  vCol = vec4(c.rgb * (1.0 - 0.62 * fogK), a);
  vPx = px;
  gl_PointSize = px;
}`;

const FS_POINTS = `#version 300 es
precision mediump float;
in vec4 vCol;
in float vPx;
uniform float uSoft;
uniform float uAdd;
uniform float uCore;
out vec4 o;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  float r = sqrt(r2);
  if (uCore > 0.0) {
    if (r > uCore || vCol.a < 0.45) discard;
    o = vec4(0.0);
    return;
  }
  float edge = clamp(max(uSoft, 2.2 / vPx), 0.0, 1.0);
  float a = vCol.a * (1.0 - smoothstep(1.0 - edge, 1.0, r));
  if (a < 0.003) discard;
  o = vec4(vCol.rgb * a, a * (1.0 - uAdd));
}`;

const VS_FULL = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FS_DOWN = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
out vec4 o;
void main() {
  o = 0.25 * (texture(uTex, vUv + uTexel * vec2(-1.0, -1.0)) + texture(uTex, vUv + uTexel * vec2(1.0, -1.0))
            + texture(uTex, vUv + uTexel * vec2(-1.0, 1.0)) + texture(uTex, vUv + uTexel * vec2(1.0, 1.0)));
}`;

const FS_BLUR = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uDir;
out vec4 o;
void main() {
  vec4 c = texture(uTex, vUv) * 0.2270270270;
  c += texture(uTex, vUv + uDir * 1.3846153846) * 0.3162162162;
  c += texture(uTex, vUv - uDir * 1.3846153846) * 0.3162162162;
  c += texture(uTex, vUv + uDir * 3.2307692308) * 0.0702702703;
  c += texture(uTex, vUv - uDir * 3.2307692308) * 0.0702702703;
  o = c;
}`;

// the full-detail image: a quad on the state's plane (y = 0), in the particles' world coordinates
const VS_PLATE = `#version 300 es
uniform mat4 uVP;
uniform vec4 uBox;
out vec2 vUv;
void main() {
  vec2 c = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1));
  vUv = c;
  gl_Position = uVP * vec4(mix(uBox.x, uBox.z, c.x), 0.0, mix(uBox.y, uBox.w, c.y), 1.0);
}`;

const FS_PLATE = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform float uAlpha;
out vec4 o;
void main() { o = texture(uTex, vUv) * uAlpha; }`;

const FS_COMPOSITE = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec4 uBg;
uniform float uLift;
uniform float uGlow;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform vec3 uLiftCol;
out vec4 o;
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main() {
  vec4 s = texture(uScene, vUv);
  vec3 b = texture(uBloom, vUv).rgb * uGlow;
  vec2 d = (vUv - uCenter) * vec2(uRes.x / uRes.y, 1.0);
  float lift = uLift * exp(-dot(d, d) * 1.6);
  vec3 bg = uBg.rgb + uLiftCol * lift;
  vec3 rgb = bg * uBg.a * (1.0 - s.a) + s.rgb + b;
  float a = uBg.a + (1.0 - uBg.a) * clamp(s.a + dot(b, vec3(0.3333)), 0.0, 1.0);
  rgb += (ign(gl_FragCoord.xy) - 0.5) / 255.0;
  a = max(a, max(rgb.r, max(rgb.g, rgb.b)) * (1.0 - uBg.a) + uBg.a);
  o = vec4(max(rgb, 0.0), clamp(a, 0.0, 1.0));
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error('pointcloud: shader: ' + log);
  }
  return sh;
}

function program(gl, vs, fs) {
  const p = gl.createProgram();
  const a = compile(gl, gl.VERTEX_SHADER, vs), b = compile(gl, gl.FRAGMENT_SHADER, fs);
  gl.attachShader(p, a); gl.attachShader(p, b);
  gl.linkProgram(p);
  gl.deleteShader(a); gl.deleteShader(b);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('pointcloud: link: ' + gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}

// ── the engine ─────────────────────────────────────────────────────────────
class Hero {
  constructor(target, opts) {
    this.opts = {
      state: null, particleBudget: 'auto', background: null, backgroundLift: 0.5,
      frame: null, frames: null, onReady: null, onHover: null, onState: null, onFrame: null, onProgress: null,
      interactive: true, hover: true, idle: true, intro: true, reducedMotion: 'auto',
      bloom: 'auto', maxDpr: 2, duration: 1600, allowSoftwareGL: false, keyboard: true,
      liftColors: null, glide: 1100, preload: 'all', introDuration: null, introAlpha: 0,
      posterHost: null,
      ...opts,
    };
    if (!this.opts.manifestUrl) throw new Error('pointcloud: manifestUrl is required');
    if (target instanceof HTMLCanvasElement) {
      this.canvas = target;
      this.container = target.parentElement;
      this.ownCanvas = false;
    } else {
      this.container = target;
      this.canvas = document.createElement('canvas');
      this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
      if (getComputedStyle(target).position === 'static') target.style.position = 'relative';
      target.appendChild(this.canvas);
      this.ownCanvas = true;
    }
    this.fallback = false;
    this.destroyed = false;
    this.paused = false;
    this.visible = true;
    this.hidden = typeof document !== 'undefined' && document.hidden;
    this.state = null;
    this.data = new Map();          // id → { st, raw, world, gpu }
    this.loading = new Map();       // id → download job (see _load)
    this._queue = [];               // download jobs, asked-for ones first
    this._raf = 0;
    this._clock = 0;
    this._last = 0;
    this._drag = null;
    this._vel = [0, 0];
    this._user = [0, 0];            // user orbit offsets (yaw, pitch), radians
    this._hoverReq = null;
    this._hoverInfo = null;
    this._listeners = [];
    this._view = new Float32Array(16);
    this._proj = new Float32Array(16);
    this._vp = new Float32Array(16);
    this.spread = 0.42;             // share of the morph over which particle starts are spread
    this.noise = 0.075;             // arc of smooth noise, world units (content spans ~2)
    this.lift = 0.11;               // vertical arc, world units
    this.sweepDir = null;
    this.sweep = [0, 1];
    this.camAnim = null;            // { from, start, dur }: the camera's own blend
    this.snapLift = null;
    this.idlePaused = false;        // setIdle(false): the sway holds where it is
    this.details = new Map();       // id → { file, img, tex, w, h }: full-detail images
    this._uploads = [];             // decoded images waiting for a frame with no morph in flight
    this.plate = null;              // { d, det }: the full-detail image drawn now
    this.detailMix = 0;             // 0..1: how far it has faded in over its particles
    this.detailOn = true;           // setDetail(false) hides it
    this._fading = false;
  }

  // ── setup ────────────────────────────────────────────────────────────────
  async init() {
    const url = new URL(this.opts.manifestUrl, document.baseURI);
    this.base = url;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`pointcloud: manifest ${res.status}`);
    this.manifest = await res.json();
    this.states = this.manifest.states;
    this.N = this.manifest.n;
    this.phone = this.manifest.phone;
    const first = this.opts.state && this.states.find((s) => s.id === this.opts.state) ? this.opts.state : this.states[0].id;
    this.state = first;

    // the page's ground: the design system's --pv-bg when it is set, else ink 0
    if (this.opts.background == null) {
      const v = getComputedStyle(this.container || this.canvas).getPropertyValue('--pv-bg').trim();
      this.opts.background = v || '#06070D';
    }
    const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const rmo = this.opts.reducedMotion;
    this.reduced = rmo === 'auto' ? !!(mq && mq.matches) : !!rmo;
    if (mq && rmo === 'auto') {
      const on = (e) => { this.reduced = e.matches; this._kick(); };
      mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
      this._listeners.push(() => (mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on)));
    }

    const gl = this.canvas.getContext('webgl2', {
      antialias: false, alpha: true, premultipliedAlpha: true, depth: false, stencil: false,
      powerPreference: 'high-performance', failIfMajorPerformanceCaveat: !this.opts.allowSoftwareGL,
      preserveDrawingBuffer: false,
    });
    if (!gl || (!this.opts.allowSoftwareGL && softwareGL(gl))) { this._fallback(); return this; }
    this.gl = gl;
    this.canvas.setAttribute('role', 'img');
    this._label();
    this._budget();
    this._size(true);
    this._glInit();
    this._events();

    await this._load(first);
    this._enter(first);
    this._wantDetail(first);
    // the other states, in the background (or on prefetch() / when asked for)
    if (this.opts.preload !== 'first') this.prefetch();
    return this;
  }

  _fallback() {
    this.fallback = true;
    const img = document.createElement('img');
    img.decoding = 'async';
    img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block;mix-blend-mode:lighten;';
    this.canvas.style.display = 'none';
    const host = this.opts.posterHost || this.container || this.canvas.parentElement;
    if (host && getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host && host.appendChild(img);
    this.poster = img;
    this._posterFor(this.state);
    let fired = false;
    const ready = () => { if (!fired) { fired = true; this.opts.onReady && this.opts.onReady(this); } };
    if (img.complete) ready();
    else { img.addEventListener('load', ready, { once: true }); img.addEventListener('error', ready, { once: true }); }
  }

  // the state's poster: the tall one when the container is portrait
  _posterFor(id) {
    const st = this.states.find((s) => s.id === id);
    const p = this.manifest.posters && this.manifest.posters[id];
    if (!this.poster || !p) return;
    const host = this.poster.parentElement, r = host ? host.getBoundingClientRect() : { width: 16, height: 10 };
    const file = typeof p === 'string' ? p : (r.height > r.width * 1.1 && p.tall ? p.tall : p.wide);
    this.poster.src = new URL(file, this.base).href;
    this.poster.alt = st ? (st.label.ariaLabel || st.label.caption).replace(/^Point cloud/, 'Still image').replace(/;\s*drag to rotate$/i, '') : '';
  }

  // the canvas label: the manifest's (brief/CONTENT.md A4), else one built from the caption
  _label() {
    const st = this.states.find((s) => s.id === this.state);
    if (!st || !this.canvas) return;
    this.canvas.setAttribute('aria-label', st.label.ariaLabel || `Point cloud of real cells: ${st.label.caption}`);
  }

  _budget() {
    const b = this.opts.particleBudget;
    if (typeof b === 'number' && b > 0) { this.budget = Math.min(this.N, Math.round(b)); return; }
    this.budget = Math.min(window.innerWidth, window.innerHeight) < 600 ? this.phone : this.N;
  }

  _glInit() {
    const gl = this.gl;
    this.prog = program(gl, VS_POINTS, FS_POINTS);
    this.progDown = program(gl, VS_FULL, FS_DOWN);
    this.progBlur = program(gl, VS_FULL, FS_BLUR);
    this.progComp = program(gl, VS_FULL, FS_COMPOSITE);
    this.progPlate = program(gl, VS_PLATE, FS_PLATE);
    this.aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    this.vao = gl.createVertexArray();
    this.vaoFull = gl.createVertexArray();
    // per-particle randoms (stagger, noise phase), the same on the CPU for snapshots
    const rnd = mulberry32(20261022);
    this.rand = new Uint8Array(this.N * 4);
    for (let i = 0; i < this.rand.length; i++) this.rand[i] = Math.floor(rnd() * 256);
    this.randBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.randBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.rand, gl.STATIC_DRAW);
    gl.bindVertexArray(this.vao);
    gl.enableVertexAttribArray(6);
    gl.vertexAttribPointer(6, 4, gl.UNSIGNED_BYTE, true, 0, 0);
    gl.bindVertexArray(null);
    this.maxPoint = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1] || 64;
    this.fb = null;
    this._targets();
    // GPU copies of loaded states (after a context restore)
    for (const d of this.data.values()) d.gpu = null;
  }

  _targets() {
    const gl = this.gl, W = this.canvas.width, H = this.canvas.height;
    const tex = (w, h) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    const fbo = (t, depth) => {
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      if (depth) gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
      return f;
    };
    if (this.fb) {
      const o = this.fb;
      [o.sceneTex, o.aTex, o.bTex].forEach((t) => gl.deleteTexture(t));
      [o.scene, o.a, o.b].forEach((f) => gl.deleteFramebuffer(f));
      gl.deleteRenderbuffer(o.depth);
    }
    const depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, W, H);
    const sceneTex = tex(W, H);
    const bw = Math.max(1, Math.round(W / 4)), bh = Math.max(1, Math.round(H / 4));
    const aTex = tex(bw, bh), bTex = tex(bw, bh);
    this.fb = { W, H, bw, bh, depth, sceneTex, aTex, bTex, scene: fbo(sceneTex, depth), a: fbo(aTex), b: fbo(bTex) };
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // ── data ─────────────────────────────────────────────────────────────────
  // A state that is asked for (setState, setView, the first state) loads at once. Prefetched
  // states load one after another in the background and give way to one that is asked for:
  // a background download in flight is stopped and starts again afterwards, so the state a
  // visitor wants never shares the bandwidth. Progress goes to opts.onProgress.
  _load(id, urgent = true) {
    if (this.data.has(id)) return Promise.resolve(this.data.get(id));
    const st = this.states.find((s) => s.id === id);
    if (!st) return Promise.reject(new Error(`pointcloud: no state ${id}`));
    let job = this.loading.get(id);
    if (!job) {
      job = { id, st, urgent: false, started: false, got: 0, total: st.bytes || 0, ctrl: null, aborted: false };
      job.promise = new Promise((res, rej) => { job.res = res; job.rej = rej; });
      this.loading.set(id, job);
      this._queue.push(job);
    }
    if (urgent && !job.urgent) {
      job.urgent = true;
      this._queue = [job, ...this._queue.filter((j) => j !== job)];
    }
    this._pump();
    return job.promise;
  }

  _pump() {
    if (this.destroyed) return;
    let urgent = false;
    for (const job of this._queue) {
      if (job.urgent && !job.started) this._fetch(job);
      if (job.urgent) urgent = true;
    }
    if (urgent) {
      for (const job of this._queue) {
        if (!job.urgent && job.started && job.ctrl && !job.aborted) { job.aborted = true; job.ctrl.abort(); }
      }
      return;
    }
    if (this._queue.some((j) => j.started)) return;      // one background download at a time
    const next = this._queue.find((j) => !j.started);
    if (next) this._fetch(next);
  }

  _fetch(job) {
    job.started = true;
    job.got = 0;
    job.ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const drop = () => { this.loading.delete(job.id); this._queue = this._queue.filter((j) => j !== job); };
    // a background download asks for low priority, so it never slows what the page is showing
    const init = job.ctrl ? { signal: job.ctrl.signal } : {};
    if (!job.urgent) init.priority = 'low';
    (job.kind === 'detail' ? this._fetchDetail(job, init) : this._fetchState(job, init)).then((val) => {
      drop();
      job.res(val);
      this._pump();
    }).catch((err) => {
      if (job.aborted && !this.destroyed) {    // gave way to a state that was asked for: queue it again
        job.aborted = false;
        job.started = false;
        job.got = 0;
        this._pump();
        return;
      }
      drop();
      job.rej(err);
      this._pump();
    });
  }

  _fetchState(job, init) {
    const st = job.st;
    return fetch(new URL(st.file, this.base), init).then((r) => {
      if (!r.ok) throw new Error(`pointcloud: ${st.file} ${r.status}`);
      return this._read(job, r);
    }).then((buf) => {
      const L = st.layout, N = this.N;
      const raw = {
        pos: new Uint16Array(buf, L.pos.offset, N * L.pos.dims),
        dims: L.pos.dims,
        col: new Uint8Array(buf, L.col.offset, N),
        grp: L.grp ? new Uint8Array(buf, L.grp.offset, N) : null,
      };
      const d = { st, raw, world: null, gpu: null };
      this._style(d);
      this._world(d);
      this.data.set(job.id, d);
      // fit its camera and hand its particles to the GPU now, not in the frame a switch starts
      if (this.cssW) this._rest(job.id);
      if (this.gl && !this.gl.isContextLost() && !d.gpu) this._upload(d);
      return d;
    });
  }

  // a full-detail image: decoded off the main thread where the browser can, then uploaded in a
  // frame with no morph in flight (_frame), so an upload never costs a morph a frame
  _fetchDetail(job, init) {
    return fetch(new URL(job.file, this.base), init).then((r) => {
      if (!r.ok) throw new Error(`pointcloud: ${job.file} ${r.status}`);
      return r.blob();
    }).then(decodeImage).then((img) => {
      if (this.destroyed) { releaseImage(img); return null; }
      const det = { file: job.file, img, tex: null, w: img.width, h: img.height };
      this.details.set(job.state, det);
      this._uploads.push(det);
      this._kick();
      return det;
    });
  }

  _hasDetail(id) {
    const st = this.states && this.states.find((s) => s.id === id);
    return !!(st && st.detail && st.detail.files && st.detail.files.length);
  }

  // the smallest file that covers the frame's long side on screen, in device px (the smallest for
  // a visitor who saves data)
  _detailFile(st) {
    const files = st.detail.files.slice().sort((a, b) => Math.max(...a.size) - Math.max(...b.size));
    const c = typeof navigator !== 'undefined' && navigator.connection;
    if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return files[0];
    const [W, H] = st.frame.size, r = this._rect(st.id), m = (st.camera && st.camera.margin) || 0.05;
    const across = Math.min(r.w, (r.h * Math.max(W, H)) / Math.min(W, H)) * (1 - 2 * m) * (this.dpr || 1);
    return files.find((f) => Math.max(...f.size) >= across * 0.95) || files[files.length - 1];
  }

  _loadDetail(id, urgent = true) {
    if (this.fallback || !this._hasDetail(id)) return Promise.resolve(null);
    const have = this.details.get(id);
    if (have) return Promise.resolve(have);
    const key = `${id}#detail`;
    let job = this.loading.get(key);
    if (!job) {
      const st = this.states.find((s) => s.id === id), f = this._detailFile(st);
      job = { id: key, state: id, kind: 'detail', st, file: f.file, urgent: false, started: false, got: 0, total: f.bytes || 0, ctrl: null, aborted: false };
      job.promise = new Promise((res, rej) => { job.res = res; job.rej = rej; });
      this.loading.set(key, job);
      this._queue.push(job);
    }
    if (urgent && !job.urgent) {
      job.urgent = true;
      this._queue = [job, ...this._queue.filter((j) => j !== job)];
    }
    this._pump();
    return job.promise;
  }

  // a state that is asked for brings its full-detail image too
  _wantDetail(id) {
    if (this._hasDetail(id) && !this.details.has(id)) this._loadDetail(id, true).catch((e) => console.warn(e));
  }

  _uploadDetails() {
    const gl = this.gl;
    if (!gl || gl.isContextLost()) return;
    for (const det of this._uploads.splice(0)) {
      if (det.tex || !det.img) continue;
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      // premultiplied on upload (an ImageBitmap carries this itself), sRGB values as they are
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, det.img);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (this.aniso) {
        const max = gl.getParameter(this.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1;
        gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max));
      }
      releaseImage(det.img);
      det.img = null;
      det.tex = tex;
    }
  }

  // the full-detail image of the state at rest fades in over its particles; a morph fades it out
  // as soon as it starts, and the particles take over
  _detailStep(dt) {
    const d = this.dst && this.dst.d;
    const det = d && this.details.get(d.st.id);
    const want = !!(this.detailOn && det && det.tex && !this.morph);
    if (want && (!this.plate || this.plate.d !== d)) {
      if (this.plate) this.detailMix = 0;
      this.plate = { d, det };
    }
    const target = want ? 1 : 0;
    if (!this.plate) this.detailMix = 0;
    else if (this.reduced) this.detailMix = target;
    else if (this.detailMix !== target) {
      const step = dt / (target ? 0.7 : 0.24);
      this.detailMix = target ? Math.min(1, this.detailMix + step) : Math.max(0, this.detailMix - step);
    }
    if (this.detailMix <= 0) this.plate = null;
    this._fading = !!this.plate && this.detailMix !== target;
  }

  // the body as it arrives, so a slow network can show how far a state has come
  async _read(job, r) {
    const len = Number(r.headers.get('content-length')) || 0;
    const total = job.st.bytes || (r.headers.get('content-encoding') ? 0 : len);
    job.total = total;
    if (!total || !r.body || typeof r.body.getReader !== 'function') return r.arrayBuffer();
    const reader = r.body.getReader();
    let buf = new Uint8Array(total), got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (got + value.length > buf.length) {
        const grown = new Uint8Array(Math.max(buf.length * 2, got + value.length));
        grown.set(buf.subarray(0, got));
        buf = grown;
      }
      buf.set(value, got);
      got += value.length;
      job.got = got;
      this.opts.onProgress && this.opts.onProgress(job.id, Math.min(1, got / total));
    }
    return got === buf.length ? buf.buffer : buf.slice(0, got).buffer;
  }

  // a state asked for earlier and no longer wanted goes back to the background queue
  _demote(id) {
    const job = this.loading.get(id);
    if (job && job.urgent) { job.urgent = false; this._pump(); }
  }

  // palette → per-particle colour (straight RGBA), size factor, pickable
  _style(d) {
    const { st, raw } = d, N = this.N;
    const pal = st.palette.map((e) => {
      const c = parseColor(e.color);
      return [c[0], c[1], c[2], e.alpha == null ? 1 : e.alpha, e.size == null ? 1 : e.size, e.pick !== false];
    });
    const col = new Uint8Array(N * 4), size = new Uint8Array(N), pick = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const e = pal[raw.col[i]] || [0.5, 0.5, 0.5, 1, 1, false];
      col[i * 4] = Math.round(e[0] * 255); col[i * 4 + 1] = Math.round(e[1] * 255);
      col[i * 4 + 2] = Math.round(e[2] * 255); col[i * 4 + 3] = Math.round(e[3] * 255);
      size[i] = Math.round(clamp(e[4], 0, 2) * 127.5);
      pick[i] = e[5] ? 1 : 0;
    }
    d.col = col; d.size = size; d.pick = pick;
    const r = st.render || {};
    d.rp = { size: r.size ?? 1, alpha: r.alpha ?? 0.92, add: r.additive ?? 0, soft: r.soft ?? 0.3, fog: r.fog ?? 0, glow: r.glow ?? 0.4 };
  }

  // quantised positions → world (X right, Y up, Z toward the viewer; sections lie in XZ)
  _world(d) {
    const { st, raw } = d, N = this.N, P = raw.pos, dims = raw.dims;
    const pos = new Float32Array(N * 3);
    const q = 1 / 65535;
    let spacing = 0.01;
    if (st.kind === 'section') {
      const [W, H] = st.frame.size, s = 2 / Math.max(W, H);
      for (let i = 0; i < N; i++) {
        pos[i * 3] = (P[i * 2] * q - 0.5) * W * s;
        pos[i * 3 + 2] = (P[i * 2 + 1] * q - 0.5) * H * s;
      }
      spacing = occupancySpacing(pos, N);
      d.umPerUnit = 1 / s;
    } else if (st.kind === 'volume') {
      const [W, H, D] = st.frame.size, s = 2 / Math.max(W, H, D);
      for (let i = 0; i < N; i++) {
        pos[i * 3] = (P[i * 3] * q - 0.5) * W * s;
        pos[i * 3 + 1] = (P[i * 3 + 2] * q - 0.5) * D * s;
        pos[i * 3 + 2] = (P[i * 3 + 1] * q - 0.5) * H * s;
      }
      const cells = st.drawnCells || N;
      spacing = Math.sqrt((W * s) * (H * s) / cells) * 1.35;
      d.umPerUnit = 1 / s;
    } else if (st.kind === 'array') {
      // a slide of tissues, drawn like a section; the dots' mean spacing comes from the build
      // (the tissues' area over the cells drawn at the full budget), since most particles are hidden
      const [W, H] = st.frame.size, s = 2 / Math.max(W, H);
      for (let i = 0; i < N; i++) {
        pos[i * 3] = (P[i * 2] * q - 0.5) * W * s;
        pos[i * 3 + 2] = (P[i * 2 + 1] * q - 0.5) * H * s;
      }
      spacing = st.frame.spacing ? st.frame.spacing * s : occupancySpacing(pos, N, 260);
      d.umPerUnit = 1 / s;
    } else if (st.kind === 'plates') {
      const side = 2, gap = (st.frame.plateGap ?? 0.55) * side;
      const f0 = st.frameIndex[0], L = st.plates[0].levels;
      const nP = st.plates.length;
      for (let i = 0; i < N; i++) {
        const c = raw.col[i];
        const plate = c >= f0 ? c - f0 : Math.floor(c / L);
        pos[i * 3] = (P[i * 2] * q - 0.5) * side;
        pos[i * 3 + 1] = ((nP - 1) / 2 - plate) * gap;
        pos[i * 3 + 2] = (P[i * 2 + 1] * q - 0.5) * side;
      }
      spacing = side * (st.frame.pitch / st.frame.size[0]);   // the lattice pitch
      d.umPerUnit = st.frame.size[0] / side;
    }
    d.world = pos;
    d.spacing = spacing;
    d.bounds = bounds(pos, N);
    d.gpu && this._upload(d);
  }

  _upload(d) {
    const gl = this.gl;
    if (!gl) return;
    if (!d.gpu) d.gpu = { pos: gl.createBuffer(), col: gl.createBuffer(), size: gl.createBuffer() };
    gl.bindBuffer(gl.ARRAY_BUFFER, d.gpu.pos); gl.bufferData(gl.ARRAY_BUFFER, d.world, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, d.gpu.col); gl.bufferData(gl.ARRAY_BUFFER, d.col, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, d.gpu.size); gl.bufferData(gl.ARRAY_BUFFER, d.size, gl.STATIC_DRAW);
  }

  // ── camera ───────────────────────────────────────────────────────────────
  // the rect a state is fitted into: its own entry in `frames`, else `frame`
  _rect(id) {
    const fs = this.opts.frames;
    const W = this.cssW || 1, H = this.cssH || 1, f = (id != null && fs && fs[id]) || this.opts.frame || {};
    const v = (x, total) => (x == null ? 0 : x < 1 && x > 0 ? x * total : x);
    const l = v(f.left, W), r = v(f.right, W), t = v(f.top, H), b = v(f.bottom, H);
    return { x: l, y: t, w: Math.max(40, W - l - r), h: Math.max(40, H - t - b) };
  }

  // resting camera of a state: fitted so its content fills the frame rect
  _fit(d) {
    const cam = d.st.camera, N = this.N;
    const fov = (cam.fov || 30) * DEG, aspect = this.cssW / this.cssH;
    const rect = this._rect(d.st.id), m = cam.margin ?? 0.06;
    const b = d.bounds;
    const target = [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2];
    // samples: every k-th particle of the drawn prefix, and the box corners
    const step = Math.max(1, Math.floor(this.budget / 2500));
    const S = [];
    for (let i = 0; i < this.budget; i += step) S.push(d.world[i * 3], d.world[i * 3 + 1], d.world[i * 3 + 2]);
    const sway = (cam.sway ? cam.sway[0] : 0) * DEG;
    const yaws = sway > 0.12 ? [cam.yaw * DEG - sway * 0.8, cam.yaw * DEG, cam.yaw * DEG + sway * 0.8] : [cam.yaw * DEG];
    const pitch = cam.pitch * DEG;
    const proj = perspective(new Float32Array(16), fov, aspect, 0.01, 1000);
    const view = new Float32Array(16), vp = new Float32Array(16);
    const box = (yaw, dist) => {
      viewOf(view, yaw, pitch, dist, target);
      mul(vp, proj, view);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (let i = 0; i < S.length; i += 3) {
        const x = S[i], y = S[i + 1], z = S[i + 2];
        const w = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
        if (w <= 1e-4) return null;
        const nx = (vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / w;
        const ny = (vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / w;
        if (nx < x0) x0 = nx; if (nx > x1) x1 = nx; if (ny < y0) y0 = ny; if (ny > y1) y1 = ny;
      }
      return [x0, x1, y0, y1];
    };
    const wantW = (rect.w * (1 - 2 * m)) / this.cssW * 2, wantH = (rect.h * (1 - 2 * m)) / this.cssH * 2;
    let dist = 1;
    for (const yaw of yaws) {
      let lo = 0.3, hi = 200;
      for (let it = 0; it < 26; it++) {
        const mid = Math.sqrt(lo * hi), bb = box(yaw, mid);
        if (bb && bb[1] - bb[0] <= wantW && bb[3] - bb[2] <= wantH) hi = mid; else lo = mid;
      }
      dist = Math.max(dist, hi);
    }
    const bb = box(cam.yaw * DEG, dist);
    const cx = (bb[0] + bb[1]) / 2, cy = (bb[2] + bb[3]) / 2;
    const rx = ((rect.x + rect.w / 2) / this.cssW) * 2 - 1, ry = 1 - ((rect.y + rect.h / 2) / this.cssH) * 2;
    return {
      yaw: cam.yaw * DEG, pitch, dist, target, fov,
      sx: rx - cx, sy: ry - cy,
      swayYaw: (cam.sway ? cam.sway[0] : 0) * DEG, swayPitch: (cam.sway ? cam.sway[1] : 0) * DEG,
    };
  }

  _camAt(now) {
    // the resting camera of the target, blended from where the camera was (camAnim)
    const A = this.camAnim;
    let c;
    if (A && A.dur > 0) {
      const t = clamp((performance.now() - A.start) / A.dur, 0, 1);
      if (t >= 1) this.camAnim = null;
      const e = easeInOut(t);
      const a = A.from, b = this._rest(this.state);
      let dy = b.yaw - a.yaw;
      dy = ((dy + Math.PI) % TAU + TAU) % TAU - Math.PI;
      c = {
        yaw: a.yaw + dy * e, pitch: lerp(a.pitch, b.pitch, e),
        dist: Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), e)),
        target: [lerp(a.target[0], b.target[0], e), lerp(a.target[1], b.target[1], e), lerp(a.target[2], b.target[2], e)],
        fov: lerp(a.fov, b.fov, e), sx: lerp(a.sx, b.sx, e), sy: lerp(a.sy, b.sy, e),
        swayYaw: lerp(a.swayYaw, b.swayYaw, e), swayPitch: lerp(a.swayPitch, b.swayPitch, e),
      };
    } else {
      c = { ...this._rest(this.state) };
    }
    return c;
  }

  _rest(id) {
    const d = this.data.get(id);
    if (!d) return this._lastCam;
    if (!d.cam || d.camKey !== this._fitKey) { d.cam = this._fit(d); d.camKey = this._fitKey; }
    return d.cam;
  }

  _applyCamera(c) {
    const idle = this.opts.idle && !this.reduced;
    const t = this._clock;
    let yaw = c.yaw + this._user[0], pitch = c.pitch + this._user[1];
    if (idle) {
      yaw += c.swayYaw * Math.sin((TAU * t) / 26);
      pitch += c.swayPitch * Math.sin((TAU * t) / 19 + 1.3);
    }
    pitch = clamp(pitch, 4 * DEG, 88.5 * DEG);
    const aspect = this.cssW / this.cssH;
    const near = Math.max(0.02, c.dist * 0.08), far = c.dist * 12 + 10;
    perspective(this._proj, c.fov, aspect, near, far);
    this._proj[8] -= c.sx; this._proj[9] -= c.sy;
    viewOf(this._view, yaw, pitch, c.dist, c.target);
    mul(this._vp, this._proj, this._view);
    this._cam = { ...c, yaw, pitch };
    this._lastCam = c;
    this._focal = (this.canvas.height / 2) / Math.tan(c.fov / 2);
  }

  // ── state changes ────────────────────────────────────────────────────────
  _enter(id) {
    const d = this.data.get(id);
    this._upload(d);
    this.state = id;
    this._label();
    this.src = { kind: 'state', d, rp: d.rp };
    this.dst = { d, rp: d.rp };
    const intro = this.opts.intro && !this.reduced;
    if (intro) {
      // the cells condense from a faint mist into the first state
      const N = this.N, pos = new Float32Array(N * 3), col = new Uint8Array(d.col), size = new Uint8Array(d.size);
      const r = mulberry32(7), mist = clamp(this.opts.introAlpha || 0, 0, 1);
      const b = d.bounds, rad = Math.max(b[3] - b[0], b[5] - b[2]) * 0.18;
      for (let i = 0; i < N; i++) {
        const u = r() * TAU, v = Math.acos(2 * r() - 1), k = rad * Math.cbrt(r());
        pos[i * 3] = d.world[i * 3] * 0.9 + k * Math.sin(v) * Math.cos(u);
        pos[i * 3 + 1] = d.world[i * 3 + 1] + k * Math.cos(v) * 0.6 + rad * 0.25;
        pos[i * 3 + 2] = d.world[i * 3 + 2] * 0.9 + k * Math.sin(v) * Math.sin(u);
        col[i * 4 + 3] = Math.round(col[i * 4 + 3] * mist);
      }
      this.snapBase = this._baseOf({ kind: 'state', d });
      this.snapRadius = Math.max(b[3] - b[0], b[4] - b[1], b[5] - b[2]) * 0.5 || 1;
      this._snapUpload(pos, col, size);
      this.src = { kind: 'snap', rp: { ...d.rp } };
      const rest = this._rest(id);
      const dur = this.opts.introDuration || this.opts.duration * 1.1;
      this.morph = { t: 0, start: performance.now(), dur, resolve: null };
      this.camAnim = { from: { ...rest, dist: rest.dist * 1.12 }, start: this.morph.start, dur };
      this.snapLift = this._liftOf({ kind: 'state', d });
      this._sweep(this.src);
    } else {
      this.morph = null;
    }
    this._readyPending = true;
    this._kick();
  }

  setState(id, { instant = false } = {}) {
    if (this.destroyed) return Promise.resolve(false);
    if (!this.states.find((s) => s.id === id)) return Promise.reject(new Error(`pointcloud: no state ${id}`));
    if (this.fallback) {
      const prev = this.state;
      this.state = id;
      this._posterFor(id);
      if (prev !== id) { this._emit(id, 'start'); this._emit(id, 'end'); }
      return Promise.resolve(true);
    }
    // the latest ask wins, also over a state still loading: going back to the state on
    // screen must stop that load from starting a morph when it arrives
    const prev = this._want;
    this._want = id;
    if (prev && prev !== id) this._demote(prev);
    if (id === this.state && !this.morph) return Promise.resolve(true);
    // already on its way to this state (a morph, or the intro): let it land
    if (id === this.state && this.morph) return this.morph.promise || Promise.resolve(true);
    return this._load(id).then((d) => {
      if (this.destroyed || this._want !== id) return false;
      this._wantDetail(id);
      return this._go(d, instant || this.reduced);
    });
  }

  _go(d, instant) {
    const id = d.st.id;
    if (!d.gpu) this._upload(d);
    const prevMorph = this.morph;
    // where every particle is now
    if (prevMorph) {
      this.snapLift = this._liftNow();
      this._snapshot();
      this.src = { kind: 'snap', rp: this._rpNow() };
      prevMorph.resolve && prevMorph.resolve(false);
    } else {
      this.src = { kind: 'state', d: this.dst.d, rp: this.dst.d.rp };
    }
    const camFrom = this._cam ? { ...this._camNow() } : this._rest(id);
    // the user's orbit offsets fold into the camera's starting point and ease out
    camFrom.yaw += this._user[0]; camFrom.pitch += this._user[1];
    this._user = [0, 0]; this._vel = [0, 0];
    this.dst = { d, rp: d.rp };
    this.state = id;
    this._label();
    this._emit(id, 'start');
    this._hoverInfo && this._setHover(null);
    if (instant) {
      this.morph = null;
      this.camAnim = null;
      this.src = { kind: 'state', d, rp: d.rp };
      this._emit(id, 'end');
      this._kick();
      return Promise.resolve(true);
    }
    let resolve;
    const promise = new Promise((r) => { resolve = r; });
    this.morph = { t: 0, start: performance.now(), dur: this.opts.duration, resolve, promise };
    this.camAnim = { from: camFrom, start: this.morph.start, dur: this.opts.duration };
    this._sweep(this.src);
    this._kick();
    return promise;
  }

  // sweep direction: the screen's right vector at the morph's start, so the wave crosses the view
  _sweep(src) {
    const yaw = this._cam ? this._cam.yaw : this._rest(this.state).yaw;
    const dir = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const P = src.kind === 'snap' ? this.snapPos : src.d.world;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < this.budget; i += 7) {
      const v = P[i * 3] * dir[0] + P[i * 3 + 2] * dir[2];
      if (v < lo) lo = v; if (v > hi) hi = v;
    }
    this.sweepDir = dir;
    this.sweep = [lo, 1 / Math.max(1e-3, hi - lo)];
  }

  _rpNow() {
    const a = this.src.rp, b = this.dst.rp, e = this.morph ? easeInOut(clamp(this.morph.t, 0, 1)) : 1;
    return {
      size: lerp(a.size, b.size, e), alpha: lerp(a.alpha, b.alpha, e), add: lerp(a.add, b.add, e),
      soft: lerp(a.soft, b.soft, e), fog: lerp(a.fog, b.fog, e), glow: lerp(a.glow, b.glow, e),
    };
  }

  _camNow() {
    const c = this._cam;
    // current camera without the idle sway (sway is re-added from the same clock, so no jump)
    const t = this._clock, idle = this.opts.idle && !this.reduced;
    const yaw = c.yaw - (idle ? c.swayYaw * Math.sin((TAU * t) / 26) : 0) - this._user[0];
    const pitch = c.pitch - (idle ? c.swayPitch * Math.sin((TAU * t) / 19 + 1.3) : 0) - this._user[1];
    return { ...c, yaw, pitch };
  }

  // point diameter in world units: the state's spacing at this budget times its size factor
  _baseOf(s) {
    if (s.kind === 'snap') return this.snapBase || 0.01;
    const d = s.d;
    return d.rp.size * d.spacing * SIZE_K[d.st.kind] * Math.sqrt(this.N / this.budget);
  }

  // CPU copy of the vertex shader: where each particle is at the current progress
  _snapshot() {
    const N = this.N, T = this.morph.t;
    const srcP = this.src.kind === 'snap' ? this.snapPos : this.src.d.world;
    const srcC = this.src.kind === 'snap' ? this.snapCol : this.src.d.col;
    const srcS = this.src.kind === 'snap' ? this.snapSize : this.src.d.size;
    const dd = this.dst.d, dstP = dd.world, dstC = dd.col, dstS = dd.size;
    const spread = this.spread, R = this.rand, noise = this.noise, lift = this.lift;
    const [sx, , sz] = this.sweepDir, [s0, s1] = this.sweep;
    const b0 = this._baseOf(this.src), b1 = this._baseOf(this.dst);
    const E = easeInOut(clamp(T, 0, 1));
    const bNew = lerp(b0, b1, E) || 0.01;
    const pos = new Float32Array(N * 3), col = new Uint8Array(N * 4), size = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const i3 = i * 3, i4 = i * 4;
      const ax = srcP[i3], ay = srcP[i3 + 1], az = srcP[i3 + 2];
      const bx = dstP[i3], by = dstP[i3 + 1], bz = dstP[i3 + 2];
      const rx = R[i4] / 255, ry = R[i4 + 1] / 255, rz = R[i4 + 2] / 255, rw = R[i4 + 3] / 255;
      const sw = clamp((ax * sx + az * sz - s0) * s1, 0, 1);
      const delay = spread * lerp(rx, sw, 0.6);
      const t = clamp((T - delay) / (1 - spread), 0, 1);
      const e = easeInOut(t), arc = Math.sin(Math.PI * e);
      const mx = (ax + bx) / 2, my = (ay + by) / 2, mz = (az + bz) / 2;
      const qx = mx * 2.2 + (ry - 0.5) * 0.9, qy = my * 2.2 + (rz - 0.5) * 0.9, qz = mz * 2.2 + (rw - 0.5) * 0.9;
      pos[i3] = lerp(ax, bx, e) + arc * noise * Math.sin(qz * 1.7 + qy * 2.3);
      pos[i3 + 1] = lerp(ay, by, e) + arc * (noise * Math.sin(qx * 1.9 - qz * 1.1) + lift * (0.4 + ry));
      pos[i3 + 2] = lerp(az, bz, e) + arc * noise * Math.sin(qy * 1.3 + qx * 2.1);
      const k = smoothstep(0.15, 0.85, e);
      for (let j = 0; j < 4; j++) col[i4 + j] = Math.round(lerp(srcC[i4 + j], dstC[i4 + j], k));
      const sz0 = (srcS[i] / 127.5) * b0, sz1 = (dstS[i] / 127.5) * b1;
      size[i] = Math.round(clamp((lerp(sz0, sz1, e) * (1 + 0.3 * arc)) / bNew, 0, 2) * 127.5);
    }
    this.snapBase = bNew;
    this.snapRadius = this._radius();
    this._snapUpload(pos, col, size);
  }

  _snapUpload(pos, col, size) {
    const gl = this.gl;
    this.snapPos = pos; this.snapCol = col; this.snapSize = size;
    if (!this.snapGpu) this.snapGpu = { pos: gl.createBuffer(), col: gl.createBuffer(), size: gl.createBuffer() };
    gl.bindBuffer(gl.ARRAY_BUFFER, this.snapGpu.pos); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.snapGpu.col); gl.bufferData(gl.ARRAY_BUFFER, col, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.snapGpu.size); gl.bufferData(gl.ARRAY_BUFFER, size, gl.DYNAMIC_DRAW);
  }

  // ── frame loop ───────────────────────────────────────────────────────────
  _kick() {
    if (this.destroyed || this.fallback || this._raf) return;
    if (!this.visible || this.hidden || this.paused) return;
    this._last = 0;
    this._raf = requestAnimationFrame((t) => this._frame(t));
  }

  _wantsLoop() {
    if (this.destroyed || this.fallback || !this.visible || this.hidden || this.paused) return false;
    if (this.morph || this.camAnim || this._drag || Math.abs(this._vel[0]) + Math.abs(this._vel[1]) > 1e-5) return true;
    if (this._fading || this._uploads.length) return true;
    return this.opts.idle && !this.reduced && !this.idlePaused;
  }

  _frame(now) {
    this._raf = 0;
    if (this.destroyed || !this.gl || this.gl.isContextLost()) return;
    const dt = this._last ? Math.min(0.1, (now - this._last) / 1000) : 1 / 60;
    this._last = now;
    if (!this.idlePaused) this._clock += dt;   // a held sway keeps its phase
    // inertia after a drag
    if (!this._drag && (this._vel[0] || this._vel[1])) {
      this._user[0] += this._vel[0] * dt; this._user[1] += this._vel[1] * dt;
      const f = Math.pow(0.02, dt);
      this._vel[0] *= f; this._vel[1] *= f;
      if (Math.abs(this._vel[0]) + Math.abs(this._vel[1]) < 1e-3) this._vel = [0, 0];
    }
    this._clampUser();
    let finished = null;
    if (this.morph) {
      this.morph.t = (performance.now() - this.morph.start) / this.morph.dur;
      if (this.morph.t >= 1) { finished = this.morph; this.morph = null; }
    }
    if (this._uploads.length && !this.morph) this._uploadDetails();
    this._detailStep(dt);
    const cam = this._camAt(now);
    this._applyCamera(cam);
    this._render();
    if (finished) {
      // settle: the target state becomes the source of the next morph
      this.src = { kind: 'state', d: this.dst.d, rp: this.dst.d.rp };
      if (this._pendingLayout) { this._pendingLayout = false; this._relayout(); }
      this._emit(this.state, 'end');
      finished.resolve && finished.resolve(true);
    }
    if (this._hoverReq) this._pick();
    if (this._readyPending) {
      this._readyPending = false;
      this.opts.onReady && this.opts.onReady(this);
    }
    this.opts.onFrame && this.opts.onFrame(this);
    if (this._wantsLoop()) this._raf = requestAnimationFrame((t) => this._frame(t));
  }

  _clampUser() {
    const c = this._cam;
    if (!c) return;
    const base = c.pitch - this._user[1];
    const lo = 4 * DEG - base, hi = 88.5 * DEG - base;
    if (this._user[1] < lo) { this._user[1] = lo; this._vel[1] = 0; }
    if (this._user[1] > hi) { this._user[1] = hi; this._vel[1] = 0; }
  }

  _render() {
    const gl = this.gl, fb = this.fb, N = this.budget;
    const M = this.morph, T = M ? clamp(M.t, 0, 1) : 1;
    const rp = this._rpNow();
    // the full-detail image over the particles: they fade as it comes in, and stop drawing under it
    const pm = this.plate ? smoothstep(0, 1, this.detailMix) : 0;
    const drawPts = pm < 0.999;
    const srcBuf = this.src.kind === 'snap' ? this.snapGpu : this.src.d.gpu;
    const dstBuf = this.dst.d.gpu;
    if (!this.sweepDir) this._sweep(this.src);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fb.scene);
    gl.viewport(0, 0, fb.W, fb.H);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(this.prog.p);
    gl.bindVertexArray(this.vao);
    const bind = (loc, buf, n, type, norm) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, n, type, norm, 0, 0);
    };
    bind(0, srcBuf.pos, 3, gl.FLOAT, false);
    bind(1, srcBuf.col, 4, gl.UNSIGNED_BYTE, true);
    bind(2, srcBuf.size, 1, gl.UNSIGNED_BYTE, true);
    bind(3, dstBuf.pos, 3, gl.FLOAT, false);
    bind(4, dstBuf.col, 4, gl.UNSIGNED_BYTE, true);
    bind(5, dstBuf.size, 1, gl.UNSIGNED_BYTE, true);

    const u = this.prog.u, c = this._cam, dpr = this.dpr;
    gl.uniformMatrix4fv(u.uView, false, this._view);
    gl.uniformMatrix4fv(u.uProj, false, this._proj);
    gl.uniform1f(u.uT, T);
    gl.uniform1f(u.uSpread, this.spread);
    gl.uniform3fv(u.uSweepDir, this.sweepDir);
    gl.uniform2fv(u.uSweep, this.sweep);
    gl.uniform1f(u.uNoise, M ? this.noise : 0);
    gl.uniform1f(u.uLift, M ? this.lift : 0);
    gl.uniform2f(u.uBase, this._baseOf(this.src), this._baseOf(this.dst));
    gl.uniform1f(u.uFocal, this._focal);
    gl.uniform1f(u.uMinPx, 1.15 * dpr);
    gl.uniform1f(u.uMaxPx, Math.min(this.maxPoint, 48 * dpr));
    gl.uniform1f(u.uAlpha, rp.alpha * (1 - pm));
    gl.uniform1f(u.uFog, rp.fog);
    const r = this._radius();
    gl.uniform2f(u.uFogRange, c.dist - r * 0.55, c.dist + r * 0.85);
    gl.uniform1f(u.uOverlay, 0.05);
    gl.uniform1f(u.uSoft, rp.soft);
    gl.uniform1f(u.uAdd, rp.add);

    gl.enable(gl.DEPTH_TEST);
    // pre-pass: the cores write depth, so near cells hide far ones without hard edges
    const prepass = rp.add < 0.5;
    if (prepass && drawPts) {
      gl.colorMask(false, false, false, false);
      gl.depthFunc(gl.LESS);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.uniform1f(u.uCore, 0.5);
      gl.drawArrays(gl.POINTS, 0, N);
      gl.colorMask(true, true, true, true);
    }
    gl.uniform1f(u.uCore, 0);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if (!prepass) gl.disable(gl.DEPTH_TEST);
    if (drawPts) gl.drawArrays(gl.POINTS, 0, N);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);

    // the full-detail image: a quad over the state's frame box, drawn with the same view and
    // projection as the particles, so the two line up wherever the camera is
    let glowTo = rp.glow;
    if (pm > 0.001) {
      const pd = this.plate.d, st = pd.st, [W, H] = st.frame.size, s = 2 / Math.max(W, H);
      const bx = st.detail.box || [0, 0, 1, 1];
      if (st.detail.glow != null) glowTo = st.detail.glow;
      gl.useProgram(this.progPlate.p);
      gl.bindVertexArray(this.vaoFull);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.plate.det.tex);
      const pu = this.progPlate.u;
      gl.uniformMatrix4fv(pu.uVP, false, this._vp);
      gl.uniform4f(pu.uBox, (bx[0] - 0.5) * W * s, (bx[1] - 0.5) * H * s, (bx[2] - 0.5) * W * s, (bx[3] - 0.5) * H * s);
      gl.uniform1f(pu.uAlpha, pm);
      gl.uniform1i(pu.uTex, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disable(gl.BLEND);
      gl.bindVertexArray(null);
    }

    // bloom at a quarter of the resolution
    const glow = this._bloomOn() ? lerp(rp.glow, glowTo, pm) : 0;
    gl.bindVertexArray(this.vaoFull);
    if (glow > 0) {
      gl.viewport(0, 0, fb.bw, fb.bh);
      gl.useProgram(this.progDown.p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb.a);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fb.sceneTex);
      gl.uniform1i(this.progDown.u.uTex, 0);
      gl.uniform2f(this.progDown.u.uTexel, 1 / fb.W, 1 / fb.H);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.useProgram(this.progBlur.p);
      gl.uniform1i(this.progBlur.u.uTex, 0);
      for (const step of [1, 2.2]) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb.b);
        gl.bindTexture(gl.TEXTURE_2D, fb.aTex);
        gl.uniform2f(this.progBlur.u.uDir, step / fb.bw, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb.a);
        gl.bindTexture(gl.TEXTURE_2D, fb.bTex);
        gl.uniform2f(this.progBlur.u.uDir, 0, step / fb.bh);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, fb.W, fb.H);
    gl.useProgram(this.progComp.p);
    const uc = this.progComp.u;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fb.sceneTex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, fb.aTex);
    gl.uniform1i(uc.uScene, 0); gl.uniform1i(uc.uBloom, 1);
    const bg = this.bg || (this.bg = parseColor(this.opts.background));
    gl.uniform4f(uc.uBg, bg[0], bg[1], bg[2], bg[3]);
    gl.uniform1f(uc.uLift, bg[3] > 0 ? this.opts.backgroundLift : 0);
    gl.uniform1f(uc.uGlow, glow);
    gl.uniform2f(uc.uRes, fb.W, fb.H);
    const lc = this._liftNow();
    gl.uniform3f(uc.uLiftCol, lc[0], lc[1], lc[2]);
    const rect = this._rect(this.state);
    gl.uniform2f(uc.uCenter, (rect.x + rect.w / 2) / this.cssW, 1 - (rect.y + rect.h / 2) / this.cssH);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(null);
  }

  // half the content's extent, blended between source and target (it sets the depth-cue range)
  _radius() {
    const of = (s) => {
      if (s.kind === 'snap') return this.snapRadius || 1;
      const b = s.d.bounds;
      return Math.max(b[3] - b[0], b[4] - b[1], b[5] - b[2]) * 0.5 || 1;
    };
    const e = this.morph ? easeInOut(clamp(this.morph.t, 0, 1)) : 1;
    return lerp(of(this.src), of(this.dst), e);
  }

  _bloomOn() {
    const b = this.opts.bloom;
    if (b === true || b === false) return b;
    return true;
  }

  // ── size ─────────────────────────────────────────────────────────────────
  _size(force) {
    const r = this.canvas.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(r.width)), cssH = Math.max(1, Math.round(r.height));
    const dpr = Math.min(window.devicePixelRatio || 1, this.opts.maxDpr || 2);
    const W = Math.max(1, Math.round(cssW * dpr)), H = Math.max(1, Math.round(cssH * dpr));
    if (!force && W === this.canvas.width && H === this.canvas.height && cssW === this.cssW && cssH === this.cssH) return false;
    this.cssW = cssW; this.cssH = cssH; this.dpr = dpr;
    this.canvas.width = W; this.canvas.height = H;
    this._fitKey = `${cssW}x${cssH}:${this._frameKey(this.opts.frame, this.opts.frames)}:${this.budget}`;
    return true;
  }

  _resized() {
    if (!this.gl) return;
    // where the camera is now, so the new fit is reached by a short glide, not a jump
    const from = this._cam && !this.reduced && !this.morph ? this._camNow() : null;
    if (!this._size(false)) return;
    if (from) this.camAnim = { from, start: performance.now(), dur: 360 };
    this._targets();
    this._relayoutOrDefer();
    this._kick();
  }

  _relayoutOrDefer() {
    if (this.morph) { this._pendingLayout = true; return; }
    this._relayout();
  }

  // every resting camera refits to the new size
  _relayout() {
    for (const d of this.data.values()) d.cam = null;
  }

  // ── events ───────────────────────────────────────────────────────────────
  _on(el, type, fn, opt) {
    el.addEventListener(type, fn, opt);
    this._listeners.push(() => el.removeEventListener(type, fn, opt));
  }

  _events() {
    const cv = this.canvas;
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => this._resized());
      this._ro.observe(cv);
    } else {
      this._on(window, 'resize', () => this._resized());
    }
    if (typeof IntersectionObserver !== 'undefined') {
      this._io = new IntersectionObserver((es) => {
        const v = es.some((e) => e.isIntersecting);
        if (v !== this.visible) { this.visible = v; if (v) this._kick(); }
      }, { threshold: 0 });
      this._io.observe(cv);
    }
    this._on(document, 'visibilitychange', () => { this.hidden = document.hidden; if (!this.hidden) this._kick(); });
    this._on(cv, 'webglcontextlost', (e) => { e.preventDefault(); if (this._raf) cancelAnimationFrame(this._raf); this._raf = 0; });
    this._on(cv, 'webglcontextrestored', () => {
      this._glInit();
      for (const d of this.data.values()) this._upload(d);
      this.snapGpu = null;
      if (this.src.kind === 'snap') this.src = { kind: 'state', d: this.dst.d, rp: this.dst.d.rp };
      this.morph = null;
      // the full-detail images went with the context: fetch the one in view again (HTTP cache)
      this._uploads.forEach((det) => releaseImage(det.img));
      this._uploads = [];
      this.details.clear();
      this.plate = null;
      this.detailMix = 0;
      this._wantDetail(this.state);
      this._kick();
    });
    if (this.opts.interactive) {
      cv.style.touchAction = 'pan-y';
      this._on(cv, 'pointerdown', (e) => this._down(e));
      this._on(cv, 'pointermove', (e) => this._move(e));
      this._on(cv, 'pointerup', (e) => this._up(e));
      this._on(cv, 'pointercancel', (e) => this._up(e, true));
      this._on(cv, 'lostpointercapture', (e) => this._up(e, true));
      if (this.opts.keyboard) {
        if (!cv.hasAttribute('tabindex')) cv.tabIndex = 0;
        this._on(cv, 'keydown', (e) => this._key(e));
      }
    }
    if (this.opts.hover) {
      this._on(cv, 'pointermove', (e) => {
        if (e.pointerType !== 'mouse' || this._drag) return;
        const r = cv.getBoundingClientRect();
        this._hoverReq = { x: e.clientX - r.left, y: e.clientY - r.top };
        if (!this._raf) this._pickSoon();
      });
      this._on(cv, 'pointerleave', () => { this._hoverReq = null; this._setHover(null); });
    }
  }

  _down(e) {
    if (this._drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    this._drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), touch: e.pointerType !== 'mouse', moved: false };
    this._vel = [0, 0];
    try { this.canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    this._setHover(null);
    this._kick();
  }

  _move(e) {
    const g = this._drag;
    if (!g || e.pointerId !== g.id) return;
    const now = performance.now(), dx = e.clientX - g.x, dy = e.clientY - g.y;
    const k = 0.3 * DEG;
    const dyaw = -dx * k, dpitch = g.touch ? 0 : dy * k * 0.8;
    this._user[0] += dyaw; this._user[1] += dpitch;
    const dt = Math.max(1, now - g.t) / 1000;
    const cap = 150 * DEG;                       // at most 150°/s carried into the glide
    this._vel = [clamp(lerp(this._vel[0], dyaw / dt, 0.5), -cap, cap), clamp(lerp(this._vel[1], dpitch / dt, 0.5), -cap, cap)];
    g.x = e.clientX; g.y = e.clientY; g.t = now; g.moved = true;
    this._kick();
  }

  _up(e, cancel) {
    const g = this._drag;
    if (!g || (e && e.pointerId !== g.id)) return;
    this._drag = null;
    if (cancel || this.reduced || performance.now() - g.t > 80) this._vel = [0, 0];
    this._kick();
  }

  _key(e) {
    const step = 9 * DEG;
    const map = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, -step * 0.6], ArrowDown: [0, step * 0.6] };
    const m = map[e.key];
    if (!m) return;
    e.preventDefault();
    if (this.reduced) { this._user[0] += m[0]; this._user[1] += m[1]; this._clampUser(); }
    else { this._vel[0] += m[0] * 2.6; this._vel[1] += m[1] * 2.6; }
    this._kick();
  }

  _pickSoon() {
    if (this._pickTimer) return;
    this._pickTimer = requestAnimationFrame(() => {
      this._pickTimer = 0;
      if (this._hoverReq && this._cam) this._pick();
    });
  }

  // CPU grid over the projected positions of the settled state
  _pick() {
    const req = this._hoverReq;
    if (!req || this.morph || !this._cam) return;
    const d = this.dst.d, P = d.world, N = this.budget, vp = this._vp;
    const W = this.cssW, H = this.cssH;
    const cell = 12, gw = Math.ceil(W / cell) + 1, gh = Math.ceil(H / cell) + 1;
    if (!this._sx || this._sx.length < N) { this._sx = new Float32Array(N); this._sy = new Float32Array(N); this._sw = new Float32Array(N); }
    const head = new Int32Array(gw * gh).fill(-1), next = new Int32Array(N);
    for (let i = 0; i < N; i++) {
      if (!d.pick[i]) continue;
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      const w = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
      if (w <= 1e-4) continue;
      const sx = ((vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / w * 0.5 + 0.5) * W;
      const sy = (0.5 - (vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / w * 0.5) * H;
      this._sx[i] = sx; this._sy[i] = sy; this._sw[i] = w;
      const gx = Math.floor(sx / cell), gy = Math.floor(sy / cell);
      if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) continue;
      const g = gy * gw + gx;
      next[i] = head[g]; head[g] = i;
    }
    // a cell under the pointer (within its drawn radius) wins by depth, the nearest to the eye;
    // otherwise the nearest cell within `rad` CSS px
    const rad = 10, base = this._baseOf(this.dst), k = (this._focal / this.dpr) * 0.5;
    const gx0 = Math.floor((req.x - rad) / cell), gx1 = Math.floor((req.x + rad) / cell);
    const gy0 = Math.floor((req.y - rad) / cell), gy1 = Math.floor((req.y + rad) / cell);
    let under = -1, underW = Infinity, near = -1, nearD = rad * rad;
    for (let gy = gy0; gy <= gy1; gy++) {
      if (gy < 0 || gy >= gh) continue;
      for (let gx = gx0; gx <= gx1; gx++) {
        if (gx < 0 || gx >= gw) continue;
        for (let i = head[gy * gw + gx]; i !== -1; i = next[i]) {
          const dx = this._sx[i] - req.x, dy = this._sy[i] - req.y, dd = dx * dx + dy * dy;
          const r = Math.max(2.5, (base * (d.size[i] / 127.5) * k) / this._sw[i]);
          if (dd <= r * r && this._sw[i] < underW) { underW = this._sw[i]; under = i; }
          if (dd < nearD) { nearD = dd; near = i; }
        }
      }
    }
    const best = under >= 0 ? under : near;
    this._hoverReq = null;
    this._setHover(best < 0 ? null : this._info(best));
  }

  _info(i) {
    const d = this.dst.d, st = d.st, idx = d.raw.col[i], pe = st.palette[idx];
    const info = { state: st.id, index: i, name: pe.name, color: pe.color, detail: '', x: this._sx[i], y: this._sy[i] };
    if (st.kind === 'array') {
      // the tissue, and the gene's level there
      const t = st.tissues && st.tissues[d.raw.grp[i]], sc = st.scale;
      const k = sc ? idx / (sc.levels - 1) : 0;
      const v = sc ? sc.range[0] + (sc.range[1] - sc.range[0]) * k : 0;
      const name = t ? t.name.charAt(0).toUpperCase() + t.name.slice(1) : st.label.tissue;
      info.name = `${name} · ${st.label.gene} ${k >= 0.999 ? '≥ ' : ''}${v.toFixed(1)}`;
      info.detail = sc ? sc.unit : '';
    } else if (st.kind === 'plates') {
      const pl = st.plates.find((p) => idx >= p.first && idx < p.first + p.levels);
      if (pl) {
        const t = (idx - pl.first) / (pl.levels - 1);
        const v = pl.range[0] + (pl.range[1] - pl.range[0]) * Math.pow(t, 1 / pl.gamma);
        info.name = `${st.label.gene} · ${pl.name}`;
        info.color = pl.hue;
        info.detail = `${t >= 0.999 ? '≥ ' : '≈ '}${v.toFixed(2)} log1p CP10K, ${pl.detail}`;
      }
    } else if (st.kind === 'volume') {
      const z = (d.raw.pos[i * 3 + 2] / 65535) * st.frame.size[2];
      info.detail = `depth ${Math.round(z)} µm of ${st.frame.size[2]} µm`;
    } else {
      info.detail = st.label.tissue;
    }
    return info;
  }

  _setHover(info) {
    const a = this._hoverInfo, same = a && info && a.index === info.index && a.state === info.state;
    if (same || (!a && !info)) { if (info) this._hoverInfo = info; return; }
    this._hoverInfo = info;
    this.opts.onHover && this.opts.onHover(info);
  }

  _emit(id, phase) {
    this.opts.onState && this.opts.onState(id, phase);
  }

  // ── public ───────────────────────────────────────────────────────────────
  setBackground(color, lift) {
    this.opts.background = color;
    if (lift != null) this.opts.backgroundLift = lift;
    this.bg = parseColor(color);
    this._kick();
  }

  // new insets. { frames } replaces the per-state rects as well; { glide: ms } lets the camera
  // glide to the new fit instead of jumping
  setFrame(frame, { frames, glide = 0 } = {}) {
    const fs = frames === undefined ? this.opts.frames : frames;
    if (this.fallback || !this.gl) { this.opts.frame = frame; this.opts.frames = fs; return; }
    if (glide > 0 && !this.reduced) { this._reframe(frame, fs, glide); return; }
    this.opts.frame = frame;
    this.opts.frames = fs;
    this.camAnim = null;
    this._size(true);
    this._targets();
    this._relayoutOrDefer();
    this._kick();
  }

  setBudget(n) {
    this.opts.particleBudget = n;
    this._budget();
    if (this.fallback) return;
    this._size(true);
    this._relayoutOrDefer();
    this._kick();
  }

  pause() { this.paused = true; if (this._raf) cancelAnimationFrame(this._raf); this._raf = 0; }
  resume() { this.paused = false; this._kick(); }

  // false holds the idle sway where it is (no jump); true lets it run on from there
  setIdle(on) {
    this.idlePaused = !on;
    this._kick();
  }

  // load states ahead of a switch, in the background and one at a time: the ids given, in
  // that order, or every state not loaded yet. { first: true } moves them to the front of
  // the background queue (a visitor pointing at a case).
  // A state's full-detail image comes after the particles of every state asked for.
  prefetch(ids, { first = false } = {}) {
    if (!this.states || this.fallback) return;
    const want = ids == null ? this.states.map((s) => s.id) : [].concat(ids);
    const list = want.filter((id) => !this.data.has(id));
    for (const id of list) this._load(id, false).catch((e) => console.warn(e));
    const dets = want.filter((id) => this._hasDetail(id) && !this.details.has(id));
    for (const id of dets) this._loadDetail(id, false).catch((e) => console.warn(e));
    if (first && (list.length || dets.length)) {
      const jobs = [...list.map((id) => this.loading.get(id)), ...dets.map((id) => this.loading.get(`${id}#detail`))].filter(Boolean);
      this._queue = [...this._queue.filter((j) => j.urgent), ...jobs.filter((j) => !j.urgent),
        ...this._queue.filter((j) => !j.urgent && !jobs.includes(j))];
    }
  }

  // false hides the full-detail image (the particles show again); true lets it fade back in
  setDetail(on) {
    this.detailOn = !!on;
    this._kick();
  }

  // → Promise<boolean>: true once a state's full-detail image is on the GPU (it shows as soon as
  // the state is at rest), false when the state has none or the engine shows posters
  detailReady(id = this.state) {
    if (this.fallback || !this._hasDetail(id)) return Promise.resolve(false);
    const have = this.details.get(id);
    if (have && have.tex) return Promise.resolve(true);
    return this._loadDetail(id, true).then((det) => new Promise((res) => {
      const wait = () => {
        if (!det || this.destroyed) res(false);
        else if (det.tex) res(true);
        else requestAnimationFrame(wait);
      };
      wait();
    }));
  }

  // true when a state's particles are here; progress(id): 0..1 while it loads, else null
  loaded(id) { return this.data.has(id); }
  progress(id) {
    if (this.data.has(id)) return 1;
    const job = this.loading.get(id);
    return job ? (job.total ? Math.min(1, job.got / job.total) : 0) : null;
  }

  umPerPixel() {
    const d = this.dst && this.dst.d;
    if (!d || !this._cam || !d.umPerUnit) return null;
    const unitsPerPx = (2 * this._cam.dist * Math.tan(this._cam.fov / 2)) / this.cssH;
    return unitsPerPx * d.umPerUnit;
  }

  // the background lift's tint: a state's liftColors entry, else the engine's blue-grey
  _liftOf(s) {
    if (!s) return LIFT;
    if (s.kind === 'snap') return this.snapLift || LIFT;
    const m = this.opts.liftColors, c = m && s.d && m[s.d.st.id];
    if (!c) return LIFT;
    if (!s.d._lift) { const p = parseColor(c); s.d._lift = [p[0], p[1], p[2]]; }
    return s.d._lift;
  }

  _liftNow() {
    if (!this.src || !this.dst) return LIFT;
    const a = this._liftOf(this.src), b = this._liftOf(this.dst);
    const e = this.morph ? easeInOut(clamp(this.morph.t, 0, 1)) : 1;
    return [lerp(a[0], b[0], e), lerp(a[1], b[1], e), lerp(a[2], b[2], e)];
  }

  _frameKey(frame, frames) { return JSON.stringify([frame || {}, frames || {}]); }

  // new framing: the camera glides from where it is to the new fit
  _reframe(frame, frames, dur) {
    if (this._frameKey(frame, frames) === this._frameKey(this.opts.frame, this.opts.frames)) return false;
    const now = performance.now();
    // the camera without its sway and the visitor's orbit, which stays applied on top
    const camFrom = this._cam && dur > 0 ? this._camNow() : null;
    this.opts.frame = frame;
    this.opts.frames = frames;
    this._fitKey = `${this.cssW}x${this.cssH}:${this._frameKey(frame, frames)}:${this.budget}`;
    for (const d of this.data.values()) d.cam = null;
    this.camAnim = camFrom ? { from: camFrom, start: now, dur } : null;
    this._kick();
    return true;
  }

  // one move to a state in a framing: the morph's camera lands on the new framing
  setView(id, frame, { frames, instant = false, glide = this.opts.glide } = {}) {
    if (this.destroyed) return Promise.resolve(false);
    const fs = frames === undefined ? this.opts.frames : frames;
    if (this.fallback) {
      if (frame) { this.opts.frame = frame; this.opts.frames = fs; }
      return id ? this.setState(id) : Promise.resolve(true);
    }
    const quick = instant || this.reduced;
    const prev = this._want;
    if (!id || id === this.state) {
      this._want = this.state;
      if (prev && prev !== this.state) this._demote(prev);
      if (frame) this._reframe(frame, fs, quick ? 0 : glide);
      return (this.morph && this.morph.promise) || Promise.resolve(true);
    }
    if (!this.states.find((s) => s.id === id)) return Promise.reject(new Error(`pointcloud: no state ${id}`));
    this._want = id;
    if (prev && prev !== id) this._demote(prev);
    this._wantFrame = frame ? [frame, fs] : null;
    return this._load(id).then((d) => {
      if (this.destroyed || this._want !== id) return false;
      this._wantDetail(id);
      const p = this._go(d, quick);
      const w = this._wantFrame;
      if (w && this._frameKey(w[0], w[1]) !== this._frameKey(this.opts.frame, this.opts.frames)) {
        // the morph has started from the old positions; land it on the new framing
        this.opts.frame = w[0];
        this.opts.frames = w[1];
        this._fitKey = `${this.cssW}x${this.cssH}:${this._frameKey(w[0], w[1])}:${this.budget}`;
        for (const dd of this.data.values()) dd.cam = null;
      }
      return p;
    });
  }

  // screen corners (CSS px) of the multi-omics plates: [{ name, hue, corners: [{x, y} x 4] }]
  plateAnchors() {
    const d = this.dst && this.dst.d;
    if (!d || d.st.kind !== 'plates' || !this._cam || this.morph) return [];
    const st = d.st, nP = st.plates.length, side = 2, gap = (st.frame.plateGap ?? 0.55) * side;
    const vp = this._vp, W = this.cssW, H = this.cssH;
    const pr = (x, y, z) => {
      const w = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
      return {
        x: ((vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / w * 0.5 + 0.5) * W,
        y: (0.5 - (vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / w * 0.5) * H,
      };
    };
    return st.plates.map((p, k) => {
      const y = ((nP - 1) / 2 - k) * gap;
      return { name: p.name, hue: p.hue, corners: [pr(-1, y, -1), pr(1, y, -1), pr(1, y, 1), pr(-1, y, 1)] };
    });
  }

  // screen positions (CSS px) of the tissue array's tissues, each at the centre of its cells:
  // [{ label, code, x, y }]; [] in other states
  anchors() {
    const d = this.dst && this.dst.d;
    if (!d || d.st.kind !== 'array' || !this._cam || !d.st.tissues) return [];
    const vp = this._vp, W = this.cssW, H = this.cssH;
    const [FW, FH] = d.st.frame.size, s = 2 / Math.max(FW, FH);
    return d.st.tissues.map((t) => {
      const X = (t.u - 0.5) * FW * s, Z = (t.v - 0.5) * FH * s;
      const w = vp[3] * X + vp[11] * Z + vp[15];
      return {
        label: t.name, code: t.code,
        x: ((vp[0] * X + vp[8] * Z + vp[12]) / w * 0.5 + 0.5) * W,
        y: (0.5 - (vp[1] * X + vp[9] * Z + vp[13]) / w * 0.5) * H,
      };
    });
  }

  destroy() {
    this.destroyed = true;
    for (const job of this._queue) if (job.ctrl) job.ctrl.abort();
    this._queue = [];
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._pickTimer) cancelAnimationFrame(this._pickTimer);
    this._raf = 0;
    this._ro && this._ro.disconnect();
    this._io && this._io.disconnect();
    this._listeners.forEach((f) => f());
    this._listeners = [];
    if (this.morph && this.morph.resolve) this.morph.resolve(false);
    const gl = this.gl;
    this._uploads.forEach((det) => releaseImage(det.img));
    this._uploads = [];
    if (gl && !gl.isContextLost()) {
      for (const d of this.data.values()) if (d.gpu) Object.values(d.gpu).forEach((b) => gl.deleteBuffer(b));
      if (this.snapGpu) Object.values(this.snapGpu).forEach((b) => gl.deleteBuffer(b));
      for (const det of this.details.values()) if (det.tex) gl.deleteTexture(det.tex);
      gl.deleteBuffer(this.randBuf);
      if (this.fb) {
        [this.fb.sceneTex, this.fb.aTex, this.fb.bTex].forEach((t) => gl.deleteTexture(t));
        [this.fb.scene, this.fb.a, this.fb.b].forEach((f) => gl.deleteFramebuffer(f));
        gl.deleteRenderbuffer(this.fb.depth);
      }
      [this.prog, this.progDown, this.progBlur, this.progComp, this.progPlate].forEach((p) => p && gl.deleteProgram(p.p));
      gl.deleteVertexArray(this.vao); gl.deleteVertexArray(this.vaoFull);
    }
    if (this.ownCanvas) this.canvas.remove();
    if (this.poster) this.poster.remove();
    this.data.clear();
    this.details.clear();
  }
}

// An image blob, decoded for texImage2D: an ImageBitmap (decoded off the main thread, premultiplied
// by its own options, which an upload follows), else an <img> (premultiplied by the unpack flag).
async function decodeImage(blob) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob, { premultiplyAlpha: 'premultiply', colorSpaceConversion: 'none' });
    } catch (_) { /* an <img> below */ }
  }
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  img._url = url;
  try { await img.decode(); } catch (err) { URL.revokeObjectURL(url); throw err; }
  return img;
}

function releaseImage(img) {
  if (!img) return;
  if (typeof img.close === 'function') img.close();
  if (img._url) { URL.revokeObjectURL(img._url); img._url = null; }
}

// a software rasteriser (SwiftShader, llvmpipe) cannot hold 60 fps here: show the poster instead
function softwareGL(gl) {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const r = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r);
}

function viewOf(out, yaw, pitch, dist, target) {
  const cp = Math.cos(pitch);
  const eye = [target[0] + dist * cp * Math.sin(yaw), target[1] + dist * Math.sin(pitch), target[2] + dist * cp * Math.cos(yaw)];
  return lookAt(out, eye, target);
}

function bounds(pos, N) {
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < N; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
    if (z < z0) z0 = z; if (z > z1) z1 = z;
  }
  return [x0, y0, z0, x1, y1, z1];
}

// mean spacing of points lying in the XZ plane: sqrt(occupied area / N)
function occupancySpacing(pos, N, G = 120) {
  const b = bounds(pos, N), w = b[3] - b[0] || 1, h = b[5] - b[2] || 1, s = Math.max(w, h) / G;
  const gw = Math.ceil(w / s) + 1, gh = Math.ceil(h / s) + 1, occ = new Uint8Array(gw * gh);
  let n = 0;
  for (let i = 0; i < N; i++) {
    const k = Math.floor((pos[i * 3 + 2] - b[2]) / s) * gw + Math.floor((pos[i * 3] - b[0]) / s);
    if (!occ[k]) { occ[k] = 1; n++; }
  }
  return Math.sqrt((n * s * s) / N);
}

async function mount(target, opts = {}) {
  const h = new Hero(target, opts);
  try {
    await h.init();
  } catch (err) {
    if (!h.manifest) throw err;
    console.warn(err);
    if (!h.fallback) { h.destroy(); h.destroyed = false; h._fallback(); }
  }
  return h;
}

export const PointCloud = { mount };
export default PointCloud;

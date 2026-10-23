var at = Object.defineProperty;
var ct = (o, t, s) => t in o ? at(o, t, { enumerable: !0, configurable: !0, writable: !0, value: s }) : o[t] = s;
var S = (o, t, s) => ct(o, typeof t != "symbol" ? t + "" : t, s);
function q(o, t) {
  const s = Math.sin(o * 12.9898 + t * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
function ht(o, t) {
  const s = Math.PI * (3 - Math.sqrt(5)), r = 1 - 2 * (o + 0.5) / t, e = Math.sqrt(1 - r * r), n = o * s;
  return [e * Math.cos(n), r, e * Math.sin(n)];
}
function lt(o, t) {
  return Math.atan2(Math.sin(o - t), Math.cos(o - t));
}
function _(o, t, s, r, e) {
  const n = Math.sin(t), i = Math.cos(t), c = Math.sin(o), a = Math.cos(o);
  return (h, u, l) => {
    const d = h * a + l * c, f = -h * c + l * a, R = u * i - f * n, x = u * n + f * i;
    return [s + d * e, r - R * e, x];
  };
}
function $(o, t, s, r = 0.3, e) {
  t.sort((n, i) => n.z - i.z);
  for (const n of t) {
    const i = n.a ?? 1;
    if (i < 0.02) continue;
    const c = Math.min(1, Math.max(0, n.white)), a = s ? 1 - c : c;
    if (e) {
      const h = Math.round(e.r * a), u = Math.round(e.g * a), l = Math.round(e.b * a);
      o.fillStyle = `rgba(${h},${u},${l},${i})`;
    } else {
      const h = Math.round(a * 255);
      o.fillStyle = `rgba(${h},${h},${h},${i})`;
    }
    o.beginPath(), o.arc(n.x, n.y, Math.max(r, n.r), 0, Math.PI * 2), o.fill();
  }
}
function J(o) {
  const t = o.trim(), s = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(t);
  if (s) {
    const e = s[1], n = e.length === 3 ? e.split("").map((i) => i + i).join("") : e;
    return {
      r: parseInt(n.slice(0, 2), 16),
      g: parseInt(n.slice(2, 4), 16),
      b: parseInt(n.slice(4, 6), 16)
    };
  }
  const r = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(t);
  return r ? {
    r: Math.round(parseFloat(r[1])),
    g: Math.round(parseFloat(r[2])),
    b: Math.round(parseFloat(r[3]))
  } : null;
}
function H(o, t) {
  return (o / 300) ** t;
}
function ut(o, t, s, r) {
  const e = 2 * t * s + r, n = o % e, i = new Array(t).fill(0);
  let c = -1;
  if (n < 2 * t * s) {
    const a = Math.floor(n / s), h = (n - a * s) / s, l = 1 - (1 - Math.min(1, h / 0.7)) ** 3;
    if (a < t) {
      for (let d = 0; d < a; d++) i[d] = 1;
      i[a] = l, c = a;
    } else {
      const d = 2 * t - 1 - a;
      for (let f = 0; f < d; f++) i[f] = 1;
      i[d] = 1 - l, c = d;
    }
  }
  return { amount: i, active: c };
}
function dt(o, t, s) {
  let [r, e, n] = o, i = !1;
  for (let c = 0; c < t.length; c++) {
    if (s.amount[c] <= 0) continue;
    const a = t[c], h = a.axis === 0 ? r : a.axis === 1 ? e : n;
    if (h < a.lo || h >= a.hi) continue;
    c === s.active && (i = !0);
    const u = a.ang * s.amount[c], l = Math.cos(u), d = Math.sin(u);
    if (a.axis === 0) {
      const f = e * l - n * d;
      n = e * d + n * l, e = f;
    } else if (a.axis === 1) {
      const f = r * l + n * d;
      n = -r * d + n * l, r = f;
    } else {
      const f = r * l - e * d;
      e = r * d + e * l, r = f;
    }
  }
  return [r, e, n, i];
}
function pt(o) {
  const t = [];
  for (let s = 0; s < o; s++) {
    const r = Math.min(2, Math.floor(q(s, 2.3) * 3)), e = -1 + 0.5 * Math.min(3, Math.floor(q(s, 5.9) * 4)), n = q(s, 7.7) < 0.5 ? 1 : -1;
    t.push({ axis: r, lo: e, hi: e + 0.5, ang: n * Math.PI / 2 });
  }
  return t;
}
const ft = (o, t, s, r, e, n) => {
  const c = t / 2, a = t / 2, h = t / 2 * 0.82, u = 0.4 + 0.06 * Math.sin(s * 0.35), l = _(s * 0.5, u, c, a, h), d = s * (0.5 + (1.7 - 0.5) * (e.scanMul ?? 1)), f = H(t, e.rsPow ?? 0.6), R = e.dimBase ?? 1, x = [], v = e.latRings ?? 17, k = e.lonDensity ?? 44;
  for (let y = 0; y <= v; y++) {
    const M = -Math.PI / 2 + y / v * Math.PI, O = Math.cos(M), P = Math.sin(M), I = Math.max(1, Math.round(Math.abs(O) * k));
    for (let C = 0; C < I; C++) {
      const L = C / I * 2 * Math.PI, [g, D, p] = l(O * Math.cos(L), P, O * Math.sin(L)), m = (p + 1) / 2, b = lt(L + s * 0.5, d), w = Math.exp(-(b * b) / 0.18) * Math.max(0, p);
      x.push({
        x: g,
        y: D,
        z: p,
        r: ((e.rBase ?? 0.6) + (e.rDepth ?? 1.7) * m + (e.rBoost ?? 1) * w) * f,
        white: (e.inkFar ?? 0.62) - (e.inkSpan ?? 0.54) * m,
        // dimBase < 1 fades un-scanned dots so the meridian reads clearly
        a: R + (1 - R) * Math.min(1, w)
      });
    }
  }
  $(o, x, r, e.rMin, n);
}, Mt = (o, t, s, r, e, n) => {
  const i = t / 2, c = t / 2, a = t / 2 * 0.82, h = _(s * 0.55, 0.35 + 0.1 * Math.sin(s * 0.9), i, c, a), u = H(t, e.rsPow ?? 0.6), l = e.moveCount ?? 14, d = pt(l), f = ut(s, l, 0.42, 1.2), R = [], x = e.latRings ?? 15, v = e.lonDensity ?? 40;
  for (let k = 0; k <= x; k++) {
    const y = -Math.PI / 2 + k / x * Math.PI, M = Math.cos(y), O = Math.sin(y), P = Math.max(1, Math.round(Math.abs(M) * v));
    for (let I = 0; I < P; I++) {
      const C = I / P * 2 * Math.PI, [L, g, D, p] = dt([M * Math.cos(C), O, M * Math.sin(C)], d, f), [m, b, w] = h(L, g, D), F = (w + 1) / 2;
      R.push({
        x: m,
        y: b,
        z: w,
        r: ((e.rBase ?? 0.6) + (e.rDepth ?? 1.7) * F + (p ? e.rActive ?? 0.3 : 0)) * u,
        white: (e.inkFar ?? 0.62) - (e.inkSpan ?? 0.54) * F - (p ? 0.14 : 0)
      });
    }
  }
  $(o, R, r, e.rMin, n);
}, mt = (o, t, s, r, e, n) => {
  const i = t / 2, c = t / 2, a = t / 2 * 0.874, h = _(s * 0.18, 0.38, i, c, 1), u = H(t, e.rsPow ?? 0.6), l = [], d = e.rings ?? 15, f = e.lonDensity ?? 40;
  for (let R = 0; R <= d; R++) {
    const x = -Math.PI / 2 + R / d * Math.PI, v = Math.cos(x), k = Math.sin(x), y = 0.62 * Math.sin(s * 2.1 - R * 0.52) + 0.38 * Math.sin(s * 1.27 + R * 0.83), M = a * (0.88 + 0.105 * y), O = Math.max(1, Math.round(Math.abs(v) * f));
    for (let P = 0; P < O; P++) {
      const I = P / O * 2 * Math.PI, [C, L, g] = h(v * Math.cos(I) * M, k * M, v * Math.sin(I) * M), D = (g / a + 1) / 2, p = Math.max(0, y);
      l.push({
        x: C,
        y: L,
        z: g,
        r: ((e.rBase ?? 0.6) + (e.rDepth ?? 1.7) * D) * (1 + 0.4 * p) * u,
        white: 0.66 - 0.56 * D - 0.1 * p
      });
    }
  }
  $(o, l, r, e.rMin, n);
};
function bt(o) {
  return o * o * (3 - 2 * o);
}
function nt(o) {
  const t = o.length, s = [];
  let r = 0;
  for (let e = 0; e < t; e++) {
    const n = o[e], i = o[(e + 1) % t], c = Math.hypot(i[0] - n[0], i[1] - n[1]);
    s.push(c), r += c;
  }
  return (e) => {
    let n = e * r, i = 0;
    for (; n > s[i] && i < t - 1; )
      n -= s[i], i++;
    const c = o[i], a = o[(i + 1) % t], h = s[i] ? Math.min(1, n / s[i]) : 0;
    return [c[0] + (a[0] - c[0]) * h, c[1] + (a[1] - c[1]) * h];
  };
}
const Y = (o) => {
  const t = -Math.PI / 2 + o * 2 * Math.PI;
  return [Math.cos(t) * 0.24, Math.sin(t) * 0.24];
}, gt = nt([
  [0, -0.26],
  [0.24, 0.16],
  [-0.24, 0.16]
]), vt = nt([
  [0, -0.2],
  [0.2, -0.2],
  [0.2, 0.2],
  [-0.2, 0.2],
  [-0.2, -0.2]
]), j = [Y, gt, vt];
function yt(o) {
  return Math.max(6, Math.round(34 * o));
}
const G = 1.4, ot = 0.9, K = G + ot, xt = (o, t, s, r, e, n) => {
  const i = j.length, a = (Number.isFinite(s) ? Math.max(0, s) : 0) % (K * i), h = Math.floor(a / K), u = Number.isFinite(h) ? Math.min(i - 1, Math.max(0, h)) : 0, l = a - u * K, d = l > G ? bt((l - G) / ot) : 0, f = e.spread ?? 1, R = j[u] || Y, x = j[(u + 1) % i] || Y, v = 160, k = [];
  for (let p = 0; p < v; p++) {
    const m = p / v, b = R(m), w = x(m);
    k.push([(b[0] + (w[0] - b[0]) * d) * f, (b[1] + (w[1] - b[1]) * d) * f]);
  }
  const y = [];
  let M = 0;
  for (let p = 0; p < v; p++) {
    const m = k[p], b = k[(p + 1) % v], w = Math.hypot(b[0] - m[0], b[1] - m[1]);
    y.push(w), M += w;
  }
  const O = yt(e.iconD ?? 1), P = (e.rDot ?? 0.021) * 1.35 * f, I = 1 + 0.02 * Math.sin(l * 3.1), C = [], L = t / 2;
  let g = 0, D = 0;
  for (let p = 0; p < O; p++) {
    const m = p / O * M;
    for (; D + y[g] < m && g < v - 1; )
      D += y[g], g++;
    const b = k[g], w = k[(g + 1) % v], F = y[g] ? Math.min(1, (m - D) / y[g]) : 0, A = (b[0] + (w[0] - b[0]) * F) * I, N = (b[1] + (w[1] - b[1]) * F) * I;
    C.push({
      x: L + A * t,
      y: L + N * t,
      z: 0,
      r: Math.max(0.35, P * t),
      white: 0.1
    });
  }
  $(o, C, r, e.rMin, n);
}, wt = (o, t, s, r, e, n) => {
  const i = t / 2, c = t / 2, a = t / 2 * 0.82, h = _(s * 0.12, 0.3, i, c, 1), u = H(t, e.rsPow ?? 0.6), l = [], d = e.orbitN ?? 12, f = e.ghostN ?? 40, R = e.particles ?? 3;
  for (let x = 0; x < d; x++) {
    const v = q(x, 1.7), k = q(x, 5.2), y = q(x, 8.9), M = a * (0.45 + 0.52 * v), O = v * 2 * Math.PI, P = Math.acos(2 * k - 1), I = Math.sin(P) * Math.cos(O), C = Math.cos(P), L = Math.sin(P) * Math.sin(O);
    let g = -C, D = I;
    const p = 0, m = Math.max(1e-6, Math.sqrt(g * g + D * D));
    g /= m, D /= m;
    const b = C * p - L * D, w = L * g - I * p, F = I * D - C * g, A = (0.25 + 0.55 * y) * (y > 0.5 ? 1 : -1);
    for (let N = 0; N < f; N++) {
      const z = N / f * 2 * Math.PI, [B, V, E] = h(
        (g * Math.cos(z) + b * Math.sin(z)) * M,
        (D * Math.cos(z) + w * Math.sin(z)) * M,
        (p * Math.cos(z) + F * Math.sin(z)) * M
      ), T = (E / M + 1) / 2;
      l.push({
        x: B,
        y: V,
        z: E,
        r: (e.ghostR ?? 0.9) * u,
        white: 0.72,
        a: (e.ghostA ?? 0.5) * (0.4 + 0.6 * T)
      });
    }
    for (let N = 0; N < R; N++) {
      const z = s * A + N / R * 2 * Math.PI + k * 6, [B, V, E] = h(
        (g * Math.cos(z) + b * Math.sin(z)) * M,
        (D * Math.cos(z) + w * Math.sin(z)) * M,
        (p * Math.cos(z) + F * Math.sin(z)) * M
      ), T = (E / M + 1) / 2;
      l.push({
        x: B,
        y: V,
        z: E,
        r: ((e.partR ?? 1.2) + (e.partRDepth ?? 1.6) * T) * u,
        white: 0.3 - 0.22 * T
      });
    }
  }
  $(o, l, r, e.rMin, n);
}, Rt = (o, t, s, r, e, n) => {
  const i = t / 2, c = t / 2, a = t / 2 * 0.78, h = e.spin ?? 1, u = _(s * 0.1 * h, 0.3, i, c, 1), l = H(t, e.rsPow ?? 0.6), d = [], f = e.ghostN ?? 150;
  for (let m = 0; m < f; m++) {
    const b = ht(m, f), [w, F, A] = u(b[0] * a, b[1] * a, b[2] * a), N = (A / a + 1) / 2;
    d.push({ x: w, y: F, z: A, r: 0.8 * l, white: 0.78, a: 0.1 + 0.22 * N });
  }
  const R = s * 0.24 * h, x = 0.55 + 0.3 * Math.sin(s * 0.18) * h, v = Math.cos(R), k = 0, y = Math.sin(R), M = -y * Math.sin(x), O = Math.cos(x), P = v * Math.sin(x), I = k * P - y * O, C = y * M - v * P, L = v * O - k * M, g = e.lanes ?? 5, D = e.segs ?? 88, p = Math.max(1, Math.round(g * (e.bandMul ?? 1)));
  for (let m = 0; m < p; m++) {
    const b = (m - (p - 1) / 2) * 0.075, w = Math.abs(m - (p - 1) / 2) / Math.max(1, (p - 1) / 2);
    for (let F = 0; F < D; F++) {
      const A = F / D * 2 * Math.PI, N = (0.16 * Math.sin(A * 3 - s * 1.7 + m * 0.22) + 0.07 * Math.sin(A * 5 + s * 1.1)) * (e.wobMul ?? 1), z = b + N, B = v * Math.cos(A) + M * Math.sin(A) + I * z, V = k * Math.cos(A) + O * Math.sin(A) + C * z, E = y * Math.cos(A) + P * Math.sin(A) + L * z, T = Math.sqrt(B * B + V * V + E * E), [it, rt, W] = u(B / T * a, V / T * a, E / T * a), Q = (W / a + 1) / 2;
      d.push({
        x: it,
        y: rt,
        z: W,
        r: ((e.rBase ?? 1.1) + (e.rDepth ?? 1.7) * Q) * (1 - 0.25 * w) * l,
        white: 0.52 - 0.44 * Q + 0.18 * w,
        a: 0.4 + 0.6 * Q
      });
    }
  }
  $(o, d, r, e.rMin, n);
}, X = {
  orbits: wt,
  globe: ft,
  rubik: Mt,
  wave: mt,
  ribbon: Rt,
  morph: xt
}, Dt = [
  ["latRings", "lonDensity"],
  ["rings", "lonDensity"],
  ["lanes", "segs"]
], St = ["orbitN", "ghostN"], kt = ["iconD"], Ot = ["rBase", "rDepth", "rActive", "rDot", "ghostR", "partR", "partRDepth"];
function Pt(o, t) {
  const s = { ...o }, r = /* @__PURE__ */ new Set(), e = Math.sqrt(t);
  for (const [n, i] of Dt) {
    const c = s[n], a = s[i];
    c != null && a != null && !r.has(n) && !r.has(i) && (s[n] = Math.max(2, Math.round(c * e)), s[i] = Math.max(2, Math.round(a * e)), r.add(n), r.add(i));
  }
  for (const n of St) {
    const i = s[n];
    i != null && !r.has(n) && (s[n] = Math.max(1, Math.round(i * t)));
  }
  for (const n of kt) {
    const i = s[n];
    i != null && (s[n] = Math.max(0.02, i * t));
  }
  return s;
}
function It(o, t) {
  const s = { ...o };
  for (const r of Ot) {
    const e = s[r];
    e != null && (s[r] = e * t);
  }
  return s.rSizeMul = (s.rSizeMul ?? 1) * t, s;
}
const Z = {
  globe: {
    latRings: 17,
    lonDensity: 44,
    rBase: 0.6,
    rDepth: 1.7,
    rBoost: 1,
    inkFar: 0.62,
    inkSpan: 0.54,
    rsPow: 0.6,
    rMin: 0.3
  },
  orbits: {
    orbitN: 12,
    ghostN: 40,
    ghostR: 0.9,
    ghostA: 0.5,
    particles: 3,
    partR: 1.2,
    partRDepth: 1.6,
    rsPow: 0.6,
    rMin: 0.3
  },
  rubik: {
    latRings: 15,
    lonDensity: 40,
    moveCount: 14,
    rBase: 0.6,
    rDepth: 1.7,
    rActive: 0.3,
    inkFar: 0.62,
    inkSpan: 0.54,
    rsPow: 0.6,
    rMin: 0.3
  },
  wave: {
    rings: 15,
    lonDensity: 40,
    rBase: 0.6,
    rDepth: 1.7,
    rsPow: 0.6,
    rMin: 0.3
  },
  ribbon: {
    lanes: 5,
    segs: 88,
    ghostN: 150,
    rBase: 1.1,
    rDepth: 1.7,
    rsPow: 0.6,
    rMin: 0.3
  },
  morph: {
    rDot: 0.021,
    iconD: 1,
    rMin: 0.25
  }
}, Ct = {
  working: "orbits",
  searching: "globe",
  solving: "rubik",
  listening: "wave",
  composing: "ribbon",
  shaping: "morph"
}, tt = {
  orbits: {
    64: { speed: 1.885, count: 1, size: 1 },
    20: { speed: 3.9, count: 0.238, size: 2.4 }
  },
  globe: {
    64: { speed: 2.015, count: 0.42, size: 1.15, extra: { scanMul: 4.08, dimBase: 0.45 } },
    20: { speed: 2.665, count: 0.105, size: 1.75, extra: { scanMul: 4.335, dimBase: 0.45 } }
  },
  rubik: {
    64: { speed: 1.82, count: 0.35, size: 1.05 },
    20: { speed: 1.95, count: 0.088, size: 1.9 }
  },
  wave: {
    64: { speed: 4.388, count: 0.341, size: 1 },
    20: { speed: 3.998, count: 0.105, size: 1.6 }
  },
  ribbon: {
    64: { speed: 2.34, count: 0.25, size: 0.85, extra: { spin: 0, bandMul: 3.9, wobMul: 1 } },
    20: { speed: 3.12, count: 0.051, size: 1.073, extra: { spin: 0, bandMul: 4.94, wobMul: 1 } }
  },
  morph: {
    64: { speed: 2.405, count: 0.54, size: 0.395, extra: { spread: 1.45 } },
    20: { speed: 2.08, count: 0.53, size: 1.011, extra: { spread: 1.45 } }
  }
}, st = /* @__PURE__ */ new Map();
function et(o, t) {
  const s = Ct[o] ?? "orbits", e = Number(t) <= 32 ? 20 : 64, n = `${s}-${e}`, i = st.get(n);
  if (i) return i;
  const c = tt[s] ?? tt.orbits, a = c[e] ?? c[64];
  let u = { ...Z[s] ?? Z.orbits };
  a.count !== 1 && (u = Pt(u, a.count)), a.size !== 1 && (u = It(u, a.size)), a.extra && (u = { ...u, ...a.extra });
  const l = { mode: s, speed: a.speed ?? 1, opts: u };
  return st.set(n, l), l;
}
const zt = {
  state: "working",
  size: 64,
  theme: "auto",
  speed: 1,
  paused: !1
}, Lt = {
  working: "Working…",
  searching: "Searching…",
  solving: "Solving…",
  listening: "Listening…",
  composing: "Composing…",
  shaping: "Shaping…"
};
function U(o) {
  if (!o || typeof window > "u" || !window.getComputedStyle)
    return {};
  const t = window.getComputedStyle(o), s = {}, r = t.getPropertyValue("--orb-size").trim();
  if (r) {
    const c = parseFloat(r);
    isNaN(c) || (s.size = c);
  }
  const e = t.getPropertyValue("--orb-speed").trim();
  if (e) {
    const c = parseFloat(e);
    isNaN(c) || (s.speed = c);
  }
  const n = t.getPropertyValue("--orb-color-dark").trim();
  n && (s.colorDark = n);
  const i = t.getPropertyValue("--orb-color-light").trim();
  return i && (s.colorLight = i), s;
}
class At {
  constructor(t) {
    S(this, "listener", null);
    S(this, "isReduced", !1);
    S(this, "onChange");
    this.onChange = t, this.init();
  }
  getIsReduced() {
    return this.isReduced;
  }
  init() {
    if (typeof matchMedia > "u") return;
    const t = matchMedia("(prefers-reduced-motion: reduce)");
    this.isReduced = t.matches, this.listener = (s) => {
      this.isReduced = s.matches, this.onChange(this.isReduced);
    }, t.addEventListener("change", this.listener);
  }
  destroy() {
    this.listener && typeof matchMedia < "u" && matchMedia("(prefers-reduced-motion: reduce)").removeEventListener("change", this.listener);
  }
}
function Ft(o) {
  let t = o;
  for (; t; ) {
    const s = t.getAttribute("data-theme");
    if (s === "dark") return !0;
    if (s === "light") return !1;
    if (t.classList.contains("dark")) return !0;
    if (t.classList.contains("light")) return !1;
    t = t.parentElement;
  }
  return null;
}
function Nt() {
  return typeof matchMedia < "u" && matchMedia("(prefers-color-scheme: dark)").matches;
}
class Et {
  constructor(t, s, r) {
    S(this, "element");
    S(this, "theme");
    S(this, "onChange");
    S(this, "mediaQueryListener", null);
    S(this, "mutationObserver", null);
    S(this, "isDark", !0);
    this.element = t, this.theme = s, this.onChange = r, this.init();
  }
  updateTheme(t, s) {
    s !== void 0 && (this.element = s), this.theme = t, this.reevaluate();
  }
  getResolvedDark() {
    return this.isDark;
  }
  init() {
    if (this.reevaluate(), typeof matchMedia < "u") {
      const t = matchMedia("(prefers-color-scheme: dark)");
      this.mediaQueryListener = () => this.reevaluate(), t.addEventListener("change", this.mediaQueryListener);
    }
    typeof MutationObserver < "u" && typeof document < "u" && (this.mutationObserver = new MutationObserver(() => this.reevaluate()), this.mutationObserver.observe(document.documentElement, {
      attributes: !0,
      attributeFilter: ["class", "data-theme"],
      subtree: !0
    }));
  }
  reevaluate() {
    let t = !0;
    this.theme === "dark" ? t = !0 : this.theme === "light" ? t = !1 : t = Ft(this.element) ?? Nt(), this.isDark !== t && (this.isDark = t, this.onChange(this.isDark));
  }
  destroy() {
    this.mediaQueryListener && typeof matchMedia < "u" && matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", this.mediaQueryListener), this.mutationObserver && this.mutationObserver.disconnect();
  }
}
class Bt {
  constructor(t, s) {
    S(this, "canvas");
    S(this, "options");
    S(this, "themeObserver");
    S(this, "motionObserver");
    S(this, "intersectionObserver", null);
    S(this, "rafId", 0);
    S(this, "isRunning", !1);
    S(this, "isVisible", !0);
    S(this, "isDestroyed", !1);
    S(this, "onVisibilityChangeHandler");
    S(this, "loop", () => {
      !this.isRunning || this.isDestroyed || (this.renderCurrentFrame(), this.rafId = requestAnimationFrame(this.loop));
    });
    this.canvas = t, this.options = { ...zt, ...s }, this.canvas.getAttribute("role") || this.canvas.setAttribute("role", "img"), this.updateAriaLabel(), this.motionObserver = new At(() => {
      this.renderCurrentFrame();
    }), this.themeObserver = new Et(this.canvas, this.options.theme, () => {
      this.renderCurrentFrame();
    }), this.onVisibilityChangeHandler = () => {
      typeof document < "u" && document.visibilityState === "hidden" ? this.stop() : this.isVisible && this.start();
    }, this.initIntersectionObserver(), typeof document < "u" && document.addEventListener("visibilitychange", this.onVisibilityChangeHandler), this.setupCanvasAndRender();
  }
  updateOptions(t) {
    var s;
    this.isDestroyed || (this.options = { ...this.options, ...t }, this.updateAriaLabel(), (s = this.themeObserver) == null || s.updateTheme(this.options.theme, this.canvas), this.setupCanvasAndRender());
  }
  destroy() {
    var t, s;
    this.isDestroyed || (this.isDestroyed = !0, this.stop(), (t = this.themeObserver) == null || t.destroy(), (s = this.motionObserver) == null || s.destroy(), this.intersectionObserver && this.intersectionObserver.disconnect(), typeof document < "u" && document.removeEventListener("visibilitychange", this.onVisibilityChangeHandler));
  }
  updateAriaLabel() {
    const t = this.options.ariaLabel || Lt[this.options.state] || "Loading...";
    this.canvas.setAttribute("aria-label", t);
  }
  setupCanvasAndRender() {
    var e;
    const s = U(this.canvas).size ?? this.options.size, r = Math.min(2, typeof devicePixelRatio < "u" && devicePixelRatio || 1);
    this.canvas.width = Math.round(s * r), this.canvas.height = Math.round(s * r), this.canvas.style.width = `${s}px`, this.canvas.style.height = `${s}px`, this.canvas.style.display = "block", this.renderCurrentFrame(), !this.options.paused && !((e = this.motionObserver) != null && e.getIsReduced()) ? this.start() : this.stop();
  }
  renderFrameAt(t) {
    const s = this.canvas.getContext("2d");
    if (!s) return;
    const r = U(this.canvas), e = r.size ?? this.options.size, n = typeof e == "number" && Number.isFinite(e) && e > 0 ? e : 64, i = Math.min(2, typeof devicePixelRatio < "u" && devicePixelRatio || 1), { mode: c, opts: a } = et(this.options.state, n), h = X[c] || X.orbits, u = this.themeObserver ? this.themeObserver.getResolvedDark() : !0, l = J(u ? r.colorDark ?? "" : r.colorLight ?? "");
    s.setTransform(i, 0, 0, i, 0, 0), s.clearRect(0, 0, n, n);
    const d = Number.isFinite(t) ? t : 0;
    h(s, n, d, u, a, l);
  }
  renderCurrentFrame() {
    var h;
    if ((h = this.motionObserver) != null && h.getIsReduced()) {
      this.renderFrameAt(0.6);
      return;
    }
    const t = U(this.canvas), s = t.size ?? this.options.size, r = typeof s == "number" && Number.isFinite(s) && s > 0 ? s : 64, e = t.speed ?? this.options.speed, n = typeof e == "number" && Number.isFinite(e) ? e : 1, { speed: i } = et(this.options.state, r), c = (i || 1) * n, a = performance.now() / 1e3 * c;
    this.renderFrameAt(a);
  }
  start() {
    var t;
    this.isRunning || this.options.paused || (t = this.motionObserver) != null && t.getIsReduced() || this.isDestroyed || (this.isRunning = !0, this.rafId = requestAnimationFrame(this.loop));
  }
  stop() {
    this.isRunning = !1, this.rafId && (cancelAnimationFrame(this.rafId), this.rafId = 0);
  }
  initIntersectionObserver() {
    typeof IntersectionObserver < "u" && (this.intersectionObserver = new IntersectionObserver(([t]) => {
      this.isVisible = t.isIntersecting, this.isVisible && typeof document < "u" && document.visibilityState !== "hidden" ? this.start() : this.stop();
    }), this.intersectionObserver.observe(this.canvas));
  }
}
export {
  zt as D,
  X as M,
  Bt as O,
  At as R,
  Ct as S,
  Et as T,
  Lt as a,
  et as b,
  U as r
};

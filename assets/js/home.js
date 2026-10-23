/* pointillviz.com · the homepage (an ES module, no dependencies)
 * 0 page scale: above 1440 × 900 the page is drawn k times larger (home.css, section 0)
 * 1 the hero: real cells of four datasets (pointcloud.js), its case dock, readout, colour key,
 *   the names on the cloud, the scale bar, the cell under the pointer, still / play, a case
 *   that is still loading, and a one-time tour of the four cases when the page sits idle
 * 2 the workspace: tabs Data / Views / Analyses, arrow keys across the twelve pictures,
 *   a tab's pictures load when it is hovered, focused or chosen
 * 3 moving pictures: play when on screen, pause off screen, a pause button each
 * 4 the 12 tools and the assistant's 13 MCP tools
 * 5 the section index, entrances below the fold
 * 6 the address: #3d, #atlas, #multiomics name a case; #data, #views, #analyses a tab
 */
import { PointCloud } from './pointcloud.js';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const root = document.documentElement;
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => reduceMQ.matches;
const wideMQ = matchMedia('(min-width: 900px) and (min-height: 500px) and (min-aspect-ratio: 9/10)');
const midMQ = matchMedia('(max-width: 1099.98px)');
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';    // --pv-ease-out

/* ───────────────────────────── 0 · page scale ───────────────────────────── */

let K = 1;
function scale() {
  const w = root.clientWidth || innerWidth;
  K = Math.min(Math.max(Math.min(w / 1440, innerHeight / 900), 1), 1.6);
  root.style.setProperty('--k', K.toFixed(4));
  root.style.setProperty('--dvw', `${(w / K / 100).toFixed(3)}px`);
  return K;
}
scale();

/* ───────────────────────────── 1 · the instrument ───────────────────────── */

// The words for each case (brief/CONTENT.md A3) and the numbers the brief lets us print.
const CASES = {
  '2d': {
    tone: '2d', name: '2D section', noun: '2D section',
    caption: 'Xenium 5K · mouse colon · 135,232 cells',
    short: 'Xenium 5K · mouse colon · 135k cells',
    line: 'Cells, images, outlines and molecules, in place.',
    nums: [[135232, 'cells'], [73, 'cell types']],
    key: 'Top cell types', detail: 'Xenium 5K · mouse colon',
  },
  '3d': {
    tone: '3d', name: '3D volume', noun: '3D volume',
    caption: '3D imaging mass cytometry · HER2⁺ breast carcinoma · 108,486 cells',
    short: '3D IMC · breast carcinoma · 108k cells',
    line: 'Orbit it, cut a slab, select through it.',
    nums: [[108486, 'cells'], [25, 'proteins'], [17, 'cell types']],
    key: 'Cell types', detail: 'HER2⁺ breast carcinoma',
  },
  atlas: {
    tone: 'atlas', name: 'Atlas', noun: 'atlas',
    caption: 'Mouse colon · several sections · [removed] cells',
    short: 'Mouse colon · several sections · [removed] cells',
    line: 'One live montage, statistics over every cell.',
    nums: [[39, 'sections'], [11443143, 'cells']],
    key: 'Top cell types', detail: 'One section',
  },
  multiomics: {
    tone: 'omics', name: 'Multi-omics', noun: 'multi-omics section',
    caption: 'Spatial‑Mux‑seq · mouse brain · 9,686 spots',
    short: 'Spatial‑Mux‑seq · mouse brain · 9,686 spots',
    line: 'Pde10a in RNA, ATAC, H3K27ac and H3K27me3.',
    nums: [[9686, 'spots'], [4, 'modalities']],
    key: 'Four modalities', detail: 'Spatial‑Mux‑seq · mouse brain',
  },
};
const ORDER = ['2d', '3d', 'atlas', 'multiomics'];

const hero = $('.hx');
const stage = $('#hx-stage');
const glBox = $('#hx-gl');
const readout = $('#hx-readout');
const dock = $('#hx-dock');
const status = $('.hx__status', dock);
const capLong = $('[data-r="caption"]', dock);
const capShort = $('[data-r="short"]', dock);
const sayLine = $('[data-r="line"]', dock);
const legend = $('#hx-legend');
const nums = $('#hx-nums');
const keyTitle = $('#hx-keytitle');
const hint = $('#hx-hint');
const scaleBar = $('#hx-scale');
const motion = $('#hx-motion');
const tip = $('#hx-tip');
const live = $('#hx-live');
const groupsBox = $('#hx-groups');
const platesBox = $('#hx-plates');
const washes = $$('.hx__wash > i');
const buttons = $$('.hx__case-btn');
const buttonFor = (id) => buttons.find((b) => b.dataset.state === id);
const fmt = (n) => n.toLocaleString('en-US');

let pc = null;
let shown = '2d';       // the case whose words are on screen: its cells are drawn, or on their way in
let asked = '2d';       // the case pressed last (it may still be loading)
let formed = false;     // the first case has condensed
let quietFor = null;    // a case the tour shows: its arrival is not announced
let manifest = null;
let canvasFocus = false;

// A custom property on the hero is written only when it changes: every write restyles the hero.
const heroVars = new Map();
function setVar(name, value) {
  if (heroVars.get(name) === value) return;
  heroVars.set(name, value);
  hero.style.setProperty(name, value);
}

// New words arrive where the old ones were (one animation each, no forced layout)
function arrive(el, { delay = 0, from = 'translateY(4px)', dur = 300 } = {}) {
  if (reduced() || !el.animate) return;
  el.animate([{ opacity: 0, transform: from }, { opacity: 1, transform: 'none' }], { duration: dur, delay, easing: EASE, fill: 'backwards' });
}
function swap(el, text) {
  if (!el || el.textContent === text) return;
  el.textContent = text;
  arrive(el);
}
const put = (el, text) => { if (el.textContent !== text) el.textContent = text; };

// the counts change to the new case's values (no counting up from zero)
function setNums(id, animate) {
  const c = CASES[id];
  nums.replaceChildren(...c.nums.map(([n, unit]) => {
    const div = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = unit;
    const dd = document.createElement('dd');
    dd.className = 'pv-num';
    dd.textContent = fmt(n);
    div.append(dt, dd);
    return div;
  }));
  if (animate) [...nums.children].forEach((d) => arrive(d));
}

// Every case's words (caption and line) sit unseen under the words on screen, in the same grid
// cell, so the dock is as tall as the longest of them for every case: nothing under it moves
// when the case changes, by tour or by tap. Any room to spare falls under the words.
function reserveWords() {
  const words = $('.hx__words', dock);
  if (!words) return;
  words.after(...ORDER.map((id) => {
    const s = words.cloneNode(true);
    s.classList.add('hx__sizer');
    s.setAttribute('aria-hidden', 'true');
    s.querySelectorAll('[data-r]').forEach((el) => { el.textContent = CASES[id][el.dataset.r]; el.removeAttribute('data-r'); });
    return s;
  }));
}

function legendFor(id, animate = true) {
  const st = manifest && manifest.states.find((s) => s.id === id);
  if (!st) return;
  // a key with long names keeps to one column where the readout is narrow (home.css)
  legend.classList.toggle('hx__legend--long', st.legend.some((l) => l.name.length > 18));
  legend.replaceChildren(...st.legend.map((l) => {
    const li = document.createElement('li');
    const dot = document.createElement('i');
    dot.style.setProperty('--c', l.color);
    li.append(dot, document.createTextNode(l.name));
    if (l.detail) {
      const small = document.createElement('small');
      small.textContent = l.detail;
      li.append(small);
    }
    return li;
  }));
  if (animate) [...legend.children].forEach((li, i) => arrive(li, { delay: i * 30, from: 'translateX(5px)', dur: 360 }));
}

// the case colour under the cloud: two layers, the new one fades in over the old (opacity only)
let washOn = 0;
function washTo(id, instant = false) {
  if (!washes.length) return;
  const next = washes[washOn ^ 1], prev = washes[washOn];
  next.style.setProperty('--c', `var(--pv-case-${CASES[id].tone})`);
  const f = (frames && frames[id]) || frameBase;
  if (f) {
    const s = stage.getBoundingClientRect(), h = hero.getBoundingClientRect();
    const cx = s.left - h.left + (f.left + (s.width - f.right)) / 2;
    const cy = s.top - h.top + (f.top + (s.height - f.bottom)) / 2;
    next.style.setProperty('--x', `${(cx / h.width * 100).toFixed(1)}%`);
    next.style.setProperty('--y', `${(cy / h.height * 100).toFixed(1)}%`);
  }
  if (instant) washes.forEach((w) => { w.style.transition = 'none'; });
  next.classList.add('is-on');
  prev.classList.remove('is-on');
  if (instant) {
    washes.forEach((w) => getComputedStyle(w).opacity);   // take the new opacity without a fade
    washes.forEach((w) => { w.style.transition = ''; });
  }
  washOn ^= 1;
}

// the dock's words for the case on screen
function words(id, animate = true) {
  const c = CASES[id];
  delete status.dataset.case;
  const set = animate ? swap : put;
  set(capLong, c.caption);
  set(capShort, c.short);
  set(sayLine, c.line);
}

function press(id) {
  buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.state === id)));
}

// The case's cells have started to arrive on screen: now its words, counts and key follow.
function describe(id, { first = false, quiet = false } = {}) {
  const c = CASES[id];
  shown = id;
  hero.dataset.case = c.tone;
  washTo(id, first);
  words(id, !first);
  (first ? put : swap)(keyTitle, c.key);
  setNums(id, !first);
  if (!first) legendFor(id);
  if (!first && !quiet) live.textContent = `${c.name}: ${c.caption}. ${c.line}`;
  showHint();
}

function showHint() {
  hint.hidden = !pc || pc.fallback || !(shown === '3d' || canvasFocus);
}

/* A case that is still on its way. The pressed button says so at once (aria-busy); if the
 * wait is long enough to see, its outline fills as the particles arrive and the caption
 * says what is loading. A case that arrives within a moment shows none of this. */
let busyT = 0;
let busyOn = null;
const SVGNS = 'http://www.w3.org/2000/svg';
function ring(b, p) {
  let svg = b.querySelector('.hx__load');
  if (!svg) {
    svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'hx__load');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const r = document.createElementNS(SVGNS, 'rect');
    r.setAttribute('pathLength', '100');
    svg.append(r);
    b.append(svg);
  }
  const cs = getComputedStyle(b), r = svg.firstChild;
  const w = parseFloat(cs.width) || b.offsetWidth, h = parseFloat(cs.height) || b.offsetHeight;   // layout px
  const rad = parseFloat(cs.borderTopLeftRadius) || 10;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  r.setAttribute('x', '0.75');
  r.setAttribute('y', '0.75');
  r.setAttribute('width', String(Math.max(0, w - 1.5)));
  r.setAttribute('height', String(Math.max(0, h - 1.5)));
  r.setAttribute('rx', String(Math.max(0, rad - 0.75)));
  const known = p != null && p > 0.005;
  svg.classList.toggle('is-known', known);
  r.style.strokeDasharray = known ? `${(p * 100).toFixed(1)} 100` : '';
}
function loadingWords(id, p) {
  const t = `Loading the ${CASES[id].noun}…${p > 0.02 && p < 1 ? ` ${Math.round(p * 100)}%` : ''}`;
  put(capLong, t);
  put(capShort, t);
}
function setBusy(id) {
  clearBusy();
  const b = buttonFor(id);
  b.setAttribute('aria-busy', 'true');
  busyT = setTimeout(() => {
    if (asked !== id || !pc || pc.loaded(id)) return;
    busyOn = id;
    const p = pc.progress(id);
    b.classList.add('is-loading');
    dock.classList.add('is-loading');
    status.dataset.case = CASES[id].tone;
    loadingWords(id, p);
    swap(sayLine, CASES[id].line);              // what is on its way, under how far it has come
    ring(b, p);
    live.textContent = `Loading the ${CASES[id].noun}.`;
  }, 160);
}
function clearBusy() {
  clearTimeout(busyT);
  busyOn = null;
  buttons.forEach((b) => { b.removeAttribute('aria-busy'); b.classList.remove('is-loading'); });
  dock.classList.remove('is-loading');
}
function onProgress(id, p) {
  if (id !== busyOn) return;
  loadingWords(id, p);
  ring(buttonFor(id), p);
}
let failT = 0;
function failed(id) {
  if (asked !== id) return;
  clearBusy();
  asked = shown;
  press(shown);
  writeHash(CASE_HASH[shown]);
  const msg = `The ${CASES[id].noun} did not load. Try again.`;
  status.dataset.case = CASES[id].tone;
  put(capLong, msg);
  put(capShort, msg);
  live.textContent = msg;
  clearTimeout(failT);
  failT = setTimeout(() => { if (!busyOn && asked === shown) words(shown, false); }, 4000);
}

// The visitor (or the tour) picks a case. The button answers at once; the words follow the cells.
function choose(id, { touring = false } = {}) {
  if (!pc || id === asked || !CASES[id]) return;
  if (!touring) { endTour(); writeHash(CASE_HASH[id]); }
  quietFor = touring ? id : null;
  asked = id;
  press(id);
  clearBusy();
  clearTimeout(failT);
  if (id === shown) words(id, false);                         // back to the case on screen
  else if (!pc.fallback && !pc.loaded(id)) setBusy(id);
  pc.setState(id).then((done) => {
    if (done) { drawScale(pc); placeGroups(pc); placePlates(pc); }
  }).catch((err) => { console.warn(err); failed(id); });
}

// A visitor who saves data (Save-Data, or a 2G connection) gets a case only when they ask for it.
const saveData = () => {
  const c = navigator.connection;
  return !!(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
};

// The other cases load in the background, one at a time, in the dock's order; a pointer on a
// case moves it to the front, a click loads it at once (pointcloud.js). Nothing loads ahead for
// a visitor who saves data: a click is the only ask.
function warm(id, first = false) {
  if (!pc || pc.fallback || saveData()) return;
  pc.prefetch(id ? [id] : ORDER, { first });
}
const whenIdle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 800));

// the first case has formed: load the others when the page is idle (on a phone nothing points
// at the dock before a tap), unless the visitor is saving data; then the tour may start
function afterIntro() {
  formed = true;
  if (pc && !pc.fallback && !saveData()) whenIdle(() => warm());
  armTour();
}

// Where the cloud may draw: right of the copy, from under the top bar down to the dock, above a
// strip for still / play, the 3D hint and the scale bar. On most wide windows the readout sits
// under the copy, beside the dock, and the cloud runs to the page's edge; on short ones it is a
// column at the top right, and the cloud keeps clear of it. A state may have its own rect: the
// multi-omics plates keep room for their names on the right, the atlas above its rows.
let frameBase = null;
let frames = null;
const topbar = $('.pv-topbar');
function frameFor() {
  const s = stage.getBoundingClientRect();
  if (!s.width || !s.height) return null;
  const h = hero.getBoundingClientRect();
  const wide = wideMQ.matches;
  const stripH = Math.round((wide ? (innerHeight <= 640 ? 26 : 30) : 34) * K);
  let f, strip;
  if (wide) {
    const copy = $('.hx__copy').getBoundingClientRect();
    const d = dock.getBoundingClientRect();
    const ro = readout.getBoundingClientRect();
    const side = ro.width > 0 && ro.left >= copy.right;      // the readout beside the cloud
    const barBottom = topbar.getBoundingClientRect().bottom;
    setVar('--copy-r', `${Math.round(copy.right - h.left)}px`);
    f = {
      left: Math.round(copy.right - s.left + 32 * K),
      right: Math.round(Math.max(8, side ? s.right - ro.left + 24 * K : s.right - d.right)),
      top: Math.round(Math.max(8, barBottom - s.top + 12)),
      bottom: Math.round(Math.max(8, s.bottom - d.top + 10 * K + stripH)),
    };
    strip = { l: f.left, r: f.right, t: Math.round(s.height - f.bottom) };
  } else {
    // stacked: the strip lines up with the page's column (the dock's edges)
    const d = dock.getBoundingClientRect();
    f = { left: 8, right: 8, top: 10, bottom: stripH + 4 };
    strip = { l: Math.round(d.left - s.left), r: Math.round(s.right - d.right), t: Math.round(s.height - stripH - 2) };
  }
  frameBase = f;
  frames = {
    multiomics: { ...f, right: f.right + Math.round((wide ? 92 : 78) * K) },
    atlas: { ...f, top: f.top + Math.round(18 * K) },
  };
  // the same rect for the focus ring and the still; the strip under it
  setVar('--f-l', `${f.left}px`);
  setVar('--f-t', `${f.top}px`);
  setVar('--f-r', `${f.right}px`);
  setVar('--f-b', `${f.bottom}px`);
  setVar('--s-l', `${strip.l}px`);
  setVar('--s-r', `${strip.r}px`);
  setVar('--s-t', `${strip.t}px`);
  setVar('--strip-h', `${stripH}px`);
  hero.classList.add('is-framed');       // the strip shows once it is in place (home.css)
  return f;
}

// The atlas's condition groups, each named over its first tile.
function placeGroups(p) {
  const a = p.anchors ? p.anchors() : [];
  const on = a.length > 0 && !p._settling;
  groupsBox.classList.toggle('is-on', on);
  if (!a.length) return;
  if (groupsBox.childElementCount !== a.length) {
    groupsBox.replaceChildren(...a.map((g) => {
      const span = document.createElement('span');
      span.style.setProperty('--g', g.accent);
      span.textContent = g.label;
      return span;
    }));
  }
  a.forEach((g, k) => {
    groupsBox.children[k].style.transform = `translate(${g.x.toFixed(1)}px, calc(${g.y.toFixed(1)}px - 100%))`;
  });
}

// The multi-omics plates, each named beside its right-hand corner, in its colour (Fig. 1e).
function placePlates(p) {
  const a = p.plateAnchors ? p.plateAnchors() : [];
  platesBox.classList.toggle('is-on', a.length > 0 && !p._settling);
  if (!a.length) return;
  if (platesBox.childElementCount !== a.length) {
    platesBox.replaceChildren(...a.map((pl) => {
      const span = document.createElement('span');
      span.style.setProperty('--g', pl.hue);
      span.textContent = pl.name;
      return span;
    }));
  }
  a.forEach((pl, k) => {
    const c = pl.corners.reduce((b, q) => (q.x > b.x ? q : b), pl.corners[0]);
    platesBox.children[k].style.transform = `translate(${(c.x + 14 * K).toFixed(1)}px, calc(${c.y.toFixed(1)}px - 50%))`;
  });
}

// A scale bar from the view's µm per pixel (not for the 3D volume's perspective).
const NICE = [10, 20, 50, 100, 200, 250, 500, 1000, 2000, 5000];
function drawScale(p) {
  const um = p.umPerPixel && p.umPerPixel();
  if (!um || p.state === '3d' || p._settling || p.fallback) { scaleBar.dataset.off = ''; return; }
  const target = 80 * K * um;
  const v = NICE.reduce((b, n) => (Math.abs(n - target) < Math.abs(b - target) ? n : b), NICE[0]);
  delete scaleBar.dataset.off;
  const w = `${(v / um).toFixed(1)}px`;
  const bar = scaleBar.querySelector('i');
  if (bar.style.width !== w) bar.style.width = w;
  const label = v >= 1000 ? `${v / 1000} mm` : `${v} µm`;
  const span = scaleBar.querySelector('span');
  if (span.textContent !== label) span.textContent = label;
}

function showTip(info) {
  if (!info) { tip.classList.remove('is-on'); return; }
  const c = CASES[info.state];
  tip.querySelector('i').style.setProperty('--c', info.color);
  tip.querySelector('b span').textContent = info.name;
  // words only: the brief lets the page print no further numbers
  let detail = c.detail;
  if (info.state === 'atlas' && info.detail) detail = info.detail.replace(/ · .*$/, ' · atlas');
  if (info.state === 'multiomics') detail = (info.detail.match(/, ([^,]+)$/) || [, c.detail])[1];
  tip.querySelector('small').textContent = detail;
  const s = stage.getBoundingClientRect(), h = hero.getBoundingClientRect();
  let x = s.left - h.left + info.x + 14, y = s.top - h.top + info.y - 18;
  const w = tip.offsetWidth || 160;
  if (x + w > h.width - 12) x = s.left - h.left + info.x - w - 14;
  tip.style.setProperty('--tx', `${Math.round(x)}px`);
  tip.style.setProperty('--ty', `${Math.round(y)}px`);
  tip.classList.add('is-on');
}

function stillMode() {
  hero.classList.add('is-still');
  scaleBar.dataset.off = '';
  motion.hidden = true;
  hint.hidden = true;
  $('#hx-fallback').hidden = false;
}

function showStill() {
  // the manifest could not be read: the 2D poster, in the cloud's own rect
  const img = document.createElement('img');
  img.src = 'assets/data/hero/poster-2d.webp';
  img.alt = 'Still image of a Xenium 5K mouse colon section, 135,232 cells coloured by 73 cell types';
  $('#hx-still').append(img);
  stillMode();
  buttons.forEach((b) => { b.disabled = true; });
}

// still / play for the idle sway and the tour (WCAG 2.2.2); a morph a visitor asks for still runs
let swayOn = true;
function setMotionButton() {
  motion.dataset.state = swayOn ? 'playing' : 'paused';
  motion.setAttribute('aria-label', swayOn ? 'Pause the motion' : 'Play the motion');
}
function initMotion() {
  const update = () => { motion.hidden = !pc || pc.fallback || reduced(); };
  update();
  setMotionButton();
  motion.addEventListener('click', () => {
    swayOn = !swayOn;
    pc.setIdle(swayOn);
    setMotionButton();
    if (!swayOn) endTour();
  });
  reduceMQ.addEventListener('change', update);
}

/* A one-time tour. When the page has sat still for 5 s with the cloud in view, the cloud steps
 * through 3D, the atlas and multi-omics and back to the 2D section, 4 s a stop, so the cases
 * show without a click. Any pointer, key, wheel, touch or scroll stops it for good, as do the
 * pause control, a hidden tab and reduced motion. A link to a case (#3d) skips it, and so does
 * saving data: the tour would download the three other cases unasked. */
const TOUR = ['3d', 'atlas', 'multiomics', '2d'];
const tour = { on: false, done: false, seen: false, idleT: 0, stepT: 0, i: 0, wait: 0 };
function armTour() {
  clearTimeout(tour.idleT);
  if (tour.done || tour.on || !formed) return;
  tour.idleT = setTimeout(startTour, 5000);
}
function tourCan() {
  return !tour.done && formed && pc && !pc.fallback && !reduced() && !saveData() && swayOn && !document.hidden
    && tour.seen && asked === '2d' && shown === '2d' && !canvasFocus;
}
function startTour() {
  if (!tourCan()) { armTour(); return; }
  tour.on = true;
  tour.i = 0;
  tour.wait = 0;
  hero.classList.add('is-touring');
  tourStep();
}
function tourStep() {
  if (!tour.on) return;
  const id = TOUR[tour.i];
  if (!id) { endTour(); return; }
  if (!pc.loaded(id)) {
    // on its way in the background: wait a little, and give up rather than show a loading state
    // (or at once if the visitor has started to save data: nothing loads for the tour then)
    if (saveData()) { endTour(); return; }
    warm(id, true);
    if (++tour.wait > 25) { endTour(); return; }
    tour.stepT = setTimeout(tourStep, 400);
    return;
  }
  tour.wait = 0;
  tour.i += 1;
  choose(id, { touring: true });
  if (tour.i >= TOUR.length) endTour();
  else tour.stepT = setTimeout(tourStep, 4000);
}
function endTour() {
  clearTimeout(tour.idleT);
  clearTimeout(tour.stepT);
  tour.done = true;
  if (tour.on) { tour.on = false; hero.classList.remove('is-touring'); }
}
function initTour() {
  const h = readHash();
  // no tour for a link to a case or a tab, or for a visitor who saves data
  if (reduced() || !pc || pc.fallback || saveData() || h.kase || h.tab >= 0) { tour.done = true; return; }
  // before it starts, input only restarts the quiet time; once it runs, input ends it
  const input = () => { if (tour.done) return; if (tour.on) endTour(); else armTour(); };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((t) => addEventListener(t, input, { capture: true, passive: true }));
  let last = null;
  addEventListener('pointermove', (e) => {
    if (tour.done) return;
    if (last && Math.abs(e.clientX - last[0]) + Math.abs(e.clientY - last[1]) < 6) return;
    last = [e.clientX, e.clientY];
    input();
  }, { passive: true });
  addEventListener('scroll', () => {
    if (tour.done) return;
    if (scrollY > hero.offsetHeight * 0.35) { endTour(); return; }   // gone on down the page
    input();
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (tour.done) return;
    if (document.hidden) { if (tour.on) endTour(); else clearTimeout(tour.idleT); } else armTour();
  });
  reduceMQ.addEventListener('change', () => { if (reduced()) endTour(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      tour.seen = e.intersectionRatio >= 0.6;
      if (!tour.seen && tour.on) endTour();
    }, { threshold: [0, 0.6, 1] }).observe(stage);
  } else {
    tour.seen = true;
  }
  armTour();
}

async function initHero() {
  const first = readHash().kase || '2d';
  shown = first;
  asked = first;
  reserveWords();
  press(first);
  describe(first, { first: true });
  let raf = 0;
  const refit = (glide = 360) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const f = frameFor();
      if (pc && f) pc.setFrame(f, { frames, glide: reduced() ? 0 : glide });
    });
  };
  // the dock rises a few pixels into place as the page loads (hx-in, which hx-settled may cut
  // short): measure again once it is there
  const settled = (e) => {
    if (e.target !== dock) return;
    ['animationend', 'animationcancel'].forEach((t) => dock.removeEventListener(t, settled));
    refit();
  };
  ['animationend', 'animationcancel'].forEach((t) => dock.addEventListener(t, settled));
  try {
    pc = await PointCloud.mount(glBox, {
      manifestUrl: 'assets/data/hero/manifest.json',
      state: first,
      background: 'transparent',
      backgroundLift: 0,
      preload: 'first',
      introDuration: 1250,
      introAlpha: 0.32,
      posterHost: $('#hx-still'),            // no WebGL: the still sits in the cloud's own rect
      frame: frameFor(),
      frames,
      onReady: (p) => {
        manifest = p.manifest;
        legendFor(p.state, false);
        hero.classList.add('is-ready');
        washTo(shown, true);                  // the wash under the cloud's own rect
        if (p.fallback) {
          // the still is in the cloud's own rect; the cases swap stills. If the head preloaded
          // the first case's particles (WebGL2 exists but could not start), take them from the
          // preload, so the browser does not flag it as unused (no second download).
          stillMode();
          const pre = document.querySelector('link[rel="preload"][as="fetch"][href$=".bin"]');
          if (pre) fetch(pre.href).catch(() => {});
        }
      },
      onState: (id, phase) => {
        if (!pc) return;
        pc._settling = phase === 'start';
        if (phase === 'start') {
          showTip(null);
          clearBusy();
          if (id !== shown) describe(id, { quiet: quietFor === id });
        } else if (!formed) {
          afterIntro();
        }
      },
      onProgress,
      onHover: showTip,
      onFrame: (p) => { drawScale(p); placeGroups(p); placePlates(p); },
    });
  } catch (err) {
    console.warn(err);
    showStill();
    return;
  }
  manifest = pc.manifest;
  window.__home = { pc, frameFor, frames: () => frames, tour };   // for the page's own checks
  showHint();
  initMotion();
  initTour();
  if (pc.fallback || reduced()) afterIntro();     // no intro to wait for

  const cv = glBox.querySelector('canvas');
  if (cv) {
    cv.setAttribute('aria-describedby', 'hx-alt hx-keys');
    cv.addEventListener('focus', () => {
      canvasFocus = cv.matches(':focus-visible');
      hero.classList.toggle('is-focus', canvasFocus);
      showHint();
    });
    cv.addEventListener('blur', () => { canvasFocus = false; hero.classList.remove('is-focus'); showHint(); });
  }

  // a mouse over the dock is a visitor reaching for the cases (a finger's tap is the click itself)
  dock.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') warm(); }, { passive: true });
  // so is keyboard focus on a case. A tap also focuses the button, just before its click; a
  // background start there would hold the case the visitor asked for at low priority.
  dock.addEventListener('focusin', (e) => {
    const b = e.target.closest('.hx__case-btn');
    if (b && b.matches(':focus-visible')) warm(b.dataset.state, true);
  });
  buttons.forEach((b) => {
    b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') warm(b.dataset.state, true); }, { passive: true });
    b.addEventListener('click', () => choose(b.dataset.state));
  });

  addEventListener('resize', () => { scale(); refit(); });
  wideMQ.addEventListener('change', () => refit(0));
  midMQ.addEventListener('change', () => refit(0));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => refit());
  if ('ResizeObserver' in window) {
    // refit only when the cloud's room changes: the copy's width, the dock's size, the readout's
    // width (its height follows the colour key of each case and does not move the cloud)
    const seen = new Map();
    const ro = new ResizeObserver((entries) => {
      let moved = false;
      entries.forEach((e) => {
        const w = Math.round(e.contentRect.width), h = Math.round(e.contentRect.height);
        const key = e.target === dock ? `${w}x${h}` : `${w}`;
        if (seen.get(e.target) !== key) { seen.set(e.target, key); moved = true; }
      });
      if (moved) refit();
    });
    [$('.hx__copy'), readout, dock].forEach((el) => el && ro.observe(el));
  }
}

/* ───────────────────────────── 2 · the workspace ────────────────────────── */

const tabs = $$('.wk__tab');
const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));

// a tab's pictures load when its tab is hovered, focused or chosen (none before)
function warmPanel(panel) {
  if (!panel || panel._warm) return;
  panel._warm = true;
  $$('img[loading="lazy"]', panel).forEach((img) => { img.loading = 'eager'; });
}

function initTabs() {
  tabs.forEach((t, i) => {
    t.addEventListener('pointerenter', () => warmPanel(panels[i]), { passive: true });
    t.addEventListener('focus', () => warmPanel(panels[i]));
  });
  document.addEventListener('pv:tabchange', (e) => {
    const tab = e.detail && e.detail.tab;
    const panel = tab && document.getElementById(tab.getAttribute('aria-controls'));
    if (!panel || !panel.classList.contains('wk__panel')) return;
    warmPanel(panel);
    rovingTiles();
    writeHash(TAB_HASH[tabs.indexOf(tab)]);
    if (reduced()) return;
    $$(':scope > .wk-tile', panel).forEach((t, i) => arrive(t, { delay: i * 45, from: 'translateY(8px) scale(0.99)', dur: 420 }));
  });
}

// Arrow keys move across the twelve pictures; past the last of a group they open the next.
const tileIndex = (panel) => $$(':scope > .wk-tile', panel);
function rovingTiles(focusTile) {
  panels.forEach((p) => tileIndex(p).forEach((t) => { t.tabIndex = -1; }));
  const open = panels.find((p) => !p.hidden) || panels[0];
  const list = tileIndex(open);
  const target = focusTile && list.includes(focusTile) ? focusTile : list[0];
  if (target) target.tabIndex = 0;
  return target;
}
function initTileKeys() {
  rovingTiles();
  panels.forEach((panel, pi) => panel.addEventListener('keydown', (e) => {
    const tile = e.target.closest('.wk-tile');
    if (!tile || e.target !== tile) return;
    const list = tileIndex(panel);
    const i = list.indexOf(tile);
    let to = null, toPanel = pi;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      if (i < list.length - 1) to = i + 1; else { toPanel = (pi + 1) % panels.length; to = 0; }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (i > 0) to = i - 1; else { toPanel = (pi + panels.length - 1) % panels.length; to = -1; }
    } else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = list.length - 1;
    if (to === null) return;
    e.preventDefault();
    if (toPanel !== pi) {
      tabs[toPanel].click();                    // pv.js shows the panel and moves the bar
      const next = tileIndex(panels[toPanel]);
      const t = next[to < 0 ? next.length - 1 : to];
      rovingTiles(t);
      requestAnimationFrame(() => t && t.focus());
    } else {
      const t = list[to];
      rovingTiles(t);
      t.focus();
    }
  }));
}

/* ───────────────────────────── 3 · moving pictures ──────────────────────── */

function initClips() {
  const vids = $$('video.wk-vid');
  if (!vids.length) return;
  const state = new Map(vids.map((v) => [v, { seen: false, user: null }]));

  const button = (v) => v.parentElement.querySelector('.wk-play');
  const label = (v) => {
    const b = button(v);
    if (!b) return;
    const playing = !v.paused;
    b.dataset.state = playing ? 'playing' : 'paused';
    b.setAttribute('aria-label', playing ? 'Pause the clip' : 'Play the clip');
  };
  const update = (v) => {
    const s = state.get(v);
    const panel = v.closest('[role="tabpanel"]');
    const shownPanel = !panel || !panel.hidden;
    const auto = s.user === null ? !reduced() : s.user;
    const want = s.seen && shownPanel && auto && !document.hidden;
    if (want) {
      if (!v.getAttribute('src')) { v.src = v.dataset.src; v.preload = 'auto'; }
      const p = v.play();
      if (p && p.catch) p.catch(() => label(v));
    } else if (!v.paused) {
      v.pause();
    }
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      state.get(e.target).seen = e.isIntersecting && e.intersectionRatio >= 0.2;
      update(e.target);
    });
  }, { threshold: [0, 0.2, 0.6] });

  vids.forEach((v) => {
    v.addEventListener('playing', () => { v.classList.add('is-playing'); label(v); });
    v.addEventListener('pause', () => label(v));
    const b = button(v);
    if (b) {
      b.hidden = false;
      b.addEventListener('click', () => {
        const s = state.get(v);
        s.user = v.paused;                      // a press is the visitor's choice, kept
        if (s.user) s.seen = true;
        update(v);
        label(v);
      });
    }
    label(v);
    io.observe(v);
  });
  document.addEventListener('visibilitychange', () => vids.forEach(update));
  document.addEventListener('pv:tabchange', () => requestAnimationFrame(() => vids.forEach(update)));
  reduceMQ.addEventListener('change', () => vids.forEach(update));
}

/* ───────────────────────────── 4 · tools, assistant ─────────────────────── */

function initTools() {
  const rail = $('#ex-rail');
  const q = $('#ex-q');
  if (!rail) return;
  const prev = $('.ex__rail-btn[data-rail="-1"]');
  const next = $('.ex__rail-btn[data-rail="1"]');
  const tools = $$('.ex__tool', rail);
  const say = (a, lit = true) => {
    tools.forEach((t) => t.classList.toggle('is-on', lit && t === a));
    q.replaceChildren();
    const b = document.createElement('b');
    b.textContent = a.querySelector('.ex__tool-name').textContent;
    q.append(b, document.createTextNode(` · ${a.dataset.q}`));
  };
  tools.forEach((a) => {
    a.addEventListener('pointerenter', () => say(a));
    a.addEventListener('focus', () => {
      say(a);
      // a card reached by keyboard comes fully into the rail's view
      const r = a.getBoundingClientRect(), rr = rail.getBoundingClientRect();
      if (r.left < rr.left || r.right > rr.right) a.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
    });
  });
  say(tools[0], false);

  // the rail fades at an edge with more cards behind it; the left fade ends where the first whole
  // card starts (a snapped card starts 40 px in, the rail's end may leave it nearer the edge)
  const items = $$(':scope > li', rail);
  let fadeL = '';
  const ends = () => {
    const x = rail.scrollLeft;
    const max = rail.scrollWidth - rail.clientWidth - 2;
    prev.disabled = x <= 2;
    next.disabled = x >= max;
    rail.classList.toggle('can-l', !prev.disabled);
    rail.classList.toggle('can-r', !next.disabled);
    const first = items.find((li) => li.offsetLeft - x >= -1);
    const f = `${first ? Math.max(12, Math.min(40, Math.round(first.offsetLeft - x))) : 40}px`;
    if (f !== fadeL) { fadeL = f; rail.style.setProperty('--fade-l', f); }
  };
  [prev, next].forEach((b) => b.addEventListener('click', () => {
    const dir = Number(b.dataset.rail);
    rail.scrollBy({ left: dir * rail.clientWidth * 0.82, behavior: reduced() ? 'auto' : 'smooth' });
  }));
  rail.addEventListener('scroll', ends, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(ends).observe(rail);
  ends();
}

function initRing() {
  const ring = $('.ex__ring');
  if (!ring) return;
  const rows = $$('.ex__group');
  const GROUP = { see: 'See', do: 'Do', steer: 'Steer', show: 'Show' };
  const COLOR = { see: '#5B8CFF', do: '#FF8A3D', steer: '#A77BFF', show: '#6FE0BD' };
  const focusGroup = (g) => {
    if (g) ring.dataset.focus = g; else delete ring.dataset.focus;
    rows.forEach((li) => li.classList.toggle('is-on', li.dataset.g === g));
  };
  rows.forEach((li) => {
    li.addEventListener('pointerenter', () => focusGroup(li.dataset.g));
    li.addEventListener('pointerleave', () => { if (!picked) focusGroup(null); });
  });
  // each of the 13 points is one MCP tool, a button: point at it, tap it or focus it
  const pick = $('.ex__ring-pick', ring);
  const pts = $$('.ex__pt', ring);
  let picked = null;
  const show = (pt) => {
    if (picked) picked.classList.remove('is-pick');
    picked = pt;
    if (!pt) { delete ring.dataset.pick; focusGroup(null); return; }
    const g = pt.dataset.g;
    pt.classList.add('is-pick');
    ring.dataset.pick = '';
    pick.style.setProperty('--g', COLOR[g]);
    pick.querySelector('i').textContent = GROUP[g];
    pick.querySelector('code').textContent = pt.textContent.replace(/_/g, '_​');   // breaks at the underscores
    focusGroup(g);
  };
  pts.forEach((pt, i) => {
    pt.setAttribute('aria-label', `${pt.textContent} (${GROUP[pt.dataset.g]})`);
    pt.tabIndex = i === 0 ? 0 : -1;
    pt.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(pt); });
    pt.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && document.activeElement !== pt) show(null); });
    // a tap focuses the point before its click: decide from the state before the press
    let down = null;
    pt.addEventListener('pointerdown', () => { down = { was: picked === pt, at: performance.now() }; });
    pt.addEventListener('click', () => {
      const fromPointer = down && performance.now() - down.at < 1500;
      show(fromPointer && down.was ? null : pt);
      down = null;
    });
    pt.addEventListener('focus', () => { pts.forEach((o) => { o.tabIndex = o === pt ? 0 : -1; }); show(pt); });
    pt.addEventListener('blur', () => { if (picked === pt) show(null); });
    pt.addEventListener('keydown', (e) => {
      const n = pts.length;
      const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      pts[(to + n) % n].focus();
    });
  });
}

/* ───────────────────────────── 5 · section index, entrances ─────────────── */

function initIndex() {
  const nav = $('#sx');
  if (!nav) return;
  const secs = ['#top', '#workspace', '#extend'].map((s) => $(s));
  const dots = $$('.sx__dot', nav);
  const [up, down] = $$('.sx__step', nav);
  let at = -1;
  const where = () => {
    const line = innerHeight * 0.4;
    let k = 0;
    secs.forEach((s, i) => { if (s.getBoundingClientRect().top <= line) k = i; });
    return k;
  };
  const sync = () => {
    const k = where();
    const end = innerHeight + scrollY >= root.scrollHeight - 4;
    up.disabled = k === 0 && scrollY < 4;
    down.disabled = k === secs.length - 1 || end;
    if (k === at) return;
    at = k;
    dots.forEach((d, i) => { if (i === k) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
  };
  const go = (k) => {
    k = Math.max(0, Math.min(secs.length - 1, k));
    const behavior = reduced() ? 'auto' : 'smooth';
    if (k === 0) scrollTo({ top: 0, behavior });
    else secs[k].scrollIntoView({ behavior, block: 'start' });
  };
  up.addEventListener('click', () => go(where() - (where() > 0 && secs[where()].getBoundingClientRect().top < -8 ? 0 : 1)));
  down.addEventListener('click', () => go(where() + 1));
  let tick = 0;
  addEventListener('scroll', () => { if (!tick) tick = requestAnimationFrame(() => { tick = 0; sync(); }); }, { passive: true });
  addEventListener('resize', sync);
  sync();
}

/* Entrances below the fold. Nothing is hidden at load: a block is armed only when the
 * visitor first scrolls and it is still wholly below the screen, so the page reads complete
 * without script, in a full-page capture, and under reduced motion. */
function initReveals() {
  $$('.ex__gate-list .pv-gate').forEach((g, i) => g.style.setProperty('--gi', i));
  if (reduced() || !('IntersectionObserver' in window)) return;
  const items = [...$$('[data-reveal]'), $('.ex__ring')].filter(Boolean);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target;
      if (el.classList.contains('ex__ring')) {
        el.classList.add('is-lit');
        setTimeout(() => el.classList.add('is-done'), 1400);
      } else {
        el.classList.add('is-in');
        setTimeout(() => el.classList.remove('is-armed', 'is-in'), 1600);   // back to plain
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
  const arm = () => {
    const vh = innerHeight;
    items.forEach((el) => {
      if (el.getBoundingClientRect().top < vh) return;   // in view or above: leave it alone
      if (el.matches('[data-reveal="stagger"]')) [...el.children].forEach((c, i) => c.style.setProperty('--i', Math.min(i, 6)));
      el.classList.add(el.classList.contains('ex__ring') ? 'is-armed-ring' : 'is-armed');
      io.observe(el);
    });
  };
  addEventListener('scroll', arm, { passive: true, once: true });
}

/* ───────────────────────────── 6 · the address ──────────────────────────── */

// A case or a tab can be linked to (a talk, a post): the address follows the visitor's choice,
// without adding history entries. The 2D section is the page's own address.
const CASE_HASH = { '2d': '', '3d': '3d', atlas: 'atlas', multiomics: 'multiomics' };
const TAB_HASH = ['data', 'views', 'analyses'];
function readHash() {
  let h = '';
  try { h = decodeURIComponent(location.hash.slice(1)).toLowerCase(); } catch (e) { /* malformed */ }
  const kase = h && Object.keys(CASE_HASH).find((k) => CASE_HASH[k] === h);
  return { kase: kase || null, tab: TAB_HASH.indexOf(h) };
}
function writeHash(h = '') {
  if ((h ? `#${h}` : '') === location.hash) return;
  try { history.replaceState(history.state, '', h ? `#${h}` : location.pathname + location.search); } catch (e) { /* sandboxed */ }
}
function openTab(i, scroll) {
  if (i < 0 || !tabs[i]) return;
  if (tabs[i].getAttribute('aria-selected') !== 'true') tabs[i].click();
  if (scroll) $('#workspace').scrollIntoView({ block: 'start' });
}
function initAddress() {
  const { tab } = readHash();
  if (tab >= 0) openTab(tab, scrollY < 4);
  addEventListener('hashchange', () => {
    const h = readHash();
    if (h.kase) choose(h.kase);
    else if (h.tab >= 0) openTab(h.tab, true);
  });
}

setTimeout(() => root.classList.add('hx-settled'), 700);
initClips();
initTabs();
initTileKeys();
initTools();
initRing();
initIndex();
initReveals();
initAddress();
initHero();

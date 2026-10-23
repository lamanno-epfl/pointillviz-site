/* pointillviz.com · the homepage (an ES module, no dependencies)
 * 0 page scale: above 1440 × 900 the page is drawn k times larger (home.css, section 0)
 * 1 the hero: six cases as colour fields (2D, 3D, atlas, multi-omics, the assistant, the
 *   store), one open at a time; real cells of the four datasets (pointcloud.js) fly into the
 *   open field; the names on the cloud, the scale bar, the cell under the pointer, still /
 *   play, a case that is still loading, and a one-time tour of the six when the page sits idle
 * 2 the workspace: tabs Data / Views / Analyses, arrow keys across the twelve pictures,
 *   a tab's pictures load when it is hovered, focused or chosen
 * 3 moving pictures: play when on screen, pause off screen, a pause button each
 * 4 the 12 tools and the assistant's 13 MCP tools
 * 5 the section index, entrances below the fold
 * 6 the address: #3d, #atlas, #multiomics, #assistant, #tool-store name a case; #data,
 *   #views, #analyses a tab
 */
import { PointCloud } from './pointcloud.js';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const root = document.documentElement;
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => reduceMQ.matches;
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

/* ───────────────────────────── 1 · the six cases ───────────────────────── */

// The six cases, in the deck's order. Four draw real cells (pointcloud.js); the assistant and
// the store are pages of their own. A tab names its case and nothing more: no dataset details
// and no numbers (HOMEPAGE_CHANGES items 1–3); each case's line is in its panel.
const ORDER = ['2d', '3d', 'atlas', 'multiomics', 'ai', 'store'];
const DATA = new Set(['2d', '3d', 'atlas', 'multiomics']);
const TONE = { '2d': '2d', '3d': '3d', atlas: 'atlas', multiomics: 'omics', ai: 'ai', store: 'store' };
const NOUN = { '2d': '2D section', '3d': '3D volume', atlas: 'atlas', multiomics: 'multi-omics section' };
const POSTER = (id) => `assets/data/hero/poster-${id}.webp`;

const hero = $('.hx');
const deck = $('#hx-deck');
const stage = $('#hx-stage');
const glBox = $('#hx-gl');
const tablist = $('.hx__tabs');
const hint = $('#hx-hint');
const scaleBar = $('#hx-scale');
const motion = $('#hx-motion');
const tip = $('#hx-tip');
const live = $('#hx-live');
const groupsBox = $('#hx-groups');
const platesBox = $('#hx-plates');
const caseTabs = $$('.hx__tab');
const cols = $$('.hx__col');
const tabFor = (id) => caseTabs.find((b) => b.dataset.state === id);
const colFor = (id) => cols.find((c) => c.dataset.state === id);
const nameOf = (id) => tabFor(id).querySelector('.hx__name').textContent;
const lineOf = (id) => colFor(id).querySelector('.hx__say').textContent;
// side by side (columns) on wide windows, stacked (rows) on phones and portrait screens
const colsMQ = matchMedia('(min-width: 900px) and (min-aspect-ratio: 1/1)');

let pc = null;
let open = '2d';        // the case whose field is open
let drawn = '2d';       // the data case whose cells are drawn, or on their way in
let formed = false;     // the first case has condensed
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

/* -- geometry ----------------------------------------------------------------- */

// A probe holds the CSS's own sizes: a stripe (--hx-stripe) and the open case's head, so the
// script reads them as the layout resolves them, at every breakpoint and page scale.
let probe = null;
function sizes() {
  if (!probe) {
    probe = document.createElement('span');
    probe.className = 'hx__probe';
    probe.setAttribute('aria-hidden', 'true');
    deck.append(probe);
  }
  const p = probe.getBoundingClientRect();
  return { stripe: p.width || 52, head: p.height || 86 };
}

// The rect a case's field takes once a switch has settled, in px of the deck: every case before
// it is a stripe, and it takes the rest. Nothing is measured on the moving columns.
function geometry(id) {
  const r = deck.getBoundingClientRect();
  const { stripe, head } = sizes();
  const across = colsMQ.matches;
  const i = ORDER.indexOf(id);
  const size = (across ? r.width : r.height) - (ORDER.length - 1) * stripe;
  const o = across ? { x: i * stripe, y: 0, w: size, h: r.height } : { x: 0, y: i * stripe, w: r.width, h: size };
  return { W: r.width, H: r.height, head, across, o };
}

// Where a data case's cells rest: its open field, under its name and line, above a strip for
// still / play, the 3D hint and the scale bar. The multi-omics plates keep room for their names
// on the right, the atlas above its rows. The same rect places the focus ring and the still.
// The cells start under the case's line, however many lines it wraps to: its bottom is read
// inside its panel, whose own layout is final even while its field is still opening.
function headOf(id, g) {
  const say = colFor(id).querySelector('.hx__say');
  const panel = say && say.closest('.hx__panel');
  if (!panel) return g.head;
  const b = say.getBoundingClientRect().bottom - panel.getBoundingClientRect().top;
  return Math.max(g.head, Math.round(b + 12 * K));
}
function place(id) {
  const g = geometry(id), o = g.o, k = K;
  const stripH = Math.round(30 * k);
  const padX = Math.round((g.across ? 22 : 10) * k);
  const f = {
    left: Math.round(o.x + padX),
    right: Math.round(g.W - (o.x + o.w) + padX),
    top: Math.round(o.y + headOf(id, g)),
    bottom: Math.round(g.H - (o.y + o.h) + stripH + 14 * k),
  };
  if (id === 'multiomics') f.right += Math.round((g.across ? 96 : 80) * k);
  if (id === 'atlas') f.top += Math.round(16 * k);
  setVar('--f-l', `${f.left}px`);
  setVar('--f-t', `${f.top}px`);
  setVar('--f-r', `${f.right}px`);
  setVar('--f-b', `${f.bottom}px`);
  const sx = Math.round((g.across ? 16 : 10) * k);
  setVar('--s-l', `${Math.round(o.x + sx)}px`);
  setVar('--s-r', `${Math.round(g.W - (o.x + o.w) + sx)}px`);
  setVar('--s-t', `${Math.round(o.y + o.h - stripH - 10 * k)}px`);
  hero.classList.add('is-framed');       // the strip shows once it is in place (home.css)
  return f;
}

/* -- the switch --------------------------------------------------------------- */

// The fields move; each case's words stay where they will rest: the opening case's panel is
// pinned to the edge of its field that does not move (the right or bottom one when it opens
// after the case that closes), so its content is uncovered, not slid. Its name turns from the
// stripe's label into the field's title as the field opens.
function openCase(id, { instant = false } = {}) {
  const prev = open;
  open = id;
  const fwd = ORDER.indexOf(id) > ORDER.indexOf(prev);
  hero.dataset.open = id;
  hero.dataset.case = TONE[id];
  if (instant) deck.classList.add('is-instant');
  cols.forEach((c) => {
    const s = c.dataset.state;
    if (s === id) c.dataset.from = fwd ? 'end' : 'start';
    else if (s === prev) c.dataset.from = fwd ? 'start' : 'end';
    c.classList.toggle('is-open', s === id);
  });
  caseTabs.forEach((t) => {
    const on = t.dataset.state === id;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
  });
  if (instant) {
    void deck.offsetWidth;               // take the new sizes without a transition
    deck.classList.remove('is-instant');
    return;
  }
  if (reduced() || prev === id) return;
  // the closing case's stripe label comes back as its field narrows
  const dur = parseFloat(getComputedStyle(hero).getPropertyValue('--hx-dur')) || 720;
  arrive(tabFor(prev).querySelector('.hx__tab-in'), { delay: dur * 0.3, from: colsMQ.matches ? 'translateY(12px)' : 'translateX(-10px)', dur: 340 });
}

// The visitor (or the tour) picks a case. The fields answer at once; the cells follow.
function choose(id, { touring = false } = {}) {
  if (!ORDER.includes(id) || id === open) return;
  if (!touring) { endTour(); writeHash(CASE_HASH[id]); }
  openCase(id);
  clearBusy();
  if (DATA.has(id)) toCells(id);
  else awayCells(id);
  showHint();
  if (!touring) { live.textContent = `${nameOf(id)}. ${lineOf(id)}`; reveal(id); }
}

// Stacked on a phone, the opened case may reach past the screen's edge: bring all of it in
// (where it will rest, not where its row is while it grows).
function reveal(id) {
  if (colsMQ.matches) return;
  const g = geometry(id), r = deck.getBoundingClientRect();
  const top = r.top + g.o.y, bottom = top + g.o.h;
  const bar = topbarBottom() + 8;
  let dy = 0;
  if (bottom > innerHeight - 8) dy = bottom - innerHeight + 12;
  if (top - dy < bar) dy = top - bar;
  if (Math.abs(dy) > 2) scrollBy({ top: dy, behavior: reduced() ? 'auto' : 'smooth' });
}
const topbarEl = $('.pv-topbar');
const topbarBottom = () => (topbarEl ? topbarEl.getBoundingClientRect().bottom : 0);

// a data case: the cells come back if they had stepped aside, and fly into its field
let awayT = 0;
function toCells(id) {
  clearTimeout(awayT);
  hero.classList.remove('is-away');
  if (!pc) { showStill(id); return; }
  if (pc.paused) pc.resume();
  const f = place(id);
  if (pc.fallback) {
    pc.setFrame(f, { frames: null });
    pc.setState(id);
    drawn = id;
    return;
  }
  if (id !== pc.state && !pc.loaded(id)) setBusy(id);
  drawn = id;
  pc.setView(id, f, { frames: null, glide: reduced() ? 0 : 900 }).then((done) => {
    if (done) { drawScale(pc); placeGroups(pc); placePlates(pc); }
  }).catch((err) => { console.warn(err); failed(id); });
}

// the assistant or the store: the cells step aside, and hold still while they are away
function awayCells(id) {
  hero.classList.add('is-away');
  showTip(null);
  warmCase(id, { asked: true });
  clearTimeout(awayT);
  awayT = setTimeout(() => { if (pc && !pc.fallback && !DATA.has(open)) pc.pause(); }, 260);
}

/* -- loading ------------------------------------------------------------------ */

// A data case still on its way: its tab says so at once (aria-busy); if the wait is long
// enough to see, a line along the top of its field fills as its cells arrive.
let busyT = 0;
let busyOn = null;
function progressTo(id, p) {
  const t = tabFor(id);
  const known = p != null && p > 0.005;
  t.classList.toggle('is-known', known);
  if (known) t.style.setProperty('--p', Math.min(1, p).toFixed(3));
}
function setBusy(id) {
  clearBusy();
  const t = tabFor(id);
  t.setAttribute('aria-busy', 'true');
  busyT = setTimeout(() => {
    if (open !== id || !pc || pc.loaded(id)) return;
    busyOn = id;
    t.classList.add('is-loading');
    progressTo(id, pc.progress(id));
    live.textContent = `Loading the ${NOUN[id]}.`;
  }, 160);
}
function clearBusy() {
  clearTimeout(busyT);
  busyOn = null;
  caseTabs.forEach((t) => { t.removeAttribute('aria-busy'); t.classList.remove('is-loading', 'is-known'); });
}
function onProgress(id, p) {
  if (id === busyOn) progressTo(id, p);
}
let failT = 0;
function failed(id) {
  if (open !== id) return;
  clearBusy();
  hero.classList.add('is-away');          // no other case's cells under this case's name
  const say = colFor(id).querySelector('.hx__say');
  const line = say.textContent;
  const msg = `The ${NOUN[id]} did not load. Open another case and come back to try again.`;
  say.textContent = msg;
  live.textContent = msg;
  clearTimeout(failT);
  failT = setTimeout(() => { say.textContent = line; }, 6000);
}

// A visitor who saves data (Save-Data, or a 2G connection) gets a case only when they ask for it.
const saveData = () => {
  const c = navigator.connection;
  return !!(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
};

// Reaching for a case readies it: a data case's cells load ahead (one at a time, in the
// background; pointcloud.js), the assistant's and the store's pictures start to load. A case
// that is opened loads at once, also for a visitor who saves data.
function warmCase(id, { first = false, asked = false } = {}) {
  if (!id) {
    if (pc && !pc.fallback && !saveData()) pc.prefetch(ORDER.filter((s) => DATA.has(s)), { first });
    return;
  }
  if (DATA.has(id)) {
    if (pc && !pc.fallback && !saveData()) pc.prefetch([id], { first });
    return;
  }
  if (saveData() && !asked) return;
  $$('img[data-src]', colFor(id)).forEach((img) => {
    const shown = () => img.classList.add('is-in');
    img.addEventListener('load', shown, { once: true });
    img.addEventListener('error', shown, { once: true });
    img.src = img.dataset.src;
    img.removeAttribute('data-src');
    if (img.complete) shown();
  });
}
const whenIdle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 800));

// the first case has formed: load the other cells when the page is idle (on a phone nothing
// points at a tab before a tap), unless the visitor is saving data; then the tour may start
function afterIntro() {
  formed = true;
  if (pc && !pc.fallback && !saveData()) whenIdle(() => warmCase());
  armTour();
}

/* -- on the cloud --------------------------------------------------------------- */

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
  if (!um || p.state === '3d' || p._settling || p.fallback || !DATA.has(open)) { scaleBar.dataset.off = ''; return; }
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

// the cell under the pointer: its type's name, in its colour
function showTip(info) {
  if (!info || !DATA.has(open)) { tip.classList.remove('is-on'); return; }
  tip.querySelector('i').style.setProperty('--c', info.color);
  // a cell type by its name; a multi-omics spot by its modality alone (the plate it is on)
  tip.querySelector('b span').textContent = info.state === 'multiomics' ? info.name.replace(/^.* · /, '') : info.name;
  const s = deck.getBoundingClientRect(), h = hero.getBoundingClientRect();
  let x = s.left - h.left + info.x + 14, y = s.top - h.top + info.y - 18;
  const w = tip.offsetWidth || 160;
  if (x + w > h.width - 12) x = s.left - h.left + info.x - w - 14;
  tip.style.setProperty('--tx', `${Math.round(x)}px`);
  tip.style.setProperty('--ty', `${Math.round(y)}px`);
  tip.classList.add('is-on');
}

function showHint() {
  hint.hidden = !pc || pc.fallback || !DATA.has(open) || !(open === '3d' || canvasFocus);
}

function stillMode() {
  hero.classList.add('is-still');
  scaleBar.dataset.off = '';
  motion.hidden = true;
  hint.hidden = true;
  $('#hx-fallback').hidden = false;
}

// the manifest could not be read: each data case shows its still, in its field
function showStill(id = drawn) {
  let img = $('#hx-still > img');
  if (!img) {
    img = document.createElement('img');
    img.decoding = 'async';
    $('#hx-still').append(img);
  }
  place(id);
  img.src = POSTER(id);
  img.alt = `Still image of the ${NOUN[id]}`;
  drawn = id;
  stillMode();
}

// still / play for the idle sway and the tour (WCAG 2.2.2); a switch a visitor asks for still runs
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

/* A one-time tour. When the page has sat still for 5 s with the deck in view, the deck opens
 * each case in turn, 4 s a stop, and comes back to the 2D section, so the six show without a
 * click. Any pointer, key, wheel, touch or scroll stops it for good, as do the pause control,
 * a hidden tab and reduced motion. A link to a case (#3d) skips it, and so does saving data:
 * the tour would download the other cases unasked. */
const TOUR = ['3d', 'atlas', 'multiomics', 'ai', 'store', '2d'];
const tour = { on: false, done: false, seen: false, idleT: 0, stepT: 0, i: 0, wait: 0 };
function armTour() {
  clearTimeout(tour.idleT);
  if (tour.done || tour.on || !formed) return;
  tour.idleT = setTimeout(startTour, 5000);
}
function tourCan() {
  return !tour.done && formed && pc && !pc.fallback && !reduced() && !saveData() && swayOn && !document.hidden
    && tour.seen && open === '2d' && !canvasFocus;
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
  if (DATA.has(id) && !pc.loaded(id)) {
    // on its way in the background: wait a little, and give up rather than show a loading state
    // (or at once if the visitor has started to save data: nothing loads for the tour then)
    if (saveData()) { endTour(); return; }
    warmCase(id, { first: true });
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
    }, { threshold: [0, 0.6, 1] }).observe(deck);
  } else {
    tour.seen = true;
  }
  armTour();
}

/* -- the tabs ------------------------------------------------------------------- */

// The six tabs are one stop for Tab; the arrow keys (left / right across the columns, up /
// down along the rows, either works) move to the next case and open it, Home and End to the
// first and the last.
function initTabs6() {
  const orient = () => tablist.setAttribute('aria-orientation', colsMQ.matches ? 'horizontal' : 'vertical');
  orient();
  colsMQ.addEventListener('change', orient);
  caseTabs.forEach((t, i) => {
    t.addEventListener('click', () => choose(t.dataset.state));
    // a mouse over a case is a visitor reaching for it (a finger's tap is the click itself)
    t.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') warmCase(t.dataset.state, { first: true }); }, { passive: true });
    t.addEventListener('focus', () => { if (t.matches(':focus-visible')) warmCase(t.dataset.state, { first: true }); });
    t.addEventListener('keydown', (e) => {
      const n = caseTabs.length;
      const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      const next = caseTabs[(to + n) % n];
      next.focus();
      choose(next.dataset.state);
    });
  });
}

async function initHero() {
  initTabs6();
  const first = readHash().kase || '2d';
  if (first !== '2d') openCase(first, { instant: true });
  hero.dataset.case = TONE[first];
  drawn = DATA.has(first) ? first : '2d';
  if (!DATA.has(first)) { hero.classList.add('is-away'); warmCase(first, { asked: true }); }
  let raf = 0;
  const refit = (glide = 360) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const id = DATA.has(open) ? open : drawn;
      const f = place(id);
      if (pc && !pc.fallback) pc.setFrame(f, { frames: null, glide: DATA.has(open) && !reduced() ? glide : 0 });
      else if (pc) pc.setFrame(f, { frames: null });
    });
  };
  try {
    pc = await PointCloud.mount(glBox, {
      manifestUrl: 'assets/data/hero/manifest.json',
      state: drawn,
      background: 'transparent',
      backgroundLift: 0,
      preload: 'first',
      intro: DATA.has(first),
      duration: 1400,                       // the cells cross from one field to the next
      introDuration: 1250,
      introAlpha: 0.32,
      posterHost: $('#hx-still'),            // no WebGL: the still sits in the cloud's own rect
      frame: place(drawn),
      frames: null,
      onReady: (p) => {
        hero.classList.add('is-ready');
        if (p.fallback) {
          // the still is in the cloud's own rect; the cases swap stills. If the head preloaded
          // the first case's particles (WebGL2 exists but could not start), take them from the
          // preload, so the browser does not flag it as unused (no second download).
          stillMode();
          const pre = document.querySelector('link[rel="preload"][as="fetch"][href$=".bin"]');
          if (pre) fetch(pre.href).catch(() => {});
        } else if (!DATA.has(open)) {
          p.pause();                          // opened on the assistant or the store
        }
      },
      onState: (id, phase) => {
        if (!pc) return;
        pc._settling = phase === 'start';
        if (phase === 'start') { showTip(null); clearBusy(); }
        else if (!formed) afterIntro();
      },
      onProgress,
      onHover: showTip,
      onFrame: (p) => { drawScale(p); placeGroups(p); placePlates(p); },
    });
  } catch (err) {
    console.warn(err);
    if (DATA.has(open)) showStill(open);
    return;
  }
  window.__home = { pc, choose, geometry, place, tour, open: () => open };   // for the page's own checks
  showHint();
  initMotion();
  initTour();
  if (pc.fallback || reduced() || !DATA.has(first)) afterIntro();     // no intro to wait for

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

  addEventListener('resize', () => { scale(); refit(); });
  colsMQ.addEventListener('change', () => refit(0));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => refit());
  if ('ResizeObserver' in window) {
    let seen = '';
    new ResizeObserver(([e]) => {
      const key = `${Math.round(e.contentRect.width)}x${Math.round(e.contentRect.height)}`;
      if (key !== seen) { seen = key; refit(); }
    }).observe(deck);
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
const CASE_HASH = { '2d': '', '3d': '3d', atlas: 'atlas', multiomics: 'multiomics', ai: 'assistant', store: 'tool-store' };
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

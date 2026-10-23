# thinking-orbs-universal — vendored copy

- **Version pinned:** 1.1.0 (npm `thinking-orbs-universal@1.1.0`)
- **Source:** `dist/index.js`, `dist/OrbController-DRcbmh1H.js` and
  `dist/ThinkingOrbElement-wHgIYO9k.js` from the npm tarball
  `thinking-orbs-universal-1.1.0.tgz` (`npm pack thinking-orbs-universal@1.1.0`)
- **Upstream project:** https://github.com/wangbin3162/thinking-orbs-universal
- **License:** MIT (see `LICENSE` in this directory, taken from the same tarball)
- **SHA-256:**
  - `index.js` — `37403c86dc2e8805622faa8e1436595b38852fd4da3e20e18a075f51a5a625d9`
  - `OrbController-DRcbmh1H.js` — `6ac34604dac79671897a0fce1f26a943868e50947198388ff0dcad3f6231ec4b`
  - `ThinkingOrbElement-wHgIYO9k.js` — `3865aa7ff56400d5afcb28c1ffd9c1c8d630f14130fe6983990ca83e8f767a97`

## Why this is vendored instead of loaded from a CDN

Same convention as every other third-party script here (deck.gl, GSAP, jsPDF,
html2canvas, three): a local file under `frontend/vendor/`, no runtime CDN
dependency.

## Why three raw files and not a bundle

The published ESM needs no bundler. Its only import specifiers anywhere are
`"./OrbController-DRcbmh1H.js"` and `"./ThinkingOrbElement-wHgIYO9k.js"` —
relative and extensioned, zero bare specifiers — and the 22 kB controller chunk
has no imports at all. A browser resolves the graph as-is, so copying three
files (26,937 bytes with LICENSE) is the whole integration. The package also has
**zero runtime dependencies**; its `react`/`vue` peers are only for the
framework sub-exports, which this app does not load.

**The two chunk filenames are content-hashed by the upstream build and change on
every release.** They are therefore pinned here rather than globbed. To upgrade:
`npm pack` the new version, copy the three `dist/` files it actually emits, and
update both the names and the SHA-256s above.

## What it's used for

The Assistant panel's status orb (`frontend/js/assistant.js`, styled in
`frontend/css/assistant.css`). Two of the six shipped states are used:

- `composing` — the panel is open and no prompt has been submitted yet
- `solving` — a turn is running

`searching` is deliberately **not** used. It would mean "a tool is running", and
that is not derivable from this app's event stream: `backend/agent_events.py`
defines `tool` with only `{name, detail, effectful}` and fires it once, at the
opening edge — there is no tool-result event, and both the Codex and Antigravity
adapters discard the closing edge on purpose. Driving `searching` from "the last
event was a tool call" would show the wrong thing for a median 3.2 s (measured
across the 12 recorded streams in `runs/*/events.jsonl`, n=104 tool events), so
the orb reports activity honestly at two levels instead of guessing at three.

Loaded by dynamic `import()` from `assistant.js`, which is a classic script.
This is deliberate and is **not** interchangeable with a `<script type="module">`
island: module scripts are deferred, so an island would evaluate *after*
`assistant.js` has already built the panel and called `_renderEmpty()`
synchronously. Dynamic `import()` also fails safely — in the jsdom suite
(`tests/assistant_render_test.cjs`) the call rejects, the mount is skipped, and
the static orb host renders on its own, so no test needs a
`requestAnimationFrame` stub.

Only `mountOrb` is used. The `ThinkingOrbElement` custom-element export is
retained because `index.js` imports it unconditionally.

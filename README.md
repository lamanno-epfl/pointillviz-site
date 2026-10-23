# pointillviz.com

The PointillViz homepage, published by GitHub Pages at <https://pointillviz.com>. It introduces
PointillViz; it does not run the app. The Tool Store and the documentation are separate sites:
<https://store.pointillviz.com> and <https://docs.pointillviz.com>.

Everything here is static. GitHub Pages serves the files as they are: no build step, no server
code, no package manager.

## Structure

| Path | What it is |
|---|---|
| `index.html` | The homepage: hero, Workspace, Extend (community tools and the AI assistant), the citation card, footer |
| `404.html` | Shown by GitHub Pages for any address that does not exist |
| `assets/css/home.css` | The homepage's own styles, loaded after the design system |
| `assets/js/home.js` | The homepage's behaviour: the hero's six cases, the workspace tabs, the clips, the tools, the section index |
| `assets/js/pointcloud.js` | The hero's engine: the point cloud of real cells, drawn with WebGL2, no dependencies. Its options are documented at the top of the file |
| `assets/data/hero/` | The hero's data: `manifest.json` (labels, colours, cameras, file layout), one `.bin` of particles per case, the tissue array's full-detail images (`tma-detail-*.webp`), and a still `poster-*.webp` per case for browsers without WebGL. The manifest is public, so it carries only what the page may show: no working notes, no cell shares or counts beyond the captions' |
| `assets/media/` | Pictures and clips of the running app and of the paper's figures, `tools/` (the twelve tools' artwork) and `social-card.jpg` (the preview shown when a link to the site is shared) |
| `assets/pv/` | The shared PointillViz design system (`pv.css`, `pv.js`, logos, icons), identical on all three sites. **Do not edit it here**: change it at its source and copy it to the three sites together |
| `CNAME` | The custom domain. GitHub Pages reads it, so leave it in place |
| `.nojekyll` | Tells GitHub Pages to publish the files as they are, without a Jekyll build |
| `robots.txt`, `sitemap.xml` | For search engines |

## How the homepage works

- **Hero.** The first screen is the wordmark (large, in the headline's place; the top bar's small copy hides while it is on screen), the lede and two actions over a deck of six cases, each its own colour field: 2D section, 3D volume, Tissue array, Multi-omics, AI assistant and Tool Store. The cases are a tablist (`.hx__tab`, `data-state="2d|3d|tma|multiomics|ai|store"`); the open one takes most of the deck and the other five narrow to stripes that keep their name, their colour and a slit through their real picture (`assets/media/hero/hint-*`). The tabs name the cases and nothing more: no dataset details and no numbers.
  - **The tissue array.** Fourteen mouse tissues on one Xenium 5K slide, turned a quarter turn so its long side runs across the stage. Its cells are coloured by the level of one gene (*Epcam*: log1p CP10K per cell, clipped at the 99th percentile) on the app's own gene scale, magma, floored so a cell without the gene still shows; a key in the strip names the gene and runs its scale from low to high, and each tissue is named at the centre of its cells (`#hx-tissues`; hidden on phones). Its particles carry the morph, a sample of its cells (the manifest's `drawn` / `drawnPhone`; the rest take the palette's hidden entry). Once they land, a full-detail image of all 549,995 cells fades in over them (`tma-detail-1600.webp`, 264 KB, or `tma-detail-2400.webp`, 549 KB, for screens that show the slide wider than about 1,500 device px): each cell a 5 µm anti-aliased dot, drawn by the engine as a textured quad in the particles' own coordinates, so it stays on them through the sway, a drag and a resize. A switch fades it out as the particles leave; under reduced motion it shows at once. `tools/build_hero_data.py` (in the workspace, not in this site) builds the data and the images and documents the choice of gene.
  - **Layout.** Wide windows (from 900 px, landscape) set the cases side by side as columns; phones and portrait screens stack them as rows. The deck is a size container: a stripe is `--hx-stripe` and the open case takes the rest, and a switch transitions `flex-basis` (720 ms; instant under reduced motion). Each case's words sit in its panel, pinned to the edge of its field that does not move, so a switch uncovers them instead of sliding them.
  - **The cells.** `home.js` mounts `pointcloud.js` on `#hx-gl`, one canvas over the whole deck; `place()` frames the open data case's cells into its field, under its name and line, so a switch flies the cells from one field into the next. The assistant and the store are pages of their own: the cells step aside and the canvas pauses while one of them is open.
  - **Loading.** Only the first case's particles load with the page (the `<head>` preloads them). The other three load in the background, one at a time, once the first case has formed and the page is idle, and at once when a visitor points at or focuses a tab. The tissue array's full-detail image comes last in that queue, and first when its case is opened; until it arrives the particles show. A case that is opened loads first: a background download in flight stops and starts again after it. The assistant's picture and the store's twelve artworks load once the page is idle, and at once when their tab is pointed at, focused or opened; they are visible as soon as they arrive. Visitors who save data (`navigator.connection.saveData`, 2G) get a case only when they open it.
  - **A case on its way.** The tab answers at once (`aria-busy`); if the particles take longer than a moment, a line along the top of its field fills as they arrive.
  - **The tour.** When the page sits still for 5 s with the deck in view, the deck opens each case in turn, 4 s a stop, and comes back to the 2D section. Any pointer, key, wheel, touch or scroll stops it for good, and so do the pause control, a hidden tab and reduced motion. It does not run when the address names a case or a tab, or for a visitor who saves data.
  - **The address.** `#3d`, `#tissue-array`, `#multiomics`, `#assistant` and `#tool-store` open the page on that case; `#data`, `#views` and `#analyses` open the workspace on that tab. A visitor's choice updates the address without adding history entries.
  - **Keyboard.** The six tabs are one stop for Tab; the arrow keys move to the next case and open it, Home and End to the first and the last. Tab then goes into the open case: the cells (arrow keys orbit them), the assistant's panel or the store's links.
- **The assistant's orb.** The AI assistant's stripe (small, above its picture) and its open panel run the viewer's animated thinking orb: thinking-orbs-universal 1.1.0 (MIT), vendored with its license in `assets/vendor/thinking-orbs-1.1.0/` and mounted by `mountOrbs()` in `home.js` once the page is idle. It pauses by itself off screen, in a hidden tab and under reduced motion; without it the still SVG dots stay.
- **Without WebGL** the case's still is shown in its field, blended into the field's colour, and the tabs swap stills. With `prefers-reduced-motion` the cloud does not move unless asked, a switch is instant, and the clips wait for their play button.
- **Workspace.** Three tabs (Data, Views, Analyses) of four pictures each, using the design system's tabs (`data-pv-tabs`). A tab's pictures load when its tab is hovered, focused or chosen. Clips (`video.wk-vid`) load when they come on screen and always have a pause button. The Images tile (Data) is two stills of one camera, the H&E and the same field with its cells (`initImages()` in `home.js`): on screen the cells turn on over the H&E, hold and turn off again, with the same pause button; without script and under reduced motion it is the final still.
- **Large screens.** Above 1440 × 900 the page is drawn up to 1.6 times larger: a line in the `<head>` sets `--k`, and `home.css` (section 0) applies it to the hero and the sections. The top bar, the footer and the toasts take the same `--k` from the design system, as on every page of the three sites.

## Change something

1. Edit the HTML, CSS or JS. Inside this site every path is **relative** (`assets/…`, `./`), never starting with `/`, so the pages work at the domain root and in a subfolder alike. Links to the other two sites use their full addresses.
2. Preview it (below), at a phone width and a desktop width.
3. Commit and push to `main`. GitHub Pages publishes the change within a few minutes.

Words and numbers follow the house style of the three sites: British spelling with *-ize*, the
facts the copy is allowed to state, and no dates for things that are not available yet.

### Placeholders

Links to things that do not exist yet are marked `href="#" data-placeholder="…"`; the page shows
a "Coming soon" state (the design system's chip, or the line under a button's name) and the
design system answers a click with a "Coming soon" note.

| Placeholder | Where | When it is available |
|---|---|---|
| `data-placeholder="paper"` | Top bar and drawer (Paper), the citation card's "Read the preprint", the footer | Replace `href="#"` with the preprint's address, remove the attribute, and fill in the authors and the DOI in the citation card and the footer of `index.html` and `404.html`. The citation card sits at the end of the page while it is a placeholder; once the preprint is out it can move up, as on braindev |
| `data-placeholder="code"` | Not on the homepage | The hero has two actions, "Browse the tools" (primary) and "Read the docs". Once the code is public, a "Get PointillViz" action can join them |

### Pictures and clips

- Every picture is a real capture of the app, a real figure panel, or real data. Label it by technology, tissue and scale ("Xenium 5K · mouse colon"), never by a dataset ID.
- Give every `<img>` an `alt`, `width` and `height`, and `loading="lazy"` when it is below the first screen.
- Clips: H.264, `+faststart`, no sound, a few seconds, at most about 1 MB, each with a WebP still of its first frame as the `<img>` behind it, and at most four on the page.
- The homepage's first load (without fonts) is about 1.9 MB a few seconds after the hero is ready, once the other three data cases have loaded in the background; keep it under 2.5 MB. The hero's media (`assets/media/hero/`: the stripes' slits, the store's twelve artworks, the assistant's result without its scale bar) is made from the hero posters, `assets/media/ai-result.webp` and the store's own artworks.

## Add a page

1. Start from `index.html`: keep its `<head>` up to `assets/pv/pv.js` (leave out `home.css`, the
   two `preload` lines and `home.js` unless the page uses them; every page needs a scale script,
   and a page without `home.css` takes the short one in the design system's `CHROME.md` §1), the skip link,
   the top bar, the drawer, `<main id="main">` and the footer. Write your content inside `<main>`
   with the design system's classes (see `assets/pv/pv.css`). A page that does not open with a
   full-bleed picture uses `class="pv-topbar"`, without `pv-topbar--overlay`.
2. Save it as `about/index.html` to serve it at `pointillviz.com/about/`. In a folder, every
   relative path gains a `../`: `assets/…` becomes `../assets/…`, and `./` becomes `../`.
   ("Overview" takes `aria-current="true"` in the top bar, the drawer and the footer: it marks the
   site you are on; `aria-current="page"` is for the homepage itself.)
3. Set its `<title>` (at most 60 characters), `description`, the Open Graph tags (`og:url` and
   `og:image` are full `https://pointillviz.com/…` addresses) and its one `<h1>`.
4. Link to it from the homepage and add it to `sitemap.xml`.

Do not copy `404.html` for a new page: its first script and its inline logos exist only because
GitHub Pages serves it at any missing address.

## Preview before pushing

```bash
python3 -m http.server 8000   # from this folder, then open http://localhost:8000
```

The hero needs WebGL2. In a browser without it you see the still images instead.

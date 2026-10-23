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
| `assets/js/home.js` | The homepage's behaviour: the hero's cases, the workspace tabs, the clips, the tools, the section index |
| `assets/js/pointcloud.js` | The hero's engine: the point cloud of real cells, drawn with WebGL2, no dependencies. Its options are documented at the top of the file |
| `assets/data/hero/` | The hero's data: `manifest.json` (labels, colours, cameras, file layout), one `.bin` of particles per case, and a still `poster-*.webp` per case for browsers without WebGL. The manifest is public, so it carries only what the page may show: no working notes, no cell shares or counts beyond the captions' |
| `assets/media/` | Pictures and clips of the running app and of the paper's figures, `tools/` (the twelve tools' artwork) and `social-card.jpg` (the preview shown when a link to the site is shared) |
| `assets/pv/` | The shared PointillViz design system (`pv.css`, `pv.js`, logos, icons), identical on all three sites. **Do not edit it here**: change it at its source and copy it to the three sites together |
| `CNAME` | The custom domain. GitHub Pages reads it, so leave it in place |
| `.nojekyll` | Tells GitHub Pages to publish the files as they are, without a Jekyll build |
| `robots.txt`, `sitemap.xml` | For search engines |

## How the homepage works

- **Hero.** `home.js` mounts `pointcloud.js` on `#hx-gl`. The four case buttons (`data-state="2d|3d|atlas|multiomics"`) morph the cloud between datasets; their captions, counts and colour keys are in the `CASES` table at the top of `home.js`, and the colour keys come from `manifest.json`.
  - **Layout.** On wide windows from 1100 × 641 the cloud takes the whole right side, from under the top bar down to the dock and out to the page's edge; the readout (counts and colour key) sits under the copy, beside the dock and as tall as it. Shorter wide windows keep the readout in a column at the top right; windows 900–1099 px wide and phones leave it out, and tablets show it under the buttons. `frameFor()` in `home.js` measures the cloud's room from the copy, the dock and the readout.
  - **The dock keeps one height.** Every case's caption and line are laid unseen under the words on screen (`reserveWords()` in `home.js`), so the dock is as tall as the longest of them and nothing under it moves when the case changes.
  - **Loading.** Only the first case's particles load with the page (the `<head>` preloads them). The other three load in the background, one at a time, once the first case has formed and the page is idle, and at once when a visitor points at the dock. A case that is clicked loads first: a background download in flight stops and starts again after it. Visitors who save data (`navigator.connection.saveData`, 2G) get the others only when they ask: nothing loads ahead, on hover or for the tour.
  - **A case on its way.** The pressed button answers at once (`aria-busy`). If the particles take longer than a moment, its outline fills as they arrive and the caption says "Loading the 3D volume… 42%". The caption, counts, colour key and the live announcement change only when the new cells start to arrive, so the words always match the cells on screen.
  - **The tour.** When the page sits still for 5 s with the cloud in view, the cloud steps once through 3D, the atlas and multi-omics and back to the 2D section, 4 s a stop. Any pointer, key, wheel, touch or scroll stops it for good, and so do the pause control, a hidden tab and reduced motion. It does not run when the address names a case or a tab, or for a visitor who saves data.
  - **The address.** `#3d`, `#atlas` and `#multiomics` open the page on that case; `#data`, `#views` and `#analyses` open the workspace on that tab. A visitor's choice updates the address without adding history entries, so a talk or a post can link straight to the 3D volume.
- **Without WebGL** the case's still is shown in the cloud's place, and the buttons swap stills. With `prefers-reduced-motion` the cloud does not move unless asked, and the clips wait for their play button.
- **Workspace.** Three tabs (Data, Views, Analyses) of four pictures each, using the design system's tabs (`data-pv-tabs`). A tab's pictures load when its tab is hovered, focused or chosen. Clips (`video.wk-vid`) load when they come on screen and always have a pause button.
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
| `data-placeholder="paper"` | Top bar and drawer (Paper), the citation card's "Read the preprint", the footer | Replace `href="#"` with the preprint's address, remove the attribute, and fill in the authors and the DOI in the citation card and the footer of `index.html` and `404.html`. The citation card sits at the end of the page while it is a placeholder; once the preprint is out it can move back into the hero, as on braindev. The hero's bottom row now holds the readout (left) and the dock (right), so the card would take the readout's place there, and the readout would go back to its side column (see the wide-window rules in section 1 of `home.css`) |
| `data-placeholder="code"` | "Get PointillViz" in the hero | Point it at the release. It is a quiet link while it is a placeholder, so "Browse the tools" (the Tool Store, the destination with the most real content) leads and "Read the docs" follows; once the code is public, Get PointillViz can become the hero's primary button (the copy deck lists it as the primary) |

### Pictures and clips

- Every picture is a real capture of the app, a real figure panel, or real data. Label it by technology, tissue and scale ("Xenium 5K · mouse colon"), never by a dataset ID.
- Give every `<img>` an `alt`, `width` and `height`, and `loading="lazy"` when it is below the first screen.
- Clips: H.264, `+faststart`, no sound, a few seconds, at most about 1 MB, each with a WebP still of its first frame as the `<img>` behind it, and at most four on the page.
- The homepage's first load (without fonts) is about 1 MB when the hero is ready, and about 1.7 MB a few seconds later, once the other three cases have loaded in the background; keep it under 2.5 MB.

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

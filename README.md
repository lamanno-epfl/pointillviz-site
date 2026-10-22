# pointillviz.com

The PointillViz introduction site, published by GitHub Pages at <https://pointillviz.com>.
It introduces PointillViz; it does not run the app.

| File | What it is |
|---|---|
| `index.html` | The homepage, including its styles |
| `media/` | Images used by the pages (`social-card.jpg` is the preview shown when a link to the site is shared) |
| `favicon.svg` | The browser-tab icon |
| `CNAME` | The custom domain. GitHub Pages reads it, so leave it in place |
| `.nojekyll` | Tells GitHub Pages to publish the files as they are, without a Jekyll build |

## Change a page

Edit the HTML, then commit and push to `main`. GitHub Pages publishes the change within about ten minutes.

## Add a page

Copy `index.html` to a new name: `about.html` is served at `pointillviz.com/about.html`, and
`about/index.html` at `pointillviz.com/about/` (inside a folder, write image paths as `../media/...`).
Then link to it from the homepage.

## Preview before pushing

```bash
python3 -m http.server 8000   # from this folder, then open http://localhost:8000
```

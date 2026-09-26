# sawyerbalint.github.io

Personal academic website built with [Quarto](https://quarto.org).

## Everyday edits

| To change… | Edit |
|---|---|
| Publications | `pubs.bib`. Add a BibTeX entry and the list rebuilds on render. Optional fields: `pdf`, `code`, `data`, `slides`, `preprint`; add `keywords = {selected}` to feature a paper on the home page. |
| CV | Replace `files/cv.pdf` (keep the name). |
| Home page text, news, links | `index.qmd` |
| Research themes | `research.qmd` |
| Headshot | Save as `images/headshot.jpg`, then follow the comment at the top of `index.qmd`. |
| Colors / fonts | `theme/light.scss`, `theme/dark.scss`; layout in `theme/site.css` |
| Navbar, social icons | `_quarto.yml` |

## Preview locally

```bash
quarto preview
```

(Or open the folder as an RStudio project and click **Render**.) Quarto runs `scripts/build-publications.ts` first to turn `pubs.bib` into the publication list. It uses Quarto's built-in Deno and pandoc, so no R/Python packages are needed.

## Publish

Pushing to `main` triggers `.github/workflows/publish.yml`, which renders and deploys to GitHub Pages.
One-time setup: **GitHub repo → Settings → Pages → Build and deployment → Source: GitHub Actions**.

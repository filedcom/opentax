# site/

The public static site at `opentax.filed.com` (`CNAME`). It is the only folder
GitHub Pages publishes: `.github/workflows/pages.yml` uploads `site/` as-is,
with no build step or bundler. Internal research belongs in `../docs/`, never
here; anything placed in `site/` becomes public on the next deploy.

## Layout

- `index.html` — landing page (inline CSS and JS, JSON-LD, Google Analytics).
- `build/index.html` — "Build on OpenTax", the guide for tax professionals.
  A page at `/build/`, not build output; it references assets as `../…`.
- `fonts/` — three self-hosted FreightDispPro `.woff2` faces; Geist comes from
  Google Fonts.
- `favicon.png`, `icon.svg`, `filed-logo.png`, `opentax-og.png` — page and
  social-card images (`opentax-mcp-og.png` is referenced by neither page).
- `robots.txt`, `sitemap.xml` (both page URLs with `lastmod`), `CNAME`.

## Rules

- Pages deploy on a push to `main` touching `site/**`, `forms/**`,
  `catalog.ts` or `scripts/site/site-stats.ts`, or on manual dispatch.
- Before upload, the workflow runs `scripts/site/site-stats.ts`, which rewrites
  every `<n> registered nodes` and `<n> input types` (optionally `<b>n</b>`) in
  both pages from the TY2025 `registry` and `inputNodes`. Keep that phrasing
  when editing copy, or the count stops updating. The committed numbers lag
  the deployed ones; that is expected.
- A new page gets its own folder with `index.html`, a `canonical`/`og:url` on
  `https://opentax.filed.com/<path>/`, and a `sitemap.xml` entry.
- Links into the repo use `https://github.com/filedcom/opentax/...`; skill
  links point at `skills/` on `main`, so renaming a skill breaks the site.
- Keep it static: no frameworks or build tooling; dprint does not format HTML.

## Verify

- `bun scripts/site/site-stats.ts` — rewrites the counts locally (it edits
  the two HTML files) and prints the new values.
- `python3 -m http.server 8000 --directory site` then open
  `http://localhost:8000/` and `http://localhost:8000/build/` to check
  relative fonts and images resolve.

## Read next

- [../.github/workflows/pages.yml](../.github/workflows/pages.yml)
- [../scripts/site/site-stats.ts](../scripts/site/site-stats.ts)
- [../skills/AGENTS.md](../skills/AGENTS.md)

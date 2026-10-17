# docs/ty2026/

TY2026 Form 1040 research: a pinned IRS source corpus and the graph, PDF and MeF
maps for building `f1040:2026`, which has no code yet (`forms/f1040/` has only
`2025/`, and `catalog.ts` has no 2026 entry). Research only: TY2025 evidence
goes in `../ty2025/`, code in `forms/`.

## Layout

- `README.md` — index of every map and the corpus/version rules; start there,
  then `readiness/ENTRY-POINT.md`.
- `corpus/` — IRS PDFs (`draft/`, `authorities/`, `ats/`) and MeF spreadsheets
  (`mef/`), with `manifest.json` (URL, bytes, SHA-256, `kind`, `status`).
- `graphs/<FORM>-GRAPH.md` — per-form source-to-line routes and build order.
- `pdf/PDF-<FORM>-MAP.md` — draft AcroForm widget maps.
- `mef/MEF-*.md` — XSD version drift, public crosswalk, binary attachments.
- `ats/ATS-SCENARIO-NN.md`, `ats/ATS.md` — ATS scenario fixture plans.
- `readiness/` — entry point, implementation plan, constants, parity queue.
- `inventories/*.csv`, `inventories/pdf-fields/pdf-fields-<slug>.csv` —
  generated tables (see Rules).

## Rules

- Every PDF under `docs/ty2026/` is Git LFS (`.gitattributes`). Run
  `git lfs install && git lfs pull` before reading one; after adding one,
  confirm it is listed by `git lfs ls-files`.
- Record a source's version before using it: draft form, final form or
  instructions, prior-year comparator, and MeF package (2026v1.0 locally versus
  the public 2026v4.0). A draft or comparator never proves a final value.
- Change the corpus through `scripts/research/ty2026/download_corpus.py`, which
  rewrites `manifest.json`; review every hash change. Don't hand-edit it.
- CSVs are generated, not hand-edited: `build_inventory.py` writes
  `pdf-coverage`, `mef-coverage`, `mef-descriptor-coverage`, `year-literals`
  and `node-coverage`; `build_pdf_fields.py` (needs `pypdf`) writes
  `pdf-fields/`. `graph-route-gaps`, `instruction-coverage` and
  `mef-public-crosswalk` have no generator in the repo.
- The five generated CSVs are stale: their code paths (e.g.
  `forms/f1040/2025/start.ts`, `forms/f1040/2025/pdf/forms/f1040.ts`) predate
  later moves and none resolve. Verify against the checkout before relying on
  a row; regenerating them is separate work.
- The maps quote research commit `b7c07b61`; recheck a route in the current
  code before implementing it.
- Name new maps after the existing ones (`FORM8889-GRAPH.md`,
  `PDF-SCHEDULEB-MAP.md`) and add a line to `README.md`.

## Verify

- `python3 scripts/research/ty2026/build_inventory.py` (from the repo root)
  regenerates the five CSVs; review the diff.
- `git lfs ls-files | grep -c docs/ty2026` should equal the count of
  `find docs/ty2026 -name '*.pdf'`.
- `bun run fmt:check` for the Markdown.

## Read next

- [README.md](README.md)
- [readiness/ENTRY-POINT.md](readiness/ENTRY-POINT.md)
- [readiness/SOURCES.md](readiness/SOURCES.md)
- [corpus/manifest.json](corpus/manifest.json)
- [../../forms/f1040/FORM.md](../../forms/f1040/FORM.md)

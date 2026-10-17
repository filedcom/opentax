# docs/

Internal research and design notes for agents building the engine. Nothing here
is published (GitHub Pages ships only `site/`) or imported by code. Research for
one node lives beside that node as `research/context.md` under `forms/`, and
benchmark truth lives in `benchmark/cases/`; neither belongs here.

## Layout

- `architecture/` — `STRUCTURE.md` (repository map and which check enforces
  each rule) and `repository-organization.md` (the seven tax sections).
- `ty2025/` — TY2025 MeF readiness, inventories, testing gates, source evidence
  by tax domain, and `ats/` IRS ATS correspondence drafts.
- `ty2026/` — TY2026 source research: pinned IRS corpus (Git LFS), graph/PDF/MeF
  maps, ATS scenario plans and generated CSV inventories.
- `guides/` — topic guides on entering inputs (`investment-interest.md`).
- `reference/drake-screens.json` — Drake screen codes mapped to form names and
  node type codes; reference data, read by no code.
- `releases/` — per-version release notes (`v2.0.9.md`) and the release
  artifact smoke-check procedure (`smoke-test.md`).

## Rules

- Put a document in the tax year it describes, then in the tax section the
  form affects (General, Income, Adjustments, Deductions, Credits, Taxes,
  Payments), matching the node tree; see each year's `AGENTS.md`.
- Cite the IRS source for every amount, line or rule: form, instructions or
  publication, with revision/year and a URL or pinned corpus path. A value the
  engine produced is evidence of engine behaviour, never of the law.
- State what was not verified. Historical checkpoints keep their date and
  commit; add a new dated section or file rather than rewriting old results.
- Use relative links to code (`../../forms/f1040/...`) so a move shows up as a
  broken link instead of a silently wrong path.
- Markdown is formatted by dprint (`dprint.json`, `textWrap: maintain`).

## Verify

- `bun run fmt:check` — dprint check, which includes every Markdown file here;
  `bun run fmt` rewrites them.
- No link checker exists. Before committing, check the relative links in the
  files you touched still resolve (open them, or `ls` each target).

## Read next

- [architecture/STRUCTURE.md](architecture/STRUCTURE.md)
- [architecture/repository-organization.md](architecture/repository-organization.md)
- [ty2025/AGENTS.md](ty2025/AGENTS.md)
- [ty2026/AGENTS.md](ty2026/AGENTS.md)
- [../AGENTS.md](../AGENTS.md)

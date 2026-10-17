# docs/ty2025/

TY2025 Form 1040 MeF readiness evidence: source proofs and gap notes by tax
domain, coverage inventories, testing gates and IRS ATS correspondence. The
code those notes describe lives in `forms/f1040/` (shared nodes, and
`forms/f1040/2025/` for year wiring and projections); TY2026 research goes in
`../ty2026/`.

## Layout

- `domains/<section>/<group>/` — source proofs, gaps and checkpoints by the
  seven tax sections; groups follow `forms/f1040/2025/domains/` where one
  exists (e.g. `taxes/household-employment/`). A form with several notes gets
  its own `form<number>/` folder (`taxes/amt/form6251/`). Each section has a
  `README.md` with per-group file counts.
- `inventory/` — coverage inventories and root/attachment audits
  (`coverage-inventory*.md`, `ty2025-unregistered-roots-*.md`).
- `readiness/` — product-board status, checkpoint handoffs and readiness
  execution logs.
- `testing/` — gate results, submission replays and PDF/native parity audits.
- `ats/` — ATS preparation (`ty2025.md`, the scenario matrix), dated check
  ledgers and `ty2025-irs-clarification-draft.md`, a question set for the
  authorized ATS operator. Drafts only: nothing here is an IRS response.

## Rules

- Name files `ty2025-<form>-<topic>.md` (`ty2025-form6251-iso-source-gap.md`,
  `ty2025-schedule-h-futa-payroll.md`); a point-in-time snapshot appends its
  date, `ty2025-<topic>-YYYY-MM-DD.md`. Existing exceptions (`README.md`,
  `ats/ty2025.md`, `coverage-inventory*.md`, two `form8621-*.md`,
  `general-business-credit-routing.md`) are not a pattern to copy.
- Choose the section by where the form's effect lands, as in
  `../architecture/repository-organization.md`; follow up cross-section
  effects with a link, not a copy.
- Each claim names its IRS source (form, instructions, publication or ATS
  packet page) and the commit, test count or CI run it was observed at. Keep
  "XSD-valid", "reviewed" and "IRS accepted" distinct: none implies the next.
- Add a new dated `## <Month day> …` section for a new checkpoint; keep earlier
  ones as history. `product_board.md` at the repo root links into these files
  by path and heading anchor, so a rename or heading change must update it.
- When adding or moving files, update the counts in `README.md` here and in the
  affected `domains/<section>/README.md`.

## Verify

- `bun run fmt:check` (dprint covers this Markdown).
- Recount after a change:
  `for d in docs/ty2025/*/; do echo "$d $(find "$d" -type f | wc -l)"; done`
- `grep -rn "docs/ty2025/<path>" product_board.md README.md` before renaming.

## Read next

- [README.md](README.md)
- [ats/ty2025.md](ats/ty2025.md)
- [../architecture/repository-organization.md](../architecture/repository-organization.md)
- [../../product_board.md](../../product_board.md)
- [../../forms/f1040/2025/domains/README.md](../../forms/f1040/2025/domains/README.md)

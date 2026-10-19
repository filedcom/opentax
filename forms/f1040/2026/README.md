# TY2026 Form 1040

`f1040:2026` is the shared nodes in `forms/f1040/nodes/` run with
`ctx.taxYear = 2026`, on the 2025 registry, staged return pipeline
(`2025/return-processing/execute_return.ts`), MeF builder and pending
normalization with the 2026v1.0 schema. It accepts every input TY2025 accepts;
there is no allowlist.

PDF output (`pdf/builder.ts`) prints Form 1040, Schedules 1, 1-A, 2, 3, A, B, C, D,
E and SE and Forms 2441, 6251, 8606, 8615, 8863, 8880, 8889, 8949, 8959, 8960
and 8995 on the IRS 2026 early-release drafts, fetched from `irs.gov/pub/irs-dft/` and pinned by
SHA-256 like the 2025 templates; the IRS cover sheet is dropped and the packet's
PDF Subject and the CLI say it uses draft forms. Each overlay in `pdf/forms/`
reuses the 2025 projection, built for the 2026 tax year, and renames only the
fields the 2026 form moved; new 2026 lines the engine does not model (Form 8995
line 16 minimum deduction, Schedule A lines 17a-17k, Schedule 1-A tip and
overtime rows, 2025-titled continuation statements) refuse by name.
Every other form refuses by name when the return needs it, as do refundable
credits that need Schedule 3-A (Form 1040 lines 27a-30). A redrafted IRS PDF
fails its digest until the mapping is reviewed.

Year differences live in two places, never in a 2026 copy of a node:

1. **Config.** Numbers that only changed are read from
   `CONFIG_BY_YEAR[ctx.taxYear]` (`nodes/config/index.ts`), with values in
   `nodes/config/2025.ts` and `2026.ts` and sources in
   `docs/ty2026/readiness/CONSTANTS.md`.
2. **Small 2026-only modules** where the law is new, beside the shared node and
   selected by `ctx.taxYear` (for example
   `schedule_a/limits-2026.ts`).

A node that cannot yet compute 2026 law throws its own named error for that
path (Schedule H FUTA, Form 8814), rather than computing 2025 law.

Shared code that pins a tax year (`CONFIG_BY_YEAR[2025]`, `taxYear === 2025`,
`z.literal(2025)`, a `^2025-` date pattern, a `_2025` identifier) fails
`bun run check:structure` (year-pinned). Today's occurrences are listed in
`scripts/testing/year-pinned-baseline.json`; that list is the TY2026
correctness work queue, and each fix removes its entry.

`bun run check:ty2026` runs every TY2025 `check:mef` sample return as TY2026,
with its dates, year fields and `year<YYYY>` keys moved one year later
(amounts never move).
`scripts/testing/mef-baseline-2026.json` records each return that does not
file, with why; the clean count can only rise.

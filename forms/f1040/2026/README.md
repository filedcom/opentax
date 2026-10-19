# TY2026 Form 1040

`f1040:2026` is the shared nodes in `forms/f1040/nodes/` run with
`ctx.taxYear = 2026`, on the 2025 registry, staged return pipeline
(`2025/return-processing/execute_return.ts`), MeF builder and pending
normalization with the 2026v1.0 schema. It accepts every input TY2025 accepts;
there is no allowlist. PDF output is refused.

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

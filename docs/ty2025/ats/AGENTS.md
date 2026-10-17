# docs/ty2025/ats

Notes on preparing the IRS TY2025 Form 1040 MeF ATS scenarios. The code
they describe is `forms/f1040/e2e/ats/`. Nothing here is an IRS response,
a transmission, or acceptance. Parent: [../AGENTS.md](../AGENTS.md).

## Files

- `ty2025.md` — the ATS preparation record. The top section is current
  (October 12 scenario/preparation matrix); older dated sections, the
  scenario inventory and the readiness audit follow. Read the top first; the
  file is ~100 KB, so grep `^## ` rather than reading it whole.
- `ty2025-check-replay-2026-10-09.md`, `ty2025-check-ledger-2026-10-10.md`,
  `ty2025-check-expansion-2026-10-10.md` — replay method and ledger rows from
  `ty2025_check_replay.ts` / `ty2025_check_ledger.ts`.
- `ty2025-{1040-totals,attachment-covers,native-schedules,retirement-copy-values,w2-copy-values}-2026-10-12.md`,
  `ty2025-native-values-2026-10-10.md` — one checkpoint per value family.
- `ty2025-scenario-8-source-reconciliation.md` — Scenario 8 packet conflicts.
- `ty2025-irs-clarification-draft.md` — questions for the authorized ATS
  operator to send; a draft, not sent.

## Rules

- `product_board.md` links to the anchor
  `ty2025.md#october-12-2026--current-source-and-preparation-matrix`; renaming
  that heading breaks it. Other board links point at whole files.
- Facts cite the ATS packet URL and page, as `ty2025_cases.ts` does; a
  replay `different` is reported, never "fixed" by editing the expected value.
- Counts quoted here (tests passed, matches) belong to the commit they name;
  re-run before restating them.
- Commands in these notes use `deno run …`; today run
  `bun forms/f1040/e2e/ats/ty2025_check_ledger.ts <out.json>`.

## Verify

- `bun run fmt:check`
- `bun test --timeout=1800000 ./forms/f1040/e2e/ats/` before quoting results.

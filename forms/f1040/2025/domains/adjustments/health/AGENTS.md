# Adjustments — health reconciliation (Forms 7206, 8853, 8889)

Export guards and full-return tests for the computed health forms in
`nodes/intermediate/forms/adjustments/health/`. The three folders share no
ledger; the forms meet only on Schedule 1 (13, 17, 23, 8e/8f/8z), Schedule 2
(17c–17f) and Form 5329 (Part VI Archer, Part VII HSA). Section map:
[../../../../nodes/inputs/adjustments/AGENTS.md](../../../../nodes/inputs/adjustments/AGENTS.md).

## form7206/

- `assertForm7206SpouseCoverage` (`form7206_spouse_coverage.ts`): a spouse
  recipient or spouse-covered month must match `general`/`f1040` spouse
  name and SSN. `form7206_independent_owner_source.ts` covers independent
  spouse plans and owned-SEP context. Both are also called by MeF
  `schedule1a.ts` / `f8995_joint_owner.ts`, so a change here can break
  Deductions export.
- Fixtures reuse `../../../pdf/reviews/adjustments/health/form7206_*.fixture.ts`;
  edit those, not copies.

## form8853/

- Only production module: `form8853_contributions_reconciliation.ts`.
  `assertW2ArcherContributionSources` makes any W-2 code R > 0 a filing
  obligation even with no income, deduction or tax; the MeF and PDF
  `f1040.ts`, `schedule1.ts` and `f5329.ts` serializers call this file.
- Ledger math stays in the node folder (`archer_*.ts`, `medicare_*.ts`,
  `ltc.ts`); fixtures here only build ledgers.

## form8889/

- `form8889_spouse_reconciliation.ts` holds the per-route replays
  (last-month rule, dated exception, rollover, code-2, spouse-only, paired)
  used by MeF/PDF `f8889.ts`; it imports the three
  `form8889_employer_*_source.ts` checks and the postyear file.
- `assertHsaExcessRequiredCopy` (postyear file, both builders): Schedule 1
  line 8z HSA excess or post-year employer evidence without a
  `form8889.forms` entry fails export. Pending is per owner:
  `forms[]` with `owner` (`primary`/`spouse`), `beneficiary_ssn`, `print_line*`.
- Table-driven: `form8889_history_returns.*`, `form8889_paired_returns.*`.

## Verify

- `bun test --timeout=1800000 forms/f1040/2025/domains/adjustments/health/form8889` (or `form7206`, `form8853`)
- `bun test --timeout=1800000 forms/f1040/2025/mef/forms/adjustments/health forms/f1040/2025/pdf/forms/adjustments/health`

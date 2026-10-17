# Income — end-to-end return contracts

Whole-return tests for Income forms (17 files): `business/` (1099-MISC and
1099-NEC to Schedule C, Form 3115, passive activity loss/Form 8582,
Schedule F sources), `foreign/` (Form 2555 with EIC and Schedule 1-A senior
MAGI, Form 8621), `investments/` (Form 8814 with Schedule B, Form 8815,
investment interest), `other/` (1099-MISC box 3, nonbusiness 1099-NEC,
Form 982, W-2G identity), `retirement/` (Form 8915-F). Per-form crosswalk:
[section map](../../nodes/inputs/income/AGENTS.md).

## Conventions here

- Form folders use abbreviated names (`form1099m/`, `form1099n/`, not the
  node types `f1099m`/`f1099nec`); `schedule-f/` and `earned-income/` are
  kebab-case; some tests sit at group level (`business/passive_activity_loss.test.ts`,
  `foreign/schedule1a_form2555_senior_2025.test.ts`).
- 1099-MISC and 1099-NEC each have two homes: `business/` for Schedule C
  receipts, `other/` for MISC box 3 (including its business/farm routing) and
  nonbusiness NEC on Schedule 1 line 8j.
- `investments/investment_interest.test.ts` proves Form 4952 and Form 8960
  (Deductions/Taxes) from investment income sources.
- All but `other/form982/form982_public_export.test.ts` (which uses
  `f1040_2025`) build the graph with `buildExecutionPlan` + `execute`.
- `foreign/schedule1a_form2555_senior_2025.test.ts` writes the filled PDF
  to `SCHEDULE1A_2555_REVIEW_PDF` / `SCHEDULE1A_2555_VEHICLE_REVIEW_PDF` when
  set, for human review; unset, it only asserts.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/e2e/income/<group>` (run from
  the repo root; the leading `./` makes it a path).
- On 2026-10-17, without the private `Return1040.xsd`, 29 of 71 tests failed,
  all on the missing schema (`Missing verification prerequisite`, xmllint
  "failed to load external entity", or `ENOENT` from a direct `stat`); treat
  that as unverified.

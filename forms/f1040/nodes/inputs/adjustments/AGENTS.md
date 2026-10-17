# Adjustments section map

Deductions before AGI: everything that lands in Schedule 1 Part II (lines
11–24) and reaches Form 1040 line 10 through the AGI aggregator. Four of the
section's computed forms (`form7206`, `form8853`, `form8889`,
`ira_deduction_worksheet`) live under `nodes/intermediate/` but are also
registered as singleton CLI inputs in [`2025/inputs.ts`](../../../2025/inputs.ts),
so a user can enter them directly. Node conventions: [../AGENTS.md](../AGENTS.md).

## Crosswalk

Paths are relative to this folder. Prefixes:
`int/` = [`../../intermediate/forms/adjustments/`](../../intermediate/forms/adjustments/),
`ws/` = [`../../intermediate/worksheets/adjustments/`](../../intermediate/worksheets/adjustments/),
`mef/` = [`../../../2025/mef/forms/adjustments/`](../../../2025/mef/forms/adjustments/),
`pdf/` = [`../../../2025/pdf/forms/adjustments/`](../../../2025/pdf/forms/adjustments/),
`rev/` = [`../../../2025/pdf/reviews/adjustments/`](../../../2025/pdf/reviews/adjustments/),
`dom/` = [`../../../2025/domains/adjustments/`](../../../2025/domains/adjustments/),
`e2e/` = [`../../../e2e/adjustments/`](../../../e2e/adjustments/),
`rules/` = [`../../../validation/rules/adjustments/`](../../../validation/rules/adjustments/),
`docs/` = [`../../../../../docs/ty2025/domains/adjustments/`](../../../../../docs/ty2025/domains/adjustments/).
`s1` = the Schedule 1 serializers in General/return-assembly
([mef](../../../2025/mef/forms/general/return-assembly/schedule1/schedule1.ts),
[pdf](../../../2025/pdf/forms/general/return-assembly/schedule1/schedule1.ts)).

| IRS form / line | Input node (folder) | Intermediate | MeF | PDF | Domain reconciliation | E2E / reviews | Rules | Research |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sch 1 line 11, educator expenses (no form) | `educator_expenses` ([education/educator_expenses](education/educator_expenses/index.ts)) | — | `s1` | `s1` | — | — | — | — |
| 1098-E, Student Loan Interest Statement (Sch 1 line 21) | `f1098e` ([education/f1098e](education/f1098e/index.ts)) | phase-out in [`agi_aggregator`](../../intermediate/aggregation/general/return-assembly/agi_aggregator/index.ts) | `s1` | `s1` | [dom/education/f1098e/f1098e_source_reconciliation.ts](../../../2025/domains/adjustments/education/f1098e/f1098e_source_reconciliation.ts) | — | — | — |
| 8917, Tuition and Fees Deduction (repealed after 2020) | `f8917` ([education/f8917](education/f8917/index.ts)) — always throws | — | — | — | — | — | [rules/education/f8917.ts](../../../validation/rules/adjustments/education/f8917.ts) | [context.md](education/f8917/research/context.md) |
| 2106, Employee Business Expenses (Sch 1 line 12) | `f2106` ([employment/f2106](employment/f2106/index.ts)) | — | [mef/employment/f2106.ts](../../../2025/mef/forms/adjustments/employment/f2106.ts) | [pdf/employment/f2106.ts](../../../2025/pdf/forms/adjustments/employment/f2106.ts) | [dom/employment/form2106/](../../../2025/domains/adjustments/employment/form2106/form2106_staged.ts) | — | [rules/employment/f2106.ts](../../../validation/rules/adjustments/employment/f2106.ts) | [docs/employment/form2106/](../../../../../docs/ty2025/domains/adjustments/employment/form2106/ty2025-form2106-gap.md) |
| 3903, Moving Expenses (Sch 1 line 14) | `f3903` ([moving/f3903](moving/f3903/index.ts)) | — | — (export blocked) | — (export blocked) | — | — | — | [context.md](moving/f3903/research/context.md) |
| 7206, Self-Employed Health Insurance Deduction (Sch 1 line 17) | `self_employed_health_insurance` ([health/self_employed_health_insurance](health/self_employed_health_insurance/index.ts)) — guard only; real entry is `form7206` | [int/health/form7206](../../intermediate/forms/adjustments/health/form7206/index.ts) | [mef/health/f7206.ts](../../../2025/mef/forms/adjustments/health/f7206.ts) | [pdf/health/f7206.ts](../../../2025/pdf/forms/adjustments/health/f7206.ts) | [dom/health/form7206/](../../../2025/domains/adjustments/health/form7206/form7206_spouse_coverage.ts) | [e2e/health/form7206/](../../../e2e/adjustments/health/form7206/form7206_2025.test.ts); [rev/health/form7206_*](../../../2025/pdf/reviews/adjustments/health/form7206_zero_eligible.test.ts) | [rules/health/f7206.ts](../../../validation/rules/adjustments/health/f7206.ts) | [docs/health/form7206/](../../../../../docs/ty2025/domains/adjustments/health/form7206/ty2025-form7206-gap.md), [patron owner](../../../../../docs/ty2025/domains/adjustments/health/ty2025-independent-patron-owner-health-source.md) |
| Qualified LTC premiums (Pub 502; lands on Schedule A line 1) | `ltc_premium` ([health/ltc_premium](health/ltc_premium/index.ts)) | — | — | — | — | — | — | [context.md](health/ltc_premium/research/context.md) |
| 8853, Archer MSAs and Long-Term Care Insurance Contracts (Sch 1 line 23, 8e) | — (W-2 box 12 code R via [`w2`](../income/wages/w2/index.ts)) | [int/health/form8853](../../intermediate/forms/adjustments/health/form8853/index.ts) | [mef/health/f8853.ts](../../../2025/mef/forms/adjustments/health/f8853.ts), `f8853_ltc.ts`, `f8853_ltc_statement.ts`, `f8853_medicare_statements.ts` | [pdf/health/f8853.ts](../../../2025/pdf/forms/adjustments/health/f8853.ts), `f8853_ltc.ts` | [dom/health/form8853/](../../../2025/domains/adjustments/health/form8853/form8853_contributions_reconciliation.ts) | [e2e/health/form8853/](../../../e2e/adjustments/health/form8853/form8853_medicare_2025.test.ts) | [rules/health/f8853.ts](../../../validation/rules/adjustments/health/f8853.ts) | [docs/health/form8853/](../../../../../docs/ty2025/domains/adjustments/health/form8853/ty2025-form8853-gap.md) |
| 8889, Health Savings Accounts (Sch 1 line 13, 8f) | — (W-2 box 12 code W via `w2`) | [int/health/form8889](../../intermediate/forms/adjustments/health/form8889/index.ts) | [mef/health/f8889.ts](../../../2025/mef/forms/adjustments/health/f8889.ts) | [pdf/health/f8889.ts](../../../2025/pdf/forms/adjustments/health/f8889.ts) | [dom/health/form8889/](../../../2025/domains/adjustments/health/form8889/form8889_spouse_reconciliation.ts) | [e2e/health/hsa_carryover.test.ts](../../../e2e/adjustments/health/hsa_carryover.test.ts); [rev/health/form8889_*](../../../2025/pdf/reviews/adjustments/health/form8889_spouse_patient_route.test.ts) | [rules/health/f8889.ts](../../../validation/rules/adjustments/health/f8889.ts) | [docs/health/form8889/](../../../../../docs/ty2025/domains/adjustments/health/form8889/ty2025-form8889-paired-hsa-gap.md) |
| Sch 1 line 16, SEP/SIMPLE/qualified plans (Pub 560) | `sep_retirement` ([retirement/sep_retirement](retirement/sep_retirement/index.ts)); CLI keys `sep_retirement` and `owned_sep_retirement` | owned-SEP route computed in `int/health/form7206` | `s1` | `s1` | owned SEP checked in [dom/health/form7206/form7206_independent_owner_source.ts](../../../2025/domains/adjustments/health/form7206/form7206_independent_owner_source.ts) | — | — | [docs/retirement/](../../../../../docs/ty2025/domains/adjustments/retirement/ty2025-independent-patron-owned-sep-source.md), [context.md](retirement/sep_retirement/research/context.md) |
| Sch 1 line 20, IRA deduction (Pub 590-A worksheet) | — (W-2 box 13 via `w2`; else CLI `ira_deduction_worksheet`) | [ws/retirement/ira_deduction_worksheet](../../intermediate/worksheets/adjustments/retirement/ira_deduction_worksheet/index.ts) | `s1` | `s1` | — | — | — | [context.md](../../intermediate/worksheets/adjustments/retirement/ira_deduction_worksheet/research/context.md) |

Every MeF/PDF file above has `pendingKey` equal to the node type (`f2106`,
`form7206`, `form8853`, `form8889`). Both builders
([mef](../../../2025/mef/builder.ts), [pdf](../../../2025/pdf/builder.ts))
call `assert1098EInterestSource` and `assertHsaExcessRequiredCopy` from
`dom/` and `assertRequiredLtcSource` from `mef/health/f8853_ltc.ts`.
No PDF field dump exists for Form 2106 (`2025/pdf/field-dumps/` has
`form7206.json`, `form8853.json`, `form8889.json`).

## Flow

- Each node writes its Schedule 1 line twice: once to
  [`schedule1`](../../outputs/general/return-assembly/schedule1/index.ts)
  (print) and once to `agi_aggregator` (arithmetic): `educator_expenses`
  line 11, `f2106` line 12, `form8889` line 13, `f3903` line 14,
  `sep_retirement`/`form7206` line 16, `form7206` line 17,
  `ira_deduction_worksheet` line 20, `form8853` line 23. The exception is
  `f1098e`: it sends only `line21_student_loan_interest` (≤ $2,500) to
  `agi_aggregator`, which applies the MAGI phase-out (MFS → 0) and then
  writes the allowed amount to `schedule1`.
- Same field from two writers becomes an array (`core/runtime/executor.ts`
  `mergePending`); a node's self-output (`{ nodeType: this.nodeType, … }`)
  replaces its pending slice. `form7206`, `form8853` and `form8889` use
  that self-output to publish the print fields their MeF/PDF descriptors read.
- `w2` feeds this section: box 12 code W → `form8889.w2_code_w_entries`,
  code R → `form8853.w2_code_r_entries`, box 13 →
  `ira_deduction_worksheet.covered_by_retirement_plan`.
- `form7206` inputs come from `schedule_c` (`schedule_c_source`),
  `schedule_f` (`schedule_f_source`), `schedule_se` (`schedule_se_source`,
  line 13 half-SE) and `sep_retirement` (`schedule1_line16_source`, or
  `owned_sep_plans` for the owned-SEP route, which `form7206` then computes
  and emits as line 16).
- Cross-section effects:
  - `form8889` → Schedule 1 lines 8f/8z (Income), `schedule2` lines 17c/17d
    and `form5329` Part VII (Taxes).
  - `form8853` → Schedule 1 lines 8e/8z (Income), `schedule2` lines 17e/17f
    and `form5329` Part VI (Taxes). The Schedule 1 node imports Form 8853's
    ledger schemas, and the native Form 1040/Schedule 1/Form 5329
    serializers call `form8853_contributions_reconciliation.ts`.
  - `form7206` → `form8995` (QBI reduction) and `schedule1a` (Deductions);
    the Pub 974 route also feeds `form8962` (Credits).
  - `sep_retirement` → `form8995.retirement_plan_deduction`.
  - `ira_deduction_worksheet` → `form8880` (Credits), and the nondeductible
    part → `form8606` (Income/retirement).
  - `f2106` `DISABLED_IMPAIRMENT` jobs → `scheduleA` line 16 instead of
    Schedule 1. `ltc_premium` → `scheduleA` line 1 only (never Schedule 1
    or Form 7206).
- Export gates in [`attachment_coverage.ts`](../../../2025/return-processing/attachment_coverage.ts):
  any non-empty `f3903s` blocks MeF and PDF (no Form 3903 serializer);
  `f2106` is blocked unless `isSupportedForm2106Route` holds (≤ 4 jobs, no
  actual-expense vehicle, no excess reimbursement).

## Traps

- `educator_expenses`, `ira_deduction_worksheet`: nothing routes
  `filing_status` to them, so the input must carry it. Without MFJ the
  second educator is silently dropped; the IRA worksheet throws when
  `filing_status`, `magi` or coverage is missing (MAGI is user-supplied).
- `self_employed_health_insurance` rejects any positive premium and any
  Marketplace overlap; the deduction exists only through `form7206`.
- `f3903` counts only `active_duty_military === true` moves.
- `f2106` reservist jobs contribute the reservist trip total, not line 10.
- `form8889` runs once per beneficiary (`spouse_hsa` for the second owner)
  and allowlists which downstream fields may be combined across spouses.

## Verify

- Nodes (fast): `bun test --timeout=1800000 forms/f1040/nodes/inputs/adjustments forms/f1040/nodes/intermediate/forms/adjustments forms/f1040/nodes/intermediate/worksheets/adjustments`
- Projections and returns: `bun test --timeout=1800000 <folder>` on the
  `mef/`, `pdf/`, `rev/`, `dom/` and `e2e/` folders above. Many full-return
  tests run `xmllint` against the private
  `.state/research/docs/IMF_Series_2025v5.4/…/Return1040.xsd` and fail (not
  skip) without it; only `mef/health/f8889.xsd.test.ts` skips.
- `bun run bench --form f1040 --year 2025`; cases using this section's nodes
  include `08-single-student-loan`, `37-single-w2-educator-expense`,
  `41-mfj-w2-educator-both`, `109-mfj-w2-ira-deduction-savers-credit`,
  `111-single-schedule-c-sep-ira-qbi` (`benchmark/cases/f1040/2025/`).
- Group context: [education/AGENTS.md](education/AGENTS.md),
  [dom/health/AGENTS.md](../../../2025/domains/adjustments/health/AGENTS.md).

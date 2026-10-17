# Income — wages reconciliation (TY2025)

Form 1040 lines 1a, 1b, 1h, 1i and Form 4852. Crosswalk:
[section map](../../../../nodes/inputs/income/AGENTS.md).

## What is here

- `line1h_source.ts` — `assertLine1hSupportedSource`: line 1h may combine
  W-2 code D excess deferrals (`codeDExcessDeferral`), corrective 1099-R
  distributions (`correctivePlanItems`) and foreign employer compensation,
  without counting `fec`/Form 2555 wages twice. Called by the Form 1040
  MeF/PDF serializers and `pdf/builder.ts`.
- `line1b_household_wages.ts` — `assertLine1bHouseholdWageSource` (both
  builders).
- `form4852/form4852_source.ts` — `reconcileForm4852Source`, the hub: it
  imports the Form 8606 Roth guards from `../retirement/form8606/` and is
  used by `retirement/rrb1099r_pension_reconciliation.ts`,
  `payments/withholding/w2_withholding_reconciliation.ts`,
  `mef/builder.ts` and `pdf/review_fixtures.ts`.
- `form4852/form4852_native_source.ts` — `form4852NativeSources` derives the
  transmitted W-2/1099-R copies for `mef/forms/income/other/w2.ts` and
  `retirement/f1099r.ts`; its comment forbids feeding them back into the
  calculation.
- `form4852/form4852_retained_evidence.ts`, `form4852_ira_margin.ts` —
  retained PDF evidence and IRA/SEP/SIMPLE margin checks (both builders,
  `pdf/forms/income/wages/f4852_retained.ts`).
- `line1a_w2_source_replay`, `line1i_combat_pay_source`,
  `nonstandard_w2_source`, `line1h_fec_w2_excess`,
  `line1b_household_source_replay` — whole-return tests.

## Traps

- Many tests here export MeF and validate it against the XSD; without the
  private `Return1040.xsd` 12 of 37 fail on xmllint's "failed to load
  external entity" message (observed 2026-10-17).

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/domains/income/wages`
- `bun test --timeout=1800000 ./forms/f1040/nodes/inputs/income/wages`

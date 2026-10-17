# Income — business reconciliation (TY2025)

Source checks and return tests for Schedules C/F, the business 1099s,
Forms 172, 461, 4797, 7203, 7217, 8582, and the S-corp/trust K-1s.
Crosswalk: [section map](../../../../nodes/inputs/income/AGENTS.md).

## What is here

- Business 1099 owner checks: `f1099m/`, `f1099nec/`, `f1099patr/`
  (`*_owner_reconciliation.ts`, called by the Form 1040 MeF/PDF serializers);
  `f1099k/` holds tests only.
- `business_schedule1_reconciliation.ts` — `assertBusinessSchedule1Amounts`
  replays each filed Schedule C/F net (`schedule_c/model.ts`,
  `schedule_f/index.ts` helpers) against Schedule 1; called by both builders.
- Passive and at-risk losses: `current_loss_filing_projection.ts`
  (`currentLossFilingProjection`, used by the 4797, 8582, 4835 and Schedule E
  serializers), `current_passive_line10_source.ts`,
  `current_passive_property_source.ts`, `form8582/` (packet tests and
  `assertSingleFilerActiveEntireLoss`), `passive_4797_dag.test.ts`.
- S-corp basis: `form7203/` (`form7203_stock_loss_projection.ts` feeds the
  7203 and Schedule E stock-loss serializers, Form 8995 and EIC;
  `form7203_owned_return.ts` checks required owner copies in both builders),
  `passive_s_corp_loss_calculation.ts` (called from `2025/index.ts`) and
  `passive_s_corp_loss_copies.ts`.
- `trust-k1/` — issued/native/prepared copy review of K-1 (Form 1041).
- `form7217/form7217_gain_filing.ts` — `assertForm7217GainFiling` for the
  7217 serializers; `personal_property_rental_source.ts` — Schedule 1 line 8l
  source for the Schedule 1 serializers.

## Traps

- `form172/` is a closed research area: no module there is imported outside
  the folder, except by its own tests. `stageForm172ProjectedReturn` is an
  internal full-graph rerun, not a filing route; the `nol_carryforward` input
  still throws on a positive NOL. Its two TaxNodes are baselined.
- `form7203/form7203_prior_reduced_execution.ts` is imported only by a node
  test (`nodes/intermediate/forms/income/business/form7203/debt_note.test.ts`).
- `form7203/*.fixture.ts` are source packets (basis ledger, notes, K-1)
  replayed by the matching `*_source.test.ts`;
  `form8582/form8582_farm_rental_packet.fixture.ts` is shared by five
  `form8582_*farm*` / `one_farm_two_rentals` tests.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/domains/income/business/<form>`
- `bun test --timeout=1800000 ./forms/f1040/2025/domains/income/business`
  (long; XSD-backed cases need the private schema).

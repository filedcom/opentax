# Income — business inputs

Sole-proprietor, farm-rental and business information returns: `schedule_c`,
`f1099nec`, `f1099m`, `f1099k`, `f1099patr`, `auto_expense`, `depletion`,
`f3115`, `f970`, `f4835`, `f7217`, `f8582_prior_year_record`,
`nol_carryforward`. Schedule F and Forms 461, 4797, 6198, 7203, 8582, 8824
compute in `intermediate/forms/income/business`. Crosswalk:
[../AGENTS.md](../AGENTS.md).

## Flow

- Information returns are evidence for a business, not extra income. Each
  1099 picks a destination (`for_routing` on NEC/K, `box*_routing` on MISC,
  a treatment `kind` on PATR) and sends `f1099nec_receipt_sources`,
  `f1099m_receipt_sources`, `f1099k_receipt_sources` or
  `patron_distribution_sources` keyed by `schedule_c_business_reference`.
  For the three `*_receipt_sources`, `schedule_c` throws unless exactly one
  cash-basis activity with that `business_reference` exists and its line 1
  already includes them; PATR rows are checked by `assertPatrScheduleCIncome`
  (`f1099patr/schedule_c_source.ts`), and `w2` `statutory_w2_sources` need a
  statutory-employee activity with exactly equal receipts.
- `schedule_c` → `schedule1`, `agi_aggregator`, `schedule_se`, `schedule1a`,
  `form8995`, `form8582`, `form6251` (depletion, mining, long-term contract
  adjustments), `form461`, `eitc`, `f8812`, `form7206`,
  `schedule_j_calculation`.
- `auto_expense` → Schedules C/E/F; `depletion` → Schedules C/E; `f3115` →
  `schedule_c`; `f4835` → `schedule_e`, `form8995`; `f7217` → `form8949`;
  `f8582_prior_year_record` → `schedule_e` as `filed_2024_form8582_record`.
- At-risk limits use `calculateSimplifiedAtRiskLoss` from
  `intermediate/forms/income/business/form6198/simplified.ts`, imported by
  `schedule_c/model.ts`, `f4835` and Schedule F; the `form6198` node itself is
  unreachable (baselined in `scripts/testing/structure-baseline.json`).

## Traps

- `schedule_c` rejects top-level `line1_gross_receipts`; receipts belong on a
  `schedule_cs` item.
- `nol_carryforward` throws for any positive `nol_amount`; Form 172 work lives
  in `2025/domains/income/business/form172/` (two baselined TaxNodes there).
- `f970` has no outputs (LIFO election is informational).
- `schedule_c/` split modules: `sstb_classification.ts`, `mfs_sstb_review.ts`,
  `qbi_multiple.ts`, `qbi_wotc.ts` (QBI), `mining.ts`,
  `long_term_contract.ts` (AMT sources), `model.ts` (schema).
- `f8582_prior_year_record` has no `index.test.ts` or `research/context.md`.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/nodes/inputs/income/business`
- `bun test --timeout=1800000 ./forms/f1040/e2e/income/business`
- `bun run check:structure`

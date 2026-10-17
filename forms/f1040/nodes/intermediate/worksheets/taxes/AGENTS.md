# intermediate/worksheets/taxes

`calculation/` produces Form 1040 line 16; `passthrough/` applies Form 8978's
negative adjustment. Routing: [section map](../../../inputs/taxes/AGENTS.md).

- `calculation/income_tax_calculation/` — Tax Table below $100,000, Tax
  Computation Worksheet above, QDCGT/Schedule D Tax Worksheet in
  `preferential_tax.ts`, §911(f) stacking, and the Schedule J, 4972, 8978,
  8814, 8621 and 8615 add-ons. Routes to `f1040`, `form6251`, `f8812`,
  `form_1116`, `form8978_reporting_year`, `form8615`.
- `calculation/tax_table_2025.ts` is also imported by `schedule_j_calculation`, `form_1116`, `form8582cr`.
- `calculation/qdcgtw/` is not the worksheet: it forwards `rate_28_gain` and
  `unrecaptured_1250_gain` from `rate_28_gain_worksheet` to
  `income_tax_calculation`.
- `calculation/unrecaptured_1250_worksheet/` routes to `schedule_d` through a
  `ScheduleDStubNode("schedule_d")`; importing `schedule_d` is circular.
- `passthrough/form8978_reporting_year/` (+ `form8978_negative_adjustment.ts`)
  → `schedule3.line6l_form8978_credit` and
  `f1040.form8978_schedule2_line17z_reduction`; with a negative line 14 it
  writes its worksheet back to its own pending slot, which
  `2025/domains/taxes/other/schedule2_line23_reconciliation.ts` reads.
- Multi-source keys are `accumulable(...)` and summed with `sumField`.
  `schedule_j_calculated_tax` needs `schedule_j_election_requested` (and vice
  versa); the Schedule J ordinary route throws with other line 16 add-ons.

## Verify

- `bun test ./forms/f1040/nodes/intermediate/worksheets/taxes --timeout=1800000`
- `bun test ./forms/f1040/e2e/taxes/other/tax_table_2025.test.ts --timeout=1800000`
- `bun run bench --form f1040 --year 2025` — every return goes through line 16.

# intermediate/worksheets/deductions

One worksheet, `standard/standard_deduction/` (`standard_deduction`): the
Form 1040 standard deduction worksheet plus lines 12–15. It decides standard
vs itemized and computes taxable income. Section map:
[../../../inputs/deductions/AGENTS.md](../../../inputs/deductions/AGENTS.md).

## Verified in `index.ts`

- Routed inputs only (no `inputNodes` entry): filing status and age/blind/
  dependent facts from `general`, `agi` from `agi_aggregator`, Schedule A
  totals and `itemized_taxes` from `schedule_a`, `qbi_deduction` from
  `form8995`/`form8995a`, `additional_deductions` and senior/vehicle parts
  from `schedule1a`. `nol_deduction` has no producer today.
- Amounts from `CONFIG_BY_YEAR` (`standardDeductionBase`,
  `standardDeductionAdditional`); the dependent floor (`1_350`, earned
  income `+ 450`) is a literal.
- Itemizes on `mfs_spouse_itemizing`, `force_itemized`, or Schedule A above
  standard; itemizing throws without `itemized_taxes` (Form 6251 line 2a).
- Operands are rounded first; line 15 = max(0, max(0, AGI − deduction) − QBI
  − Schedule 1-A − NOL).
- Outputs: `f1040` (12a or 12e, 15), `income_tax_calculation`,
  `schedule_j_calculation`, `form_1116`, and `form8960` 9a/9b when itemizing.
  `standardAmountFor2025` serves the Schedule A line 18 election check in
  `forms/f1040/2025/domains/deductions/itemized/schedule-a/`.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/nodes/intermediate/worksheets/deductions/`
- `bun run bench --form f1040 --year 2025` — every return passes through here.

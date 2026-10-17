# intermediate/aggregation/taxes

One aggregator, `other/schedule2/` (Schedule 2, Additional Taxes), fed by 23
nodes in the Taxes, Income, Credits and Adjustments sections (list in the
[section map](../../../inputs/taxes/AGENTS.md)).

- Field names carry the line (`line11_additional_medicare`); a line with
  several sources keeps one key per source, summed in pure helpers (line 13
  `uncollected_fica` + `uncollected_fica_gtl`, 17h, 17k). Lines 1b/1c are
  `accumulable` and the node writes their sums back to its own pending slot.
- Part I (AMT + lines 1a–1f) → `f1040.line17_additional_taxes` and
  `credit_limit_schedule2_line1z` (Part I minus AMT); Part II (line 21) →
  `f1040.line23_other_taxes`; part totals and the chapter 1 split →
  `form8978_reporting_year`. No outputs when both parts are 0.
- `line20_965_tax_installment` is accepted but kept out of line 21.
- Hard stops: nonzero line 14 (§453(l)(3)), positive line 10 in 2025, a
  generic `line17a_investment_credit_recapture`, a Form 5329 chapter 1 amount
  above its line 8 tax.
- `schedule2Part1Total`, `schedule2Part2Total`, `assertNo2025Schedule2Line10`
  and `assertNoUnsupportedSchedule2Line14` are reused by the MeF serializer
  and `2025/domains/taxes/other/`.

## Verify

- `bun test ./forms/f1040/nodes/intermediate/aggregation/taxes --timeout=1800000`
- `bun test ./forms/f1040/2025/mef/forms/taxes/other --timeout=1800000`
- `bun run bench --form f1040 --year 2025`

# TY2026 Form 1040

`f1040:2026` runs the shared nodes in `forms/f1040/nodes/` with
`ctx.taxYear = 2026` and the 2025 registry, MeF builder and pending
normalization. A return may use only the inputs listed in `supported/`; any
other input, or a `general` fact listed there as dated to TY2025, is refused
because its calculation path still applies TY2025 law. PDF output is refused.

## Design rule

TY2026 reuses the shared nodes and code. Never copy a 2025 node into a 2026
fork. Year differences live in two places:

1. **Config by `ctx.taxYear`** for numbers that only changed:
   `CONFIG_BY_YEAR[ctx.taxYear]` from `nodes/config/index.ts`, with values in
   `nodes/config/2025.ts` and `2026.ts` (sources in
   `docs/ty2026/readiness/CONSTANTS.md`).
2. **Small year-specific modules** for 2026-only law (new OBBBA lines,
   worksheets or forms), placed beside the shared node and selected by tax
   year. Shared logic stays single-source.

## Enabling an input for 2026

1. Find every 2025 literal in the input's calculation path: the input node
   and every node it routes to, through to the 1040 output. Grep for `2025`,
   the year-specific numbers, `CONFIG_BY_YEAR[2025]`, `taxYear: 2025` and
   `z.literal(2025)`.
2. Read changed numbers from `CONFIG_BY_YEAR[ctx.taxYear]`. If a number is
   missing from `F1040Config`, add it to `types.ts`, `2025.ts` (the TY2025
   value, so TY2025 output is unchanged) and `2026.ts`, each with its source.
3. Apply 2026 law differences in a small module beside the shared node, chosen
   by `ctx.taxYear`.
4. Add a 2026 test that cites the source of each expected value; keep the
   TY2025 tests passing unchanged.
5. Add the input key to its section's file in `supported/`, and remove any
   `general` field it clears from that file's `Ty2025OnlyGeneralFields`
   (`dependents` and the Form 8962 residence fields sit in `credits.ts`).
   Each section owns its file, so parallel work does not collide.

### Worked example: `educator_expenses`

`nodes/inputs/adjustments/education/educator_expenses/index.ts` caps each
educator at `PER_EDUCATOR_CAP = 300`, the TY2025 amount (Rev. Proc. 2024-40
§2.13). Rev. Proc. 2025-32 §4.12 sets $350 for 2026.

- Replace the constant with `CONFIG_BY_YEAR[ctx.taxYear].educatorExpenseLimit`
  in `compute(ctx, input)`, passing the value to the pure cap helper.
- Check its targets, `schedule1` line 11 and `agi_aggregator`, for their own
  2025 literals.
- No 2026-only law applies, so no year module is needed. A case that does
  need one, such as the 0.5% charitable floor on Schedule A, adds
  `schedule_a/charitable-floor-2026.ts` beside the node and calls it when
  `ctx.taxYear >= 2026`.
- Test: a TY2026 MFJ return with two educators spending $400 each deducts
  $700 (Rev. Proc. 2025-32 §4.12); the TY2025 test still expects $600.
- Add `"educator_expenses"` to `supported/adjustments.ts`.

## Work queue

The 192 TY2025 inputs not yet enabled, from `forms/f1040/2025/inputs.ts`,
grouped by the return section of the node each input key enters
(`nodes/<role>/<section>/...`). Enabled: `general`, `w2`, `f8888`.

### general (25)

`amendment_request`, `f1310`, `f2120`, `f4547`, `f5471`, `f56`, `f8082`, `f8275`, `f8332`, `f8822`, `f8833`, `f8840`, `f8843`, `f8854`, `f8854_annual`, `f8858`, `f8867`, `f8886`, `f8938`, `f8958`, `f8997`, `f9000`, `preparer`, `schedule_b_part_iii`, `schedule_lep`

### income (54)

`alimony_received`, `auto_expense`, `benefit_1042s`, `clergy`, `depletion`, `education_income`, `f1099b`, `f1099c`, `f1099div`, `f1099g`, `f1099int`, `f1099k`, `f1099m`, `f1099nec`, `f1099oid`, `f1099patr`, `f1099r`, `f3115`, `f3921`, `f4835`, `f4852`, `f4852_reviewed_source`, `f7217`, `f8621`, `f8814`, `f8873`, `f8915d`, `f8915f`, `f8949`, `f970`, `fec`, `form2555`, `form4797_investment_1245`, `form4797_prior_history`, `form6252`, `form6781`, `form8582_prior_year_record`, `form8815`, `form8824`, `household_wages`, `k1_partnership`, `k1_s_corp`, `k1_trust`, `lump_sum_ss`, `nol_carryforward`, `personal_property_rental`, `ppp_forgiveness`, `rrb1099r`, `schedule_c`, `schedule_d`, `schedule_e`, `schedule_f`, `ssa1099`, `w2g`

### adjustments (14)

`educator_expenses`, `f1098e`, `f2106`, `f3903`, `f8917`, `form7206`, `form8853`, `form8889`, `ira_deduction_worksheet`, `ltc_premium`, `owned_sep_retirement`, `self_employed_health_insurance`, `sep_retirement`, `student_loan_interest_records`

### deductions (17)

`f1098`, `f1098_cashout_refinance_review`, `f1098_mortgage_limit_review`, `f1098_purchase_points_cross_loan_review`, `f59e`, `f8283`, `form4562`, `form4684`, `form4952`, `form8990`, `form_8829`, `mortgage_refinance_points`, `qbi_aggregation`, `qbi_patron`, `sales_tax_deduction`, `schedule1a`, `schedule_a`

### credits (49)

`f1095a`, `f2441`, `f3468`, `f3800`, `f4136`, `f5695`, `f5884`, `f6478`, `f6765`, `f7207`, `f8609`, `f8801`, `f8812`, `f8812_credit_limit_worksheet`, `f8812_earned_income_worksheet`, `f8820`, `f8826`, `f8834`, `f8835`, `f8844`, `f8859`, `f8862`, `f8863`, `f8863_claimant_review`, `f8863_credit_limit_worksheet`, `f8864`, `f8874`, `f8874_recapture`, `f8881`, `f8882`, `f8896`, `f8908`, `f8911`, `f8912`, `f8936`, `f8941`, `f8994`, `form1116_carryover_review`, `form1116_prior_carryover`, `form1116_review`, `form1116_schedule_c_source`, `form2441`, `form3800_current_orphan_allocation`, `form3800_current_production_allocation`, `form8396`, `form8582cr`, `form8839`, `qsehra`, `schedule_r`

### taxes (23)

`ct2`, `f2210`, `f2210f`, `f4255`, `f453a_interest`, `f4970`, `f5405`, `f8611`, `f8615`, `f8697`, `f8828`, `f8866`, `f8965`, `f8978`, `f965`, `form4137`, `form4972`, `form5329`, `form6251_prior_iso_sale`, `form8919`, `form8960_additional_modifications`, `schedule_h`, `schedule_j`

### payments (10)

`ext`, `f1040es`, `f2439`, `f8288`, `f8379`, `f843`, `f8805`, `f8857`, `f9465`, `payment_request`

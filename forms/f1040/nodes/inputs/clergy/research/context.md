# Clergy — Ministerial Income Computations

## Overview

This node captures clergy/ministerial income data for ministers of the gospel. Ministers have a dual-status tax treatment: they are employees for federal income tax (W-2) but self-employed for self-employment (SE) tax on their ministerial services.

**Key rules (IRS Pub 517, 2025):**
- A housing (rental) allowance is excludable from gross income (IRC §107(2)) only up to the **smallest** of: (a) the amount officially designated in advance, (b) the amount actually used to provide the home, and (c) the fair rental value of the home, furnished, plus utilities. Pub 517 also caps it at reasonable pay for services; that limit is not modeled.
- Churches normally leave the designated allowance **out of W-2 box 1**. The minister then includes only the **excess** allowance (paid above the smallest of the limits) in income, on Form 1040 line 1h, with "Excess allowance" on the dotted line.
- A parsonage provided in kind is excluded under §107(1) and never appears in box 1.
- For SE tax, the housing allowance and the fair rental value of a parsonage (plus utilities) are **included** in net earnings from self-employment (IRC §1402(a)(8); Pub 517 "Figuring Net Earnings"). Unreimbursed ministerial business expenses are deducted in full; the Deason allocation to tax-free income applies to income tax only (Pub 517 "Expenses Allocable to Tax-Free Income").
- Ministers with an approved Form 4361 are exempt from SE tax on ministerial earnings. Other self-employment income (e.g. a non-ministerial Schedule C) is unaffected.

**Wires to:** `schedule_se.ministerial_se_earnings` (ministers without Form 4361); `f1040` + `agi_aggregator` `line1h_other_earned` (excess allowance); `schedule1.line8z_other_income` (negative exclusion, only when the allowance was included in box 1).

**IRS Form:** Pub 517 worksheets
**Node Type:** input
**Tax Year:** 2025

---

## Input Fields

| Field | Type | Description | IRS Reference |
| ----- | ---- | ----------- | ------------- |
| `ministerial_wages` | number ≥ 0 | Ministerial wages (W-2 box 1). Used only for SE earnings; income tax takes wages from the `w2` node. | Pub 517 |
| `housing_allowance_designated` | number ≥ 0 | Amount officially designated in advance as a housing allowance. | IRC §107(2) |
| `housing_allowance_paid` | number ≥ 0 | Allowance actually paid this year. Defaults to the designated amount. | Pub 517 |
| `housing_allowance_included_in_w2_box1` | boolean | True only if the church included the allowance in box 1 (uncommon). | Pub 517 |
| `actual_housing_expenses` | number ≥ 0 | Amount actually used to provide the home (rent or mortgage, utilities, repairs, furnishings). | IRC §107(2) |
| `fair_market_rental_value` | number ≥ 0 | Fair rental value of the home, furnished, plus utilities. | IRC §107(2) |
| `parsonage_value` | number ≥ 0 | Fair rental value (plus utilities) of a church-provided parsonage. | IRC §107(1), §1402(a)(8) |
| `unreimbursed_ministerial_expenses` | number ≥ 0 | Unreimbursed ministerial business expenses, deducted in full against SE earnings. | Pub 517 |
| `has_4361_exemption` | boolean | Approved Form 4361: no SE tax on ministerial earnings. | IRC §1402(e) |
| `is_ordained_minister` | boolean | Must be true for any clergy treatment. | IRC §107, §1402(c)(4) |

---

## Calculation Logic

1. **Eligibility.** Items without `is_ordained_minister === true` produce no outputs.
2. **Allowance paid.** `paid = housing_allowance_paid ?? housing_allowance_designated ?? 0`.
3. **Allowable exclusion.** `allowable = min(designated, paid, actual, fair_rental_value)`. A missing actual-expense or rental-value figure counts as zero, so nothing is excluded until both are entered.
4. **Excess allowance (normal case, allowance not in box 1).** `excess = max(0, paid − allowable)` → `f1040.line1h_other_earned` and `agi_aggregator.line1h_other_earned`.
5. **Allowance in box 1.** Subtract `allowable` on `schedule1.line8z_other_income`; no line 1h amount.
6. **SE earnings (no Form 4361).** `ministerial_wages + (allowance not in box 1 ? paid : 0) + parsonage_value − unreimbursed_ministerial_expenses` → `schedule_se.ministerial_se_earnings`. A loss remains negative and offsets Schedule C profit on line 2 before the 92.35% factor and the $400 test.

---

## Output Routing

| Field | Destination | Condition |
| ----- | ----------- | --------- |
| `ministerial_se_earnings` | `schedule_se` | ordained, no Form 4361, earnings other than 0 |
| `line1h_other_earned` | `f1040`, `agi_aggregator` | ordained, allowance not in box 1, excess > 0 |
| `line8z_other_income` (negative) | `schedule1` | ordained, allowance in box 1, allowable > 0 |

---

## Edge Cases & Special Rules

1. **Spending above the designation** creates no deduction; the exclusion is capped at the designated amount.
2. **Form 4361 with an excess allowance:** the excess is still taxable income on line 1h; there is still no SE tax on it.
3. **Parsonage plus cash allowance:** both can exist. The parsonage needs no income adjustment; both count in SE earnings when there is no Form 4361.
4. **Separate Schedule SE field:** ministerial earnings use `ministerial_se_earnings` rather than `net_profit_schedule_c`, so they don't collide with Schedule C's deposit and stay out of QBI, Form 7206, and Form 8990 routes that read Schedule C profit.
5. **Shared line 1h:** clergy, foreign employer compensation, and Form 2555 deposits accumulate; Form 1040 and AGI sum them, and the finalized return carries a scalar line 1h.
6. **Not modeled:** the reasonable-compensation ceiling; the Schedule SE line A checkbox; the "Excess allowance" literal next to line 1h; the attached explanation Schedule SE requires for ministerial wages and expenses.

---

## Sources

| Document | Year | URL |
| -------- | ---- | --- |
| IRS Publication 517 | 2025 | https://www.irs.gov/publications/p517 |
| Instructions for Schedule SE | 2025 | https://www.irs.gov/instructions/i1040sse |
| IRC §107 | Current | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section107 |
| IRC §1402 | Current | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section1402 |
| Form 4361 | Current | https://www.irs.gov/pub/irs-pdf/f4361.pdf |

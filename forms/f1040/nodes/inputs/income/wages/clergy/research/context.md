# Clergy — Ministerial Income Computations

## Overview

This node takes one row per church W-2 for a minister of the gospel and files
the housing allowance and ministerial self-employment (SE) earnings only from
sourced, reconciled facts. Ministers are employees for income tax (W-2) but
self-employed for SE tax on ministerial services (Pub 517). Every row names the
minister, the church and its W-2, and the record behind each amount; anything
missing, inconsistent or unsupported fails closed.

**Key rules (IRS Pub 517; Instructions for Schedule SE (2025)):**
- A housing (rental) allowance is excludable from gross income (IRC §107(2)) only up to the **smallest** of: (a) the amount officially designated in advance of payment, (b) the amount actually used to provide the home, and (c) the fair rental value of the home, furnished, plus utilities. Pub 517 also caps it, and a parsonage's exclusion, at reasonable pay for services; the engine cannot judge that, so the minister attests to it (`not_more_than_reasonable_pay_confirmed: true`).
- The church leaves the designated allowance **out of W-2 box 1**. The minister includes only the **excess** (allowance paid above the smallest limit) on Form 1040 line 1h; Pub 517: "On the dotted line next to line 1h, enter 'Excess allowance' and the amount."
- A parsonage provided in kind is excluded under §107(1) and needs no income adjustment.
- Without an approved Form 4361, ministerial wages, the **whole** allowance paid, and the parsonage's fair rental value plus utilities, less unreimbursed ministerial expenses **in full**, are net earnings from self-employment on Schedule SE line 2 (i1040sse 2025, "Ministers, Members of Religious Orders, and Christian Science Practitioners"; Pub 517, "Figuring Net Earnings" and "Expenses Allocable to Tax-Free Income": the allocation to tax-free income reduces income-tax deductions only). Expenses subtracted there need an attached explanation (i1040sse: "subtract on line 2 the allowable expenses ... and attach an explanation"; Pub 517, "Allowable deductions"). The result can be a loss, which reduces other line 2 earnings (i1040sse, "More Than One Business").
- With an approved Form 4361, ministerial earnings are exempt from SE tax. With no other income subject to SE tax, check box 1 for Form 4361 on Schedule 2 line 4; with $400 or more of other SE earnings, check Schedule SE line A (i1040sse 2025). The excess allowance stays line 1h income.
- Ministerial wages are not FICA wages (Pub 517, Table 1: a minister's earnings are not covered under FICA), so the church W-2 shows no social security or Medicare wages.

**Wires to:** `f1040` and `agi_aggregator` `line1h_other_earned` (excess
allowance); `schedule_se.ministerial_sources` (one owned row per W-2, without
Form 4361).

**IRS Form:** Pub 517 worksheets; Form 1040 line 1h; Schedule SE line 2 and line A; Schedule 2 line 4 box 1; Form 1040 line 27b
**Node Type:** input
**Tax Year:** the return year (`ctx.taxYear`); every row carries `tax_year`

---

## Input Fields

All objects are strict; amounts in whole dollars except `ministerial_wages`,
which equals the W-2's box 1.

| Field | Type | Description | IRS Reference |
| ----- | ---- | ----------- | ------------- |
| `tax_year` | integer | Must equal the return year. | |
| `minister.owner` | `taxpayer` \| `spouse` | Whose ministry; a spouse needs a joint return. | |
| `minister.name`, `minister.ssn` | string | Must match the return's taxpayer or spouse. | |
| `minister.credential` | `ORDAINED` \| `COMMISSIONED` \| `LICENSED` | Status that makes the minister eligible. | Pub 517 |
| `minister.ordained_commissioned_or_licensed_confirmed`, `minister.ministerial_services_confirmed` | `true` | Attestations; anything else fails. | IRC §107, §1402(c)(4) |
| `minister.credential_reference` | string | Ordination, license or commission record. | |
| `employer.employer_name`, `employer.employer_ein`, `employer.w2_reference` | string | The church and its entered W-2 (`source_document_reference`). | |
| `ministerial_wages` | number ≥ 0 | Equals that W-2's box 1. A W-2 mixing other pay fails closed. | Pub 517 |
| `housing_allowance.included_in_w2_box1` | boolean | `true` fails closed: the church must issue a Form W-2c. | |
| `housing_allowance.designation` | `{ amount, designated_on, effective_from, designation_reference }` | Designated before the period it covers (`designated_on ≤ effective_from`), covering the return year. | IRC §107(2); Pub 517 "Designation requirement" |
| `housing_allowance.paid` | `{ amount, payment_records_reference, paid_after_designation_confirmed: true }` | Allowance paid in the year. | Pub 517 |
| `housing_allowance.actual_housing_expenses` | `{ amount, expense_records_reference }` | Amount actually used to provide the home. | IRC §107(2) |
| `housing_allowance.fair_rental_value` | `{ amount, furnished_plus_utilities_confirmed: true, fair_rental_value_reference }` | Fair rental value, furnished, plus utilities. | IRC §107(2) |
| `housing_allowance.not_more_than_reasonable_pay_confirmed` | `true` | The allowance is not more than reasonable pay for the services. | Pub 517 "Rental allowances" |
| `parsonage` | `{ fair_rental_value_plus_utilities > 0, fair_rental_value_reference, not_more_than_reasonable_pay_confirmed: true }` | Home provided in kind; the exclusion is not more than reasonable pay. | IRC §107(1), §1402(a)(8); Pub 517 "Fair rental value of parsonage" |
| `unreimbursed_ministerial_expenses` | `{ amount > 0, not_reimbursed_confirmed: true, expense_records_reference }` | Reduces SE earnings in full; ignored with Form 4361. | Pub 517 "Allowable deductions"; i1040sse |
| `form4361` | `{ approved: false }` or `{ approved: true, approved_on, approval_reference }` | Approved exemption from SE tax on ministerial earnings; every row for one minister must agree. | IRC §1402(e) |

The start node adds two context fields, `return_filer` (the general filer
identity) and `return_w2s` (the entered W-2s), so the node reconciles each row
before it routes anything and a mismatch surfaces as a calculation diagnostic.
Export reconciles the retained rows again, as Form 2106 does.

---

## Calculation Logic

1. **Reconcile.** `tax_year` equals the return year; the minister's SSN and name match the return's taxpayer or (joint only) spouse (names compare without case, periods, commas, extra spaces, leading Rev./Reverend/Pastor/Dr./Fr. or trailing Jr./Sr./II/III/IV); rows for one minister agree on Form 4361; exactly one entered W-2 has the minister's SSN, the church's EIN and name, `source_document_reference === w2_reference`, box 1 equal to `ministerial_wages`, no statutory-employee box and no box 3 or box 5 wages; each row uses its own W-2.
2. **Box 1 allowance.** `included_in_w2_box1: true` throws (W-2c needed).
3. **Allowable exclusion.** `min(designated, paid, actual, fair rental value)`.
4. **Excess allowance.** `paid − allowable`, summed over rows → `f1040` and `agi_aggregator` `line1h_other_earned`.
5. **Ministerial SE earnings (no Form 4361).** `wages + paid + parsonage − expenses` per row (with Form 4361 the expenses are ignored), as `{ recipient: T|S, source_reference: "ministerial <w2_reference>", net_earnings }` → `schedule_se.ministerial_sources`. Zero rows are omitted; losses stay negative.

`schedule_se` adds the rows to line 2 (per owner on a joint return). QBI,
Form 7206 and Schedule 1-A receive no SE deduction from ministerial earnings:
pay for ministerial services is not a trade or business. Beside Schedule C,
Schedule F or partnership earnings (export-blocked), they receive the line 13
figured on those earnings alone, a provisional split.

---

## Output Routing

| Field | Destination | Condition |
| ----- | ----------- | --------- |
| `line1h_other_earned` | `f1040`, `agi_aggregator` | total excess > 0 |
| `ministerial_sources` | `schedule_se` | a row without Form 4361 with nonzero earnings |

---

## Filing (MeF and PDF)

`forms/f1040/2025/domains/income/wages/clergy/clergy_source.ts` reconciles the
retained rows again at export, against the retained general and W-2 sources,
the finalized Schedule SE rows and Schedule 2, and decides what prints:

| Item | MeF | PDF (2025) |
| ---- | --- | ---------- |
| Line 1h "Excess allowance" | `OtherEarnedIncomeAmt` referencing `WagesNotShownSchedule` with `OtherWagesNotShownTxt` "EXCESS ALLOWANCE" | line 1h type "EXCESS ALLOWANCE" |
| Schedule SE line 2 | `NetNonFarmProfitLossAmt` includes the ministerial earnings | `f1_5` |
| Line 2 explanation (when expenses are subtracted) | `AllowableSEExpenseExplnStmt` referenced from the `IRS1040ScheduleSE` root | supplemental page after Schedule SE |
| Schedule SE line A | `ExemptForm4361Ind` | `c1_1` |
| Schedule 2 line 4 box 1 | `ExemptForm4361Ind` | `Line4_ReadOrder.c1_3` |
| Form 1040 line 27b | `ClergyMemberInd` | `c2_12` |

Attachment coverage blocks export for rows that do not parse, do not reconcile
to their context, or carry the allowance in W-2 box 1.

---

## Edge Cases & Special Rules

1. **Spending above the designation** creates no deduction; the exclusion stops at the designated amount.
2. **Form 4361 with an excess allowance:** the excess is line 1h income; there is no ministerial SE earnings row.
3. **Parsonage plus cash allowance:** both may exist; the parsonage needs no income adjustment and both are SE earnings without Form 4361.
4. **Two churches:** one row per W-2; each W-2 is used once.
5. **Fails closed (calculation):** missing or blank evidence, a designation after the period it covers, a W-2 mismatch or FICA wages on the church W-2, an allowance in box 1, a spouse minister on a non-joint return, a wrong-year row.
6. **Fails closed (export):** ministerial earnings beside Schedule C, Schedule F or partnership SE earnings anywhere on the return, including a spouse's (the QBI, Form 8995-A, Schedule 1-A and Form 7206 export guards that replay owner Schedule SE sources are not ministerial-aware); Form 4361 with other SE earnings under $400, or with no other SE income beside another person's Schedule SE, such as a spouse's (Schedule 2 line 4 presentation not confirmed); a Schedule C marked `clergy_schedule_c`; any earned income credit; an additional child tax credit beside ministerial SE earnings (the clergy earned-income rules are not modeled); line 1h mixed with another line 1h source.
7. **Attested, not computed:** the reasonable-pay ceiling.
8. **Not modeled:** retired ministers' allowances; ministerial fees and honoraria on Schedule C; the EIC and Schedule 8812 clergy earned-income rules; clergy earned income for Form 2441, IRA and SEP compensation and Form 7206 (ministerial SE earnings are not added; not blocked).

---

## Sources

| Document | Year | URL |
| -------- | ---- | --- |
| IRS Publication 517 | 2025 | https://www.irs.gov/publications/p517 |
| Instructions for Schedule SE | 2025 | https://www.irs.gov/instructions/i1040sse |
| Instructions for Form 1040 (line 1h, line 27b) | 2025 | https://www.irs.gov/instructions/i1040gi |
| IRC §107 | Current | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section107 |
| IRC §1402 | Current | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section1402 |
| Form 4361 | Current | https://www.irs.gov/pub/irs-pdf/f4361.pdf |

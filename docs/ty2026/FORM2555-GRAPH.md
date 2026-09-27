# TY2026 Form 2555 foreign earned income and housing contract

Sources: pinned [2026 draft Form 2555](corpus/draft/f2555.pdf), SHA-256
`4057a14f7d9ed31a328c6a7ccb4e17d127addd4d3b0be05cf85a78320eb7e775`,
[2026 draft instructions](corpus/draft/i2555.pdf), and final [Notice
2026-25](corpus/authorities/n-26-25.pdf) for location-specific foreign
housing limits. The form and instructions are drafts; refresh them before
release. Form 2555 is outside the seven linked 1040 ATS packets, so it needs
independent full-return fixtures.

## Source facts and calculated lines

| Form area | Required source and decision | Filed handoff |
| --- | --- | --- |
| Parts I–III | Owner-specific identity, citizenship/nationality, foreign tax home and employer, prior exclusion/revocation, qualifying bona fide residence **or** 330 full days in a 12-month physical-presence period, travel/U.S. workdays, and any separate household. The tax-home test is required in either route. | Validate a complete election and dates, including period overlap with TY2026. Do not infer physical presence from a count alone; distinguish U.S. workdays and foreign travel. Use separate forms for spouses when both claim. |
| Part IV, lines 19–26 | 2026 foreign wages, professional/partnership service income, noncash benefits and allowances, sourced to work performed abroad and converted to U.S. dollars at the applicable receipt time. Exclude U.S.-business-day earnings and qualifying meals/lodging already excluded under §119. | Include taxable gross income once on Form 1040/Schedule C or the applicable source before the Form 2555 exclusion. Foreign income tax withheld is **not** U.S. federal withholding on Form 1040 lines 25a/b. |
| Part VI, lines 28–36 | Eligible housing expenses, location/day limit, base housing amount and employer-provided share. 2026 ordinary full-year expense ceiling is **$39,870**; location limits come from Notice 2026-25. Base is **$21,264** for 365 days, or **$58.26 per qualifying day** as printed on line 32. | Employer-funded housing exclusion line 36; do not add an uncapped expense amount to the earned-income exclusion. For self-employed housing, compute Part IX deduction separately. |
| Part VII, lines 37–42 | Annual foreign earned income exclusion ceiling **$132,900** per qualifying person, prorated by qualifying days; line 42 is limited by line 41 after housing exclusion. | Part VIII line 43. The 2026 instructions and form specify ratio/whole-dollar rounding; verify line 38/39/40 before asserting an amount. |
| Part VIII, lines 43–45 | Line 43 combines housing and earned-income exclusions; line 44 removes AGI deductions allocable to excluded income; line 45 is the remaining exclusion. | **Schedule 1 line 8d** (negative additional income), then 1040 line 8/AGI. Supply the Foreign Earned Income Tax Worksheet input so excluded income is stacked for tax on remaining income. |
| Part IX, lines 46–50 | Self-employed share of housing amount after the line 36/43 restrictions and any allowed **2025-origin** housing deduction carryover. | **Schedule 1 line 24j** adjustment → 1040 line 10/AGI. Carry the origin year and unused amount forward; do not place this deduction on Schedule 1 line 8d. |

The [PDF field inventory](pdf-fields-f2555.csv) has **160** widgets, all in
the field tree. The draft PDF has a coversheet and three form pages. On form
page 3 (PDF page 4), line 29b is `Page3.f3_4[0]`, line 32 is `f3_7[0]`,
line 37 is `f3_13[0]`, line 45 is `f3_22[0]`, and line 50 is `f3_27[0]`.
The CSV gives complete names, tooltips and coordinates. Map all completed
parts, checkboxes, travel and housing rows, and required statements rather
than copying the TY2025 descriptor's five approximate fields.

## Current code boundary

- `form2555` is absent from the TY2026 registry. Its shared node's
  `filing_details` path calls `calculatePhysicalPresence2555`, which **throws
  for every year other than 2025**. The broad aggregate path can calculate
  amounts with 2026 config, but the TY2025 MeF serializer rejects aggregate
  inputs because they lack filing details; it is not a filed TY2026 path.
- `2026-indexed.ts` has the correct $132,900 ceiling and $21,264 base, but
  the aggregate `housingAmount` adds employer housing to expenses above the
  base without the Notice 2026-25 **location/day cap**, employer-share ratio,
  or Part IX sequence. It also omits the 2025 housing deduction carryover.
- The aggregate node sends housing deduction through
  `line8d_foreign_housing_deduction`; the dedicated TY2026 Schedule 1 node
  **rejects** a positive value for that legacy key. The 2026 destination is
  line 24j. The aggregate path also sends foreign self-employment earnings
  to the TY2025 Schedule SE object, and exclusion to the shared income-tax
  node; audit both 2026 destinations and preserve SE tax on excluded SE
  earnings.
- The structured TY2025 path handles only uninterrupted physical presence,
  a foreign employer with no W-2, no housing claim, no travel, no previous
  election, and zero allocable deductions. Bona fide residence, mixed
  employee/SE income, location-specific housing, spouse forms and changes
  of tax home still need source facts and filing calculations.
- The TY2025 PDF descriptor fills five fields and is not a complete 2026
  attachment. The TY2025 MeF serializer hardcodes 2025 calculation and a
  subset of fields. The current TY2026 XSD, document order, statement
  references and multiple-form rules are an output gate.
- The TY2025 `foreign_employer_wages.ts` module has **two** MeF descriptors:
  `FECRecord` and `WagesNotShownSchedule`. It derives both from
  `form2555.filing_details`. The public TY2026 attachment workbook lists
  them at form level (row 191) and line 1h (row 804), respectively. A foreign
  employer's wages are a source record whether or not the taxpayer claims
  §911; do not make the income record contingent on a Form 2555 election.
  Confirm the selected XSD's filing conditions and references before
  emitting either document.

## Dependencies and acceptance cases

1. Build owner-keyed Form 2555 eligibility and income records, preserving
   wages/SE/activity identity so the 1040 gross-income line and Schedule 1
   exclusion cannot double-count or omit income. Use the completed Part IV
   amount as the exclusion ceiling, not a free-standing aggregate amount.
2. Calculate housing expenses per location and qualifying period using the
   pinned notice table; split employer-funded exclusion and self-employed
   deduction, compute Parts VI–IX, and reconcile any 2025 carryover. Route
   line 45 to Schedule 1 line 8d and line 50 to line 24j. Carry excluded
   income into the tax worksheet and Form 1116's foreign-tax reduction;
   preserve Schedule SE on excluded foreign self-employment income. See the
   [Form 1116 contract](FORM1116-GRAPH.md).
3. Render every required 2026 form page and statement, then build current
   TY2026 MeF XML from the authorized XSD. Reconcile Form 2555 lines 45/50
   to Schedule 1 and 1040, and verify the same amount enters the tax
   worksheet and foreign-tax-credit exclusion calculation.
4. Test $132,900 full-year and part-year limits, exactly 329/330 physical
   days, bona fide residence, U.S. business days, ordinary and adjusted
   housing locations, employer/SE split, 2025 carryover, two spouses,
   foreign tax withheld, and 2025/TY2026 regression. A completed 1040 total
   without a complete Form 2555 PDF/XML attachment is not an accepted case.

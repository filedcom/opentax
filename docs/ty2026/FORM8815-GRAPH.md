# TY2026 Form 8815 savings-bond education exclusion contract

Source snapshot: [IRS draft Form 8815 (2026)](corpus/draft/f8815.pdf),
SHA-256 `c7e4cdb44c8b734b9c62a214755b41b21e189238283632e2ddd20c3d6b9eeaa7`,
and [2026 draft instructions](corpus/draft/i8815.pdf), SHA-256
`931b0f01c17f81500124e8ad859ff03948cd788f936936ae6c3e9d02fd4c5257`.
The form gives 2026 phaseout thresholds and routes its line 14 to Schedule B
line 3. Recheck final PDFs and the selected 2026 MeF package before filing.

## Source ledger and eligibility

Keep each redeemed Series EE/I bond with owner, serial number, issue and
redemption dates, original age of owner, face value, proceeds and interest
already reported in prior years. Qualifying bonds were issued after 1989,
in the taxpayer's (or permitted spouse's) name when age 24 or older before
issue. Keep the person receiving education, their dependency status, each
school/ESA/QTP name and address, expense date/type, tuition/fees or eligible
account contribution, tax-free education benefit, and allocation to Form
8863 or nontaxable ESA/QTP distributions. Exclude room/board and amounts
already used for another tax benefit. MFS does not qualify.

## Printed form and graph route

| Area | Calculation and route |
| --- | --- |
| Line 1 | List each eligible student/dependent and school, Coverdell ESA, or QTP; attach a continuation statement if the three printed rows are insufficient. |
| Lines 2–4 | Sum qualifying expenses and subtract nontaxable educational benefits, without double-counting expenses used for education credits or tax-free distributions. Stop at zero or less. |
| Lines 5–8 | Sum 2026 redemption proceeds and eligible interest; use the line 6 worksheet if interest was reported before redemption. Line 7 is the smaller of 1 and line 4 / line 5, rounded to at least three decimal places. Line 8 is interest times this ratio. |
| Lines 9–14 | Derive modified AGI from the printed worksheet, including Form 2555/4563 and other listed addbacks and the special Schedule E royalty-interest computation where relevant. For single, HOH and **qualifying surviving spouse**, phaseout is **$101,800–$116,800** over $15,000. For MFJ it is **$152,650–$182,650** over $30,000. Line 14 is line 8 less phased-out line 13 and goes to Schedule B line 3, reducing taxable interest on line 4 and 1040 line 2b. |

The source interest must first appear in Schedule B's payer/interest total;
the line 14 exclusion then subtracts from that total exactly once. If no
Schedule B would otherwise be required, its attachment obligation still
needs review for this election. Coordinate Form 8863, ESA and QTP expense
allocations before computing Form 8815.

## Current code boundary

- Shared `form8815` computes a basic proportional exclusion and outputs
  `ee_bond_exclusion` to Schedule B. Its 2026 config has the correct printed
  start/end numbers, but `phaseoutRange` groups **QSS with MFJ**, contrary
  to the 2026 form. It also accepts supplied `modified_agi`, expenses and
  interest without deriving or verifying their source; missing MAGI defaults
  to zero and missing proceeds defaults to interest. It emits no Form 8815
  attachment, line details, student/school identity or continuation.
- The TY2025 PDF descriptor maps `ee_bond_interest`, `bond_proceeds` and
  `qualified_expenses` into **line 1 student/institution text fields**. It
  cannot be used for the 2026 attachment. The [2026 field inventory](pdf-fields-f8815.csv)
  has **23 terminal text widgets**, including three line 1 pairs and split
  decimal fields for lines 7 and 12. TY2025 MeF emits only four aggregate
  amounts and needs current-year XSD/statement review. Form 8815 is absent
  from the TY2026 registry and PDF/MeF routes.

## Build order and acceptance

1. Refresh final 2026 form/instructions and MeF XSD/rules; verify the
   Schedule B line 3 and 1040 line 2b handoff.
2. Build bond and qualified-expense ledgers with identity, eligibility,
   prior-year interest, education-benefit and Form 8863/ESA/QTP allocations.
   Compute modified AGI from the specified return lines/addbacks; resolve
   any PTC/self-employed insurance and IRA worksheet order.
3. Compute lines 2–14, including QSS at the single/HOH threshold,
   at least three-decimal ratios, zero/full phaseout boundaries and the
   prior-reported-interest worksheet. Reconcile line 14 with Schedule B.
4. Fill/render all form fields and any line 1 continuation; emit current
   `IRS8815` and test XSD/active rejects. Cover single, HOH, QSS, MFJ,
   MFS, age/ownership, partial expenses, zero expenses, tax-free benefit,
   prior-year interest, overlapping 8863/QTP benefit, multiple students,
   foreign-income MAGI addback, and TY2025 regression.

This is a research and implementation contract, not registered TY2026
filing support.

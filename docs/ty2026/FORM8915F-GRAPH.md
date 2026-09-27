# TY2026 Form 8915-F disaster retirement distribution contract

Source snapshot: [IRS draft Form 8915-F (Rev. December 2026)](corpus/draft/f8915f.pdf),
SHA-256 `fc0b5061b2f868a766b681f70953eea888085dd5301a8489d79fa4b949a7f556`.
The expected draft instruction URL still serves December 2025; pin the
[December 2025 instructions](corpus/authorities/i8915f--2025.pdf), SHA-256
`01720eac68072a62e76b8ef55df4740cefde28aa9623ccc73d3f4fd0d7af654a`,
only as a comparator. Obtain 2026 instructions, final form and current MeF
XSD/rules before filing. The form has a 2026 tax-year checkbox and covers
2021-and-later disaster years, with separate forms by spouse and disaster
beginning year as directed on the form.

## Filing unit and history

Keep an owner/spouse × disaster-year × FEMA-number ledger, with declaration,
beginning and ending dates; affected residence; each 1099-R source/account,
distribution date, gross/taxable amount and basis; retirement-plan, traditional
IRA and Roth IRA categories; prior Form 8915-F elections, taxable amounts,
repayments and remaining three-year inclusion. Link each repayment to its
original distribution, recipient plan and date. Part IV main-home distributions
have their own qualified-distribution and repayment period. A disaster label
or an aggregate `total_distribution` cannot establish eligibility or avoid
claiming the same distribution on two Forms 8915-F.

## Printed parts and return handoff

| Area | Calculation and route |
| --- | --- |
| Header/items A–C | Choose return year and disaster beginning year, list every FEMA number, and follow the form's filing decision tree. Create a separate spouse attachment where required. |
| Part I, lines 1a–7 | For 2021-and-later disasters, determine available qualified-distribution capacity using **$22,000 per disaster**, reduced by prior-year uses; use instruction Worksheet 1B for multiple/displaced disasters. Separate total available retirement-plan, traditional-IRA and Roth-IRA distributions from the qualifying amounts. Line 6 receives the early-withdrawal-tax waiver; line 7 remains under ordinary IRA/pension reporting and may feed Part IV. |
| Part II, lines 8–15 | Compute taxable qualified distributions from non-IRA plans after cost/basis, elect full inclusion or three-year spread on line 11, add prior-year installment from Worksheet 2, and subtract Worksheet 3 repayments. Line 15 goes to 1040/1040-SR/1040-NR **line 5b**. |
| Part III, lines 16–26 | Complete Form 8606 first when needed; its lines 15b/25b supply applicable IRA distribution amounts without duplication. Combine with other traditional IRA amounts, elect full inclusion or three-year spread on line 22 consistently with Part II, add Worksheet 4 prior-year income and subtract Worksheet 5 repayments. Line 26 goes to **1040 line 4b**. Do not assume every Roth IRA distribution is tax-free. |
| Part IV, lines 27–32 | Track qualified distributions for purchase/construction of a main home in a disaster area and eligible repayments. Remove any line 7 amount moved to line 28; exclude distributions already in Parts II/III or another Form 8915-F. Route line 32 to 1040 line 4b or 5b by account type; separately review Form 5329 early-distribution tax. |

The 2025 comparator instructions include Worksheets 1B–5 and repayment
carryback/carryforward rules. Reconcile their dates and any changed 2026
instructions before applying them to a 2026 calculation.

## Current code boundary

- Shared `f8915f` is an aggregate input node with a hardcoded **$100,000**
  maximum, two prior-year income fields and one current repayment. It has no
  FEMA identifier, disaster capacity, account/basis/8606 split, election
  history, Part IV, or completed attachment. It sends a single signed net
  amount to **Schedule 1 line 8z**; the draft form instead directs taxable
  amounts to 1040 lines 4b/5b. An excess repayment is not automatically
  negative current Schedule 1 income. `is_roth_ira` treats every Roth
  distribution as tax-free without calculating its taxable portion.
- TY2025 registers the source node, but there is no TY2025 Form 8915-F PDF
  or MeF descriptor to extend. The [2026 draft field inventory](pdf-fields-f8915f.csv)
  has **102 terminal widgets** across the four form pages, including year,
  FEMA, disaster table, election, amount and Part IV fields. There is no
  TY2026 registry, PDF or MeF route for this attachment.
- Form 8915-D is a distinct 2019-disaster route in TY2025 code. The
  [source-status decision](FORM8915D-STATUS.md) pins its latest 2024
  form/instructions and keeps it out of the 2026 filing graph; the
  Form 8915-F draft explicitly starts at 2021 disasters.

## Build order and acceptance

1. Pin current 2026 instructions and active MeF package; compare the 2026
   form and 2025 worksheet rules, disaster-year cutoffs, repayment timing,
   the Form 8915-D source-status decision, and attachment requirements.
2. Build disaster/owner/1099-R/repayment ledgers and FEMA eligibility;
   allocate per-disaster $22,000 capacity without reuse across years/forms.
   Complete Form 8606 and account-specific basis before Parts II/III.
3. Calculate Parts I–IV and Worksheets 1B–5 by account category. Reconcile
   every 1099-R amount against 1040 lines 4a/4b or 5a/5b, 5329 and any
   Part IV move, preserving prior-year installments and amended-return
   effects from repayments.
4. Fill/render all 102 widgets and required statements/worksheets, emit
   current MeF attachment(s), test XSD and active rejects. Cover a 2026
   disaster, 2024/2025 installment, two disasters, spouse forms, cap,
   partial/nonqualifying amount, IRA basis/Roth distribution, full-inclusion
   election, repayment/carryover, main-home Part IV, early-tax waiver,
   and TY2025 regression.

This is a research and implementation contract, not registered TY2026
filing support.

# TY2026 Form 8621 PFIC/QEF filing contract

Source snapshot: the current IRS [Form 8621 (Rev. December 2025)](corpus/authorities/f8621--2025.pdf),
SHA-256 `9c063d71a970eff604d9c3f05449422f86fbe29d99407282a87d94fc6c10a2d0`,
and [instructions of the same revision](corpus/authorities/i8621--2025.pdf),
SHA-256 `f16061fd6ddd952a39f986bab7e7c561d25de61d2ed40938e5e560b9baba477b`.
The form is a December 2025 **revision**, with tax-year blanks rather than a
printed 2025 return year; the instruction examples and 1040 line references
name 2025. No newer 2026 Form 8621 draft was found in this snapshot. The
pinned [2026 Schedule 2 draft](corpus/draft/f1040s2.pdf) establishes its
2026 interest destinations. Recheck Form 8621 revision, final 2026 return
instructions and selected MeF XSD/rules before filing.

## Filing unit and source ledger

Keep one Form 8621 record per PFIC/QEF, with shareholder and foreign-entity
identity, direct/indirect ownership chain, stock class and block, acquisition
and disposition dates, share counts, foreign currency and translated USD,
value, adjusted basis, distributions by year, PFIC start year, foreign taxes
and section 6621 interest rates/due dates. Record exceptions to annual
reporting and the Form 8938 duplicate-asset checkbox. The December 2025
revision's Part V requires a three-letter currency code and separate
foreign-currency amount on line 15e(1) and USD on line 15e(2).

Preserve the **election history by PFIC and year**: section 1291 default,
QEF (§1293), mark-to-market (§1296), Part II elections A–H (including
purging/deemed sale/dividend and section 1294 payment deferral), and Part VI
outstanding/terminated §1294 tax. A single current `regime` enum cannot
describe a historic election transition, multiple stock blocks, a partial
sale or a QEF with a continuing §1291 taint. Verify when a joint return can
use one form and when a pass-through owner files separately.

## Printed parts and TY2026 routes

| Area | Calculation and output |
| --- | --- |
| Header/Parts I–II | Complete owner/entity IDs, address and tax years, share class/count/value, annual-report facts and applicable elections. For each elected regime, validate its effective year, statement and prior-year carryforward rather than inferring it from an income amount. |
| Part III, 6–9 | QEF ordinary income after section 951/1293(g) reductions goes to Schedule 1 line 8z; QEF net long-term capital gain goes to Schedule D Part II. Section 1294 Election B computes deferred payment of tax, and Part VI carries that obligation forward. Keep QEF distributions and earnings/basis records so an amount is not taxed twice. |
| Part IV, 10–14 | Mark-to-market year-end gain is ordinary income; ordinary loss is limited to unreversed inclusions. Stock dispositions have their own 13/14 gain and loss computation, including any remaining loss governed by other rules. Maintain adjusted basis and unreversed inclusions after each event. |
| Part V, 15–16 | For each excess distribution or §1291 disposition, use the prior three-year distribution history, 125% threshold, per-block holding days, year-by-year allocation, prior-year highest tax rate/foreign-credit limit and section 6621 interest. Route current/pre-PFIC slice to ordinary income; line 16e is additional income tax on Form 1040 line 16 with `1291TAX` indicator; line 16f interest goes to **2026 Schedule 2 line 19a**. Retain the required holding-period statement. |
| Part VI, 17–26 | List every outstanding §1294 election; calculate deferred tax and interest due on full/partial termination. Form 8621 line 24 interest goes to **2026 Schedule 2 line 19b**. Lines 19a/19b total at 19c, then Schedule 2 lines 20/21 and Form 1040 line 23. Reconcile tax principal separately from interest. |

Link nonexcess dividends to Schedule B/1040, investment income to Form 8960,
QEF capital gain to the Schedule D tax worksheet, and foreign tax to Form
1116 where allowed. Treat 2025 instruction destinations as comparators when
they differ from the pinned 2026 Schedule 2 draft. Do not use an old line
17p pending key for either 2026 interest amount.

## Current code boundary

- Shared `f8621` already computes a stock-block section 1291 excess
  distribution/history allocation by `ctx.taxYear`, QEF 6c/7c amounts,
  year-end §1296 gain/loss and some downstream ordinary/capital income.
  Its input is a strict per-company aggregate and cannot express all Part
  II elections, detailed Part I ownership, mark-to-market dispositions,
  foreign-currency line 15e(1)/(2), or Part VI election balances. It accepts
  a supplied historical interest charge instead of deriving it from rates
  and due dates. The node sends only line 16f interest to old Schedule 2
  `line17p_form8621_interest`.
- TY2025 MeF serializers emit an `IRS8621` and excess-distribution
  statement, but hardcode shareholder tax year `2025` and currency `USD`.
  They cannot be reused as TY2026 filed XML without current schema and
  year/currency/Part VI review. The TY2025 PDF inventory has no Form 8621
  descriptor. The [current revision PDF inventory](pdf-fields-f8621.csv)
  has **151 terminal widgets** in its field tree: 127 text and 24 buttons
  over four pages. This is a field baseline, not proof of a final 2026 form.
- `f8621` and its form/statement attachment have no TY2026 registry, PDF or
  MeF route. The 2026 Schedule 2 graph must distinguish 19a from 19b and
  carry 19c through its changed total lines.

## Build order and acceptance

1. Refresh Form 8621/instructions and final 2026 Schedule 2, and obtain
   current 2026 MeF XSD/rules. Diff revisions before field or XML mapping.
2. Build per-stock-block, owner and election-year ledgers. Complete filing
   exceptions, foreign entity/share details, Part II and Part VI, including
   partial termination and historical tax/interest balances.
3. Derive Part III–V values and the per-year section 1291 statement from
   source data; route 16e to 1040 line 16, 16f/24 to Schedule 2 lines 19a/b,
   QEF gain to Schedule D and ordinary amounts to Schedule 1/B/8960.
4. Fill/render the 151 widgets, then current-form revisions. Emit each PFIC
   plus its statements using current MeF document order and test XSD and
   active rejects. Cover a disclosure-only PFIC, QEF election/capital gain,
   QEF payment deferral and termination, MTM gain/loss/disposition, first-
   year and multi-year §1291 distributions, foreign currency/credit and
   section 6621 interest, joint/pass-through ownership and TY2025 regression.

This is the 2026 research and implementation contract, not a claim of
registered filing support.

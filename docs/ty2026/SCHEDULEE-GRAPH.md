# TY2026 Schedule E implementation contract

The activity-level [Form 6198 at-risk contract](FORM6198-GRAPH.md) and
[Form 8582 passive-loss contract](FORM8582-GRAPH.md)
allocate allowed Schedule E loss before the return-wide
[Form 461 limit](FORM461-GRAPH.md). Preserve the originating activity and
reporting form through both stages.

Source snapshot: the pinned [2026 draft Schedule E](corpus/draft/f1040se.pdf)
(`0bee231f1ecb2470fb884b1f9cee7707eddee8994ce479fc563850b2dd3c5aed`)
and [September 21 draft instructions](corpus/draft/i1040se.pdf)
(`71d19faaf741cf3c9841c3b44e7a4a8d3f380ab5d3723140c1b859ae97b0459a`).
The [TY2026 ATS scenarios 3 and 6](ATS.md) include Schedule E pages; scenario
6 has a partnership Part II row. Refresh the draft and the current MeF package
before filing acceptance. The May MeF v1 download does not settle current XML
names or business rules.
The [scenario 6 page-level fixture](ATS-SCENARIO-06.md) independently derives
Part II line 32 and Part V line 41 as $1,200 from the printed $2,200
nonpassive income and $1,000 allowed nonpassive loss; its K-1 is absent.

## 2026 line and fact changes

| Printed location | Required fact or calculation | Existing code / decision |
| --- | --- | --- |
| Part I A/B | Whether 2026 payments required Form 1099, then whether required forms were or will be filed. The draft instructions note the $2,000 reporting threshold for certain payments made from January 1. | `schedule_e` has per-property answers. Derive the form-level answer from them and preserve any other payment source; do not infer a filing obligation solely from an expense total. |
| Lines 1–4 | Address, type, days, QJV, gross rent and royalties for each property. | Shared `schedule_e` item has these facts. Reconcile 1099-MISC rent/royalty amounts to a property instead of treating a source document as another activity. |
| Line 6 | Rental business vehicle expense. The 2026 instructions give 72.5 cents per mile for January–June and 76 cents for July–December, plus eligible parking and tolls. | Shared auto-expense node has period-specific 2026 rates. Route its property-specific result here; require Form 4562 Part V when auto expense is claimed, as the Schedule E instructions say. |
| Lines 12, 13a, 13b | Bank mortgage interest; **new vehicle-loan interest**; other interest. Allocate mixed-use vehicle interest to rental business. Interest on these lines is determined after any Form 8990 limitation. | The shared item has `expense_mortgage_interest` and `expense_other_interest`, and the TY2025 MeF descriptor serializes the latter as `MortgageInterestPaidOtherAmt`. A TY2026 property record needs a separate vehicle-loan-interest amount and debt/business-use evidence. Do not place it in `expense_other_interest` or line 6. Reconcile personal-use interest claimed on Schedule 1-A so the same dollars are not deducted twice. |
| Lines 18–22 | Depreciation/depletion, per-property total/net, at-risk and passive-loss limits. | Shared `computePropertyNet` sums expenses before Form 8582 allocates passive loss. Keep each property's allowed loss and disallowed carryforward traceable; Form 6198 is required for an amount not at risk. The draft instructions introduce [Form 4562-B](FORM4562B-GRAPH.md) for amortization; complete its instruction and filing gates before routing it. |
| Lines 23a–26 | Aggregate gross rent, royalties, mortgage interest, depreciation, all expenses, allowed income/loss. | Build from rounded, printed property lines. Line 26 must reconcile to the Part I contribution to line 41, not to an unrestricted net loss. |
| Parts II–IV, lines 27–39 | Partnership/S corporation, estate/trust, and REMIC activity rows with separate passive and nonpassive columns. | Current K-1 nodes send aggregates straight to Schedule 1 line 5; the TY2025 Schedule E serializer emits property Part I and farm totals, not these rows. Add activity identity, K-1 column facts, basis/at-risk/passive limits, and attached computations before enabling these activities. ATS scenario 6 specifically exercises a partnership row. |
| Part V, lines 40–43 | Form 4835 farm net, all-part total to Schedule 1 line 5, farming gross reconciliation, real-estate-professional reconciliation. | Shared Schedule E and TY2025 serializer handle a Form 4835 path. The TY2026 sink must combine **all** Parts I–IV plus Form 4835 once and reconcile line 41 to Schedule 1 and AGI. |

The 2026 draft still prints three property columns on page 1 and three pages
total. More than three properties require additional page-1 statements with a
stable property identity and totals over all properties. The first property
page cannot be mistaken for the complete activity list.

## Graph ownership and order

1. Collect one source record per rental/royalty activity with property ID,
   address, ownership share, payer/source matches, personal/rental days,
   income, each printed expense, asset/debt references, and prior-year loss
   balances. Collect K-1 and Form 4835 activities under their own IDs. The
   [current shared input](../../forms/f1040/nodes/inputs/schedule_e/index.ts)
   has useful fields but no TY2026 vehicle-interest slot and no Part II–IV
   activity rows.
2. Calculate auto expense and depreciation by property. Complete Form 8990
   before fixing Schedule E lines 12/13a/13b. Allocate shared-home and vehicle
   costs using evidence, then reconcile any personal-use vehicle interest to
   Schedule 1-A. No generic unassigned pass-through expense may be silently
   placed on a property.
3. Build gross and expense lines per property; apply at-risk, passive, and
   other applicable limits through Form 6198/Form 8582 and preserve released
   losses by activity. Feed eligible QBI to Form 8995/8995-A, net investment
   income to Form 8960, and disposition facts to Form 4797 without treating
   those forms as independent duplicate income sources.
4. Assemble Schedule E Parts I–V, route line 41 to dedicated 2026 Schedule 1
   line 5 and AGI exactly once, and reconcile printed Schedule E line 41,
   Schedule 1 line 5, Form 1040 line 8, and taxable income. The current
   `schedule_e` node emits to both Schedule 1 and AGI; audit aggregation before
   registering it in the TY2026 graph.

## Output and acceptance gates

- **PDF:** inventory every widget on the pinned three-page draft; map per-
  property lines 3–22, summary lines 23–43, 1099/QJV answers, and page/statement
  pagination. There is no TY2025 Schedule E PDF descriptor to reuse. Render a
  rental, a loss-limited rental, a royalty, a Form 4835 farm, and a Part II
  K-1 case; inspect all three page positions and overflow statements.
- **MeF:** use the current authorized TY2026 XSD and business rules. Diff the
  TY2025 `IRS1040ScheduleE` property group and its interest fields against the
  current schema, including the vehicle-interest element. Serialize Parts
  II–IV activity groups where supported, link Form 8582/6198/4835/4562/8990
  attachments, and validate the full return XSD. The TY2025 serializer's
  `expense_other_interest` mapping cannot be assumed to mean line 13b in 2026.
- **ATS:** extract scenario 3 and 6 source facts by page, distinguishing empty
  printed fields from zero values. Scenario 3 shows an unpopulated Schedule E
  page, so it cannot establish a rental calculation. Scenario 6 PDF page 9's Part II
  partnership row lists a $1,000 nonpassive loss in column (i) and $2,200
  nonpassive income in column (k); derive the $1,200 line 32 contribution
  independently, subject to the linked activity and basis facts. That row is
  a mandatory activity and attachment case. Add independent 2026 cases for
  pre/post-July mileage, vehicle interest split with Schedule 1-A, Form 8990
  limit, three-plus-property overflow, passive loss, and Form 4835. Reconcile
  calculated amounts and both PDF and XML; never use a blank ATS total as an
  expected zero.
- **Year isolation:** run the same basic rental through TY2025 and TY2026 and
  check the separate 2026 line 13a only appears in TY2026 output. Keep any
  year-specific input change explicit; do not silently reinterpret the old
  `expense_other_interest` field.

The [node coverage ledger](node-coverage.csv) keeps `schedule_e`
`audit-required` until those calculation, output, schema, and scenario gates
pass. This document is a build contract, not a claim of Schedule E readiness.

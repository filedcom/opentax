# TY2026 Form 4797 business-property disposition contract

Source snapshot: [draft 2026 Form 4797](../corpus/draft/f4797.pdf), SHA-256
`2261752a7ef65fbdf253532637a244f919bcbdc894030a1c810d2a29fa6e9f57`,
and [2025 instructions](../corpus/authorities/i4797--2025.pdf), SHA-256
`cddf741b95ec1689712aba82936346bd7b7c13dfe593fc66102a31e333b8fae9`,
as a **prior-year comparator**. The draft `i4797--dft.pdf` URL still serves
2025. The printed form has a material line renumbering and a new Part III
qualified-production-property (QPP) use-change checkbox. Confirm the final
2026 instructions, the current MeF XSD/rules and any QPP guidance before
filing; do not treat old line numbers as current authority.
The [2026 Form 6252 draft's embedded instructions](../corpus/draft/f6252.pdf)
still refer to old Form 4797 lines (for example, its line-12 recapture
paragraph names Form 4797 lines 31/13/32, while the 2026 Form 4797 draft
uses 33/14/34). Its installment-sale line-25/26 destinations similarly
need reconciliation. Track this source conflict through final publication;
do not encode the stale cross-references.

## Current implementation and later draft

The [current farmland prerequisite](FARMLAND-CURRENT.md) now reuses shared 4797
character arithmetic and year-aware loss-history replay for a staged 2026 land
source ledger. Its internal handoff now reaches shared Schedule D netting, AMT
and reviewed NIIT exclusions, with corresponding draft component output. It
is not registered in public intake or the return graph. The
[October 1 draft](../corpus/draft/f4797-2026-10-01.pdf), SHA-256
`66e57b82213189baa8564ed9cb83e75d6f556edb0bd051df458879280bc1fec9`, is preserved
alongside the older snapshot. Its line 20a points to Schedule A 17d; the table
below reflects that newer cross-reference. The remaining asset, loss-limit,
bundle, MeF and source-acceptance requirements still apply. The standalone
land-only Form 4797 component now prints Parts I/II and property continuations
from finalized history, with matching capital/ordinary/loss destinations.
The internal loss owner now derives that finalized history from preliminary
capital/461 amounts. The land QBI component retains ordinary/capital character
and allowed/suspended amounts by reviewed activity; return-wide QBI, graph and
bundle registration remain unfinished. See the current farmland implementation
for allocation conventions and the farming-loss/Form 172 boundary.

## Canonical disposition and history records

One record per disposed asset or partial disposition: owner, activity and
asset IDs; property description and tax character; acquisition, placed-in-
service, disposition and casualty dates; gross proceeds and payer-reported
1099-B/S amount; selling costs; original cost, improvements, basis
adjustments, depreciation/depletion **allowed or allowable** by year and
method; Form 4562/4562-B asset history; business/income-producing use;
holding-period and §1231 qualification; sale, installment, exchange,
casualty, theft, condemnation or other conversion; disposition percentage;
recapture class under §§1245/1250/1252/1254/1255; and any QOF deferral.
Keep source form/line, pass-through K-1 character, and prior §1231 loss
vintages. The prior-five-year nonrecaptured-loss balance is not a free input:
derive it from earlier filed returns and reductions by later §1231 gains.

Do not use a `disposed_properties` count as a gain/loss amount. A rental
disposition must provide its property, basis, proceeds and depreciation;
asset sale data must be shared with [Form 4562](./FORM4562-GRAPH.md),
[Form 4684](./FORM4684-GRAPH.md), [Form 6198](./FORM6198-GRAPH.md),
[Form 8582](./FORM8582-GRAPH.md), Schedule E, and [Schedule D](./CAPITAL-GAIN-GRAPH.md)
without double counting. Apply at-risk and passive limitations to the source
loss before allowing it into the return-wide ordinary or §1231 result.

## Printed 2026 calculation and destinations

| Part / lines | Calculation and reconciliation |
| --- | --- |
| Header, 1a–1c | Reconcile 1099-B/S reported **gross** proceeds included in lines 2, 11 or 22; partial MACRS disposition gain included in lines 2, 11 or 26; and partial-disposition loss in lines 2 or 11. These are informational controls over the detailed rows, not extra gains to add. |
| I, 2–8 | Part I holds qualifying business-property sales and noncasualty involuntary conversions, generally held **more than one year**. Each line-2 row computes gross sales price + depreciation allowed/allowable − cost/basis/improvements/selling expenses. Add [Form 4684 line 39](./FORM4684-GRAPH.md) gain (3), [Form 6252](../corpus/draft/f6252.pdf) §1231 installment gain (4), [Form 8824](../corpus/draft/f8824.pdf) exchange gain/loss (5), **noncasualty** Part III line 34 remainder (6), and livestock (7). Line 8 is the §1231 net. The supplied `section_1231_gain` aggregate cannot print or independently verify these sources. |
| I, 9–10 and II, 12–13 | If line 8 is a loss, it goes to line 12 as ordinary loss. If it is gain, use the prior-five-year nonrecaptured §1231 loss at line 9: line 10 is the remaining long-term capital gain to Schedule D, while the recaptured portion enters Part II line 13. A §1231 net gain without prior-loss balance goes to Schedule D directly. Preserve any resulting prior-loss balance for 2027. |
| II, 11–20b | Line 11 holds ordinary property rows including assets held one year or less; lines 12–18 add the Part I loss/recaptured gain, Part III recapture **line 33 → line 14**, Form 4684 lines 31/38a **→ line 15**, Form 6252 ordinary gain (16), Form 8824 (17) and livestock (18). Line 19 nets the entries. For individuals, line 20a separates the specified income-producing loss from Form 4684 line 35 column (b)(ii) for **Schedule A line 17d**; line 20b excludes it and goes to **Schedule 1 line 4**. Do not send line 19 to Schedule 1 without this split. |
| III, 21–34 | Four printed property columns compute gross price (22), cost plus selling expenses (23), accumulated depreciation/depletion (24), adjusted basis (25), total gain (26), and class-specific ordinary recapture: §1245 (27a–b), §1250 (28a–g), §1252 (29a–c), §1254 (30a–b), §1255 (31a–b). Line 27 now asks whether a §1245 disposition changes use of **QPP**; resolve the 2026 instruction treatment instead of mapping it as ordinary generic §1245. Line 32 totals gains, line 33 totals recapture to Part II line 14, and line 34 divides residual gain between **casualty/theft to Form 4684 line 33** and noncasualty to Part I line 6. Retain unrecaptured §1250 gain separately for the Schedule D tax worksheet; it is not identical to ordinary §1250 recapture. |
| IV, 35–37 | Recompute §179/§280F(b)(2) deduction or depreciation when business use drops to 50% or less. Each property's recapture requires prior deductions, recomputed depreciation and business-use history. The 2025 instruction comparator directs the amount as **other income on the schedule that took the deduction**, with a basis increase and potential SE tax allocation; verify the final 2026 route. It is not automatically Part II ordinary gain. |

Form 4797's residual gain/loss must retain its source character through
Schedule D's long-term line 11, Schedule 1 line 4, Schedule A line 17d and
the property/activity-specific carryforward ledger. In particular,
`line_11_form2439` in the shared Schedule D node is a misleading catchall
for §1231 gain; give the 2026 print/XML path a source-specific value and
prevent separate Form 2439 transactions from colliding with it.

## Current code boundary

- Shared `form4797` handles aggregate character, specialized passive-property,
  investment section 1245 and K-1 sources. Its annual history helper now serves
  2025 and 2026 while retaining the 2025 public contract. The specialized routes
  do not establish a complete 2026 asset/recapture ledger.
- The staged 2026 land calculator supplies derived property amounts and the
  annual loss balance to shared arithmetic; it reconciles its ordinary/capital
  split independently. Preliminary amounts expose no current deductible loss
  or outgoing vintage; finalization still requires the limitation owner's
  amount and source reference. It does not forward the shared node's outputs into the
  2026 graph. That prevents the legacy Schedule D catchall and ordinary-income
  routes from bypassing the required 2026 source consumers.
- Existing 2025 PDF/MeF routes have their own source/filing restrictions. Reuse
  requires a current-year mapping audit, rather than assuming the old output
  fields cover 2026. The newer draft has 188 terminal widgets on two printed
  pages plus cover. The standalone land component verifies the template and
  prints only the applicable page, plus seven-column overflow statements.
  Gain, loss and multi-page continuations have been rendered and inspected.
- `form4797` remains absent from the 2026 registry/bundle builder and has no 2026
  MeF serializer. The 2025 generated validation rules are not active 2026 rules.

## Build order and acceptance

1. Pin final 2026 Form 4797 instructions, current MeF XSD/business rules,
   and any QPP use-change guidance; reconcile all renumbered cross-form
   references with final Forms 4684, 6252, 8824, Schedule A/D and Schedule 1.
2. Build the disposition/asset ledger and Part III recapture before Part I
   §1231 netting and Part II ordinary totals. Derive the five-year §1231
   recapture balance and unrecaptured §1250 worksheet from prior records.
   Route Part IV recapture back to its source schedule and update basis.
3. Make the graph consume one classified transaction result, preserving
   source/asset/activity IDs across Forms 6198 and 8582. Ensure line 34
   casualty residual reaches Form 4684 line 33, then its line 39 or 38a
   returns to the correct Form 4797 branch exactly once. Avoid a cycle by
   staging property-level recapture, casualty netting, then return-level
   §1231/ordinary totals.
4. Fill and visually inspect all 188 PDF widgets and overflow property
   statements; emit current 2026 MeF detail and cross-form references from
   the same printed-line record. Reconcile return Schedule 1/A/D, PDF, XML,
   source forms and carryforward balances. Run TY2025 regressions on shared
   code and a complete TY2026 return fixture.
5. Test short/long holding periods, gain/loss §1231 netting, a five-year
   prior-loss balance, rental disposition, K-1 source, Form 6252 installment,
   Form 8824 exchange, a mixed Form 4684 casualty gain/loss, each Part III
   recapture class, QPP use change, §179/listed-property business-use drop,
   partial MACRS dispositions, unrecaptured §1250 tax rate and multi-asset
   sales. Verify that each source amount appears once in the filed outputs.

This is the source-backed implementation contract; the TY2026 calculation,
validation, PDF, MeF and end-to-end acceptance remain open.

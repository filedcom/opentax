# TY2026 Form 4684 casualty, theft and disaster contract

Source snapshot: [draft 2026 Form 4684](corpus/draft/f4684.pdf), SHA-256
`f7c5cfa5ba93b0b22b7e8e93f7eccc7db42e0ed04159664889cda0dc3c3ca9db`,
and the [2025 instructions](corpus/authorities/i4684--2025.pdf), SHA-256
`830b752edd1e945dc98ccb0ea91992643106840091c42ce0fcc0bf319ba5271a`,
as a **prior-year comparator only**. The draft `i4684--dft.pdf` URL still
serves 2025. [Revenue Procedure 2009-20](corpus/authorities/rp-09-20.pdf)
and [2011-58](corpus/authorities/rp-11-58.pdf) govern the optional Ponzi
safe harbor. The form is draft, so confirm the final 2026 form, instructions,
applicable disaster legislation and current MeF release before filing.

## Event and property ledger

Keep separate casualty/theft **event** IDs and property IDs. Record loss and
discovery dates, property type/location/acquisition date, personal versus
trade/business/rental/royalty/income-producing use, related activity and asset
IDs, adjusted basis, pre/post-event fair market value, destruction/theft
status, reimbursement claimed or reasonably expected, later reimbursement,
holding period, and prior deductions. Preserve disaster declaration type,
FEMA DR/EM number if federal, event ZIP, qualified-disaster eligibility and
any §165(i) election or revocation separately. A state declaration, a federal
declaration and the special **qualified disaster loss** classification are
not interchangeable. The draft expands Section A's general disaster check to
**federally or state-declared** events; the 2025 instructions describe the
older federal-only loss rule and mention state declarations for deadline
postponement. Obtain the 2026 instructions to resolve the new eligibility
boundary, including any nondisaster gains that can offset losses. Do not infer
that a state declaration alone supports the federal prior-year election.

One Section A through line 12 is needed **per personal event**, with up to
four property columns on each printed copy. Section B Part I similarly repeats
**per business/income-producing event**; Part II summarizes the separate
Parts I. Repeated pages and overflow statements must retain the event and
property relationships. A single aggregate `personal_basis` and
`business_basis` pair cannot represent this topology.

## Printed calculation and destinations

| Section / lines | Calculation and filed handoff |
| --- | --- |
| A, 1–9 | For each personal property: basis (2), reimbursement **whether or not claimed** (3), gain if reimbursement exceeds basis (4), pre/post FMV (5/6), decline (7), lesser of basis or decline (8), and nonnegative loss after reimbursement (9). Later reimbursement and gain postponement/recognition need distinct facts and instruction-backed handling. |
| A, 10–12 | Sum losses **within the same event** on line 10, then subtract the event floor: $100 ordinarily, **$500 only where qualified-disaster rules apply**. Do not subtract a floor per property. |
| A, 13–18 | Use one summary copy: gains from all line 4s (13), event losses from all line 12s (14). Line 15 separates the eligible $500-floor qualified-disaster portion and goes to **2026 Schedule A line 17b**, or the instruction's increased-standard-deduction route. Remaining net losses face 10% of **Form 1040 line 11b** AGI at lines 16–18; line 18 goes to **Schedule A line 16**. If gains equal/exceed losses, the line 15 instructions instead direct the difference to Schedule D. Gain/loss netting, qualified-loss allocation and standard-deduction treatment must follow the 2026 instructions, not a generic `max(loss − 10% AGI, 0)` shortcut. |
| B Part I, 19–28 | For each business/income-producing property, track basis (20), reimbursement (21), gain (22), FMV (23/24), decline (25), smaller basis/decline (26), and loss (27). For **total destruction or theft**, line 26 uses basis, regardless of FMV decline. Line 28 totals the event. Ponzi safe-harbor line 51 enters line 28 without lines 19–27. Link home-office casualty loss from [Form 8829 line 35](FORM8829-GRAPH.md) to line 27. |
| B Part II, 29–39 | Classify each event/property by **held one year or less** (29–32) versus **more than one year** (33–39), and loss column as trade/business/rental/royalty versus income-producing. Short-hold trade/business net at line 31 goes to **Form 4797 line 15**; income-producing line 32 goes to **Schedule A line 17d** for individuals. Long-hold losses versus gains, including Form 4797 line 34 at line 33, determine line 38a trade/business net to **Form 4797 line 15**, line 38b income-producing loss to **Schedule A line 17d**, or line 39 net gain to **Form 4797 line 3**. Preserve other entity destinations and exceptions for the instructions. |
| C, 40–51 | Optional [Rev. Proc. 2009-20](corpus/authorities/rp-09-20.pdf) safe harbor, as [modified](corpus/authorities/rp-11-58.pdf): qualified investment, 95% without potential third-party recovery or 75% with it, actual/potential recoveries, and deduction to Section B line 28. Require scheme, qualified-investor, recovery and declarations evidence; ordinary financial-scam thefts do not automatically qualify. |
| D, 52–57 | §165(i) prior-year election or revocation for **federally declared** disaster, including disaster name, loss dates, property address, prior election date and repayment evidence. This attaches to the preceding year's return/amendment, so carry an election record across returns and do not silently shift the current-year loss. |

This form feeds [Form 6198](FORM6198-GRAPH.md) for any activity loss subject
to at-risk limits, then [Form 8582](FORM8582-GRAPH.md) passive restrictions and
[Form 461](FORM461-GRAPH.md) excess-business-loss testing where applicable.
Retain the original property/transaction character when allowed amounts flow
to [Form 4797](FORM4797-GRAPH.md), Schedule A or D. Reimbursements,
involuntary-conversion gain deferral and later recoveries need their own
year-specific records.

## Current code boundary

- Shared `form4684` accepts one personal and one business aggregate, requires
  `is_federal_disaster`, always uses the $100 and 10%-AGI reductions, and
  routes personal loss to legacy Schedule A `line_15_casualty_theft_loss`.
  It cannot express the 2026 state-declaration branch, qualified-disaster
  line 15, multiple events, gains, Section C/D or the 2026 Schedule A lines.
- It sends a long-hold business loss through `ordinary_gain_form4684` to
  shared Form 4797's **line 14** calculation, whereas the draft 4684 line
  31/38a directs **line 15**. Its other-business branch sends a negative
  amount to Schedule D's `line_11_form2439` (a different source), bypassing
  Section B's holding-period and income-producing classifications. The
  helper also always caps by FMV decline, missing line 26's total-destruction
  and theft basis rule.
- TY2025 PDF descriptor maps only nine aggregate numeric inputs and does not
  construct the repeated form. TY2025 MeF supports one documented long-term
  business loss, rejects personal losses and casualties outside 2025, and
  asserts the obsolete Form 4797 line 14 route. It is not a 2026 schema map.
- `form4684` is absent from the TY2026 registry/PDF builder and has no 2026
  MeF serializer. The [PDF inventory](pdf-fields-f4684.csv) has **162
  terminal widgets**, all in the field tree, across four printed pages plus
  the draft cover. Tooltips identify many lines, but repeated A/B columns,
  checkbox exports and rendered appearance still need visual verification.

## Build order and acceptance

1. Obtain final 2026 Form 4684/instructions and confirm state-declared
   personal-loss eligibility, qualified-disaster classification, §165(i)
   election timing, reimbursement/§1033 interaction and Section B character
   rules. Compare any revised form against this pinned draft and the 2025
   comparator; record a change before implementation.
2. Build source-keyed event/property records and a repeated Form 4684
   calculator for Sections A and B. Reconcile line 1–12 per event, one A
   summary, repeated B Part I and one B Part II. Integrate Form 8829/asset
   basis and downstream Form 4797/Schedule A/D destinations before activity
   loss limits. Add C and D with their own evidence and cross-year state.
3. Fill the 162 widgets from calculated printed lines and source facts;
   render every page and a multi-event copy. Select authorized TY2026 MeF
   XSD/business rules and map repeated IRS4684 instances, statements,
   disaster/election data and totals. Reconcile XML, PDF, return and
   carryforward/election records. Preserve TY2025 regression behavior.
4. Exercise ordinary federal and state-declared events, a nonqualifying
   event, multiple properties in one event versus separate events, $100
   versus $500 floors, qualified loss with standard deduction, gains exceeding
   losses, partial reimbursements and later recoveries, total destruction,
   short/long hold business and income-producing property, mixed Form 4797
   gain/loss, Ponzi safe-harbor 95%/75% cases, home-office loss, and federal
   prior-year election/revocation. Verify the exact Schedule A/4797/1040
   handoffs and activity-limit records.

This is a research and implementation contract, not filed TY2026 support.

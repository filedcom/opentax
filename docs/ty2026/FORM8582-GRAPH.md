# TY2026 Form 8582 passive-activity-loss contract

Source snapshot: pinned [2026 draft Form 8582](corpus/draft/f8582.pdf),
SHA-256 `4329950c160bc4e72b545166728e317a80802d1eae5c626deb66520ba42b4f89`.
The [draft instruction URL](https://www.irs.gov/pub/irs-dft/i8582--dft.pdf)
still serves 2025. Pinned [2025 instructions](corpus/authorities/i8582--2025.pdf),
SHA-256 `76787e11a385d1205faf70a07924cdec4efd5e66628e6f47e5316d29e6035f71`,
are a **prior-year comparator** for worksheet sequence and definitions. The
2026 form prints the $25,000 active-rental allowance and $150,000 Part II
MAGI ceiling, with special MFS rules requiring the current instructions.
Verify final 2026 instructions, form revision and MeF package before filing.

## Activity ledger and order

Keep a stable `activityId`, owner, activity grouping, rental/nonrental and
active/material participation status, current and prior classification,
property/K-1/source form, gross income, deductions, disposition facts, basis
and at-risk allowed amount, prior passive-loss origin and form/character,
prior commercial revitalization deduction (CRD), and each loss's eventual
reporting form and line. Rental status alone does not establish active
participation or eligibility for the Part II allowance. A rental real-estate
professional activity, publicly traded partnership, former passive activity,
entire-interest disposition, credit under Form 8582-CR, or NIIT regrouping
needs its own source-backed treatment; do not put every Schedule E amount
into this form.

Resolve basis, [Form 6198 at-risk](FORM6198-GRAPH.md) and any other
activity-level limits before passive-loss arithmetic. Then determine the
allowed and suspended amounts by activity and by reporting form; send only
allowed losses to Schedule C/E/F, Form 4835, Form 4797, Form 4684,
Schedule D/Form 8949 or their source owners. Complete the subsequent
[Form 461](FORM461-GRAPH.md) excess-business-loss limit on the now-allowed
business items. Save the remaining passive losses with activity, origin year
and tax character for the next return. The Part III line 11 total is a
reconciliation of allowed loss, not an extra Schedule 1 deduction.

## Printed 2026 worksheet and filed outputs

| Part / lines | Required calculation and evidence |
| --- | --- |
| I, 1a–1d | Part IV active-participation rental activities: current net income, current net loss and prior unallowed losses in distinct columns; sum signed line 1d. An old loss that was not from an actively participated year may belong in Part V even if the same property now qualifies for Part IV. |
| I, 2a–2d | Part V other passive activities: equivalent columns and signed line 2d. Preserve each source, including passive partnerships, S corporations, rentals without active participation and any properly passive farm-rent activity. |
| I, 3 | Combine 1d and 2d and subtract any allowed prior-year unallowed CRD as instructed. If nonnegative, the draft says stop and file the form with all losses allowed. A negative line 3 goes to Part II only if line 1d is negative and the filer qualifies; otherwise continue to line 10. |
| II, 4–9 | Special active-rental allowance. Line 4 is lesser loss from line 1d or 3, stated positive. Line 5 prints $150,000 subject to MFS instruction; line 6 is the **Form 8582 modified AGI**, not ordinary AGI. Lines 7/8 phase out at 50% and cap at $25,000; line 9 is the lesser of 4/8, with separate CRD treatment. MFS who lived with spouse during the year skips this part. MFS who lived apart may have half-size limits; require an explicit lived-apart fact rather than treating every MFS as ineligible. |
| III, 10–11 | Line 10 sums positive current passive income from 1a/2a. Line 11 adds line 9; reconcile that allowed-loss total to all per-activity and reporting-form allowed amounts. Its destination is each ordinary source form, never one aggregate Schedule E deduction. |
| IV and V | Activity rows have name, current income/loss, prior unallowed loss, and overall gain/loss. Maintain separate active-rental and other-passive rows; carry totals to 1a–c and 2a–c. Preserve extra rows in a continuation with the same column topology. |
| VI–VIII | Allocate any special allowance among eligible activity losses, then allocate unallowed loss by activity ratio; subtract from each total loss to derive allowed loss. Retain exact whole-dollar totals and deterministic rounding. The 2025 instructions describe separate CRD allocations where applicable; refresh that procedure against 2026 instructions. |
| IX | For an activity with loss on two or more forms/schedules or with separately taxed transactions, split allowed and suspended amounts **by source form and tax character**, including Form 4797 parts and Form 8949 28%-rate versus other capital losses. Keep a separate copy/continuation per activity as required. |

The draft has three printed form pages after its coversheet. The
[PDF field inventory](pdf-fields-f8582.csv) records **205 terminal widgets**,
all in the field tree: 54 on printed page 1, 125 on page 2 and 26 on page 3
(PDF pages 2–4). The first two fields are return name/ID; Part I line 11 is
`f1_19`. Parts IV–IX include row tables and ratios. The TY2025 PDF
descriptor refers to seven positional names such as `f1_03`; the 2026 field
is `f1_3` and represents **line 1a active-rental income**, not a generic
Schedule C passive amount. Rebuild the descriptor from this inventory and
render an active-rental and a multi-form Part IX return.

## Current graph boundary

- Shared `form8582` already has a useful pure passive-loss limit and
  whole-dollar allocation helpers. `schedule_e` sends activity rows and
  aggregate rental/other totals, while `agi_aggregator` computes modified
  AGI and separately invokes the same passive-loss helper before AGI. These
  two calculations must use **one reconciled activity result** so Schedule E,
  Form 8582, Schedule 1/AGI and carryforwards cannot diverge.
- The input has no stable activity/source ID, MFS lived-apart evidence,
  disposition/PTP/form-character detail or CRD allocation. `specialAllowance`
  treats **all MFS** as ineligible, even when the filer lived apart all year.
  The node emits one negative `line5_schedule_e` amount and one aggregate
  `suspended_pal_8582` carryforward, losing Part VII–IX destination and
  origin-year detail.
- TY2025 MeF code does serialize activity worksheets for supported patterns,
  but it rejects some MFS, prior Form 4797 and other multi-form patterns and
  is bound to the 2025 schema. It cannot establish 2026 XSD element order,
  accepted continuations or business-rule validity. `form8582` is absent
  from the current TY2026 registry and PDF bundle; the 2026 MeF builder does
  not exist yet.

## Build order and acceptance

1. Pin final 2026 instructions and current Pub. 925 or equivalent authority.
   Decide participation, grouping, real-estate-professional, PTP, former-
   passive, complete-disposition, MFS and filing-exception paths before
   declaring any activity eligible. Keep prior-year guidance marked as a
   comparator until confirmed.
2. Make an activity-keyed calculation after basis and at-risk limits.
   Reconcile Form 8582 MAGI with Schedule 1/1040 and any 2026 deduction
   changes. Compute Parts IV/V before I, then II/III and VI–IX, preserving
   each current/prior source row and its tax character. Avoid a graph cycle
   by using a pre-passive AGI/MAGI view and a single final passive result.
3. Route allowed amounts once to [Schedule E](SCHEDULEE-GRAPH.md),
   [Form 4835](FORM4835-GRAPH.md), Schedule C/F, Form 4797, Form 4684 and
   Form 8949/Schedule D as applicable; send the resulting business amounts
   to Form 461 and QBI. Save each unallowed balance by activity, origin and
   destination, and reconcile all Parts VI–IX to line 11.
4. Render the complete 205-widget PDF including continuations and Part IX
   copies. Build TY2026 XML against the current authorized XSD and active
   rules, comparing XML/PDF to the same ledger and source forms. The user's
   downloaded May v1 package is only a baseline. Re-run TY2025 regressions
   for shared code.
5. Test active-rental MAGI below, at and above the phaseout; MFS lived apart
   versus together; rental plus other passive income/loss; old losses that
   changed participation status; a PTP and former-passive activity; full
   disposition; CRD; a partnership loss spanning Form 4797 and Schedule E;
   Form 8949 28%-rate allocation; prior carryforward release; and a
   below-threshold [Form 461](FORM461-GRAPH.md) result. Verify form lines,
   allowed source loss, suspended balances, Schedule 1/AGI and PDF/XML.

This is a source and implementation plan. The passive-loss branch is still
open until the full 2026 graph, validation, PDF, MeF and complete-return
evidence pass.

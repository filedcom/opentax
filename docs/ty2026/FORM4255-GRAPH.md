# TY2026 Form 4255 credit recapture and excessive-payment ledger

Snapshot: September 27, 2026. The IRS currently serves [Form 4255
(December 2025)](corpus/authorities/f4255--2025.pdf) and matching
[instructions](corpus/authorities/i4255--2025.pdf), pinned with
[646 PDF fields](pdf-fields-f4255.csv). Its source is each originally
claimed property/credit, not a taxpayer-entered aggregate recapture amount.
Recheck the form and current MeF release before a TY2026 filing route.

## Inputs, calculation and destinations

- Keep the original [Form 3468](FORM3468-GRAPH.md), [Form 8835](FORM8826-8835-STATEMENTS.md),
  [Form 8911](MEF-REMAINDER.md), [Form 7207](GENERAL-BUSINESS-CREDIT-GRAPH.md),
  Form 8936 or other credit record by facility/property, tax year, owner,
  Form 3800 utilization, unused carryover, elected payment, transfer and
  basis reduction. Preserve K-1/pass-through allocation and notification
  history. Determine event date and whether disposition, use change,
  partnership-interest change, financing, PWA, emissions tier or an excessive
  election/transfer triggers a distinct Form 4255 section.
- Part I spans three printed pages. Reconcile each source-form row 1a–1z/2a–2z
  across columns (a)–(t): original credit, gross/net elective payment,
  non-EPE amount used, carryover, recapture percentage and amount, the portion
  reducing carryover versus recapturing tax, excessive transfer/payment,
  PWA penalties and totals by creditability. One total loses legally
  different destinations.
- Part II computes recapture per property: original credit and Form 3800
  use, financing change, placed-in-service month, event date, five-year
  recapture percentage, replacement credits that could have been used and
  increased tax. Adjust remaining Form 3800 carryovers and asset/partner
  basis from the same ledger. Part III computes §48 clean-hydrogen emissions
  tier recapture from the corresponding Form 3468 property.
- The pinned 2026 [Schedule 2 draft](corpus/draft/f1040s2.pdf) has line
  **10** for net EPE recapture from Form 4255 line 1d column (l), and line
  **13a** for recapture of other credits. Route other Form 4255 taxes and
  penalties by their exact source/type only after reconciling final 2026
  instructions and the current XSD. Keep any amount that can reduce tax
  with credits separate from an amount that cannot.

## Current code boundary

The shared [`f4255` node](../../forms/f1040/nodes/inputs/f4255/index.ts)
accepts original credit, an arbitrary `year_of_recapture` and even a manual
override, multiplies by a five-year percentage, and sends everything to
TY2025 Schedule 2 line 17a. In the pinned 2026 Schedule 2, line 17a is
**household employment tax**. The node has no original credit source IDs,
Form 3800 utilization/carryover, transfer/EPE, financing, PWA, emissions,
basis or K-1 detail; the TY2025 inventories have no Form 4255 PDF or MeF
serializer. Do not register that shortcut in TY2026.

## Build and acceptance

1. Refresh Form 4255/instructions and current XSD/rules. Map Part I's
   columns and source rows, Parts II–III and each Schedule 2 destination.
2. Build recapture events from the original facility/credit ledger. Reconcile
   credit used, carryover reduction, recapture and basis increase; retain
   event and notification evidence for transfers and pass-throughs.
3. Render all required pages/continuations and binary statements; build
   current Form 4255 XML and validate its links to original credit documents,
   Form 3800 and a complete 1040 return.
4. Test year 1–5 and after-year-5 dispositions, decline in qualified use,
   substitute available credits, transfer versus retained portion, net EPE,
   excessive transfer/payment, PWA penalty, hydrogen emissions tier,
   carryover/basis adjustment and a K-1 recapture. Preserve TY2025 tests.

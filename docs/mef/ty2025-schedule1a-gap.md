# TY2025 Schedule 1-A native filing blocker

Sources:
[2025 Schedule 1-A](https://www.irs.gov/pub/irs-prior/f1040s1a--2025.pdf),
[2025 Form 1040 instructions, including Schedule 1-A](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf),
and checked-in v5.4 `Common/IRS1040Schedule1A/IRS1040Schedule1A.xsd`.

The `schedule1a` node currently computes one combined deduction and sends it to
Form 1040 line 13b, but it does not produce a finalized Schedule 1-A output. The
2025 MeF/PDF registries have no Schedule 1-A descriptor. Form 1040 MeF therefore
correctly rejects positive line 13b rather than filing the line without its
required attached schedule. This guard must remain until all positive components
and line 38 reconcile to a native document.

## Source and line blockers

- Part I lines 1–3 use Form 1040 line 11b plus Puerto Rico excluded income, Form
  2555 lines 45/50, and Form 4563 line 15. The node receives `magi` from the AGI
  aggregator but no separate exclusion/deduction source or proof that those four
  adjustments are zero. Thus the current `magi` cannot be assumed to be Schedule
  1-A line 3 in every return.
- Part II lines 4a–4c distinguish W-2 box 7, Form 4137 tips, multiple employers,
  and the Social Security wage-base/special occupation cases. The node receives
  only employee-SSN/amount pairs from qualifying W-2 box 7 records, then
  computes the final tips deduction. It cannot fill or reconcile every
  applicable source line, and the IRS instructions' multi-employer and wage-base
  worksheets are not represented.
- Part III lines 14a–14c distinguish qualified overtime included in W-2 box 1
  from qualified overtime on Forms 1099-NEC/MISC. The node currently accepts
  taxpayer/spouse compensation totals as direct claims without those document
  identities, inclusion checks, or the source-line split.
- Part IV line 22 requires a VIN and per-loan interest deducted on Schedule C,
  E, or F versus interest claimed on Schedule 1-A. The node has a VIN, paid
  interest, and an asserted business-schedule amount, but no loan/purchase-date,
  new-vehicle, final-assembly, lender, or business-deduction reconciliation.
  Native v5.4 permits at most 50 vehicle groups; the node has no corresponding
  limit. Emitting line 30 from these assertions could overstate the deduction.
- Part V can calculate line 37 from age, SSN, filing status, and MAGI, but the
  node does not preserve per-person line 36a/36b or the intermediate lines 32–35
  as a finalized schedule document. It also inherits the Part I MAGI
  uncertainty.

The v5.4 XSD has distinct elements for these source lines and Part VI line 38.
Adding an XML serializer that only writes the final four deduction amounts would
not reconcile them to the form and could silently omit required details. A
senior-only route may be feasible after explicit zero-exclusion facts and
per-person line projection, but it would still need native registration, a Form
1040 line 13b/line 38 reconciliation, filled-PDF review, local XSD and IRS
business-rule checks. No tests, typecheck, XSD, PDF rendering, or ATS acceptance
were run in this build-first audit. No compatibility layer or workaround was
added.

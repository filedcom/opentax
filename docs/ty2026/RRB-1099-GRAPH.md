# TY2026 railroad retirement statement graph

Snapshot: September 27, 2026. The Railroad Retirement Board's current
[RRB-1099 SSEB explanation](corpus/authorities/rrb-txl-1099--2012.pdf)
(SHA-256 `bb3769d1577800d0320b1f0ce1b5241390e49e119432887d799fe7478f5cfd21`)
and [RRB-1099-R pension explanation](corpus/authorities/rrb-txl-1099r--2019.pdf)
(`0e643a1c7696bedc5869e7e151236a5009c806df6eb5fc96fc60b1469d3c9e5f`)
are pinned issuer guidance. IRS [Publication 915 for 2025](corpus/authorities/p915--2025.pdf)
(`44c4053dab046c737e4eadff7cf8a8d23fe55d6147bde995c6055b55af6db22b`)
and [Publication 575 for 2025](corpus/authorities/p575--2025.pdf)
(`30bd37ccfcb1fe2e191abadbb38ce7cf7fcbb638e3065335436dd6025a35caa5`)
are **method comparators**, not TY2026 line authority. [Publication 939,
December 2025](corpus/authorities/p939--2025.pdf)
(`83bc40482e7bd7c8ef7b7f34e5e37586402143ef007ec42bc7e5cd79f65df651`)
covers the General Rule. Refresh the 2026 publications and final Form 1040
instructions before coding annual taxability and return-line references.

## Two different issuer statements

An annuitant can receive both forms for one stream of monthly payments.
`RRB-1099` carries the Social Security equivalent benefit (SSEB) part of
tier I and special guaranty payments. `RRB-1099-R` carries the non-SSEB
part of tier I, tier II, vested dual benefits and supplemental annuities.
Keep separate statement type, payee/claim, calendar-year, original/corrected/
duplicate and source IDs. The RRB says a corrected statement replaces the
corresponding original, a duplicate adds nothing, and other distinct
originals in the same year remain valid.
The [public TY2026 MeF inventory](MEF-V1-DRIFT.md#what-the-public-september-24-inventory-already-establishes)
lists `IRSRRB1042S` for nonresident recipients, but no U.S. RRB-1099 or
RRB-1099-R source entry. Do not map U.S. statements to that nonresident
document; confirm the selected 1040 release's source-document rule.

| Issuer form/box | Correct source meaning and 2026 handoff |
| --- | --- |
| RRB-1099 boxes 3, 4, 5 | Gross SSEB, repayments, and **signed** net (3 minus 4). Combine net with SSA-1099 and other RRB-1099 records in the [Social Security benefits owner](SSA-BENEFITS-GRAPH.md). A negative box 5 can offset another positive benefit; do not clamp each statement to zero. Compute Form 1040 lines 6a/6b from the combined benefits and AGI worksheet, with the line 6c lump-sum election where eligible. |
| RRB-1099 boxes 6–9 | Box 6 workers' compensation offset is already included in box 3; boxes 7/8/9 identify benefits paid for prior years and are also included in box 3. Preserve prior-year breakdown for the Publication 915 lump-sum election; do not add these amounts again to income. |
| RRB-1099 boxes 10–11 | Box 10 SSEB federal withholding to 1040 withholding; box 11 Medicare premiums are informational for any medical deduction, not a reduction to gross benefits. |
| RRB-1099-R box 3 | Employee contributions/investment in contract, **not current-year income**. Store annuity start date, method, expected months/return and cumulative prior recovery; a changed reported contribution can require recomputation or an affected-year amendment. |
| RRB-1099-R boxes 4–7 | Box 4 contributory NSSEB/tier II paid, box 5 vested dual benefit and box 6 supplemental annuity (both generally fully taxable), box 7 total gross = 4+5+6. Determine taxable pension with the applicable Simplified Method or General Rule and report 1040 pension lines 5a/5b. Do not treat box 8 as gross pension. |
| RRB-1099-R boxes 8–10 | Box 8 is **prior/unknown-year pension repayment**, not netted from boxes 4–6; preserve the paid and original-tax years for claim-of-right or other recovery treatment. Box 9 is pension federal withholding. Box 10 is Medicare premiums, normally shown here only if no RRB-1099 is required; do not deduct the same premium twice. |

The statement totals are before Medicare premium deductions, so cash
deposited to the bank is not the taxable-benefit source. If total combined
SSA/RRB SSEB net is negative after offsets, preserve the signed amount and
evaluate prior-year repayment relief rather than reporting negative 1040
line 6a. The 2025 Publication 915 comparator describes a deduction/credit
path for qualifying repayments over $3,000; the final TY2026 instructions
must determine the exact Schedule A/1040 route.

## Current code boundary

The shared [`rrb1099r` node](../../forms/f1040/nodes/inputs/rrb1099r/index.ts)
mixes boxes from **both** statements in one item. Its `box3_sseb_gross`,
`box4_sseb_repaid` and `box5_sseb_net` belong to RRB-1099, while its
`box8_tier2_gross`, `box9_tier2_taxable` and `box10_tier2_withheld` are
incompatible with RRB-1099-R: issuer boxes 8, 9 and 10 actually mean
prior-year repayment, withholding and Medicare premiums. The node calls
RRB-1099 boxes 6/7 Medicare/withholding, although they mean workers'
compensation offset and a prior-year benefit component. It clamps a
negative SSEB net to zero, calculates a simplified pension exclusion from
the wrong box, and deposits gross SSEB directly into Form 1040 and AGI
without a complete combined-benefit record. It has no 2026 registry entry,
source duplicate handling, source PDF or current MeF mapping.

## Build and acceptance

1. Intake the two actual issuer statement shapes with separate box maps,
   replacement/duplicate identity and payee owner. Reconcile each RRB-1099
   box 5 to boxes 3–4 and each RRB-1099-R box 7 to boxes 4–6.
2. Send signed SSEB net, prior-year segments and withholding to one combined
   SSA/RRB benefit calculation. Implement the regular versus lump-sum
   taxable-benefit comparison using prior-year return facts, and expose
   1040 lines 6a/6b/6c and withholding. Resolve net-negative repayment
   relief in the final TY2026 instructions.
3. Send the pension component and basis history to the [pension
   owner](FORM1099R-GRAPH.md). Select Simplified Method versus General Rule
   from the annuity start/method facts, carry recovered basis forward, and
   reconcile 1040 lines 5a/5b and box 9 withholding. Route any box 8
   repayment to its affected-year tax-benefit decision.
4. Determine from the selected v4-or-later MeF package whether either RRB
   source statement is represented as structured XML, an attachment, or
   return-line detail only. Validate the 2026 1040/Schedule A PDFs and
   current ATS cases; no invented PDF copy of the issuer statement is
   implied by the TY2025 form inventory.
5. Test both statements for one payee, multiple originals, corrected versus
   duplicate, SSEB negative net offset against SSA/other RRB, workers'
   compensation and prior-year amounts already included in box 3, lump-sum
   election, pension General Rule/Simplified Method, changed basis, box 8
   prior-year repayment, box 9/10 distinction, Medicare premium duplicate
   prevention and 1040 withholding reconciliation.

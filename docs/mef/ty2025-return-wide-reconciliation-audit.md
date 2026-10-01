# TY2025 return-wide ordering and reconciliation audit

The Form 1040 sink calculates tax, credit, withholding, refundable-payment, and
balance subtotals from its retained graph inputs. Native MeF and PDF export are
separate projections; a changed filed subtotal could otherwise reach one or both
outputs without replaying the sink calculation.

## Bounded export replay staged in this batch

`return-wide-arithmetic.ts` checks the retained Form 1040 lines 11, 14, 15,
18, 21, 22, 24, 25d, 32, 33, 34, and 37 against their immediate component lines whenever the subtotal is
supplied. Both Form 1040 native and PDF descriptors call the same check before
projection. The replay catches a changed AGI, deduction, taxable-income, tax,
credit, withholding, or payment
subtotal, including a changed Schedule 3 deposit on line 20 or line 31 when the
final 1040 component is present. It accepts unsupplied optional line components
as zero, matching the sink's arithmetic. Positive and per-subtotal tamper
fixtures are authored for the bulk test gate.
Lines 34 and 37 use the filed whole-dollar difference of lines 33 and 24;
line 37 includes a reported line 38 penalty, including when that penalty
exceeds an overpayment. This does not establish a 2026 application election
or refund-account allocation.

The next bounded pass checks attached Schedule 1 line 10/26 against Form 1040
lines 8/10; Schedule 1-A line 38 against line 13b; Schedule 2 Part I against
line 17; and Schedule 3 line 15 against line 31. Both native and PDF Form 1040
entry points use the same pending-graph replay. This rejects a conflicting final
return deposit even when its own Form 1040 arithmetic remains coherent. Schedule
2 Part I reuses its calculator rather than maintaining a second sum.

The 2025 Schedule 2 line-structure review also blocks any positive legacy Form
5405 repayment on line 10 at graph calculation and direct native/PDF projection.
The
[official 2025 Schedule 2](https://www.irs.gov/pub/irs-prior/f1040s2--2025.pdf)
marks line 10 reserved, and the
[Form 5405 instructions](https://www.irs.gov/instructions/i5405) say 2024 was
the final repayment filing year. The guarded source cannot silently increase
Form 1040 line 23 without a printable 2025 line. Positive and direct-export
rejection fixtures are authored but unrun.

Schedule 2 Part II now replays its retained source rows into Form 1040 line 23
at both final native and PDF entry points. The replay subtracts the retained
Form 8978 Schedule 2 line 17z reduction, checks the worksheet's adjusted line 21
when present, and matches the filed line 23. It excludes Schedule 2 line 20, as
directed by line 21 on the
[official 2025 Schedule 2](https://www.irs.gov/pub/irs-prior/f1040s2--2025.pdf).
The
[2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
place the bounded negative Form 8978 adjustment on Schedule 2 line 17z. Fixtures
cover a positive reduced total and tampering with the Schedule 2 source,
adjusted worksheet, or Form 1040 amount. This proves the retained arithmetic; it
does not authenticate the partner audit source for Form 8978. The 2025 Schedule
2 line 14 and line 15 installment-sale interest entries remain unsourced and
unprinted in the current graph/PDF. They need separate retained sale and
interest-calculation evidence before inclusion in line 21.

### Schedule 2 installment-sale interest source boundary

The [2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
put section 453(l)(3) interest for certain residential-lot and timeshare dealer
sales on Schedule 2 line 14, and section 453A(c) interest for qualifying
nondealer installment obligations on line 15. The [2025 Form 6252
instructions](https://www.irs.gov/pub/irs-pdf/f6252.pdf) explicitly say the
interest is **not** calculated on Form 6252. [Publication 537
(2025)](https://www.irs.gov/publications/p537) gives the section 453A test and
calculation: sale price above $150,000, an aggregate year-of-origin outstanding
face amount above $5 million, exceptions for farm and individual personal-use
property, unrecognized gain at the close of the return year multiplied by the
applicable maximum tax rate, the **fixed sale-year applicable percentage**, and
the underpayment rate for the month containing the taxpayer's year end.
Interest continues in later years while an originally qualifying obligation
remains outstanding.

The current `form6252.f6252s` rows supply gain, sale price, and payments for
each attached Form 6252, with a 2024 filed-form check for some later-year
sales. They do not inventory **all** outstanding obligations by origin year,
identify sales belonging to one transaction, establish dealer/residential-lot
or timeshare status for line 14, preserve the origin-year aggregate face amount
and percentage for line 15, prove the year-end unpaid balance and unrecognized
gain for every obligation, identify the statutory exceptions, or retain a
year-end rate source. Partnership and S corporation pass-through information
can also require an owner-level interest computation (see the [2025 Form 1065
instructions](https://www.irs.gov/instructions/i1065) and [2025 Schedule K-1
shareholder instructions](https://www.irs.gov/instructions/i1120ssk), codes M
and N). Deriving interest from
the Form 6252 current payment alone would therefore produce an unsupported
Schedule 2 amount; accepting a bare interest figure would leave the source
unauthenticated. The Schedule 2 graph input, native MeF mapping, and PDF
descriptor have no line 14/15 fields, so neither amount can be printed or
reconciled to line 21 and Form 1040 line 23 yet.

The implementation gate is a retained obligation/interest workpaper keyed to
each sale and pass-through source. It must carry origin-year, transaction and
property classification, face amount and close-of-year balance, prior-year
percentage where relevant, unrecognized gain and gain character, maximum tax
rate, tax-year-end underpayment rate citation, and per-obligation line 14/15
calculation. Then add the computed lines to Schedule 2 Part II, MeF, and PDF,
and assert their sum through line 21 and Form 1040 line 23. A positive
two-obligation case, a later-year carryover, both statutory classifications,
and tampered workpaper/line totals should be in the bulk validation batch.

### Form 1040 line 26 estimated-payment amount

The [2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
include 2025 estimated federal income-tax payments and any 2024 return or
amended-return overpayment applied to 2025 on line 26. The existing `f1040es`
input holds four quarterly amounts and one prior-year applied amount. A shared
calculator now sums those five fields in both the graph node and final
native/PDF Form 1040 export, rejecting a positive filed line 26 without the
retained source or any changed source/line amount. Positive and tampered export
fixtures are authored for the bulk gate.

The source still lacks an IRS payment confirmation, posted tax period, payer
identity, and reference to the accepted prior-year overpayment election. It
also cannot allocate joint payments on separate returns or establish whether
an applied credit was later changed by an amended return. The amount replay
does not authenticate that these dollars were paid, credited to 2025, or owned
by the filer. Those receipt/ownership joins remain before line 26 can be
treated as externally verified.

The [2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
put withholding shown on Form 8288-A in line 25c (other forms), not line 25b
(Forms 1099). The existing `f8288` graph deposit now uses the line 25c input;
final native/PDF export checks that its retained sum does not exceed filed line
25c. This is a bucket and lower-bound reconciliation, not complete Form
8288-A filing support: the raw `f8288` source has no seller taxpayer identity,
issued certificate byte binding, or filed Form 8288-A attachment. Those facts
and cross-source duplicate/period checks remain before the credit is verified.

## Remaining return-wide work

| Area                           | Current graph observation                                                                                                                                                                                                      | Unresolved join                                                                                                                                                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Income/AGI                     | The AGI aggregator deposits line 11; the Form 1040 sink can also receive explicit lines 9, 11, and 15. Final export now replays line 11 from lines 9–10, line 14 from lines 12–13, and nonnegative line 15 from lines 11 and 14 when the component lines are present. | Recompute each component from identified source rows at export; sparse direct sink inputs still prevent a blanket source equality assertion. |
| Schedule 1 and 1-A             | Bounded source routes deposit Schedule 1 income/adjustments and Schedule 1-A line 38; final schedule totals now reconcile to Form 1040.                                                                                        | Replay every contributing child source and detect duplicate documents across Schedule 1/1-A and the filed pages; exact source authenticity remains open.                                                                                     |
| Schedule 2 and 3               | Schedule 2 Parts I and II and Schedule 3 nonrefundable/payment totals now reconcile to Form 1040, including the retained Form 8978 line 17z reduction; several credits are finalized in the Form 1040 sink after tax is known. | Authenticate child sources, including the Form 8978 partner audit and corrected return facts. The official 2025 Schedule 2 also has installment-sale interest on lines 14 and 15, which lack a sourced graph route and printable projection. |
| Withholding and payments       | Form 1040 line 25d/32/33 are calculated from deposits, and staged export replay now checks their immediate component lines.                                                                                                    | De-duplicate payer statements and extension/estimated-payment receipts by issued identity and tax period, then reconcile each to lines 25–31.                                                                                                |
| Multiple copies and carryovers | Several child descriptors create multiple owner/source-specific native and PDF copies; credit and loss carryovers have route-specific ledgers.                                                                                 | Require a complete per-copy source inventory and origin-year/earlier-use ledger across the final return. One arithmetic total cannot establish that all copies belong to the taxpayer or that a carryover is available.                      |

This note records a bounded internal consistency improvement. It does not
establish complete source authenticity, 2025 business-rule acceptance, or IRS
ATS acceptance.

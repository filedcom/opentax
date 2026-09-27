# TY2026 SSA and railroad-equivalent benefits

Sources: the pinned [2026 draft Form 1040](corpus/draft/f1040.pdf),
[IRS Publication 915 (2025)](corpus/authorities/p915--2025.pdf) as the
latest published benefits/box guide available in this snapshot, and the
existing Social Security taxability worksheet in the shared AGI node. Replace
the publication comparator with the 2026 edition when issued, and check any
revised Form 1040 instructions before product registration.
The pinned [RRB issuer explanation and pension statement plan](RRB-1099-GRAPH.md)
distinguishes the SSEB RRB-1099 from RRB-1099-R, whose same-numbered boxes
have different meanings. The shared `rrb1099r` node must not be registered
as a second SSEB source beside this dedicated owner.

| Statement | Source boxes | Registered route |
| --- | --- | --- |
| SSA-1099 | Box 3 gross, box 4 repayments, box 5 net, box 6 withholding | Net benefits to 1040 line 6a and the AGI taxability worksheet; box 6 to line 25b. |
| RRB-1099 | Box 3 gross SSEB, box 4 repayments, box 5 net SSEB, **box 10 withholding** | Same 1040 lines; the RRB-1099 box 6 is a workers' compensation offset and is not a withholding source. |

The dedicated 2026 `ssa1099` source accepts a list of typed statements and
requires box 5 to equal boxes 3 less 4 on each one. It sums signed net
benefits across statements before sending the nonnegative total to line 6a.
The shared AGI node calculates line 6b from other income and tax-exempt
interest, and the dedicated 2026 Form 1040 sums line 25b withholding with
other withholding. The current graph and PDF test covers one SSA-1099; a
second graph test mixes SSA-1099 and RRB-1099 and checks box 10 withholding.

If aggregate repayments exceed benefits, the source emits an explicit
diagnostic. That case needs its repayment-deduction path before it can be
filed. Lump-sum benefits attributable to earlier years need the Publication
915 election worksheet and remain outside the registered calculation. The
2026 MeF element mapping, current-year instructions, and ATS comparison
remain open.

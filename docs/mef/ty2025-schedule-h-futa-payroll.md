# TY2025 Schedule H FUTA employee payroll slice

The Schedule H FUTA source lists every unrelated adult household employee in a
reviewed 2025 payroll ledger. Each row has a distinct employee ID, a nonempty
payroll source reference, quarterly and annual cash wages, and any Form W-2
source reference and box 2/3/5 amounts. The source affirms that all household
employees are included. The calculation caps each employee's FUTA wages at
$7,000, sums the capped amounts, and rejects a different Section A line 15 or
Section B line 20 wage total. Native and PDF both recompute the same check.

The four quarters must sum to each employee's annual cash wages. A $1,000
current quarter or a separately referenced prior-year qualifying quarter
supports the FUTA line 9 answer. For these unrelated adult employees, the
$2,800 2025 per-employee threshold determines Social Security and Medicare
wages; Social Security wages are capped at $176,100 per employee. Form W-2 boxes,
aggregate FICA and Additional Medicare wages, federal withholding, and line A
must match the payroll ledger.

The [2025 Schedule H instructions](https://www.irs.gov/instructions/i1040sh)
specify the per-employee $7,000 FUTA base and the exclusions for wages paid to
a spouse, child under 21, or parent. This bounded ledger accepts unrelated
adults only. Family and under-18 exceptions, gross-up, noncash pay, and
multiple employers remain outside this slice. FICA-only returns without a FUTA
ledger, actual prior-year quarter and W-2/W-3 source copies, state wage-base
differences, and payroll byte authentication remain open. The implementation
and authored fixtures await the requested bulk test and filled-PDF review after
the other form implementations finish.

# TY2025 Schedule H FUTA employee payroll slice

The Schedule H FUTA source lists every unrelated household employee in a
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
adults and a separately evidenced unrelated student under age 18. Family,
other minor cases, gross-up, noncash pay, and
multiple employers remain outside this slice. Wider FICA-only returns without a
worker ledger, actual prior-year quarter and W-2/W-3 source copies, state wage-base
differences, and payroll byte authentication remain open. The implementation
and authored fixtures await the requested bulk test and filled-PDF review after
the other form implementations finish.

## One-worker FICA-only route (written, unrun)

The [2025 Schedule H instructions](https://www.irs.gov/instructions/i1040sh)
send line 8 to Schedule 2 line 9 without Part II when neither 2024 nor 2025
has a $1,000 household-payroll quarter. A bounded route now accepts exactly one
unrelated adult employee with ordinary cash wages of at least $2,800 in 2025,
four 2025 quarters individually below $1,000, and four referenced 2024 quarters
also below $1,000. The employee's annual wages must equal the 2025 quarters;
W-2 boxes 3 and 5 must equal those wages, and box 2 must equal the entered
federal withholding. Native MeF and PDF recompute Part I and reconcile the
total to Schedule 2 line 9. A positive FICA-only export without this ledger
rejects. Wider multiworker, family, minor, and withholding-only situations
remain open.

The synthetic source/calculation/native/PDF and altered-quarter/W-2 fixtures
are authored but unrun. [ATS Scenario 1](https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-1-12012025.pdf)
supplies $3,100 Schedule H wage totals and a No answer on line 9, but no
worker-level 2024/2025 quarter ledger. It remains partial evidence and cannot
pass the FICA-only export gate without reviewed payroll facts. Entered source
references do not authenticate payroll or W-2 bytes.

## Unrelated student minor with FUTA only (written, unrun)

The worker ledger can now identify one unrelated student who was under 18 at
some point in 2025 by a birth-date record and a separate school-enrollment
record. Both references must differ from the payroll reference. The IRS
instructions exclude that worker's cash wages from the $2,800 FICA test but
include them in the $1,000 FUTA quarter test and $7,000 FUTA wage base.
A synthetic one-worker $4,000 case therefore reports line A No, zero Social
Security/Medicare wages, $4,000 Section A wages, $24 FUTA, and $24 on
Schedule 2 line 9. Calculation, native XML, PDF, age tamper, line A drift, and
Schedule 2 mismatch fixtures are authored for the deferred batch. Age,
enrollment, payroll, and state source bytes are not authenticated. Other
under-18 cases, family workers, and wider combinations remain open.

## Unrelated nonstudent minor whose household work is principal occupation

The [2025 Schedule H instructions](https://www.irs.gov/instructions/i1040sh)
include an under-18 worker's wages in Social Security and Medicare when
household services are the worker's principal occupation; student household
work does not meet that exception. A bounded active route now requires a
distinct birth-date record, education-status record, principal-occupation
record, payroll source, and Form W-2 for one unrelated minor. It excludes
simultaneous student-minor classification, reconciles four payroll quarters
and W-2 boxes 2/3/5, and applies the $2,800 FICA threshold and $7,000 FUTA
base. A synthetic $4,000 one-worker case calculates $612 FICA plus $24 FUTA,
prints both parts of Schedule H, and joins $636 to Schedule 2 line 9 at node,
native MeF, and PDF projection. Positive and altered-source/line-A/Schedule 2
fixtures are authored for the deferred batch.

The age, education, occupation, payroll, W-2 and state records are identified
and reviewed source assertions, not authenticated document bytes. Family
workers, nonstudent minors without a proved principal household occupation,
and wider worker combinations remain open. No XSD, full test, or filled-PDF
result is claimed for this route yet.

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

Positive Form W-2 box 2 withholding for an unrelated employee now also needs a
separately referenced Form W-4 and an affirmative review that the employee
requested withholding and the employer agreed. The W-4 reference must differ
from that employee's payroll and W-2 references; the one-worker FICA-only route
also keeps it distinct from the prior-year payroll source. Both payroll routes
replay this check at calculation, native MeF, and PDF projection. These are
reviewed source assertions; the W-4, W-2, and payroll bytes still need
authentication for broader positive filing.

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

## One child age 18–20 with agreed income tax withholding

The [2025 Schedule H instructions](https://www.irs.gov/instructions/i1040sh)
exclude wages paid to an employer's child under 21 from the Social Security,
Medicare, and FUTA tests. They permit federal income tax withholding when the
employee requests it, supplies Form W-4, and the employer agrees. A bounded
route accepts exactly one such child, born in 2005 or 2006, with ordinary cash
wages and a positive Form W-2 box 2 amount. It requires separate reviewed
relationship, birth-date, payroll, Form W-4, and Form W-2 references; the
employer parent's SSN must match the final filer, while the child's SSN must
match Form W-2. Four payroll quarters must sum to Form W-2 box 1 and annual
wages. At least one quarter reaches $1,000, demonstrating that the false FUTA
line 9 answer rests on the family exclusion. W-2 boxes 3 and 5, taxable FICA
wages, and FUTA are zero. Schedule H line 7/8 and Schedule 2 line 9 equal
W-2 box 2. Native MeF and PDF replay the retained source and Schedule 2 total.

The synthetic $5,000 wage/$250 withholding and tamper fixtures are authored
for the deferred test batch. Source references are reviewed assertions, not
authenticated document bytes. Spouse/parent cases, multiple workers, mixed
family/unrelated payroll, and other ages remain open.

## One nonstudent minor with FICA and no FUTA (written, unrun)

The 2025 instructions include a worker under 18 in FICA wages when the worker
is not a student and household services are their principal occupation. The
existing one-worker `fica_only_payroll` source now accepts that classification
when both 2024 and 2025 payroll quarters stay below $1,000. Distinct age,
nonstudent, principal-occupation, prior/current payroll, and W-2 references
support the classification and amounts. Annual cash wages must meet the $2,800
FICA threshold, reconcile to four 2025 quarters and W-2 boxes 3/5, and match
Schedule H taxable wages. The bounded $3,100 case yields $474 FICA, no FUTA,
and $474 on Schedule 2 line 9. Native MeF and PDF require the retained payroll
and Schedule 2 total. Positive and source/age/quarter/tax tamper fixtures are
authored for the deferred batch.

The referenced records are reviewed assertions, not authenticated bytes.
Multiple workers, family employees, other minor classifications, and prior or
current FUTA-qualifying quarters remain outside this FICA-only route.

## One spouse employee with agreed withholding on a joint return (written, unrun)

The [2025 Schedule H instructions](https://www.irs.gov/instructions/i1040sh)
exclude wages paid to a spouse from FICA and FUTA, while a completed Form W-4
and the household employer's agreement can support federal income tax
withholding. The family payroll source now has direct child and spouse variants.
The spouse variant requires a reviewed marriage date before 2025, distinct
marriage, relationship, and 2025 marriage-continuity records, payroll, Form
W-4 and Form W-2 references, and an affirmation that the marriage continued
through 2025. The 2025 quarters
must sum to W-2 box 1; at least one reaches $1,000 to demonstrate the family
FUTA exclusion. W-2 boxes 3/5 and Schedule H FICA/FUTA remain zero.

This bounded joint-return route requires the employer to be the primary filer
and the employee to match the final-filer spouse identity. Exactly one filed
W-2 must match the spouse SSN, employer EIN, wages, withholding, and zero FICA
boxes. The same W-2 wages and withholding must reach Form 1040 lines 1a and
25a. Schedule H line 7/8 and Schedule 2 line 9 must equal W-2 box 2 and
Form 1040 line 23. Native and PDF exports replay those final-return joins.
The synthetic $5,000 wage/$250 withholding and source/identity/return tamper
fixtures are authored for the deferred batch. Source references are reviewed
assertions, not authenticated document bytes. Separate returns, multiple
workers or W-2s, other relationship histories, and other family cases remain
open.

## Current selected PDF evidence (2026-10-04)

Three full-return packets now exercise all three initial Schedule H routing
paths. The
three-state FUTA-only return prints Box A/B No and Box C Yes, skips Part I, and
reconciles $90 FUTA through Schedule H, Schedule 2, and Form 1040 across seven
reviewed pages. A separate sourced adult-worker FICA plus Ohio FUTA return
prints Box A and line 9 Yes, $474 FICA, $19 FUTA, and $493 on Schedule H line
26, Schedule 2 line 9, and Form 1040 across six reviewed pages. A joint
spouse withholding-only packet prints Box A No/B Yes/C blank, skips lines
1–6, and stops after line 9 No on its sole Schedule H page; its $250 line 8
tax reaches Schedule 2 and Form 1040, offset by the spouse's W-2 withholding.
Its five pages also passed review. All three packets passed source replay,
local TY2025v5.4 XSD, artifact hashes, page-origin checks, and visual review.
Their manifest digests and paths are in the
[validation batch](ty2025-form1040-validation-batch.md). Referenced payroll,
W-2, and state records remain unverified bytes, and the other worker and
state/rate branches still require review.

## Complete unrelated-worker FICA-only inventory (October 6)

The FICA-only source now accepts a complete nonempty worker inventory and uses
the same per-worker FICA classification and W-2/W-4 validation as the FUTA
route. Adults, evidenced student minors, evidenced nonstudent minors whose
principal occupation is household work, and employees below the $2,800 annual
threshold retain separate wage tests. Both years must have aggregate quarterly
cash wages below $1,000; checking each worker separately is insufficient.
Duplicate employee IDs or W-2 references, conflicting classification or wage
amounts, missing withholding agreements, and changed retained employee records
reject. Native and PDF exports bind the complete ledger and calculated tax to
Schedule 2 line 9. The one-worker/index-zero restriction is removed.

Three reviewed structured-source full returns exercise adult+student+low-paid
adult ($478), principal-occupation minor+student+low-paid adult ($524), and
student+low-paid adult with agreed withholding only ($40). These are reviewed
constructed payroll records, not authenticated W-2/W-4, birth, school, payment
or employer records. All 15 new pages show correct owner, route, required
blanks and Schedule 2/Form 1040 amounts. An aggregate $1,000 current quarter
rejects even when each worker remains below $1,000; a prior $1,000 quarter,
last-worker wage/classification conflict, and substituted last-worker record
also reject.

Retained joint-source replay exposed an independent identity discrepancy: the
Schedule H PDF used the combined name shown on Form 1040 while native MeF
identified the household employer. The PDF now prints the same employer name
as native MeF, rather than adding the employee spouse to the employer field.
Historical source packets and the pre-change production replay are retained
separately; historical equality is not inferred where later zero/name or
pending changes already existed before this payroll phase.

Mixed family/unrelated inventories, parent exceptions, noncash or employer-paid
employee tax, broader state/rate tracing, source-byte authentication and IRS
acceptance remain open under the existing board parent.

Final nine-module standard task: **50 passed, 0 failed, 0 ignored (19s)**.
Typed source gate: **2/0 (12s)**. Actual saved-input replay: **6 packets,
33 pages**, all full local v5.4 XSD; three new packets are exact whole pending,
prepared pending, carry, origins, PDF and native XML except ReturnTs. Two prior
packets match pre-change commit 530f39141 exactly; the joint packet changes only
its employer-name field, with four other pages raster-exact and its corrected
Schedule H page matching the historical original. Historical Form1040 amounts
remain unchanged; older XML final newline and PDF zero/joint-name differences
are separately retained. No full historical pending/PDF equality is claimed.

Logs: `/tmp/opentax-scheduleh-multiworker-final-standard-v2-oct6.log`,
`/tmp/opentax-scheduleh-multiworker-focus-v3-oct6.log`,
`/tmp/opentax-scheduleh-main-raw-v3-oct6.log`.
Actual replay report: `/tmp/opentax-scheduleh-main-raw-oct6/report.json`.
Private originals: `.state/research/scheduleh-multiworker-oct6-preserved`
(nine files), `.state/research/scheduleh-prior-oct6-preserved` (21 files).
Root reviews: `/tmp/opentax-scheduleh-multiworker-review-oct6.json` and
`/tmp/opentax-scheduleh-joint-identity-review-oct6.json`.

## Child wages throughout the under-21 age range

The existing family withholding-only route rejected sourced younger children because its birth-date guard accepted only 2005–2006. The retained before-probe `/tmp/opentax-scheduleh-child-before-source-oct6.json` and `.log` show rejection of a 2008 birth with the same5000 cash wages/250 agreed withholding and zero W-2 FICA wages. [TY2025 Schedule H instructions](https://www.irs.gov/instructions/i1040sh) exclude wages paid to the employer’s child under21 from FICA and FUTA. The source guard now admits children born2005–2024 while retaining relationship/identity, complete payroll, W-2/W-4 and employer/retained-ledger/Schedule2 checks. A child who reaches21 during2025 still needs a separately sourced split-period route; future or invalid dates remain rejected. No minor student or principal-occupation exception is needed for the employer’s own under21 child.

New full-return cases cover age20, turning18, age17 andage15. Each retains5000 cash wages/250 withholding and no household FICA/FUTA; the employer’s unrelated W-2 remains taxable in its own document. Source/native/direct-PDF negatives reject changed birth record, altered tax, age21 and future dates. These constructed ordinary source facts do not authenticate a birth record, employer, W-2 or signed W-4. Wider mixed-family/unrelated payroll and parent exceptions remain within the existing open parent. Final standard, replay and rendered-page results are pending; initial typed-test context errors and the overbroad whole-XML SocialSecurityTax assertion are retained as diagnostics.

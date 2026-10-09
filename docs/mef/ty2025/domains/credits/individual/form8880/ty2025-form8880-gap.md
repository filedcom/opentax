# TY2025 Form 8880 source-to-document boundary

Status: the calculator's self-emitted `print_line*` values are now the single
native Form 8880 payload for both PDF and MeF. The old independent MeF-only
input keys were removed. A contribution without computed native lines or a
reviewed zero-credit outcome rejects instead of silently omitting IRS8880, and
the calculator now uses sourced AGI, filing status and a tax-liability limit
derived during Form 1040 finalization before a positive Saver's Credit reaches
Schedule 3 line 4. The initial build-first notes below retain their historical
test status. Current evidence is recorded in the following update; IRS
business-rule and ATS acceptance remain open.

## Current selected evidence (2026-10-04)

Sixty-six focused Form 8880 and PDF-builder tests pass. The existing
`single-form8880-w2-deferral` source fixture yields a local TY2025v5.4
XSD-valid return and a visually reviewed four-page packet. The PDF builder
now omits the second IRS Form 8880 source page because it contains instructions
only. The filed page reconciles a $2,000 W-2 code D deferral and a $428 credit
to Schedule 3 line 4 and Form 1040 line 20. The selected review manifest
passed source replay, page-origin, PDF/XML hash, and XSD checks; its digest is
in the [validation batch](../../../../testing/ty2025-form1040-validation-batch.md). This is one
synthetic route; source authenticity, other branches, IRS business rules, and
ATS acceptance remain open.

On 2026-10-05, native MeF and PDF export gained a shared replay of positive
Form 8880 W-2 deferral entries against retained W-2 box 12 copies. It compares
employee SSN, deferral code, amount, and the reviewed code G employee split as
a multiset; a missing, changed, or duplicated W-2 now rejects instead of
allowing a self-contained Form 8880 claim. Sourced MFJ D/E and governmental
457(b) code G examples still pass. The focused native/PDF cases passed 22/22,
and a wider related batch passed 139/139. Issuer authenticity and other
contribution sources remain separate gates.

The same native/PDF finalization check now also replays positive contributors'
birth dates, five-month student answers, dependent-claim answers, filing
status, and present SSNs against the retained general source when that source
is part of the return. Direct tests first showed that a retained five-month
student could be contradicted by a positive Form 8880 claim; they now reject
that drift for taxpayer and spouse, while matching single and joint claims
pass. The focused 35-test batch and wider 145-test batch pass. Standalone
reviewed Form 8880 inputs without a retained general record remain a separate
supported source route; independent fact authentication is still open.

The TY2025 line 9 AGI bands now match the printed 2025 Form 8880 table:
single/MFS/QSS ceilings of $23,750/$25,500/$39,500, HOH ceilings of
$35,625/$38,250/$59,250, and MFJ ceilings of $47,500/$51,000/$79,000. Qualifying
surviving spouse uses the single/MFS column, not MFJ. The earlier configuration
used older bands. Exact-boundary and QSS cases are written but unrun in the
agreed build-first pass.

A reviewed zero-credit computation emits `calculated_zero_credit: true` on the
Form 8880 node, without a Schedule 3 amount or native print lines. MeF accepts
that outcome only with a contribution source and no competing print lines, then
omits IRS8880. This covers fully offset distributions, AGI above the table and
zero tax capacity. A contribution source without either the computed positive
lines or this reviewed-zero outcome still rejects. This marker is a computed
node result, not an alternate manual filing payload.

The [2025 Form 8880](https://www.irs.gov/pub/irs-pdf/f8880.pdf) is attached when
an eligible individual claims the nonrefundable retirement-savings contributions
credit. Its 2025 PDF lines 1 and 2 separately show IRA/ABLE contributions and
elective deferrals, while the checked-in TY2025 v5.4 `IRS8880.xsd` retains
legacy-looking XML element names for those line numbers. The serializer follows
the XSD's line-number annotations and the PDF's 2025 line order; this still
needs the agreed XSD and visual-PDF batch.

The underlying source inventory is not complete. The calculator receives IRA
contributions from the IRA worksheet, elective deferrals from W-2 and AGI/status
from aggregation. The Form 8880 node now forwards these facts without claiming a
credit. The Form 1040 sink derives line 18 and the five higher-priority Schedule
3 worksheet lines, then computes and finalizes Form 8880 and Schedule 3
together. The old asserted `income_tax_liability` input rejects. Age, student,
and dependent answers are required for a positive contributor; the joint
distribution window has one reviewed ledger. Independent proof of contribution
eligibility and payer classifications, plus a sourced nonjoint distribution
ledger, remain open. Do not mark Form 8880 fully supported until the source,
native XML, PDF, and ATS evidence reconciles.

Graph-level resolution (2026-09-28, unrun): the existing
`form8880 -> schedule3 -> f1040` edges remain acyclic. Form 8880 forwards only
validated contribution source; Schedule 3 forwards that source and its
higher-priority line amounts to Form 1040. The sink derives line 18 from line 16
plus Schedule 2 Part I, subtracts Schedule 3 lines 1, 2, 3, 6d, and 6l, calls
the pure Form 8880 calculation, updates line 20/22 in the same pass, then
finalizes the earlier Form 8880 and Schedule 3 pending records. Direct
prefilling of Schedule 3 line 4 conflicts with this source route. The
finalization only replaces calculated fields, preserving contribution source
facts for native MeF/PDF reconciliation. The producer graph for lines 1, 2, 3,
6d, and 6l still carries its own form-specific source limitations; this change
does not certify those inputs or create a manual-capacity fallback. Focused DAG,
all-five-priority-line, zero-capacity, MeF/PDF and conflict cases are written
but unrun.

The W-2 box 12 D/E/F/H/S/AA/BB/EE source route retains employee SSNs and
attributes contributions to the taxpayer or MFJ spouse only when that identity
matches. Missing, mismatched, ambiguous, or nonjoint-spouse ownership and the
old combined manual amount reject. The native MeF line 2 amounts are checked
against those owned W-2 sources. Focused cases are written but unrun. Non-W-2
line 2 sources remain unsupported. Code G can now contribute only when the W-2
entry carries an explicit governmental 457(b) answer, an employee-elective
amount no larger than the box 12 total, and a reviewed payroll split reference.
The employer portion does not enter Form 8880. A raw code G total still rejects.

Build-first addendum (2026-09-28, unrun): W-2 employee-owned codes F, H, S, AA,
BB, and EE now join D/E on Form 8880 line 2. The source retains each employee
SSN and code, and the calculator and native serializer still reconcile the owner
totals. Positive raw code G remains blocked because box 12 does not separate
employee and employer amounts. The 2025 Form 8880 instructions explicitly
include designated Roth deferrals on line 2.

Reviewed code G addendum (2026-09-28, unrun): W-2 source, Form 8880 calculator,
and native contribution checks now carry the same employee-elective amount. The
reviewed split reference is a source-workpaper requirement, not independent
authentication. Non-governmental 457(b) amounts, unsplit totals, employer-only
amounts, and employee amounts larger than box 12 cannot create a credit. The
[IRS 2025 Form 8880](https://www.irs.gov/pub/irs-pdf/f8880.pdf) permits
governmental 457(b) elective deferrals, while the
[IRS W-2 guidance](https://www.irs.gov/retirement-plans/common-errors-on-form-w-2-codes-for-retirement-plans)
explains that code G includes elective and nonelective deferrals. Focused cases
are written but unrun; the overall source audit and full validation gates stay
open.

The MeF and PDF assembly paths now compare positive Form 8880 line 11 with the
finalized 2025 Credit Limit Worksheet: Form 1040 line 18 less Schedule 3 lines 1
through 3, 6d, and 6l. They also require Form 8880 line 12 to equal Schedule 3
line 4. A positive native serializer call without finalized return context now
rejects. Both native and PDF assembly also require positive contribution source
facts and match each owner's printed line 1 and line 2 to those facts.
Standalone calculator inputs still need eligibility and distribution source
review; this export reconciliation is not a substitute for those facts. The
added source, calculation, MeF, and PDF cases are written but unrun.

Positive credit calculation now also needs each contributing person's birth
date, answer for full-time student status during at least five calendar months
of 2025, and answer for whether another return claims that person as a
dependent. A contributor born after January 1, 2008, a five-month student, or a
claimed dependent cannot create a positive credit. The general source sends
these per-person facts to the calculator. MeF and PDF export require the same
facts for positive contributor lines and reconcile line 7 to lines 6a/6b. Mixed
joint returns where one contributor is ineligible still stop rather than
silently claiming that person's contribution; modeling that valid spouse-only
variant and independent document proof remain open. Focused cases are written
but unrun.

Native MeF and PDF rerun the Form 8880 calculator from source facts and compare
every printed line, including contributions, reductions, AGI, rate, raw credit,
limit, and claim. They require the source filing status and AGI to match
finalized Form 1040. The bounded Form 2555 foreign-earned-income/housing addback
now comes from the AGI aggregator, changes the Form 8880 line-8 credit rate, and
is checked against the same filed Form 2555 computation and Schedule 1 line 8d
during native/PDF assembly. An asserted addback without that source rejects.
Puerto Rico and American Samoa exclusions still need their own source join; the
broader refigure is not complete. Focused calculator and tampering cases are
written but unrun.

Unified lookback build pass (2026-09-28, unrun): the two mutually exclusive
partial joint-distribution reviews were replaced directly, without a fallback,
by one `form8880_joint_distribution_review` source. It permits distinct dated
qualifying entries after 2022 and before the documented 2026 filing due date,
requires filed-return joint-status evidence for 2023/2024 and a documented
filing plan for prefiling 2026, and treats 2025 as joint from this return. The
reviewed distribution-source reference and no-other-distributions affirmation
cover the whole window, including years with no entries. A documented extension
is required to use October 15 rather than April 15. The combined calculation
allows 2023/2024 and 2025/2026 distributions in one computation, keeps
nonjoint-year spouse amounts out of the taxpayer column, and rejects conflicting
status or duplicate distribution references. Any positive joint credit now
requires this complete review, even when its entry list is empty. The old
partial input keys and joint scalar distribution amounts now explicitly reject.
This is a reviewed-source contract, not independent authentication of payer
documents, prior returns, or a future 2026 filing plan. Focused positive and
rejection cases are written but unrun; the full validation and ATS gates remain
open.

The
[2025 Form 8880 instructions](https://www.irs.gov/pub/irs-prior/f8880--2025.pdf)
and [2025 Publication 590-A](https://www.irs.gov/publications/p590a) describe
the testing window and the joint-return exception. The unified review above
implements those line-4 rules for its reviewed-source entries. The new finalized
tax-capacity feed still needs the agreed full-batch verification.


## October 9 nonjoint distribution ledger and complete returns

The public general source now accepts `form8880_nonjoint_distribution_review`.
It records the taxpayer, reviewer, normal or extended filing deadline, extension
reference, complete distribution inventory and dated recipient-owned entries.
Each entry carries a positive gross amount, distinct source reference and a
reviewed line-4 treatment with its classification workpaper. The ten treatments
cover inclusion and the nine exception categories in the
[2025 Form 8880 instructions](https://www.irs.gov/pub/irs-prior/f8880--2025.pdf).
The calculation sums included distributions; exclusions remain visible in the
inventory. This is reviewed structured evidence, not authenticated payer bytes.

The ledger rejects duplicate sources, another recipient, invalid/out-of-window
dates, unconfirmed extensions, simultaneous scalar distributions and joint-return
use. Single, MFS, HOH and QSS calculations are exercised. Retained general and
Form8880 ledger copies must agree at export; the zero-credit native path also
replays the source and final return before omitting the form. Existing scalar
sources remain compatible and are not upgraded to sourced-record proof.

Three synthetic complete returns retain wages25000, W-2 deferrals2000,
withholding1000 and pre-credit tax928:

| Case | Included distributions | Credit | Final tax | Refund | Pages |
| --- | ---: | ---: | ---: | ---: | ---: |
| Prior distribution plus excluded5000 rollover | 200 | 360 | 568 | 432 | 4 |
| Distribution before extended filing deadline | 500 | 300 | 628 | 372 | 4 |
| Contributions fully offset | 2000 | 0 | 928 | 72 | 2 |

All three XMLs pass cached TY2025v5.4 Return1040.xsd (SHA256
`e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`).
All ten generated pages were visually reviewed: owner, single/digital-assets
marks, wage/AGI/deduction/tax/payment/refund, Schedule3 and Form8880 amounts,
attachment order and omission in the zero-credit case reconcile. Existing
zero-presentation qualifications remain; no signature or IRS acceptance is
claimed. The dates are prior-year or prefiling2026 facts, so these fixtures do
not prove current-year distribution-income joins.

The focused typed batch passes189 tests. Each return rejects changes to either
retained ledger copy at native and complete-PDF boundaries (six rejections per
export). Private artifacts, source/pending snapshots, schema results and page
renders: `.state/research/form8880-nonjoint-2026-10-09/`. Broader contribution
sources, issuer authentication, current-year income-source joins, local business
rules and IRS acceptance remain open; the Form8880 parent is not closed.


## October 9 current-year Form1099-R source joins

Current-year entries in the reviewed nonjoint ledger now require an identified
Form1099-R copy. The public return entry point and native/PDF source replay
compare the complete positive distribution inventory: issued-copy reference,
recipient, payer EIN, account, gross amount, explicit taxable amount, both
codes and IRA indicator. Duplicate, missing and changed copies reject. The
review includes a plan-classification reference; codeD must agree with the new
nonqualifying-plan treatment. The existing distribution-code enum was moved to
a shared file and re-exported without changing its members.

This extends the [Form8880 line4 source rules](https://www.irs.gov/pub/irs-prior/f8880--2025.pdf)
to the same current-year copies that produce retirement income. CodeD identifies
nonqualified annuity/life-insurance distributions in the
[2025 Form1099-R instructions](https://www.irs.gov/pub/irs-prior/i1099r--2025.pdf).
The constructed code7/D annuity remains taxable income while its reviewed
nonqualifying-plan classification excludes it from the saver reduction.

Six single-filer age61 returns retain AGI25000, standard deduction15750,
taxable income9250, pre-credit tax928 and withholding1000:

| Case | Current gross/taxable distribution | Prior included | Saver credit | Final tax/refund | Pages |
| --- | --- | ---: | ---: | --- | ---: |
| Pension | 500/500 | 0 | 300 | 628/372 | 4 |
| IRA | 500/500 | 0 | 300 | 628/372 | 4 |
| Pension plus IRA | 300/300 plus400/400 | 200 | 220 | 708/292 | 4 |
| Partly taxable pension | 500/400 | 0 | 300 | 628/372 | 4 |
| Fully offset credit | 2000/2000 | 0 | 0 | 928/72 | 2 |
| Nonqualified annuity, code7/D | 500/500 | 0 | 400 | 528/472 | 4 |

The partly taxable case uses gross500 for the credit reduction and taxable400
for income, with wages24600; it does not reduce the saver ledger by only400.
The mixed case retains both copies and distinct Form1040 IRA/pension joins.
All six complete XMLs pass cached TY2025v5.4 Return1040.xsd, digest
`e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`.
The grouped typed tests pass231/0, followed by one additional classification
boundary pass. Sixty changed public sources reject; each native/full-PDF export
rejects72 changes, including retained-ledger and missing/duplicate/changed-copy
variants. Tests also reject missing current-year metadata, misplaced prior-year
metadata and codeD classified as an included distribution.

All22 generated pages were reviewed for owner, filing status/digital-assets
marks, income placement, credit and tax/payment/refund totals, attachment order
and zero-credit form omission. Five packets nevertheless print fully taxable
gross amounts on line4a or5a. The
[Form1040 instructions](https://www.irs.gov/instructions/i1040gi) call for blanks
in those fully taxable cases; the partly taxable packet correctly needs5a500
and5b400. This new presentation issue is deferred97, with no fix or complete
paper approval claimed. Calculations and selected source joins still reconcile.

Evidence: `.state/research/form8880-current-2026-10-09/`, including six source/
pending/XML/PDF sets,22 page renders, schema report, qualification review and
failure/final logs. Source references are synthetic reviewed facts, not issuer
or signature authentication. Current-year non-1099-R distribution sources,
broader classification proof, joint histories, local business-rule acceptance
and IRS acceptance remain open. The existing parent task is not closed.


## October 9 joint distribution inventory checkpoint

The reviewed joint mode now binds both spouses' complete positive current-year
Form1099-R inventories to the distribution ledger. It requires reviewer/date,
owner identity, payer/account/source reference, gross and explicit taxable
amounts, both distribution codes, IRA mark and plan classification. Excluded
current distributions remain in that inventory with zero qualifying amount.
Missing, duplicate, misowned or changed source copies reject at public entry and
again at native/full-PDF export, including a calculated zero credit. Retained
general facts bind both owner identities and the complete ledger. The older
joint ledger remains compatible without being represented as this stronger proof.

Seven MFJ returns retain AGI50000, standard deduction31500, taxable income18500,
[IRS table tax1853](https://www.irs.gov/publications/p1040) before credits and
withholding/payments3000. Both owners are61, with W-2 deferrals2000/1500.
[Form8880 instructions](https://www.irs.gov/pub/irs-prior/f8880--2025.pdf)
distinguish distributions received during a joint filing year from distributions
received when the couple did not file jointly; the retained2026 filing plan is
review evidence, not proof of an eventual2026 filing.

| Case | Line4 taxpayer/spouse | Credit | Final tax | Refund |
| --- | --- | ---: | ---: | ---: |
| Both current distributions | 300/300 | 580 | 1273 | 1727 |
| Prior spouse distribution, separate filing | 300/700 | 500 | 1353 | 1647 |
| Prior spouse distribution, joint filing | 700/700 | 420 | 1433 | 1567 |
| Prior separate plus prefiling separate | 800/700 | 400 | 1453 | 1547 |
| Prior separate plus prefiling joint | 800/1200 | 300 | 1553 | 1447 |
| Additional excluded spouse code7/D annuity | 300/300 | 580 | 1273 | 1727 |
| Distributions fully offset both contributions | 2500/2500 | 0 | 1853 | 1147 |

The grouped typed gate passes240/0. These seven cases reject35 public-source
changes and63 native plus63 full-PDF changes, including ledger and retained
owner mutations. All seven XMLs pass cached TY2025v5.4 Return1040.xsd, digest
`e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`.
All26 pages were reviewed: six four-page1040/Schedule3/Form8880 packets and one
two-page zero-credit1040. Amounts, columns, identity on1040, MFJ/digital-assets
marks, refund totals and zero-credit omission reconcile. All seven repeat
fully taxable gross presentation deferred97; six Form8880 page4 headers omit
the spouse name, extending the existing joint-name qualification. No deferred
repair or whole-form closure is claimed.

The first fixture rounded each W-2 Medicare withholding amount to whole dollars,
creating a one-dollar Form8959 payment in six cases. Initial refund assertions
incorrectly ignored that payment. Correcting the new fixture to cents removes
it; final refunds above reconcile. Original failure and diagnostic logs remain,
but the suspected refund defect was disproved and no new future TODO was kept.

Evidence: `.state/research/form8880-joint-2026-10-09/`, seven source/pending/XML/
PDF sets,26 renders, qualification/schema reports and original/final test logs.
Issuer authentication, current-year sources without1099-R copies, wider
eligibility/classification and prior-source proof, business rules and IRS
acceptance remain open. The main Form8880/source-provenance parents stay open.

## October 9 IRA deduction and nondeductible basis checkpoint

Four source-entry cases connect traditional IRA contributions, W-2 deferrals,
Form8880, the IRA deduction worksheet and (for two MFS cases) Form8606 basis.
All use reviewed empty distribution inventories and age61/nonstudent/not-dependent
facts. Single-filer wages27000 with IRA2000, or wages26000 with IRA1000 and
W-2 deferral1000, produce deductions2000/1000 and AGI25000. Employer-plan-covered
MFS filers living with their spouse have wages25000 and nondeductible IRA2000,
or IRA1000 plus W-2 deferral1000; their retained basis is2000/1000 and AGI25000.

These expected deduction boundaries follow
[2025 Publication590-A](https://www.irs.gov/publications/p590a): these single
filers are below the79000 phaseout, while the covered MFS filers exceed10000.
The [2025 tax table](https://www.irs.gov/publications/p1040) gives928 on taxable
income9250. The [Form8880 table](https://www.irs.gov/pub/irs-prior/f8880--2025.pdf)
gives a20% credit on2000 eligible contributions at25000AGI for both statuses.
All four calculations therefore show credit400, final tax528 and refund1472
on2000 payments. The saver credit is available alongside a deductible IRA
contribution; the mixed cases distinguish lines1 and2 without double-counting.

Two single-filer cases produce complete XML/PDF packets. Their retained
Form5498 and prior zero-basis records are synthetic reviewed facts. Export does
not actually bind those records for the fully deductible branch: removing the
worksheet or changing its contribution, custodian-record owner or box1 amount
is accepted in eight native and eight complete-PDF builds. Each PDF mutation
uses a newly built bundle from the altered pending graph, so this is not
confused with the separate rejection of a stale prepared-bundle hash. Explicit
observational assertions retain this gap as deferred98; they do not count as
successful source validation.

Both MFS cases derive the expected nondeductible Form8606 basis but fail native
and full-PDF assembly with the scalar builder's joint-return/spouse-ambiguity
error. The guard also treats a present MFS spouse header as joint. These are
retained blocked cases, not two additional supported returns; deferred99
preserves the source, pending values, exact error and original failed log.
No spouse facts were removed to get a packet. No runtime fix is undertaken for
either newly discovered issue.

Evidence: `.state/research/form8880-ira-2026-10-09/`, original and final test logs,
source/pending records for four cases, two native/PDF packets, source-mutation
reports and two blocked-case reports. The first test log contains a corrected
fixture-only misspelling of the empty distribution-review fields. Neither the
Form8880 nor Form8606 parent task is closed by these checks.

The final related gate passes70/0, including the explicit two MFS rejection
cases and the eight source-mutation acceptance observations. Both single-filer
XMLs pass cached TY2025v5.4 Return1040.xsd, digest
`e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`.
All12 pages were reviewed: each packet has Form1040 pages1–2, Schedule1 pages3–4,
Schedule3 page5 and Form8880 page6. Printed identity, status/digital-assets marks,
IRA deductions, line1/2 contribution split, tax and refund reconcile. The
source-validation qualification remains material despite those correct outputs.

## October 9 voluntary employee contribution checkpoint

The public general source now accepts `form8880_employee_contribution_review`
for voluntary after-tax employee payments to a reviewed qualified employer plan.
This is Form8880 line2, distinct from IRA/ABLE line1 and W-2 elective deferrals.
The [2025 Form8880 instructions](https://www.irs.gov/pub/irs-prior/f8880--2025.pdf)
include voluntary employee contributions and exclude section414(h)(2) employer
pickup amounts. The contract requires a2025 annual payroll statement and plan
statement with matching employee/participant SSN, sponsoring employer EIN and
paid amount; distinct references/account identity; plan qualification; and
explicit non-IRA/ABLE, no-returned-payment, nonemployer, nonpickup and
not-already-in-Box12 classifications. A matching owned W-2 identifies the
employer relationship; it does not independently substantiate the after-tax
amount, which must reconcile between the two reviewed records.

Public entry rejects missing/ambiguous/misowned W-2 joins and missing reviewed
distribution inventory. Calculations allocate contributions by actual SSN,
reject nonjoint spouse claims and unsourced deferral totals, and combine the
reviewed payments with sourced elective deferrals. Both native and full-PDF
builders replay the retained general review, W-2 relationship, owner facts and
computed outcome before document selection. This validation therefore still
runs when distributions eliminate the credit and no Form8880 is printed, or
when the computed Form8880 slice is removed. A PDF without a prepared native
bundle receives the same new-source checks.

Exact cents remain in payroll and plan records. For this reviewed route, cents
are added across line2 sources before rounding its owner total, and the credit
is rounded to whole dollars. This follows the
[Form1040 rounding instructions](https://www.irs.gov/instructions/i1040gi),
which require summing amounts before rounding a line total; historical scalar
routes are not upgraded to this reviewed-source claim.

All single cases have AGI25000, taxable9250, pre-credit tax928 and payments2000.
Joint cases have AGI50000, taxable18500, pre-credit tax1853 and payments3000.
Both owners are61; the reviewed student/dependent answers are false.

| Case | Actual voluntary/elective payments | Filed line2 taxpayer/spouse | Prior distributions | Credit | Final tax/refund |
| --- | --- | --- | ---: | ---: | --- |
| Single voluntary | 1500.50/0 | 1501/0 | 0 | 300 | 628/1372 |
| Single mixed | 1000.49/1000.49 | 2001/0 | 0 | 400 | 528/1472 |
| Single prior distribution | 1500/0 | 1500/0 | 500 | 200 | 728/1272 |
| Single fully offset | 1500/0 | 1500/0, no filed form | 1500 | 0 | 928/1072 |
| Joint both owners | taxpayer1000, spouse1500 | 1000/1500 | 0 | 500 | 1353/1647 |
| Joint spouse only | spouse1500 | 0/1500 | 0 | 300 | 1553/1447 |

The focused grouped gate passes239/0; the native/PDF builder gate passes187/0
with Poppler on PATH. An initial builder run failed only because `pdftotext`
was absent from PATH; the original log is retained. Six new public fixtures
reject30 invalid source/inventory inputs and54 changes at each native/full-PDF
boundary. Schema tests reject duplicate or unreconciled records and forbidden
classifications. Development logs retain the zero-credit PDF omission and
fractional-credit failures corrected in this new path; those were implementation
failures of the new route, not repairs to deferred items98–99.

All six XMLs pass cached TY2025v5.4 Return1040.xsd, digest
`e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`.
All22 pages were reviewed: five four-page1040/Schedule3/Form8880 packets and one
two-page zero-credit1040. Filing marks, source income, rounded owner columns,
credit, tax and refunds reconcile. Both joint Form8880 page4 name headers omit
Sam, and the spouse-only packet omits some zero amounts in the primary column;
these extend existing joint-name/zero-presentation qualifications, not new fixes.

Evidence: `.state/research/form8880-employee-2026-10-09/`, six source/pending/XML/
PDF sets,22 renders, schema and qualification reports, original/final tests.
The records are reviewed structured facts, not authenticated issuer bytes.
Wider IRA/ABLE sources, source authentication, other eligibility/credit-order
combinations, business-rule validation and IRS acceptance remain open. The
Form8880 and source-provenance parent tasks are not closed.

## October 9 complete-export eligibility audit

The retained voluntary-contribution cases now test six positive contributor
columns across five returns: three single columns, both columns on the joint
return, and the spouse-only column. Each column has six changes: birth date
after the eligible cutoff or missing, student answer true or missing, and
dependent-claim answer true or missing. Each change is applied to the general
source, computed Form8880 source, and both together. All108 altered graphs
reject independently in native assembly and in the full PDF builder, rebuilt
without an old prepared bundle. This adds to the earlier54 source rejections
per export; the zero-credit case is deliberately outside this positive-claim
eligibility matrix.

The six-return/source module passes7 tests, and the calculator module passes74,
including the January1,2008 eligible birth-date boundary. The governing
[2025 Form8880 caution and instructions](https://www.irs.gov/pub/irs-prior/f8880--2025.pdf)
exclude a contributor born after that date, claimed as a dependent, or meeting
the five-calendar-month student definition. The test changes the reviewed
answers; it does not authenticate school, age or dependency records.

No runtime change or newly discovered deferred defect was needed. Prior XSD
and22-page review evidence for the unchanged six source fixtures is retained
separately; this audit does not add new PDF reviews or claim IRS acceptance.
Evidence: `.state/research/form8880-eligibility-2026-10-09/`. Broader IRA/ABLE,
eligibility-source authenticity, credit ordering and the parent task stay open.

## October 9 W-2 plan complete-return checkpoint

Eleven complete returns now cover every retained saver W-2 code D/E/F/H/S/AA/BB/EE
and reviewed governmental G, including an employer-only G source and joint H/AA
ownership. This is complete-return evidence for existing routes, not new runtime
support or closure of the broader Form8880 task.

The [2025 W-2 instructions](https://www.irs.gov/pub/irs-prior/iw2w3--2025.pdf)
include codeH in box1 wages and provide for the employee deduction. Its single
fixture therefore has wages27000, Schedule1 line24f deduction2000 and AGI25000;
the joint H/AA fixture has wages52000, deduction2000 and AGI50000. Both native
`Sect501c18DContriDedAmt` and the filled Schedule1 page2 show2000. CodeG's
reviewed1500 employee/500 employer split contributes only1500 to Form8880;
the separate employer-only2000 case has no Form8880 or saver credit. The
[2025 Form8880](https://www.irs.gov/pub/irs-prior/f8880--2025.pdf) lists eligible
plan contributions, owner limits and the applicable credit bands.

| Cases | AGI | Saver credit | Final tax | Payments | Refund | Pages each |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Single D/E/F/S/AA/BB/EE | 25000 | 400 | 528 | 2000 | 1472 | 4 |
| Single H | 25000 | 400 | 528 | 2000 | 1472 | 6 |
| Single G employee split | 25000 | 300 | 628 | 2000 | 1372 | 4 |
| Single G employer only | 25000 | 0 | 928 | 2000 | 1072 | 2 |
| Joint H/AA | 50000 | 800 | 1053 | 3000 | 1947 | 6 |

The typed return module passes11/11. Each of the ten positive-credit returns
rejects four retained W-2 changes (removal, duplicate copy, changed owner and
changed box12 amount) through both native assembly and a newly built full PDF:
40 rejections at each boundary. All11 original XMLs validate against the retained
TY2025v5.4 schema; all46 pages have been visually reviewed for amounts, identity,
filing/digital marks and order. Native saver amounts and the H deduction are
also compared directly with the source expectations. Private evidence is
`.state/research/form8880-plans-2026-10-09/`, including source/pending records,
XML/PDFs, page renders, schema logs, review report and hashes.

Joint Form8880 page6 still prints only Alex Plans despite both contributor
columns; the existing deferred joint-name issue applies. No newly discovered
repair was implemented. Source authenticity, wider IRA/ABLE contributions,
credit-order combinations, business rules and IRS acceptance remain open.

## October 9 ordinary-limit ABLE source checkpoint

Public `general.form8880_able_contribution_review` now carries owned Form5498-QA
facts, program/eligibility review references, contribution classifications and
dated beneficiary payment records. Each beneficiary has one reviewed account
and all source references are distinct. The strict review reconciles box1 to
beneficiary cash plus other contributors' cash plus QTP rollovers/transfers;
box2 ABLE-to-ABLE rollovers remain separate. Only the designated beneficiary's
payments enter Form8880 line1. The line is shared by calculation, native and
PDF checks; ABLE amounts do not create an IRA deduction or Form8606 basis.

The [2025 Form5498-QA instructions](https://www.irs.gov/pub/irs-prior/i1099qa--2025.pdf)
distinguish box1 contributions/QTP transfers from box2 ABLE transfers.
[Publication907](https://www.irs.gov/pub/irs-prior/p907--2025.pdf) establishes
the ordinary19000 annual limit and describes the additional employed-beneficiary
limit. This implementation enforces the ordinary limit and requires reviewed
current eligibility, the program's cumulative limit, no returned/excess funds,
no prior excess and no current-year ABLE distributions. Higher-limit,
multiple-account and distribution/excess-tax routes remain guarded; they still
belong to the broader unfinished source/credit task. Medical/program authenticity
is not established by these structured review facts.

A complete nonjoint or owned-joint lookback ledger is required before public
execution, and preserved source/owner facts are replayed during native and full
PDF construction even when no credit form prints. Prior qualifying distributions
reduce the contribution; deposits by others produce a reviewed zero-credit
outcome. For this route, source cents remain retained while each combined
Form8880 contribution line and the credit round to whole dollars. Legacy IRA
source-validation defect98 and MFS defect99 remain unchanged.

| Case | Beneficiary ABLE T/S | W-2 deferral | Prior offset | Credit | Tax | Refund |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Single own cents | 1500.50/0 | 0 | 0 | 300 | 628 | 1372 |
| Single mixed deposits | 1000.49/0 | 1000.49 | 0 | 400 | 528 | 1472 |
| Single other-only deposits | 0/0 | 0 | 0 | 0 | 928 | 1072 |
| Single prior distribution | 1500/0 | 0 | 500 | 200 | 728 | 1272 |
| Single full offset | 1500/0 | 0 | 1500 | 0 | 928 | 1072 |
| Joint both beneficiaries | 1000/1500 | 0 | 0 | 500 | 1353 | 1647 |
| Joint spouse only | 0/1500 | 0 | 0 | 300 | 1553 | 1447 |

Single AGI/tax-before-credit/payments are25000/928/2000; joint amounts are
50000/1853/3000. The mixed-deposit account also contains5000 other cash,3000
QTP transfers and2000 ABLE rollovers, none counted as beneficiary payments.
The other-only account has2000 third-party cash. All seven XMLs validate against
retained TY2025v5.4; direct native line1/credit comparisons pass and all24 filled
pages were reviewed. The two zero-credit packets contain only Form1040.

The grouped source/calculation/native/PDF/W-2 run passes258/0 before final
cent-valued mixed-source and schema-valid review-edit checks; the final ABLE
and employee modules pass15/0, and native/composed-PDF builders pass187/0.
Twenty-eight public inconsistencies reject;91 altered graphs reject at each
export boundary, rebuilding the full PDF without a stale prepared bundle.
Eight schema-negative classifications also reject. Initial PDF failures caught
the missing IRA/ABLE line1 parity check during implementation; the log remains
retained alongside the passing evidence.

Private evidence: `.state/research/form8880-able-2026-10-09/` contains all source,
pending, XML/PDF, page-origin/renders, schema/verification logs and hashes.
Both joint Form8880 page4s repeat the existing missing-spouse-name issue, and
the spouse-only primary-column zero presentation remains qualified. Wider
source/eligibility/credit combinations, authenticity, business rules and IRS
acceptance remain open.

## October 9 employed-beneficiary ABLE limit checkpoint

The existing ABLE source review now accepts an employed-beneficiary review with
owned current-service W-2 wages, employer plan-review references and a complete
2025 residence calendar. It applies the smaller of reviewed wage compensation
and the poverty guideline for the state where the beneficiary resided longest.
Other contributors and QTP transfers remain within the ordinary19000 limit;
only beneficiary payments may use the additional allowance. Public execution,
native assembly and rebuilt full PDFs reconcile the complete owned W-2 inventory,
including zero-credit outcomes. Missing, duplicated, changed-owner or changed-wage
copies and disqualifying plan contributions reject.

The [2025 Form1099-QA instructions, page1](https://www.irs.gov/pub/irs-prior/i1099qa--2025.pdf)
explicitly give additional limits15060 continental,18810 Alaska and17310 Hawaii.
Those amounts agree with the preceding-year rule in
[26CFR1.529A-2(g)(2)(ii)–(iii)](https://www.ecfr.gov/current/title-26/section-1.529A-2)
and the [2024 HHS guidelines](https://www.govinfo.gov/content/pkg/FR-2024-01-17/pdf/2024-00796.pdf).
This resolves the implementation's limit-year choice. Publication907's 2025
figures conflict with those authorities; they were not used as the limit oracle.
The downloaded eCFR HTML is an access page and is identified as such in the
private source manifest; the regulation was read through the web tool.

The plan exclusion covers defined-contribution401(a)/403(a),403(b) and457(b)
contributions, including employer-only amounts. W-2 codesD/E/G/AA/BB/EE supply
conflicting evidence; IRA-based codesF/S and codeH alone do not. A retirement-plan
checkbox alone also does not establish a disqualifying contribution. Four
source-helper acceptance checks cover those distinctions, with eight rejection
checks for excluded plans, deferred compensation and statutory wages. These
helper checks are not additional complete-return packets. A simultaneous
voluntary employee-plan review for this beneficiary stays guarded because its
existing schema does not distinguish the applicable plan classes.

| Complete return | Beneficiary payment T/S | Saver credit | Tax | EIC | Refund |
| --- | ---: | ---: | ---: | ---: | ---: |
| Continental limit | 15060/0 | 400 | 528 | 0 | 1472 |
| Alaska limit | 18810/0 | 400 | 528 | 0 | 1472 |
| Hawaii limit | 17310/0 | 400 | 528 | 0 | 1472 |
| Wage-limited cents | 12000.49/0 | 0 | 0 | 542 | 2542 |
| Joint both | 18810/18810 | 800 | 1053 | 0 | 1947 |
| Joint spouse only | 0/17310 | 400 | 1453 | 0 | 1547 |
| Alaska-to-Texas move | 15060/0 | 400 | 528 | 0 | 1472 |
| Two employers | 15060/0 | 400 | 528 | 0 | 1472 |

Every account also has19000 of other contributors' cash, excluded from the
credit. Wages are25000 per owner except the12000.49 wage-limited case; the
multiple-employer sources are10000 plus15000. The moving beneficiary spends
January–April in Alaska and May–December in Texas. Current mailing addresses
are distinct from the reviewed 2025 residence facts. Single withholding is2000;
joint withholding is3000. The low-wage case retains the required EIC family,
SSN, residency and prior-disallowance review facts; its542 credit comes from the
[2025 Publication596 table](https://www.irs.gov/publications/p596), single/no-child
12000–12050 row. Its original fixture omitted those facts and the expected EIC;
failed logs are retained rather than changing its age or suppressing the credit.

Eight XMLs pass the retained TY2025v5.4 schema, and all30 filled pages have been
reviewed. Sixty-four public inconsistencies and104 mutations at each of the
native/full-PDF boundaries reject. Thirteen additional schema classifications
reject incomplete or contradictory wage, plan and residence evidence. The
ordinary-limit and employed modules pass18/0; the final grouped run passes169/0
and the configured native/composed-PDF builder run passes187/0. The first builder run's
single failure was missing `pdftotext` on PATH; the configured replay retains
its result separately.

Private evidence: `.state/research/form8880-able-employment-2026-10-09/` retains
sources, calculated graphs, XML/PDFs, all page renders, review reports and hashes.
Both joint Form8880 headers still omit the spouse, and zero-valued printed cells
remain qualified under existing deferred items. No deferred repair was made.
Self-employment compensation, ABLE distributions/rollovers, excess taxes, source
authentication and IRS acceptance remain outside this completed wage-source
checkpoint and inside the broader open task; no parent checkbox is closed.

## October 9 owned ABLE distribution checkpoint

Owned current-year Form1099-QA records now reconcile annual gross distributions,
earnings, basis, dated payments and qualified expenses to the beneficiary's
reviewed account. Gross distributions reduce the saver contribution base even
when tax-free; taxable earnings reach Schedule1 line8q, AGI, owner Form5329
PartII, Schedule2 and final Form1040. Annual gross amounts round once for the
saver ledger, including the500.50→501 boundary. Source inventory checks run
before native/PDF selection, including zero-credit and tax-free cases.

The calculation follows the annual earnings ratio in
[26CFR1.529A-3](https://www.ecfr.gov/current/title-26/section-1.529A-3)
and the2400 gross/400 earnings/1600 qualified expense example in
[Publication907](https://www.irs.gov/publications/p907): taxable earnings133.33
file as133, with additional tax13. The
[2025 Schedule1](https://www.irs.gov/pub/irs-prior/f1040s1--2025.pdf)
places ABLE earnings on8q. Gross-distribution offsets follow
[Form8880](https://www.irs.gov/pub/irs-prior/f8880--2025.pdf).
The next-year case retains a specific election for an expense paid March1,2026,
within the first60 days, with no allocation to another tax year.

| Return | Taxable earnings | Saver credit | Final tax | Refund |
| --- | ---: | ---: | ---: | ---: |
| Qualified | 0 | 300 | 628 | 1372 |
| Qualified cents | 0 | 300 | 628 | 1372 |
| Publication example | 133 | 400 | 551 | 1449 |
| Nonqualified | 400 | 400 | 608 | 1392 |
| Basis only | 0 | 300 | 628 | 1372 |
| Credit fully offset | 133 | 0 | 951 | 1049 |
| Next-year expense election | 133 | 400 | 551 | 1449 |
| Joint, primary taxable | 133 | 800 | 1076 | 1924 |
| Joint, spouse taxable | 133 | 800 | 1076 | 1924 |
| Joint, both taxable | 533 | 800 | 1156 | 1844 |
| Additional tax rounds to zero | 4 | 300 | 628 | 1372 |
| Saver rate boundary | 400 | 200 | 848 | 1152 |

Single wages are25000, except25400 in the rate-boundary case; joint wages50000.
Payments are2000/3000 respectively. The rate-boundary AGI25800 changes the saver
rate to10%. Joint gross distributions appear in both saver columns. Two taxable
owners retain separate Form5329 copies, with primary133/13 and spouse400/40.
The4 taxable/0 additional-tax case retains Form5329 despite no Schedule2 tax.

Twelve complete XML returns validate against retained TY2025v5.4 XSD. All90
filled pages were reviewed through45 unique rendered page images. Final typed
grouped checks pass194/0; configured native/composed-PDF builders pass187/0.
Forty-eight public inconsistencies,94 native and94 full-PDF mutations reject;
eight additional source-schema variants reject. This includes missing ledgers,
changed owner/earnings/expenses, removed Form5329 and high-income NIIT scope.
Failed intermediate logs remain explicitly separate from final passing proof:
initial8z mapping, missing return-wide8q join, literal fixture type and the
inactive Form8960 guard were corrected before this checkpoint.

Private evidence lives in `.state/research/form8880-able-distributions-2026-10-09/`:
source/pending/origin records, XML/PDFs, page renders, logs, verification report,
reviewed-image hashes and SHA256SUMS. Source references are synthetic and do not
authenticate issuer records. Joint Form8880 headers still omit the spouse, and
zero additional-tax Form5329 line8 prints blank versus native0; existing deferred
presentation qualifications remain unchanged.

The bounded route covers living beneficiaries with no transfers, rollovers,
returned excess, additional accounts or beneficiary changes. Above-threshold
NIIT treatment lacks a resolved primary-source classification, so native/full-PDF
exports reject; future item100 records that question without implementing it.
Self-employment compensation, broader distributions and exceptions, source
authentication and IRS acceptance remain open. No parent checkbox is closed.

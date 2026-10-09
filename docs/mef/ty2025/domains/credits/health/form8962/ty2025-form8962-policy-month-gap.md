# TY2025 Form 8962 policy-month MeF boundary

> Current verification: see the October9 policy-route checkpoint below; older staged/unrun notes are historical and remain scoped by the exact replay.

## One two-person policy with excess APTC below 400% FPL (2026-10-05)

The monthly filing boundary now accepts one unchanged, same-state policy
covering a single filer and one claimed dependent at 100%–399% FPL when the
dependent's identified filed return and W-2 establish Worksheet 1-2 MAGI.
The existing source replay checks both covered SSNs, all twelve Form 1095-A
columns and annual totals, household income, the single-status Table 5 cap,
Schedule 2 line 1a, and Form 1040 line 17 before native MeF or PDF output.
At 200% FPL, a $40,880 household with $8,184 PTC and $10,800 APTC has
$2,616 excess before the $975 repayment cap. The full-return case verifies
native XML, local TY2025 v5.4 XSD, and filled PDF; changed cap and policy APTC
are rejected. This follows the [2025 Form 8962 monthly and Table 5
instructions](https://www.irs.gov/instructions/i8962). Multiple policies,
shared allocation, uncovered family members, source-byte authentication, and
IRS acceptance remain outside this route.

The same two-person policy fixture now exercises the remaining Single filing
status Table 5 brackets: $36,000 household income (176% FPL) limits repayment
to $375; $66,000 (322% FPL) limits it to $1,625; and exactly $81,760
(400% FPL) has no limitation. Each case recomputes the credit and excess APTC
from the same twelve sourced policy months, checks Schedule 2 and Form 1040,
passes native MeF with the TY2025 v5.4 XSD and filled PDF, and rejects an
altered line 28 cap. These caps follow the *Single* filing-status column even
though the household contains a dependent.

## Consistent Marketplace correction record identity across policies (2026-10-05)

The same-state monthly export allows one Marketplace determination record to
support corrected SLCSP amounts on multiple policies. It rejects a repeated
determination reference only when the two policies claim different SHA-256
digests for that reference. The three-policy positive/shared-record/conflict
case and four adjacent corrected-policy cases pass through MeF and PDF. This
preserves the [TY2025 instruction](https://www.irs.gov/instructions/i8962)
that one same-state coverage-family SLCSP may apply across policies. The
record identifiers remain reviewed assertions, not authenticated Marketplace
bytes.

## One-person, one-month same-state policy transition (staged, unrun)

The [2025 Form 8962 monthly instructions](https://www.irs.gov/instructions/i8962)
say to add columns A and C from multiple Forms 1095-A affecting a month and
count the agreed same-state column B once. A bounded single-filer route now
accepts two identified policies for that same covered person when the first
covers January through one transition month, the second covers that month
through December, and the only simultaneous month is the transition. Both
policies must name the filer's SSN, report monthly positive premiums/APTC,
agree on the transition-month SLCSP, and have no shared allocation or SLCSP
correction. The native and PDF routes reconcile the $900/$600/$350 June
premium/SLCSP/APTC row, all other months, $1,446 excess repayment, Schedule 2
line 1a, and Form 1040 line 17. The full-return positive and two-overlap-month,
SLCSP, APTC, and return-tamper fixtures are authored but unrun. A longer overlap,
different covered people, corrected SLCSP, interstate transition, and external
Marketplace-statement authentication remain outside this route. Publication
[974](https://www.irs.gov/publications/p974) still governs special coverage
and eligibility cases, which this narrow route does not infer.

## Corrected SLCSP in the one-month transition (staged, unrun)

The same one-person transition now admits a corrected overlap-month column B
only when **both** identified policies carry distinct dated Marketplace-error
determinations for that month, each with its own reference and SHA-256, and
both agree on the corrected benchmark. Their reported column B and annual
statement totals remain intact. The source graph counts the corrected $650
benchmark once while adding both $900 in premiums and $350 in APTC; native
MeF and PDF independently check the source against Form 8962 monthly rows,
Schedule 2 line 1a, and Form 1040 line 17. The positive fixture expects
$854 PTC and $1,396 excess APTC; mismatched correction, reused evidence, and
return-tamper fixtures are authored but unrun. More than one overlap month,
one-sided corrections, mixed coverage families, allocation, move, and external
authentication of the Marketplace records remain closed. This follows the
[2025 Form 8962 instructions](https://www.irs.gov/instructions/i8962) for
multiple same-state policies and an incorrect applicable SLCSP.

## One-policy corrected SLCSP month (build-first, unrun)

The monthly single-filer route now accepts one identified, nonshared,
same-state Form 1095-A policy with exactly one independently determined
`marketplace_error` SLCSP correction on a covered APTC month. The original
column B and annual statement total stay in the source record; calculation
uses the corrected month while native MeF checks the dated Marketplace
tool/contact determination, reference, record SHA-256, positive original and
corrected amounts, all twelve monthly rows, Schedule 2/3, and Form 1040. PDF
projection invokes the same native check for a corrected monthly claim. This
follows the [2025 Form 8962 line 10 and lines 12–23
instructions](https://www.irs.gov/instructions/i8962) for a wrong reported
SLCSP. Positive source/calculation/native/PDF and source/amount tampering
fixtures are authored but unrun. Multiple corrected months, no-APTC months,
changes in coverage family, moves, shared policies, and authentication of the
underlying Marketplace record bytes remain outside this route.

## One-person sequential policies at 100%-399% FPL (staged, unrun)

The below-400% income check now admits multiple identified same-state policies
for one covered filer on the monthly route when the existing policy checks prove
at most one active policy each month. It applies the 2025 Table 2 contribution
and single-filer Table 5 repayment limit to the merged monthly credit and APTC,
requires the sourced single-filer SSN and a reviewed fact that the taxpayer
cannot be claimed as a dependent, then reconciles Schedule 2/3 and Form 1040.
A two-policy six-month switch at
200% FPL has $7,800 PTC, $9,000 APTC, $1,200 excess, and a $975 limited
repayment. Source, calculation, native, PDF, and cap-tampering fixtures are
authored but unrun. The below-100% exception remains limited to one verified
policy; shared-policy cases retain separate boundaries.

## One verified dependent on two same-state policies at 100%-399% FPL (staged, unrun)

A single filer with one claimed dependent can now use the monthly two-policy
route below 400% FPL when the existing filed dependent Form 1040 and Forms
1099-INT establish Worksheet 1-2 MAGI and each policy names a distinct
tax-family SSN. The poverty table uses both family members, while the 2025
Table 5 limit remains the **single filing-status** amount. At 200% FPL, a
source case with overlapping policies in January–June and only the taxpayer's
policy in July–December computes $6,792 PTC, $9,000 APTC, $2,208 excess, and
$975 repayment. Source, calculation, native, PDF, and cap-tampering fixtures
are authored but unrun. Other dependent income sources, more than two
policies, unmatched covered people, and corrected SLCSP remain outside this
route.

## Two verified dependents on three same-state policies at 100%-399% FPL (staged, unrun)

The three-policy monthly route now also accepts a single filer and two claimed
dependents below 400% FPL when their filed returns and interest forms establish
Worksheet 1-2 MAGI, each policy identifies one distinct tax-family member, and
all three policies are active together in every covered month. The 2025 Table 2
contribution uses the three-person poverty line; Table 5 uses the single filing
status cap. A 200%-FPL case with $13,968 PTC and $18,000 APTC limits its $4,032
excess to $975. Source aggregation, calculation, native MeF, PDF projection,
and cap-tampering fixtures are authored but unrun. Partial-family months and
corrected SLCSP still require separate coverage-family evidence and remain
closed.

## One-person below-400%-FPL filing route (build-first, unrun)

The native MeF and PDF projections now accept a bounded one-person, one-policy
return with income from 100% through 399% of the applicable poverty line,
using the existing full-year line 11 or monthly lines 12–23 policy source. The
filing boundary independently reconciles line 5, the [2025 Table 2 applicable
figure](https://www.irs.gov/instructions/i8962), annual/monthly contribution,
credit, advance payments, the [2025 Table 5 single-filer repayment
limit](https://www.irs.gov/instructions/i8962), Schedule 2 line 1a or Schedule 3
line 9, and finalized Form 1040. At exactly 400% the 8.5% figure applies with
no repayment cap, as it did in the calculation node. The PDF instance now runs
the same source-to-final-return reconciliation for below-400% returns before
rendering. Source, annual, monthly, all three cap tiers, and tamper cases are
written but not run.

The one-person sequential monthly extension above covers multiple policies;
this one-policy route still does not cover multiple people,
below-100% exception cases, shared coverage, self-employed insurance, Form
2555, or other eligibility exceptions. The sourced Form 1095-A, policy identity,
and finalized-return checks still apply. External Marketplace authenticity,
full-batch tests, schema validation, PDF visual review, IRS rules, and ATS
acceptance remain open.

## One-person covered-person identity check (build-first, unrun)

The positive annual and monthly one-person export routes now require each Form
1095-A policy to identify exactly one covered individual whose full SSN matches
the Form 1040 filer. Missing, mismatched, or additional covered people stop MeF
output, and PDF instance creation uses the same native reconciliation. The
[2025 Form 8962 instructions](https://www.irs.gov/instructions/i8962) define the
credit and repayment around the tax and coverage families, and Form 1095-A Part
II identifies the covered individuals. This is an identity boundary, not proof
of monthly eligibility, premium payment, source-document authenticity, or IRS
acceptance. Truncated or absent Part II SSNs need reviewed source documentation
before these bounded routes can file. Focused annual and monthly cases are
written but remain unrun for the shared validation batch.

The
[2025 Form 8962 instructions](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf)
direct monthly lines 12–23 to use Form 1095-A monthly columns A, B, and C. They
send net PTC on line 26 to Schedule 3 line 9 and excess APTC repayment on line
29 to Schedule 2 line 1a. The checked-in TY2025 v5.4 schema has the native
`MonthlyPTCCalculationGrp` and those total fields.

## Ordinary APTC cents

The [2025 Form 8962 instructions](https://www.irs.gov/instructions/i8962)
require whole-dollar electronic entries. For a single ordinary APTC policy
without shared allocation, SLCSP correction, move review, or marriage
worksheet, the source graph now rounds the monthly Form 1095-A columns A/B/C
before calculating lines 12–23. A full-year policy with unchanged premium and
SLCSP instead uses and rounds each annual line 33 total once for line 11. Raw
Marketplace values remain in the pending source record. Native MeF independently
reconciles the raw annual/monthly totals, then checks the filed whole-dollar
rows or line 11, total PTC and APTC, Schedule 2 or 3, and Form 1040.

Seven full-return cents cases pass local TY2025 v5.4 XSD: monthly net PTC,
annual line 11 net PTC, monthly excess-APTC repayment, below-100% APTC-only
repayment, MFS APTC-only annual repayment, and corrected-copy versions of the
ordinary monthly and annual paths. Five build PDF packets; a raw premium
changed across a rounding boundary is rejected at native export. The
corrected-copy cases keep both Marketplace statements in the source record and
use only the identified corrected version for calculation, MeF, and PDF. The
monthly $800.51/$700.49/$300.51 source yields $8,400 PTC, $3,612 APTC, and
$4,788 net PTC. Replacing monthly APTC with $750.51 yields $612 excess
repayment. Cents handling for other multi-policy combinations, shared
allocations, marriage, QSEHRA, and Pub. 974 remains open, as do source
authenticity, PDF visual
review, the final bulk test, IRS business-rule results, and ATS acceptance.

For multiple ordinary APTC policies, the [Form 8962
instructions](https://www.irs.gov/instructions/i8962) combine source amounts
that belong on the same monthly or annual line. The [2025 Form 1040 rounding
rule](https://www.irs.gov/instructions/i1040gi) says to retain cents while
adding amounts for one line and round the total. Applying that general rule
to the Form 8962 combination instructions, the graph now merges raw
monthly premiums and APTC, selects one same-state SLCSP or adds distinct-state
SLCSPs, and rounds each resulting Form 8962 line using integer cents. For annual
line 11, it adds
the raw policy line 33 A and C totals, selects one same-state line 33 B (or
adds different-state B amounts), then rounds those line totals. Native MeF
recomputes the same amounts from each original policy and checks Schedule 2/3
and Form 1040.

Full-return cents cases cover a chronological two-policy single-filer switch,
two simultaneous same-state taxpayer/dependent policies on monthly and annual
lines, and simultaneous policies in Texas and Oklahoma on monthly lines.
$500.26 plus $300.26 premiums file as $801 for the month. The different-state
$600.26 plus $400.26 SLCSPs file as $1,001; rounding the source forms
separately would give a different value. All four variations pass local
TY2025 v5.4 XSD and build PDF packets. A three-amount half-dollar case guards
against binary floating-point addition losing the rounding threshold; source
amounts beyond cent precision reject. The affected source, calculation, MeF,
corrected-copy, and full-return suite passes 162 cases. Other no-APTC
multi-policy routes, special allocations, marriage, QSEHRA, Pub. 974, and other policy
combinations still need source-to-filed cents reconciliation.

## No-APTC positive PTC: bounded monthly route

The one-filer, one-policy 200%-FPL monthly path now has a full-return source
case. A $30,120 W-2 and twelve covered zero-APTC months with separately
determined SLCSP and timely full-payment records produce $8,400 of credit on
Form 8962, Schedule 3 line 9, and Form 1040 line 31. The complete native
return passes local TY2025 v5.4 XSD, the PDF packet builds, and 149 focused
cases across this route pass. PDF visual review and the final bulk regression
remain open. The broader boundaries below still apply.

The same no-APTC source path now files for one lawfully present enrollee below
100% FPL when the existing reviewed source status establishes lawful presence,
Medicaid ineligibility due to immigration status, Marketplace coverage, and
otherwise applicable-taxpayer facts. A $10,000 W-2 gives 66% FPL and $9,000
monthly or $8,400 annual PTC in separate full-return cases. Both local TY2025
v5.4 XSD checks and PDF builds pass; deleting the status stops native export.
The external eligibility records and filled PDF pages remain unreviewed.

The one-policy monthly path also reduces a month with an issuer-confirmed
protected partial payment by the unpaid premium at the unextended filing due
date. In a full return, an $800 reported January premium with $500 paid above a
$450 documented issuer threshold produces $500 on Form 8962 column (a) and
$8,250 total credit. A separate Texas January emergency-order case with $400
paid yields $8,150 annually. The original $800 remains in the Form 1095-A
source; MeF recomputes each claimed premium, and both full returns pass local
TY2025 v5.4 XSD. Source-record authentication remains open. See the
[no-APTC gap](./ty2025-form8962-no-aptc-below400.md).

The [2025 Form 8962 instructions](https://www.irs.gov/instructions/i8962)
require Form 8962 when the taxpayer claims a PTC even if no APTC was paid. They
also warn that Form 1095-A column B can be blank, zero, or wrong in that case,
and require the applicable SLCSP to be determined for **every covered month**. A
covered month's credit additionally depends on the taxpayer's share of the
enrollment premium being paid by the return due date (subject to the stated
exceptions). Zero APTC is therefore not evidence of zero PTC.

The two- or three-policy same-state no-APTC monthly route now also admits all
possible uncovered-month counts for sequential nonoverlapping policies: at most
ten gaps for two policies and nine for three. A bounded two-policy case has one gap in
each policy period (April and September). Both 1095-A statements report zero
premium, SLCSP, and APTC in the corresponding gap; neither gap has a
Marketplace SLCSP determination or payment record. The ten covered months have
policy-specific determinations and timely full-payment records. At 401% FPL,
the ten monthly credits total $2,170 on Schedule 3 line 9 and Form 1040 line
31; native MeF omits both uncovered month groups and PDF leaves both rows
blank, including contribution. Source, credit, ghost-evidence, and final-return
tamper fixtures are authored for the deferred batch. The IRS instructions for
lines 12–23 direct monthly entries for partial-year enrollment and a blank
column (c) when both premium and SLCSP are blank. Two-policy overlap with more
than two gaps, Marketplace source-byte authentication, and wider families remain
open. The maximum-gap examples are documented in the
[no-APTC gap](./ty2025-form8962-no-aptc-below400.md).

The `f1095a.slcsp_corrections` amounts alone remain insufficient. A bounded
one-policy monthly filing route now also requires one `no_aptc_monthly_evidence`
record per covered month: the Marketplace determination amount, method, date,
reference, and source-record SHA-256, plus a dated payment record with amount,
reference, and source-record SHA-256 for each covered month. The payment is
explicitly `paid_in_full`, `protected_partial` under an issuer threshold, or
`emergency_order_partial` under a state order. The protected records also need
issuer coverage confirmation and the applicable threshold or order facts. The
policy must cover only the identified single filer in one state, have positive
reported column A in each covered month, zero APTC, no shared allocation or
unreported coverage change, and an applicable SLCSP correction for every covered
month. Uncovered months require zero reported columns A/B/C and zero Form 8962
monthly policy and credit amounts. The recorded determination must equal the
corrected SLCSP; the qualifying payment must be dated no later than April 15,
2026, the ordinary
[TY2025 Form 1040 due date](https://www.irs.gov/instructions/i1040gi). The route
reconciles the raw 1095-A A/C columns and line 33 totals, each monthly Form 8962
row, final Form 1040 AGI/poverty table, line 24/26, Schedule 3 line 9, and Form
1040 line 31. The PDF instance invokes the same native reconciliation before
rendering. A partial-year policy with an interior uncovered month now follows
the same reviewed-month route; MeF omits that month and the PDF leaves its row
blank. Focused positive and tamper cases are written but unrun.

References and hashes identify the separate source records for preparer review.
The application has not authenticated the Marketplace or payment documents or
compared hashes to their actual bytes; that external source review remains
required. No-APTC policies outside the bounded four-policy route, shared
policies, changes in coverage family
or state, protected partial payments outside the documented issuer-threshold
and state emergency-order routes, nonstandard due dates,
other below-400%-FPL multi-person returns, and MEC/coverage eligibility proof remain outside this
bounded route. The entered evidence is not submitted as an invented IRS
attachment.

The full-year positive case with varying determined B amounts uses monthly lines
12–23. A new bounded line-11 path covers one full-year policy with unchanged
positive column A and independently determined unchanged positive applicable
SLCSP. It uses the same twelve per-month Marketplace determinations and timely
full-payment records, including when reported column B is zero or blank. The
source node forwards the corrected monthly sum as the existing canonical annual
SLCSP; native and PDF projections check every record, raw 1095-A annual totals,
line 11 amounts, Schedule 3, and Form 1040. The
[2025 line-10/11 instructions](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf)
permit line 11 only when the correct applicable SLCSP is the same all year.
Focused positive and tamper cases are written but unrun. The
`determination_source` enum alone never authorizes a claim.

For the bounded partial-year case, PDF instance creation also runs the MeF
source-to-final-return reconciliation before rendering; the PDF cannot silently
print a partial-year calculation that MeF rejects.

An original Form 1095-A followed by one statement with its `CORRECTED` box
checked now uses the corrected statement only, as the
[2025 instructions](https://www.irs.gov/instructions/i8962) require. The raw
source retains both records, while calculation, MeF and PDF select the corrected
one by exact issuer and policy number. Missing or ambiguous identity, multiple
corrected versions, and competing statements reject rather than combining
original and corrected premiums. This is a bounded source-selection rule, not
proof that the captured checkbox matches an authentic Marketplace document.
Focused cases are written but unrun.

The MeF descriptor now accepts a positive monthly filing for one full-year
policy, **one policy with partial-year coverage including separated covered
periods**, or two identified same-state policies with one chronological switch
and possible uncovered months, on a one-person single return. A bounded
two-person same-state route also allows two overlapping policies when each names
exactly one distinct taxpayer or claimed-dependent enrollee, the dependent's
required filed return and interest forms reconcile MAGI, and both policies
report the same SLCSP during each shared month. All twelve 1095-A columns must
be present, with positive APTC in covered months and zero policy amounts outside
covered months. It checks each policy's reported annual totals against its
monthly columns when supplied. The household must be above 400% of the 2024 FPL
used for 2025 coverage, without Form 2555, tax-exempt interest, or nontaxable
Social Security additions. It checks the completed Form 1040 AGI, 8.5%
applicable figure, annual/monthly contribution, each covered month's
premium/SLCSP/APTC from the active policy, each month's maximum assistance and
allowed PTC, totals, and the resulting Schedule 2 or Schedule 3 amount against
the finalized Form 1040. An uncovered month must have zero policy and credit
amounts; its Form 8962 monthly row is not emitted in MeF and is left entirely
blank in PDF, including column (c) contribution. A missing or conflicting source
stops positive MeF output. The
[IRS 2025 instructions](https://www.irs.gov/instructions/i8962) direct
fewer-than-12-month coverage to lines 12–23 and say to leave column (c) blank
when columns (a) and (b) are blank. They do not impose a contiguous-coverage
requirement; each month is separately sourced. They also say to combine columns
A and C across multiple Forms 1095-A, but to use column B from one form rather
than double-count same-state SLCSP. The nonoverlap cases make that choice
unambiguous; the two-person overlap route verifies equal reported B amounts.
Focused unrun MeF/PDF cases cover an interior uncovered month for one-policy,
same-state two-policy, and interstate two-policy routes; they reject a gap whose
1095-A still reports SLCSP or APTC, an unsourced overlap, and final-return
mismatch. This does not allow alternating policies or overlap without verified
tax-family ownership.

The descriptor also accepts Form 8962 annual line 11 for one identified
same-state policy with all twelve months covered, unchanged positive monthly
enrollment premium and SLCSP, and positive APTC each month. Form 1095-A line 33
amounts for all three columns must be present and reconcile to the monthly
source columns. The route retains the same single, one-person, above-400%-FPL
boundary. It independently computes line 11's annual assistance and PTC from
line 33 and the Form 1040 income, checks lines 24–29, and reconciles the
resulting Schedule 2 or Schedule 3 and Form 1040 amount. Altered monthly
coverage, mismatched annual amounts, and mismatched final-return totals stop
output. The
[2025 instructions for lines 10 and 11](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf)
require this annual branch only for full-year coverage with unchanged columns A
and B; column C may vary.

A bounded second annual route now accepts exactly two same-state, full-year
policies when one covers the single taxpayer and the other covers the one
claimed dependent. Each Form 1095-A Part II covered-person SSN must match that
tax family's identities without overlap, and each policy needs a distinct
number, all twelve monthly columns, reconciled line 33 totals, unchanged
positive monthly A/B, positive monthly APTC, and the same SLCSP on both
statements. Annual line 11 adds columns A and C from both statements but uses
column B only once, as the
[2025 line 11 instructions](https://www.irs.gov/instructions/i8962) direct for
separate same-state policies. The dependent MAGI must independently reconcile
through the existing interest-only filed-return route, and the calculated
credit/repayment must match the finalized Schedule 2 or 3 and Form 1040. Missing
covered-person identities, duplicated people, divergent SLCSP, changed monthly
amounts, and altered final-return totals stop output. Focused positive and
rejection tests are written but unrun.

The same full-year, two-person line 11 route now also accepts one policy in each
of two different contiguous states. The taxpayer's policy must match the filer's
state, the other policy must name the claimed dependent, and both policies must
retain unchanged positive monthly premiums and SLCSP, positive APTC, and
reconciled line 33 totals. Unlike same-state policies, the annual SLCSP is the
sum of the two state-specific line 33 column B amounts, following the
[2025 Form 8962 line 11 instructions](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf).
The source node independently combines those state-specific monthly amounts; MeF
reconciles the source identities, filed dependent MAGI, household income, annual
credit, Schedule 3 and Form 1040, and the PDF instance invokes the same
reconciliation. A taxpayer move, Alaska/Hawaii table, shared policy, state
mismatch, or changed SLCSP remains outside this annual route. Focused positive
and rejection cases are written but unrun.

The bounded annual and monthly routes now accept an Alaska or Hawaii poverty
table when the filer address, Form 1095-A coverage state, general return source
state, and a single-element `ptc_residence_states_2025` report all agree. The
independent MeF reconciliation uses the
[2025 instructions' Tables 1-2 and 1-3](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf):
$18,810/$25,540 for Alaska family sizes one/two and $17,310/$23,500 for Hawaii.
It checks the calculated line 4 and table location, line 5's above-400% result,
and the same 1095-A/final-return amounts as the contiguous route. PDF instance
creation also invokes that reconciliation, so a mismatched Alaska/Hawaii source
cannot print. This is a single-state route; a taxpayer who moved during 2025
needs the higher-table rule. A bounded single-taxpayer move route now handles
one state switch with twelve month-specific residence facts, two state-specific
nonoverlapping Form 1095-A policies, and one policy switch matching the same
month. The higher poverty table among the two states is required even if the
current mailing state has a lower table. It uses the same monthly and final
return reconciliation and requires a reported Marketplace move review on the
arrival policy. PDF projection invokes MeF before printing. Missing residence
months, a policy/state mismatch, a third state, overlapping policies, and a
second switch remain blocked. Sourced zero-coverage months are now permitted on
this move route and omitted from the MeF/PDF monthly lines. Positive and
mismatch cases are written but unrun. See the
[interstate-move audit](./ty2025-form8962-interstate-move-gap.md).

This is deliberately narrower than the calculation node. The descriptor does not
yet independently reconcile annual line 11 across other multiple-policy
configurations, other overlapping monthly policies, multi-person cases beyond
three policies, multiple policies in different states beyond the bounded
two-state annual family and sequential move routes, SLCSP corrections,
shared-policy Part IV, marriage Part V, QSEHRA, other below-400%-FPL multi-person repayment caps,
wider Alaska/Hawaii moves, or self-employed insurance worksheets to raw source
documents and the finalized return. Most dependent MAGI routes remain rejected.
A later bounded annual-policy path now accepts one claimed dependent with a
referenced, interest-only filed return and independently sourced Forms 1099-INT,
as detailed in
[the dependent-MAGI audit](./ty2025-form8962-dependent-magi-gap.md). Monthly
dependent coverage is now also reconciled for one nonshared policy and the
bounded two-policy same-state overlap using that same source and finalized
return, while other multi-policy dependent coverage, Form 8814 children, other
required-filing bases, foreign income, and nontaxable Social Security remain
unsupported. Older serializer-only direct cases for unsupported routes were
replaced with rejection cases; their node-level arithmetic and PDF tests remain.
Source authentication and IRS business-rule/ATS acceptance are also pending.
Focused tests were written but not run, and the full calculation/XML/PDF batch
remains the verification gate.

For overlapping same-state policies, the 2025 instructions require adding each
1095-A column A and C for the month while using column B from only one
same-state policy (and applying the equivalent rule to annual line 11). The
1095-A node already deduplicates monthly B; its derived annual SLCSP sums the
_selected monthly benchmarks_ across multiple policies, rather than summing
duplicated line-33 B totals. The bounded monthly two-person route now permits
simultaneous same-state policies for one taxpayer and one claimed dependent. It
requires a distinct Part II SSN on each policy, verifies both identities against
the filed return, uses the existing source-backed dependent MAGI workpaper,
combines columns A and C, and counts the agreed column B once. A policy may be
active for only part of the year; each active month's source amounts, computed
contribution, PTC, APTC, Schedule 2/3, and Form 1040 are rechecked. PDF
projection retains the one-person overlap rejection, while the two-person PDF
instance invokes MeF reconciliation before rendering. Focused source, MeF, and
PDF cases are written but unrun. This does not support a shared policy with
another tax family, more than two enrollees or policies, unequal same-state
benchmarks, different-state simultaneous coverage, unsupported dependent income,
or corrected original/replacement 1095-A statements entered together. Those
routes still need enrollee and coverage-family facts by month, ownership and
allocation, any corrected benchmark determination, and final-return
reconciliation before filing.

A separate bounded monthly route now accepts two simultaneous policies in
different contiguous states when one Form 1095-A covers only the taxpayer in the
filing state and the other covers only one claimed dependent. The existing
filed-return/1099-INT dependent-MAGI proof and complete distinct Part II SSNs
remain required. Each shared month adds columns A and C across policies and,
unlike the same-state rule, adds **both** state-specific column B amounts, as
the
[2025 Form 8962 monthly instructions](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf)
direct. It checks every monthly Form 8962 row, the aggregate credit/APTC, and
Schedule 2 or 3 and Form 1040 totals; the PDF instance uses the same native
reconciliation. This is not the taxpayer's interstate move route: the taxpayer
policy must be in the filing state, and the other policy must cover the distinct
dependent. Alaska/Hawaii cross-state coverage, shared tax-family policies, more
than two people or policies, and corrected SLCSP remain blocked pending their
separate poverty-table and coverage-family source facts. Focused source, MeF,
PDF, and tampering cases are written but unrun.

The current build pass also checks repeated Form 1095-A issuer and policy
identities before aggregation. Two statements for that identity may contribute
different months, as the
[IRS permits](https://www.irs.gov/affordable-care-act/individuals-and-families/health-insurance-marketplace-statements),
but the same covered month cannot count twice. An annual-only repeat cannot
establish that its coverage months are disjoint and stops for monthly source
detail. This catches an original and
[corrected statement](https://www.irs.gov/affordable-care-act/corrected-incorrect-or-voided-form-1095-a)
entered together without rejecting a documented midyear split. Distinct policies
still aggregate normally. Focused positive and negative source cases are written
but unrun; this check does not relax the remaining MeF/PDF overlap boundaries or
settle the remaining Publication 974 routes.

## One full-year Situation 4 policy without an agreement (2026-10-01, unrun)

The [2025 Form 8962 Part IV instructions](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf)
assign a percentage based on enrolled individuals when the two tax families
cannot agree. A bounded full-year case now requires exactly two covered people:
the Marketplace recipient/filer and one child claimed by a different,
nonenrolled taxpayer. One reviewed source record names the policy, the filer,
the other taxpayer, the claimed child's SSN, the enrollment and tax-family
review records, the no-agreement review record, and the exact 1-of-2 enrolled
count. The two review references and hashes must differ. The one-half
percentage applies to each month's premium, SLCSP, and APTC and to Form 8962
Part IV. Native and PDF projection recompute the source rows and join the net
credit to Schedule 3 line 9 and Form 1040 line 31. A full-return $1,800 credit
and changed claim, owner, count, review, and final-credit fixtures are authored
for the deferred bulk gate.

The reviewed references and hashes are entered metadata; the Marketplace,
claim, and no-agreement document bytes are not independently authenticated.
Other enrolled counts, periods, policies, household sizes, and allocation
situations remain outside this route.

## Agreed Situation 4 shared-policy filing path (build-first, unrun)

The
[TY2025 Form 8962 Part IV instructions](https://www.irs.gov/instructions/i8962)
permit two tax families to agree on one allocation percentage for premiums,
applicable SLCSP, and APTC for each shared month. The current build pass adds a
native and filled-PDF reconciliation for one identified policy with an agreed
Situation 4 allocation. It requires a single taxpayer with no claimed
dependents, exactly two Part II covered SSNs (the filer and the other allocating
taxpayer), one full source allocation period, monthly 1095-A columns, and a
same-state source policy. The MeF builder independently reruns the Form 1095-A
allocation and Form 8962 calculation, then matches every computed field to the
pending form and matches repayment or credit to finalized Schedule 2/3 and
Form 1040. The PDF descriptor invokes the same reconciliation. Source, XML, PDF,
tampering, and return-drift cases are written but not run.

The [TY2025 Situation 4 instructions](https://www.irs.gov/instructions/i8962)
also allow the other allocating taxpayer to be absent from the 1095-A covered
list. The IRS Joe/Alice/Jane example allocates to Alice, who claims covered
Jane but is not enrolled. A bounded one-policy, full-year, one-person-filer
route now records the [1095-A Part I line 5 recipient SSN](https://www.irs.gov/instructions/i1095a)
and a reviewed other-family
claim packet. The packet identifies the covered person's SSN, other taxpayer's
SSN, policy number, tax year, Marketplace enrollment reference, tax-family
review reference/hash, and allocation agreement reference/hash and percentage.
The filing boundary requires the filer to be the 1095-A recipient and a covered
person, the other taxpayer to be absent from the covered list, the claimed
person to be the second covered person, and the packet's taxpayer, policy, and
percentage to match the Part IV allocation. The same percentage allocates
each month's premium, SLCSP, and APTC. Calculation and the shared native/PDF
reconciliation carry the resulting credit to Schedule 3 line 9 and Form 1040
line 31. A full-return fixture and packet, recipient, and final-return tamper
cases are authored but unrun. Packet hashes are reviewed metadata; this route
does not authenticate the underlying Marketplace, claim, or agreement bytes.

Other non-enrolled-taxpayer combinations, multiple policies, wider tax
families, unmatched agreement periods, corrected SLCSP, and interstate shared
coverage remain closed pending their own source and final-return checks.

## Two agreed Situation 4 periods on one policy (build-first, unrun)

The [TY2025 Form 8962 Situation 4 instructions](https://www.irs.gov/instructions/i8962)
allow two tax families to agree on a different allocation percentage for
different months, while requiring the same percentage for premiums, SLCSP, and
APTC within each month. A bounded full-year source case now uses one identified
1095-A policy covering two taxpayers from separate families and reviewed
20%-for-January-through-June and 80%-for-July-through-December agreements.
Each source period carries its own 2025 policy, filer and other-taxpayer SSNs,
month range, percentage, agreement reference, and SHA-256. The native filing
boundary requires exact matches to the Part IV rows, the 1095-A recipient to
be the filer, and distinct reviewed references and hashes when percentages
change. Source aggregation applies each period's percentage to all three
monthly columns; the Form 8962 calculation produces $7,200 credit and $4,800
allocated APTC, with $2,400 reaching Schedule 3 line 9 and Form 1040 line 31.
The PDF descriptor invokes the same native reconciliation. Full-return,
native/PDF, changed-percentage, changed-identity, duplicate-agreement, and
final-return-drift fixtures are authored but unrun. A higher-income, larger
APTC source variant also exercises excess repayment through Schedule 2 line 1a
and Form 1040 line 17. Agreement hashes are
reviewed metadata; agreement and Marketplace bytes are not authenticated.

The source gate also requires distinct agreements for any previously supported
five-period Situation 4 allocation whose percentages change. Wider tax
families, multiple policies, mixed allocation situations, and independent
source-byte authentication remain open.

### One claimed dependent on an agreed shared policy (build-first, unrun)

The single-return Situation 4 route now also accepts one policy covering the
filer, one claimed dependent, and one other enrolled taxpayer. The filer must
be the 1095-A recipient. The dependent must have a source-backed required
2025 return and matching income form; Worksheet 1-2 MAGI is rederived from
those records. Each allocation period needs a reviewed agreement naming the
policy, both taxpayers, months, and percentage. The source's three enrolled
SSNs must match the filer, claimed dependent, and other Part IV taxpayer.
Form 1095-A allocation is recomputed by month, then Form 8962, Schedule 2/3,
and Form 1040 amounts are reconciled in the native and PDF builders. A positive
credit fixture and dependent, agreement, covered-person, and finalized-return
tampering fixtures are written but unrun. Agreement hashes and dependent
document identifiers are source metadata; independent authentication of the
underlying Marketplace, agreement, and dependent-return bytes remains open.

## One full-year MFS spouse policy

The MeF descriptor now reconciles one full-year policy shared by an MFS filer
and spouse. It requires both covered SSNs, the spouse's SSN in Part IV, the
same policy identifier and coverage state, one source allocation period, and
twelve monthly premium, SLCSP, and APTC amounts. For an MFS filer with no
exception, it accepts only a 50% APTC allocation and reconciles the repayment
to Schedule 2 and Form 1040. For a documented domestic-abuse or abandonment
exception, it accepts 50% premium and APTC allocations, uses the filer family's
SLCSP rather than allocating the reported SLCSP, and reconciles the credit to
Schedule 3 and Form 1040. Both cases rerun the Form 1095-A allocation and Form
8962 calculation from source. The two focused TY2025 XSD cases, including
source-identity, allocation, and final-return tampering checks, pass 2/2.
Other MFS shared-policy combinations remain within the open Form 8962 gate.

Two executor-produced MFS shared-policy fixtures now also join Form 8962 to
the correct finalized return page. All 15 synthetic PDF-review sources,
including both new MFS cases, passed TY2025 v5.4 XML validation. The generated
static PDFs under
`.state/research/ty2025-filled-pdf-review/2026-09-29-v7/` were rendered
and the four Form 8962 pages visually inspected. The no-exception packet shows
only a 0.50 APTC allocation, twelve $400 APTC months, and $750 on both Form
8962 line 29 and Schedule 2 line 1a. The exception packet shows 0.50 premium
and APTC allocations with blank SLCSP percentage, $700 family SLCSP in each
month, and $2,400 on Form 8962 line 26 and Schedule 3 line 9. The PDF SHA-256
values are `52ace6d59ea348495a71c3b55134b3400382b22758481e0d836206ebf71fecd2`
(repayment) and `bfaa9881069286e5143caedc813050dcbf441f0e8d87ecb621dfa52b72b1b845`
(exception). These focused artifacts do not establish other MFS scenarios or
the release PDF gate.

## Alaska/Hawaii taxpayer policy with a contiguous-state dependent policy (2026-10-01, unrun)

The bounded two-person monthly family-policy route now accepts one full-year
taxpayer policy in Alaska or Hawaii and a simultaneous policy in a contiguous
state covering the filer's one claimed dependent. The single filer must have
an explicit one-state residence record for all twelve months in the filing
state; this is not an interstate move. Each policy names only its own covered
SSN, and the dependent's required 2025 return and Forms 1099-INT source its
modified AGI. The [2025 Form 8962 instructions](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf)
add the monthly column B benchmarks from policies in different states, while
line 4 uses the Alaska/Hawaii poverty table for the filer's verified residence.
For the authored Alaska/Texas case, the $25,540 two-person Alaska poverty line,
$150,000 household income, and two $500 monthly premiums produce $1,900 or
$2,000 combined monthly SLCSP, $10,644 annual PTC, and $8,244 net PTC after
$2,400 APTC. That amount reconciles through Schedule 3 line 9 and Form 1040
line 31, native Form 8962, and the PDF projection. Residence, covered-person,
SLCSP, and final-return tamper fixtures are authored but unrun. The path still
rejects a second Alaska/Hawaii policy, a shared policy, taxpayer moves,
unsupported dependent-income sources, and Marketplace corrections. Source-byte
authentication, XSD/business-rule checks, filled-PDF review, and ATS remain
open.


## October 9: reviewed joint-family monthly advances and repayment limits

A joint return with one same-state policy covering the complete tax family now
reconciles monthly advances against owned income, required-dependent MAGI,
reviewed person-month coverage eligibility and the retained Form1095-A copy.
Each covered month must have positive APTC and an identified premium payment
covering the balance by April15,2026, reviewed after payment and month end.
Changed retained statements, missing or contradictory reviews, altered cap,
repayment or final-return joins fail before native and PDF output. The PDF
descriptor also enforces this guard at400% FPL and above.

The nine synthetic cases use family4 poverty income31,200 and dependent MAGI32,400.
The joint repayment limits follow Table5 in the
[2025 Form8962 instructions](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf).
Positive regular tax uses the MFJ bands in the
[2025 Tax Table](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf).

| Case | Household MAGI | FPL% | PTC | Advances | Cap | Repayment | Refund / owed |
|---|---:|---:|---:|---:|---:|---:|---|
| below-200 | 59,280 | 190 | 8,052 | 10,800 | 750 | 750 | 2,250 / 0 |
| at-200 | 62,400 | 200 | 7,752 | 10,800 | 1,950 | 1,950 | 1,050 / 0 |
| at-300 | 93,600 | 300 | 3,384 | 10,800 | 3,250 | 3,250 | 0 / 3,340 |
| at-399 | 124,488 | 399 | 0 | 10,800 | 3,250 | 3,250 | 0 / 7,042 |
| at-400 | 124,800 | 400 | 0 | 10,800 | none | 10,800 | 0 / 14,634 |
| net-credit | 62,400 | 200 | 7,752 | 1,200 | n/a | 0 | 9,552 / 0 |
| equal-credit | 62,400 | 200 | 7,752 | 7,752 | n/a | 0 | 3,000 / 0 |
| partial-year | 62,400 | 200 | 5,964 | 8,100 | 1,950 | 1,950 | 1,050 / 0 |
| joint-benefits | 82,400 | 264 | 5,244 | 10,800 | 1,950 | 1,950 | 999 / 0 |

The partial-year policy begins April1; January–March rows are absent from XML
and blank in PDF. Equal credit prints zero on Form8962 line26. The benefits
case includes net SSA20,000, taxable4,000, AGI34,000 and taxpayer MAGI50,000.
Withholding is3,000, or3,200 with benefits. These calculations reconcile the
reported advance amounts; they do not authenticate the original Marketplace award.

The final normal typed run passes106 tests across five related files. Eleven new
tests cover nine complete positive returns, eleven conflicts at both200% and400%
through native/PDF gates, and six public eligibility/payment conflicts. All nine
full returns pass the configured TY2025 v5.4 XSD. All51 rendered pages were
observed:28 distinct pages and23 exact matches to observed pages. Flattened
packets contain no live fields/widgets. Existing deferred68 primary-only joint
names and deferred76 blank zero Form1040 line24 remain qualifications; no
presentation repair or broad parent closure is claimed.

Private evidence: `.state/research/form8962-joint-aptc-2026-10-09/` retains source,
expected and prepared data, XML/PDF, renders, logs and hashes. Initial new-test
type errors and a synthetic fractional-cent W2 withholding amount were corrected
before the final passing run. Prior sections marked staged/unrun retain their
historical status; this batch does not replay those cases.

This bounded route excludes shared/multiple/corrected policies, mixed months
with and without advances, annual computation, foreign exclusions, QSEHRA and
Publication974 special calculations. Source authenticity, broader combinations,
business rules and IRS acceptance remain open. The full typed suite still has
the separately recorded deferred78 blocker.


## October 9: policy-route verification checkpoint

At runtime head `ebf79bba8`, the normal typed command below passed **115 tests,
zero failures** across the existing native Form8962 and health PDF review folders.
This replaces the historical unrun status for the cases actually selected by this
command, including policy switches, overlapping transitions, corrected SLCSP,
shared allocation and interstate component guards. It does not establish full
public-return, XSD or visual proof for every component test.

```sh
DENO_V8_FLAGS=--max-old-space-size=8192 deno test -A   forms/f1040/2025/mef/forms/credits/health/f8962/   forms/f1040/2025/pdf/reviews/credits/health/
```

Nine existing source fixtures were separately replayed through `executeReturn`,
`prepareReturn`, complete native XML and the actual PDF builder, using the filer
extracted from finalized Form1040. All nine pass the configured TY2025 v5.4 XSD.
An independent Python Decimal replay derives each policy month from the retained
input, applies supplied corrections/payment protection/allocation percentages,
and compares PTC, advances, final tax, refund/owed and every native monthly amount.
It passes all nine. No calculation or export runtime was changed in this batch.

| Fixture suffix (all start `single-`) | PTC | APTC | Repayment | Net credit | Tax | Refund / owed | Pages |
|---|---:|---:|---:|---:|---:|---|---:|
| alternating-three-no-aptc-policies-200-fpl | 7,800 | 0 | 0 | 7,800 | 1,487 | 9,313 / 0 | 5 |
| four-sequential-no-aptc-policies-four-gaps | 5,600 | 0 | 0 | 5,600 | 1,487 | 7,113 / 0 | 5 |
| twelve-sequential-no-aptc-policies-full-year | 7,800 | 0 | 0 | 7,800 | 1,487 | 9,313 / 0 | 5 |
| two-sequential-no-aptc-policies-protected-partial | 7,051 | 0 | 0 | 7,051 | 1,487 | 8,564 / 0 | 5 |
| alternating-policies-all-covered-slcsp-corrections | 1,304 | 2,400 | 1,096 | 0 | 9,117 | 0 / 1,117 | 6 |
| alternating-policies-both-slcsp-corrected | 1,354 | 2,400 | 1,046 | 0 | 9,067 | 0 / 1,067 | 6 |
| five-sequential-corrected-slcsp-policies | 1,054 | 2,400 | 1,346 | 0 | 9,367 | 0 / 1,367 | 6 |
| situation4-nonenrolled-other-taxpayer | 4,800 | 1,920 | 0 | 2,880 | 1,487 | 4,393 / 0 | 5 |
| situation4-two-agreed-percentages | 7,200 | 4,800 | 0 | 2,400 | 1,487 | 3,913 / 0 | 5 |

All **48 filled pages** were rendered and observed:31 distinct pages and17 exact
matching pages. The four gap months have blank monthly rows; protected January
payment400.51 prints401. Corrected benchmarks and shared percentages reconcile.
PartIV properly prints only the last15 policy-number characters and uses separate
rows for January–June20% and July–December80%. Fields and widgets are absent in
these final flattened builder outputs; no clipping or amount discrepancy was
observed in this batch.

The [2025 Form8962 instructions](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf)
support monthly corrected amounts, protected premium payments, Situation4
allocations and last15-character policy numbers. The independent regular-tax
check uses Single taxable-income bands14,350–14,400 and59,550–59,600 in the
[2025 Tax Table](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf):1,487 and8,021.

Private evidence: `.state/research/form8962-policy-replay-2026-10-09/` retains
commands, source/prepared data, XML/PDF, monthly oracle, renders and hashes.
Marketplace, insurer and allocation references/repeated digests are synthetic
review assertions; the run does not authenticate records or signatures. Broader
combinations, complete business rules and IRS acceptance remain open. No deferred
work was implemented, no parent task closed, and the full-suite deferred78
blocker remains separate. Scoped CI on the runtime head passed run37887768222.


The subsequent [complete interstate checkpoint](./ty2025-form8962-interstate-move-gap.md#october-9-complete-interstate-return-checkpoint) adds ten public-entry XSD-valid returns/60 observed pages and25 focused passes. It covers reported2–12-state moves, Hawaii, corrected unreported arrival, a gap month and region-specific repayment limits. This resolves the prior checkpoint's lack of full interstate packet evidence for these ten cases only; broader coverage and authentication remain open.

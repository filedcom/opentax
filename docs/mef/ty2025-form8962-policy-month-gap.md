# TY2025 Form 8962 policy-month MeF boundary

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

This does not extend the under-400% filing route to multiple people or policies,
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

## No-APTC positive PTC: bounded monthly route written, unrun

The [2025 Form 8962 instructions](https://www.irs.gov/instructions/i8962)
require Form 8962 when the taxpayer claims a PTC even if no APTC was paid. They
also warn that Form 1095-A column B can be blank, zero, or wrong in that case,
and require the applicable SLCSP to be determined for **every covered month**. A
covered month's credit additionally depends on the taxpayer's share of the
enrollment premium being paid by the return due date (subject to the stated
exceptions). Zero APTC is therefore not evidence of zero PTC.

The `f1095a.slcsp_corrections` amounts alone remain insufficient. A bounded
one-policy monthly filing route now also requires one `no_aptc_monthly_evidence`
record per covered month: the Marketplace determination amount, method, date,
reference, and source-record SHA-256, plus the premium amount paid in full,
payment date, reference, and source-record SHA-256 for each covered month. The
policy must cover only the identified single filer in one state, have positive
reported column A in each covered month, zero APTC, no shared allocation or
unreported coverage change, and an applicable SLCSP correction for every covered
month. Uncovered months require zero reported columns A/B/C and zero Form 8962
monthly policy and credit amounts. The recorded determination must equal the
corrected SLCSP; full premium payment must be dated no later than April 15,
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
required. No-APTC multiple policies, shared policies, changes in coverage family
or state, less-than-full-payment exceptions, nonstandard due dates,
below-400%-FPL returns, and MEC/coverage eligibility proof remain outside this
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
[interstate-move audit](ty2025-form8962-interstate-move-gap.md).

This is deliberately narrower than the calculation node. The descriptor does not
yet independently reconcile annual line 11 across other multiple-policy
configurations, other overlapping or alternating monthly policies, more than
three policies, multiple policies in different states beyond the bounded
two-state annual family and sequential move routes, SLCSP corrections,
shared-policy Part IV, marriage Part V, QSEHRA, below-400%-FPL repayment caps,
wider Alaska/Hawaii moves, or self-employed insurance worksheets to raw source
documents and the finalized return. Most dependent MAGI routes remain rejected.
A later bounded annual-policy path now accepts one claimed dependent with a
referenced, interest-only filed return and independently sourced Forms 1099-INT,
as detailed in
[the dependent-MAGI audit](ty2025-form8962-dependent-magi-gap.md). Monthly
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

This does not yet cover shared policies where the other taxpayer is not a
covered enrollee, multiple allocation periods or policies, a claimed dependent
in either tax family, no-APTC Situation 3, divorce, corrected SLCSP, or
inter-state shared coverage. Those routes still need tax-family membership and
coverage-family facts, month-by-month source allocation, and their own
final-return checks before native filing.

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

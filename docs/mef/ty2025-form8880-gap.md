# TY2025 Form 8880 source-to-document boundary

Status: the calculator's self-emitted `print_line*` values are now the single
native Form 8880 payload for both PDF and MeF. The old independent MeF-only
input keys were removed. A contribution without computed native lines or a
reviewed zero-credit outcome rejects instead of silently omitting IRS8880, and
the calculator now uses sourced AGI, filing status and a tax-liability limit
derived during Form 1040 finalization before a positive Saver's Credit reaches
Schedule 3 line 4. Focused source-to-MeF and negative cases are written but
unrun. No XSD, filled-PDF, IRS business-rule or ATS acceptance is claimed.

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

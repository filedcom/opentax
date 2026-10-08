# TY2025 Schedule 1-A bounded filing paths

Sources:
[2025 Schedule 1-A](https://www.irs.gov/pub/irs-prior/f1040s1a--2025.pdf),
[2025 Form 1040 instructions, including Schedule 1-A](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf),
[IRS list of qualifying tipped occupations](https://www.irs.gov/forms-pubs/occupations-that-customarily-and-regularly-received-tips-on-or-before-dec-31-2024),
and the ignored local v5.4 IRS schema cache at
`Common/IRS1040Schedule1A/IRS1040Schedule1A.xsd`. The schema package is not
checked in; reproducible provenance remains open.

The `schedule1a` node computes a combined deduction and sends it to Form 1040
line 13b. MeF includes identified W-2-box-7 and Form 4137 tips, reviewed Form 4070 employer reports, and reviewed W-2-box-14 FLSA
overtime, vehicle-interest, and senior routes in the Schedule 1-A
descriptor after Schedule 1 and before Schedule 2. Form 1040's positive-line-13b guard opens
only when that source review is present and the second pass has exactly one
attached Schedule 1-A. The descriptor independently rejects unsupported
components and reconciles their combined line 38 to line 13b. All four routes have a
two-page PDF field map and inspected synthetic full-return packets.
An age-eligible senior source can create a provisional graph deduction before
filing review. Native and PDF Schedule 1-A export now reject that source when
the Part I zero-exclusion review is missing, even if Form 1040 line 13b was
also omitted. Context-only MAGI/status input can still omit the form. This
prevents a provisional deduction source from disappearing silently at export;
the qualifying senior source, review, and final return must reconcile.

## Source and line blockers

- Part I lines 1–3 use Form 1040 line 11b plus Puerto Rico excluded income, Form
  2555 lines 45/50, and Form 4563 line 15. The node receives `magi` from the AGI
  aggregator as line 1 AGI. A bounded positive Form 2555 line 45 path now adds
  the structured full-year physical-presence exclusion to line 2b/2e/3 for a
  senior or qualified vehicle-interest Schedule 1-A claim. It replays the
  pending Form 2555 calculation,
  requires line 50 zero, and retains separate sourced zero reviews for Puerto
  Rico and Form 4563. The deduction phaseout uses the increased MAGI, and
  native/PDF export reconcile to Form 1040 line 13b. The focused joint return
  has $160,000 AGI, $20,000 Form 2555 line 45, $180,000 line 3 MAGI, and
  $8,400 on line 38/1040 line 13b; its full native return passed local TY2025
  v5.4 XSD. A nine-page filled packet includes Form 1040, Schedule 1,
  Schedule 1-A, and Form 2555; Schedule 1-A Part I and all Form 2555 pages were
  rendered and visually reviewed (SHA-256
  `b321afa905c708bfa40df3eaa8a45d8747ca9ce82962ece2e17b83201de99700`).
  A second focused joint return combines $50,000 Form 2555 line 45 with a
  reviewed $4,000 vehicle loan and two senior claims. Its $160,000 AGI becomes
  $210,000 Schedule 1-A MAGI. The vehicle phaseout reduces line 30 to $2,000,
  the senior deduction is $4,800, and line 38/1040 line 13b is $6,800. The
  native return passed local TY2025 v5.4 XSD; the nine-page PDF was generated,
  and both Schedule 1-A pages were rendered and visually reviewed (SHA-256
  `08b6a05ff1225334be9b378a69e6d427e008d127065f2db1f677268755599d4c`).
  This route does not cover part-year Form 2555, a positive housing deduction
  (see the [line 50 source contract](../international/form2555/ty2025-form2555-line50-schedule1a-source-gap.md)),
  Form 2555 with tips/overtime, positive Puerto Rico or Form
  4563 exclusions, issuer/source-document authentication, IRS business rules,
  or ATS acceptance. Other positive routes still need their own sources.
- Part II has source-backed W-2 box 7, reviewed W-2 box 14 or separate employer tip statements, reviewed Form 4070 monthly report, and Form 4137 routes with a published three-digit
  tipped occupation code, a valid
  timely employment SSN, and reviewed zero Part I exclusions. Each positive
  employer row retains its EIN and name and is checked against the W-2 and
  Form 4137 facts at native/PDF export. A reviewed W-2 box 14, separate employer statement, Form 4070, or Form 4137 employer occupation and reference can supply the code when the 2025 W-2 omits it; a W-2 with a different code rejects. W-2 box 7 alone requires box 5 Medicare wages at or below $176,100; reviewed box 14, separate statement, or Form 4070 amounts can replace box 7 for the same employer when box 5 is higher. Form 4137 line 1 column (c) is
  combined with the selected W-2 or Form 4070 amount using the greater amount for each employee and
  employer, so the same tips are not deducted twice. One employer fills lines
  4a/4b/4c as applicable; multiple
  employers print zero on 4a/4b and put the sum of the greater-of amounts on
  4c through the IRS worksheet, kept in the PDF packet. The worksheet
  paginates after five employer rows. It also fills lines 6/7, 9–13, and
  38 and reconciles to Form 1040. Duplicate source rows or Form 4070 months, high box 5 wages
  for the W-2 box 7-only route, and an
  occupation code outside the IRS list reject. Other employer statement variants,
  multiple occupations at one employer, other special wage-base handling,
  multiple Schedule C businesses, multi-employer full-packet validation, and
  underlying record authentication remain open. Native and PDF
  export also require every qualifying Form 4137 employer with a matching W-2
  to appear in the Schedule 1-A claim. The two-employer positive and
  omission-tamper fixtures await the bulk test gate; they do not authenticate
  source documents.
- Part III now supports employer-identified `FLSA Overtime Premium` in W-2
  box 14 when a source-referenced review confirms the employee is covered and
  nonexempt under the FLSA and that the premium is included in box 1. The W-2
  node carries employee SSN, employer EIN, premium, box 1 wages, and the review
  reference into Schedule 1-A. Multiple employers and both spouses can be
  summed, with duplicate employee/employer pairs rejected. Native and PDF
  outputs fill lines 14a–21 as applicable and line 38; the filer, AGI, and
  deduction reconcile to Form 1040. A separate employer-furnished 2025
  statement may now supply the premium when box 14 does not show it. The W-2
  source records the statement's tax year, employee SSN, employer EIN, premium,
  furnished status, and reference, plus an independent FLSA coverage and box 1
  inclusion review. It rejects mismatched identities, a premium greater than
  box 1 wages, or a simultaneous box 14 premium. Native export rechecks the
  statement against the filed W-2 source, and PDF uses that authorization.
  [Notice 2025-69, section II.B.2](https://www.irs.gov/pub/irs-drop/n-25-69.pdf)
  and the [2025 Schedule 1-A instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
  permit a separately furnished employer accounting for 2025. Raw
  taxpayer-entered overtime totals remain rejected. A bounded full-year
  employer payroll summary may instead supply aggregate time-and-a-half pay
  for hours over 40 per workweek; exactly one-third becomes the FLSA premium
  under Notice 2025-69 method B. Its owner and employer must match the W-2,
  the pay must be included in box 1, and a box 14 or separately stated premium
  cannot also be claimed. Native/PDF export replays the source amount and
  reference. A second bounded Notice 2025-69 method C uses an employer's
  full-year statement of double-time pay above regular wages for hours over
  40; one-half is the deductible FLSA premium, subject to the same W-2 owner,
  employer, box 1, and single-method checks. Other payroll methods, deferred
  W-2 amounts, Forms 1099-NEC/MISC,
  full combined packets, and authenticated employer statement bytes remain open.
- Part IV now has a reviewed 2025 purchase-loan route for up to 50 new,
  qualifying US-assembled passenger vehicles. Each record needs a borrower
  SSN, VIN, 2025 origination/purchase dates, lender and document references,
  first-lien and personal-use confirmations, eligible vehicle facts, whole-
  dollar interest, and a source-referenced review that no interest was deducted
  elsewhere. Bare VIN/interest assertions and positive Schedule C/E/F amounts
  are rejected. The native v5.4 schema permits 50
  vehicle groups; the PDF prints one VIN plus an attached subtotal and paginated
  statement when there are more than two. A bounded same-vehicle 2025
  refinance retains the original purchase-loan facts plus the later lender
  and first-lien references, original outstanding qualified principal, new
  principal no greater than that balance, and separate before/after interest
  amounts summing to line 22 interest. Cash-out and other ineligible debt
  reject. The calculator, native group, and PDF retain one VIN and the same
  line 23/30/38 total; positive and tamper cases are authored but unrun.
  This follows the [2025 Schedule 1-A instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
  for refinanced qualifying loans. Inherited obligors, mixed business-use
  interest, document authentication, and cross-schedule deduction
  reconciliation remain open.
- Part V's senior calculation computes per-person lines 36a/36b and
  intermediate lines 32–35. Its zero-exclusion review and the separate bounded
  Form 2555 review do not authenticate the underlying documents.

The v5.4 XSD has distinct elements for these source lines and Part VI line 38.
The registered Schedule 1-A MeF descriptor
requires an explicit source-referenced Part I review. The zero route confirms
no section 933 Puerto Rico exclusion and no Form 2555 or Form 4563 filing; the
bounded positive route replays structured Form 2555 line 45. It uses the AGI
calculated upstream, computes each positive deduction and emits Parts I–VI
in native XSD order, including the Part V phaseout and each spouse's line 36
amount. It checks
the filing status, each claimed senior's SSN/age/timely employment-valid SSN
facts, AGI, and the senior/total deduction against the pending Form 1040 lines
11b and 13b, and rejects a conflicting or unreviewed Form 2555/4563 source.
Other positive Part I exclusions remain unsupported. These references are review evidence, not
independent authentication of the underlying taxpayer documents.

The source, document, return integration, and PDF field-map cases are written.
Positive Parts II–V can now coexist in native XML and PDF projection. A joint
source graph with two identified W-2 tip employers ($3,000/$2,000), reviewed
$4,000 overtime, $4,000 vehicle interest, and $10,800 of senior deduction
passes local v5.4 full-return XSD. All five pages of its `v77` packet were
rendered and visually inspected: each part prints its own amount, the
employer worksheet reconciles to line 4c, and line 38 equals Form 1040 line
13b at $23,800. A mismatched Form 1040 total rejects. Other mixed source
combinations, underlying record authentication, IRS rules, and ATS remain open.
The official 2025 two-page AcroForm was inspected: page 1 fields
`f1_03`, `f1_08`, and `f1_09` correspond to lines 1, 2e, and 3; page 2
fields `f2_15` through `f2_23` correspond to lines 31 through 38. The
registered PDF descriptor projects a supported worksheet after the
same MeF source/return reconciliation, and Form 1040's PDF line 13b opens only
when that page's line 38 matches. Other Part II/III/IV sources remain open.
The `joint-senior-schedule1a` fixture now exercises the real source graph,
Form 1040 join, native TY2025 v5.4 XML, and four-page filled PDF. A PDF build
initially found that Form 6251 read a nonexistent calculated `line37_senior`
from the Schedule 1-A source slot. Its PDF projector now reads the finalized
Form 1040 senior amount and requires the Schedule 1-A source to reconcile
before subtracting it from Form 6251 line 1a. The regenerated `v39` packet
prints both spouses on Schedule 1-A page 1, $160,000 on Part I lines 1/3,
$5,400 for each spouse in Part V, and $10,800 on line 38 and Form 1040 line
13b. All four pages were visually inspected and the full-return XML passed the
local XSD. The remaining positive Part I exclusions, other Part II sources,
other Part III/IV sources, source authentication, IRS business rules,
and ATS acceptance remain open.
The source commit `89b972c6` passed the complete `deno task test` run at
8,932/8,932 with zero failures; the log is retained at
`.state/research/ty2025-full-test-schedule1a-pdf.log`.

The `single-w2-qualified-tips-schedule1a` fixture uses one $30,000 W-2 with
$5,000 box 7 tips, TTOC 102, box 5 Medicare wages below the wage base,
timely employment-valid taxpayer SSN facts, and reviewed zero Part I
exclusions. Its source graph reports $5,000 on Form 1040 line 13b, $9,250
taxable income, $928 tax, and a $1,572 refund. The native Schedule 1-A
emits $5,000 on lines 4a, 4c, 6, 7, 13, and 38 and passes local TY2025 v5.4
full-return XSD. All four pages of the `v41` PDF were rendered and inspected:
Part II prints those amounts and zero on line 4b; line 8 prints $30,000 MAGI,
line 9 prints the $150,000 threshold, lines 10–12 are blank, and
Form 1040 line 13b prints $5,000. The page review and SHA-256 are in the
[filled-PDF notes](../../testing/ty2025-filled-pdf-review-2026-09-29.md). This is a
synthetic source check; payer-issued bytes and IRS business-rule acceptance
remain open.
Source commit `46d7d080` passed `deno task test` at 8,938/8,938 with zero
failures; retain `.state/research/ty2025-full-test-schedule1a-tips.log`.

The `single-two-w2-qualified-tips-schedule1a` source has $3,000 and $2,000
box 7 tips from different employers. Their EIN, name, employee SSN, box 5
wages and occupation codes must match the W-2 records. The graph and native
Schedule 1-A put zero on 4a/4b and $5,000 on 4c, 6, 7, 13, and 38; Form 1040
line 13b agrees. The full return passes local TY2025 v5.4 XSD. In the
five-page `v76` packet, Schedule 1-A page 1 and the employer worksheet were
rendered and visually inspected. The worksheet shows both employer rows and
reconciles to line 4c; a six-employer component case verifies pagination.
This follows the [2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
for lines 4a–4c. Form 4070, Form 4137, actual W-2 bytes, IRS business
rules, and ATS remain open.

The `single-two-w2-flsa-overtime-schedule1a` fixture uses two $50,000/$30,000
W-2s with separately identified $3,000/$1,000 FLSA overtime premiums and
source-referenced covered/nonexempt and box-1-inclusion reviews. Its graph
reports $80,000 AGI, $4,000 on Form 1040 line 13b, $60,250 taxable income,
$8,175 tax, and $175 owed. Native Schedule 1-A prints $4,000 on lines
14a/14c/15/21/38 and zero on line 14b; the full return passes local TY2025
v5.4 XSD. All four pages of the `v42` PDF were rendered and inspected; the
amounts, filer identity, and blank unrelated parts agree with the source,
graph, and XML. The [filled-PDF notes](../../testing/ty2025-filled-pdf-review-2026-09-29.md)
retain the page review and SHA-256. Source references are review assertions;
payer-issued W-2 and payroll bytes, IRS business rules, and ATS acceptance
remain open.
Source commit `b2182cc1` passed `deno task test` at 8,947/8,947 with zero
failures; retain `.state/research/ty2025-full-test-schedule1a-overtime.log`.

The `single-reviewed-car-loan-schedule1a` fixture has a synthetic $80,000 W-2
and one reviewed 2025 purchase loan with $4,000 interest, a VIN, lender and
purchase references, vehicle eligibility facts, and a zero-interest-deducted-
elsewhere review. The graph reports $80,000 AGI, $4,000 on Form 1040 line
13b, $60,250 taxable income, $8,175 tax, and $175 owed. Native Schedule 1-A
prints the VIN, zero on line 22(ii), $4,000 on lines 22(iii)/23/24/30/38,
and passes local TY2025 v5.4 full-return XSD. All four pages of the `v43`
PDF were rendered and inspected; the Part IV rows, filer identity, and Form
1040 totals agree with the source, graph, and XML. The [filled-PDF notes](../../testing/ty2025-filled-pdf-review-2026-09-29.md)
retain the page review and SHA-256. The references are review assertions,
not authentication of the underlying lender or purchase documents. IRS
business rules and ATS acceptance remain open.
Source commit `44282e25` passed `deno task test` at 8,951/8,951 with zero
failures; retain `.state/research/ty2025-full-test-schedule1a-vehicle.log`.

The `single-three-car-loan-schedule1a` source has three distinct VINs and
$1,000/$1,500/$1,500 of reviewed interest. Three native line 22 groups and
the $4,000 deduction pass local TY2025 v5.4 full-return XSD. The 2025
[Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
require a statement when more than two VINs are reported. In the `v75`
five-page packet, line 22a prints the first VIN and $1,000; line 22b shows
`SEEATTACHED` and the remaining $3,000; the statement lists VINs two and
three separately with zero deducted elsewhere. Schedule 1-A lines
23/24/30/38 and Form 1040 line 13b each show $4,000. The Schedule 1-A page
and statement were visually inspected; a focused 20-loan case verifies
pagination. Lender and purchase records remain reviewed references rather
than authenticated bytes. IRS business rules and ATS acceptance remain open.

The `single-form4137-qualified-tips-schedule1a` fixture uses one qualifying
W-2 employer with $5,000 box 7 tips and Form 4137 line 1 column (c) with
$6,500 tips received and $5,000 reported. Schedule 1-A lines 4a/4b/4c
print $5,000/$6,500/$6,500; line 38 and Form 1040 line 13b deduct $6,500
once. The $1,500 unreported portion reaches Form 1040 line 1c, and Form
4137's $115 tax reaches Schedule 2 lines 5/7/21 and Form 1040 line 23.
The source graph and native XML pass local TY2025 v5.4 full-return XSD.
The corrected seven-page `v79` packet was visually inspected; its hash is
in the [filled-PDF notes](../../testing/ty2025-filled-pdf-review-2026-09-29.md).
This route requires a matching employer, W-2 occupation code, recipient
SSN, and Form 4137 amount at export. Multiple-employer greater-of
arithmetic and the worksheet pass focused tests. Form 4070 employer-report bytes,
multi-employer full-packet validation, source-byte authentication,
IRS rules, and ATS remain open.

The `single-two-employer-form4137-tips-schedule1a` fixture now stages a full
two-employer packet with distinct issued W-2 sources and Form 4137 line 1
rows. Under the [2025 Schedule 1-A instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf),
the employer worksheet selects the greater of W-2/4070 and Form 4137 tips
per employer. The staged native and PDF assertions expect $6,500 and $3,000
in its two rows, zero on lines 4a/4b, $9,500 on line 4c and Form 1040 line
13b, and $2,500 of unreported tips on Form 1040 line 1c. They also reject
an omitted Schedule 1-A employer or changed Form 4137 amount. The filled
Form 4137 PDF projector also rechecks all W-2 tip sources and its calculated
unreported income and tax against Form 1040 line 1c and Schedule 2 line 5
when the return is present. The current two-employer packet now has an eight-page visual review, exact native replay/full local XSD and a5/0 focused employer-join/worksheet gate (October8); see the current evidence below. This does not establish source authenticity, complete Schedule1-A coverage, business-rule compliance or IRS acceptance.

The `single-form4070-high-wage-qualified-tips-schedule1a` fixture has twelve
monthly employer reports totaling $20,000, matched by recipient, employer,
and occupation to a W-2 with $15,000 in box 7, $200,000 in box 5, and no tipped occupation code. The
reviewed monthly net is cash plus charged tips less tips paid out. It
replaces the W-2 box 7 amount for this employer rather than adding to it.
Schedule 1-A lines 4a/4c show $20,000, lines 10/12 show the $5,000 MAGI
phaseout, and line 13/38 and Form 1040 line 13b show $15,000. The full
return passes local TY2025 v5.4 XSD. All four pages of the `v81` PDF were
rendered and are pixel-identical to the visually inspected `v80` pages (SHA-256
`c13a8bcad9afdd1f66343d64047dbef23fa69e8c916626d803c213b5316cb132`).
Monthly report entries carry review references; actual employer-submitted
report bytes and IRS business-rule acceptance remain open. The route follows
the [2025 Form 1040 Schedule 1-A instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf).

The `single-form4070-form4137-no-w2-code-schedule1a` fixture combines
reviewed employer reports with a reviewed occupation on the Form 4137
employer row. Its W-2 has no box 14b occupation code. The $5,000 Form 4070
total and $6,500 Form 4137 line 1(c) amount fill Schedule 1-A lines 4a/4b;
line 4c and Form 1040 line 13b take $6,500 once. Form 1040 line 1c includes
$1,500 unreported income, and Form 4137's $115 tax reaches Schedule 2 lines
5/7/21 and Form 1040 line 23. The full return passes local TY2025 v5.4 XSD.
All seven `v82` PDF pages were rendered and visually inspected (SHA-256
`790e2381262c4ee1d6b3070711b47f56c8ea83482825dc9fa8e0179a3a3beb8a`).
The occupation review is a structured fact with a source reference; the
underlying record is not authenticated. The 2025 W-2 transition relief is
described in [IRS Notice 2025-69](https://www.irs.gov/irb/2025-50_IRB).

The `single-w2-box14-qualified-tips-schedule1a` fixture selects $20,000 of
employer-labeled W-2 box 14 tips over $15,000 in box 7 for the same employer.
The review identifies the exact box 14 label, source reference, qualifying
occupation, and inclusion in box 1 wages. Its W-2 has $200,000 in box 5 and
no occupation code in box 14b. The Schedule 1-A source row records which W-2
box was selected; native export rechecks that exact amount and code. Schedule
1-A lines 4a/4c show $20,000 and lines 13/38, with Form 1040 line 13b, show
$15,000 after the $5,000 MAGI phaseout. The full return passes local TY2025
v5.4 XSD. All four `v83` PDF pages were rendered and are pixel-identical to
the visually inspected `v81` pages (SHA-256
`4e6b69f1c79ed6ca5ad53aa2c83d9cf98c5e8a640e2ee18f87e7e2766ef91cb3`).
The [2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
allow an employer's voluntary W-2 box 14 tip amount. Issuer-form
authentication and IRS business-rule acceptance
remain open.

The `single-employer-statement-qualified-tips-schedule1a` fixture uses a
separately furnished employer statement reporting $20,000 of 2025 tips for
the identified employee and employer. Its reviewed occupation and source
references, affirmative box 1 inclusion, W-2 employee SSN/EIN/name, and
$200,000 W-2 wages are checked at filing export. This statement replaces
the same employer's $15,000 W-2 box 7 amount; it cannot be combined with a
selected W-2 box 14 tip amount or Form 4070 report for the same employee and
employer. Schedule 1-A lines 4a/4c show $20,000 and lines 13/38 and Form
1040 line 13b show $15,000 after the $5,000 MAGI phaseout. The full return
passes local TY2025 v5.4 XSD. All four `v84` PDF pages were rendered and
are pixel-identical to the visually inspected `v81` pages (SHA-256
`356436712b7c01930371fff607f6b3049e6f56938338529e70c7f43d26215842`).
The source reference and review facts do not authenticate the employer's
actual statement bytes. More than one statement for an employer is not yet
resolved. The [2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
permit this employer statement method.

The `single-1099nec-trade-business-tips-schedule1a` fixture exercises a
bounded line 5 route under the [2025 Schedule 1-A instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
and [Notice 2025-69](https://www.irs.gov/irb/2025-50_IRB). One 1099-NEC
box 1 contains $18,000 of compensation; a reviewed point-of-sale record
identifies $12,000 as qualified tips in occupation 102, linked to the
taxpayer and one cash-basis Schedule C business. Schedule C line 31 is
$10,000. The filed half-SE-tax deduction rounds to $706, so line 5 is
limited to $9,294. Employee line 4c prints zero; lines 5/6/7/13/38 and
Form 1040 line 13b print $9,294. The source graph and full native return
pass local TY2025 v5.4 XSD. Native and PDF preflight reject a changed NEC
tip amount, wrong owner, duplicate payer, multiple Schedule C businesses,
farm income, or additional allocable Schedule 1 lines 16/17. The review
affirms there are no other deductions allocable to this business. The
12-page `v85` filled PDF was viewed as a page contact sheet and its
Schedule 1-A page 1 at full resolution (SHA-256
`7ed925ddc0c9aacac604166dcf21683eeab3714fffd3b0d637a5266862be2000`).
Payer-issued 1099 and tip-record bytes are not authenticated. Multiple
businesses and the 1099-K line 5 source still need their own
owner-specific net-profit and deduction allocation. IRS business rules and
ATS acceptance remain open.

The `single-nec-misc-business-tips-schedule1a` fixture adds a reviewed
1099-MISC box 3 tip component to the same Schedule C business as a reviewed
1099-NEC box 1 component. The two payer reports contribute $5,000 and
$8,000 of qualified tips, respectively, while Schedule C line 31 is
$10,000. The line 5 worksheet applies the $706 rounded SE deduction once,
so line 5, line 13, line 38, and Form 1040 line 13b show $9,294. MISC box 3
must be routed to Schedule C; a tip amount larger than the box, NIIT
classification, or a changed internal row rejects. The full return passes
local TY2025 v5.4 XSD. All 12 `v86` PDF pages were viewed as a contact sheet
and the Schedule 1-A line 5 page was checked at full resolution (SHA-256
`b3479712e700700c9ea14235ad144f187b3e03489b10cd8a6f30b7b5d49ea8b4`).
Source references and review facts are not authenticated payer/tip bytes.
multiple-business deduction allocation, IRS rules, and ATS remain
open.

The `single-nec-misc-k-business-tips-schedule1a` fixture adds $6,000 of
reviewed Form 1099-K box 1a tips to $4,000 NEC and $4,000 MISC tips. The
processor's $10,000 box 1a is allocated to $8,000 included in the named
Schedule C business and $2,000 identified as payments already counted on the MISC report, with a
transaction-review reference and a check that the included K receipts do not
duplicate another payer report. The three
sources produce $18,000 gross receipts, $10,000 profit, and $9,294 on
Schedule 1-A line 5 after the rounded $706 Schedule 1 line 15 deduction.
Native and PDF export match the K source row to the original payer report
and the proprietor. The full return passes local TY2025 v5.4 XSD, and a
changed K receipt row or referenced MISC payer rejects. All 12 `v87` PDF pages were inspected as a
contact sheet, with Schedule 1-A page 1 checked at full resolution (SHA-256
`541ad5cff5a492002aa5eda8d3f990f4acfa87ef4667cd7ae8935c279747194b`).
Processor and tip-record bytes, transaction-level duplicate evidence,
personal-payment classification, EIN recipients, multiple-business
deduction allocation, IRS business rules, and ATS acceptance remain open.

## October 8 — current two-employer Form4137 packet review

All **eight pages** of retained `single-two-employer-form4137-tips-schedule1a` were rendered and directly inspected: two Form1040 pages, two Schedule1-A pages, the employer tips worksheet, two Schedule2 pages and Form4137. Full saved inputs/filer, selected pending Form1040/Schedule1-A/Schedule2/Form4137, all native leaves and document attributes were read. Employer EIN/name, owner SSN and worksheet occupation joins are consistent; the eight-page layout has no observed clipping, missing rows or inconsistent amounts.

The two W-2 sources have wages30,000/20,000 and withholding2,500/1,500. Form4137 reports received/reported tips6,500/5,000 and3,000/2,000, giving2,500 unreported tips on Form1040 line1c. The per-employer greater amounts6,500 and3,000 give9,500 on the keep-for-records worksheet and Schedule1-A line4c; lines4a/4b are explicitly zero. MAGI52,500 has no phaseout; line38/Form1040 line13b are9,500. Form4137's Social Security wage/tip base is50,000 and remaining176,100 cap is126,100; unreported tips2,500 produce Social Security155 and rounded Medicare36, total191 on Schedule2 line5/7/21 and Form1040 line23. AGI52,500 less standard15,750 and tips9,500 gives taxable27,250; recorded income tax3,035 plus191 gives3,226, withheld4,000 and refund774. The exact ordinary-tax-table row was not independently re-inspected in this observation.

[2025 IRS Schedule1-A instructions, line4c worksheet](https://www.irs.gov/instructions/i1040gi) were reread and privately retained with URL/time/SHA; they prescribe the per-employer greater-of calculation and keep-for-records worksheet. The native bundle has six documents (1040, Schedule1-A, Schedule2, Form4137 and two W-2s), distinct IDs and zero binary attachments. The extra PDF worksheet is a record workpaper, not a required separately transmitted document.

Private `.state/research/board-execution-2026-10-07/form4137-two-employer-retained-review-20261008-v1/` retains all page renders, source hashes, observations and actual terminal logs. Current source replay: actual0 at **11:50:59.330345UTC**, logSHA `134e012a18890a3fd88c418a4e2349c349922026f3f22eb2d7d4a3efb48e550e`; graph diagnostics empty, native XML exactly reproduces the held bytes and full local TY2025v5.4 XSD passes. Whole pending matches after only the previously known inactive recorded Form8960 `{filing_status:"single",magi:52500}` is removed; no other normalization. Existing two-file focused tests: actual0 at **11:52:21.177227UTC**, **5passed/0failed/24filtered**, logSHA `f93888131f8f950023cfd39fbf7c557da3be8eac7a260e172fb94b27dcebc3f7`; they cover two employers, greater-of/no-double-counting, missing/changed qualifying employer/4137 facts at native/PDF export and the worksheet. Filtered cases are not ignored failures or claimed passes.

Independent11:52:42 observation rehashes all2,706 root runtime paths and retained source/XML/PDF/page images; runtime matches the live full-regression preflight. Original main52 and future54 remain unchanged. No PDF/source was regenerated, no aggregate checker/coverage count increased, and no discrepancy or new future task was identified. Structured W-2/job/SSA/residency assertions remain synthetic and unauthenticated. Wider Schedule1-A routes, source proof, full regression phase, business rules and IRS acceptance remain open.

## October8 — aggregate-payroll overtime retained packet

All four `single-aggregate-payroll-flsa-overtime-schedule1a` pages were rendered and directly observed: two Form1040 and two Schedule1-A pages. Full source/filer, selected pending and every native leaf/attribute were read. Reviewed full-year, furnished-to-employee12,000 time-and-a-half pay for hours beyond40, with FLSA-covered/nonexempt and box1-inclusion assertions, gives4,000 by the [Notice2025-69 methodB](https://www.irs.gov/irb/2025-50_IRB). W-2 wages/withholding80,000/8,000 match the owner/employer and native W-2. Schedule1-A14a/14c/15/21/38 and Form1040line13b all show4,000;14b printszero. MAGI80,000 has no phaseout, standard15,750 plusovertime4,000 yields19,750 deductions and taxable60,250. Recordedtax8,175 lesswithheld8,000 produces175owed. The exactordinarytax-table row was not independently re-inspected. Otherdeductionsections areblank. Three native documents have distinct IDs and no binary attachments; no observed packet clipping, missing marks or amount discrepancy.

Private `.state/research/board-execution-2026-10-07/schedule1a-aggregate-overtime-retained-review-20261008-v1/`: current sourcegraph diagnosticsempty, exact heldnativeXML and full localTY2025v5.4XSD, actual0 at **11:55:31.930602UTC**, logSHA `4d33e2a86ff165bf0374a9d67aa3e54b60fbf47dcb1d428ca801bfc1b89fc58d`. Wholepending matches after only the knowninactiveForm8960 `{filing_status:"single",magi:80000}` is removed. Currenttwofilefocused source/native/PDF replay cases actual0 at **11:56:29.878823UTC**, **2passed/0failed/124filtered**, logSHA `2f65978471a99e231aa52a8c9d20e9ab3696b8713bb9f814fc6f95e8b6ae5cba`. Changed source/owner, competing methods and export amount contradictions reject. Filtered cases are not claimed as passes. Independent11:56:36 verifies all2706 root runtime paths and original source/XML/PDF hashes; runtime equals the live full-regression preflight. Four page hashes and primary notice bytes/provenance are retained. No originals regenerated or aggregate checker count increased.

The source test additionally confirms a narrower code restriction:12,001 aggregate pay rejects because of exact divisibility by3; the double-time branch requires even excess pay. The notice prescribes fractional methods and [Form1040 instructions](https://www.irs.gov/instructions/i1040gi) permit consistent whole-dollar filing. Their combined implication for these boundaries needs a reviewed cents/rounding contract rather than an exact-integer divisibility prerequisite. This newly identified coverage restriction is recorded only in `future_todo`, **unworked**. Current4,000 packet parity does not resolve it. Synthetic payroll/issuer/FLSA/SSA assertions remain unauthenticated; broader Schedule1-A source, combined payroll, business rules and IRS acceptance remain open.

## October8 — double-time excess-pay retained packet

All four `single-double-time-flsa-overtime-schedule1a` pages were rendered and directly observed (two Form1040, two Schedule1-A). Full source/filer, selected pending and every native leaf/attribute were read. The reviewed full-year10,000 **excess above regular wages** at double time produces5,000 under [Notice2025-69 methodC](https://www.irs.gov/irb/2025-50_IRB), rather than claiming the entire10,000. Employee/employer identities, FLSA-covered/nonexempt and box1-inclusion assertions join the80,000/8,000 W-2. Schedule1-A14a/14c/15/21/38 and Form1040line13b show5,000;14b printszero, noMAGIphaseout. Standard15,750 plus5,000 gives20,750 deductions and taxable59,250. Recordedtax7,955 versus8,000 withholding produces45refund. The exactordinarytax-table row was not independently re-inspected. Otherdeductionsections remainblank, three native IDs aredistinct, zero binary attachments, no observed clipping or amount/mark discrepancy.

Private `.state/research/board-execution-2026-10-07/schedule1a-double-time-retained-review-20261008-v1/`: current diagnosticsempty, nativeXML exactly reproduces retained bytes, full localTY2025v5.4XSD passes; actual0 at **11:59:59.969798UTC**, logSHA `6156af56b73d4101646c53beedae46c947bead991d5e953459af03278da2a0df`. Wholepending matches after only the knowninactiveForm8960 `{filing_status:"single",magi:80000}` is removed. Currenttwofilefocused cases actual0 at **12:00:18.661312UTC**, **2passed/0failed/124filtered**, logSHA `214f86e9b60beffcafc8206aed7681a2c7ccda4914ef52310f5cc9bc81119688`; reviewed source and native/PDF exporter amount contradictions reject. Filtered cases are not claimed as passes. Independent12:00:44 verifies all2706root runtime paths, original source/XML/PDF hashes and page-image hashes; root equals the live full-regression preflight, main52/future55 unchanged. Existing retained primary-notice bytes/provenance are referenced rather than redownloaded.

This review covers the divisible10,000 positive. The already deferred cents/rounding restriction remains in `future_todo`, unworked. No original was regenerated, no aggregate coverage count increased, and no additional future task was identified. Employer/issuer/FLSA/SSA assertions are synthetic, without authenticated payroll bytes. Broader Schedule1-A sources/combined methods, complete phase regression, business rules and IRS acceptance remain open.

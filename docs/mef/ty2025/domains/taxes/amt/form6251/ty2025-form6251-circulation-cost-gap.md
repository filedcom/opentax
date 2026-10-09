# TY2025 Form 6251 circulation-cost adjustment

The [2025 Form 6251 line 2o instructions](https://www.irs.gov/instructions/i6251)
require circulation costs deducted currently for regular tax to be capitalized
and amortized over three years for AMT. Line 2o is the signed current-year
regular deduction less the current-year AMT deduction. The remaining
unamortized balance by itself is not a line 2o amount. The adjustment is not
made when the regular-tax three-year write-off was elected.

The reviewed-total `f59e` circulation record requires the current-year regular
and AMT deductions and an explicit regular three-year election fact. It sends
their signed difference to Form 6251 line 2o. The Form 6251 node includes that
amount in AMTI and in the negative-lines-2c-through-3 filing test. The TY2025
MeF descriptor uses `CirculationCostAmt` in the `IRS6251` sequence, and the PDF
descriptor uses page-1 AcroForm field `f1_19[0]`. The cached TY2025 XSD and
field dump supplied the element and field mapping. The focused Form 6251/Form
59E source, calculation, native, and PDF run on 2026-09-30 passed 156/156 cases,
including positive, negative, missing-source, election, XML-order, and
PDF-mapping checks.

Native and PDF export now replays any nonzero line 2o against the retained Form
59E input and rejects a missing source, duplicate workpaper reference, changed
deduction, or conflicting election. The October 9 grouped check below runs the retained replay fixture.

A zero-net circulation adjustment also replays every retained pool when Form
6251 is exported. Opposite signed differences cannot hide a duplicate reviewed
workpaper reference or an invalid election/loss fact. The input node rejects
duplicate references before calculating even if the differences offset; a
missing Form 59E source remains valid when no line 2o is claimed. This does not
establish the underlying workpaper or regular-tax deduction independently.

The reviewed-total route relies on entered deduction figures; it does not calculate the
three-year amortization schedule, a property-loss limitation, or authenticate source workpapers. The October 9 source join below now verifies
the positive regular deduction against an owned Schedule C expense. Non-circulation
`f59e` types still use the existing unsupported mixed-adjustment disposition
until their own line-specific sources are available. The retained full-return/XSD/PDF checks below do not establish IRS business-rule
acceptance or close broader Form 6251 coverage.


## October 9 owned-expense and complete-return checkpoint

Previously, a positive regular circulation deduction could reach Form 6251 from
reviewed scalar amounts without proving it was deducted by the business. Export
now requires a retained business reference, Part V expense description, and owner
TIN; exactly one owned Schedule C expense must match that deduction. Reused
expense references, missing or changed expenses, owner conflicts, passive or
limited/disposed activities, and changed Schedule 1 business totals reject.
Taxpayer/spouse source and finalized-return identities must agree. Zero-net
circulation pools still replay each source. This is a regular-deduction join;
reviewed AMT deduction figures, amortization histories and election authenticity
remain separate unfinished requirements.

The typed source/return/Form 59E/native/PDF group passes **122/0**. An initial
broader invocation passed121 and failed one existing XSD case because its command
lacked `xmllint` permission; the corrected invocation uses the cached schema and
passes all122. Three new public-entry return tests independently assert the
regular tax, AMTI, exemption, AMT, Schedule 2 and final tax. Source tests also
cover spouse ownership and opposite-signed pools with a zero total.

Three synthetic single-filer packets use wages200,000, withholding35,000,
ISO adjustment240,000 and Schedule C receipts equal to the owned circulation
expense. Regular taxable income184,250 and regular tax37,067 remain fixed.
The AMT worksheet uses exemption88,100,26% of the first239,100 taxable excess
and28% thereafter, following the [2025 instructions](https://www.irs.gov/pub/irs-prior/i6251--2025.pdf).

| Reviewed regular / AMT deduction | Line2o | AMTI | AMT | Total tax | Owed |
| --- | ---: | ---: | ---: | ---: | ---: |
| 30,000 / 10,000 | 20,000 | 460,000 | 62,283 | 99,350 | 64,350 |
| 8,000 / 10,000 | -2,000 | 438,000 | 56,123 | 93,190 | 58,190 |
| Elected10,000 / 10,000 | 0 | 440,000 | 56,683 | 93,750 | 58,750 |

All three full XML documents pass the retained TY2025 `2025v5.4` XSD. All21
filled PDF pages were reviewed:17 distinct rendered pages plus four exact
matches, across nine contact sheets. Schedule C expense/owner fields, signed
Form6251 adjustment, Schedule2 and final tax agree. Each packet rejects six
mutations in both native and full-PDF export: expense, owner, missing trace,
Schedule1, line2o and final1040 AMT; **18/18 reject in each exporter**.

Existing qualifications repeat: native Form6251 omits line1a while PDF prints
15,750 (`future_todo`84); Schedule C zero tentative/net profit prints blank
while native emits0 (`future_todo`76). No deferred item was implemented, and
no main-board parent was closed. Election and deduction amounts are reviewed
synthetic facts, not authenticated evidence or an amortization calculation.

Private evidence: `.state/research/form6251-circulation-packets-2026-10-09/`
contains inputs, execution/pending output, XML/PDFs, page origins, source-derived
arithmetic, rejection details, render review, test logs and SHA256 inventory.
The existing full suite remains running against its preserved worktree snapshot;
this grouped pass does not establish a green full-suite result.


## October 9 computed three-year circulation schedule

The optional cost schedule now calculates regular and AMT deductions from
identified cost records, their paid/incurred tax year, and reviewed prior-year
deductions. It follows the three-year period beginning with the expenditure
year in [section56(b)(2)(A)(i)](https://www.law.cornell.edu/uscode/text/26/56)
and [2025 Form6251 line2o](https://www.irs.gov/pub/irs-prior/i6251--2025.pdf).
Calendar-year status, section173 eligibility, no separate section173
capitalization election, and the existing no-property-loss fact are explicit.
The regular three-year election selects equal regular/AMT annual deductions.
Without that election, regular tax deducts the expenditure in its first year,
while AMT amortizes it over the three years. Both stop after full recovery.

Every cost reference is unique across the circulation pools. Cost records must
sum to original basis; all earlier deduction years must be present exactly once
and match the schedule. The opening unrecovered AMT balance includes new costs
and subtracts the prior allowed AMT deductions. Conflicting entered current
amounts reject, but current deduction totals need not be entered on this route.
Calculation and both export validators use the same schedule resolver. Export
also checks source/final owner identity and the owned ScheduleC expense for
any positive regular deduction. Cent-level records allocate the final penny
remainder to year three; the unit case recovers100 as33.33,33.33,33.34.

The final grouped gate passes **132/0**, including six new complete-return
cases and four schedule tests. An initial type-check caught a Zod-refinement
API error; it was corrected without weakening the inferred types. The existing
reviewed-total path and all earlier grouped AMT tests remain passing.

Six prepared packets pass full TY2025 XSD. All42 PDF pages were reviewed through
17 distinct images and25 exact matches on nine contact sheets. Each has wages
200,000, withholding35,000, ISO240,000 and regular tax37,067. Cost records total
30,000 (18,000 plus12,000); an active amortization year allows10,000 for AMT.

| Cost year / regular election | Current regular deduction | Line2o | AMTI | Total tax | Owed |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2025 / no | 30,000 | 20,000 | 460,000 | 99,350 | 64,350 |
| 2024 / no | 0 | -10,000 | 430,000 | 90,950 | 55,950 |
| 2023 / no | 0 | -10,000 | 430,000 | 90,950 | 55,950 |
| 2022 / no, fully recovered | 0 | 0 | 440,000 | 93,750 | 58,750 |
| 2025 / yes | 10,000 | 0 | 440,000 | 93,750 | 58,750 |
| 2024 / yes | 10,000 | 0 | 440,000 | 93,750 | 58,750 |

All36 altered-cost, owner, balance, entered-deduction, duplicate-source and
history/year mutations reject in both native and full-PDF export. The
zero-current-deduction fixtures retain an explicit zero-activity ScheduleC;
its PartV prints0 while several calculated zero lines print blank (existing
`future_todo`76). Native6251 line1a omission remains deferred84. No new deferred
item or main-board closure is added.

Private evidence: `.state/research/form6251-circulation-schedule-2026-10-09/`.
Cost/election/prior-return references remain reviewed synthetic facts, not
issuer bytes or authenticated accepted returns. Property-loss limitations,
short tax years, other activity destinations, election attachments and broader
Form6251 coverage remain unfinished. The original full suite is still running
in its unchanged runtime worktree; the grouped pass is not a full-suite pass.

# TY2025 Form 6251 circulation-cost adjustment

The [2025 Form 6251 line 2o instructions](https://www.irs.gov/instructions/i6251)
require circulation costs deducted currently for regular tax to be capitalized
and amortized over three years for AMT. Line 2o is the signed current-year
regular deduction less the current-year AMT deduction. The remaining
unamortized balance by itself is not a line 2o amount. The adjustment is not
made when the regular-tax three-year write-off was elected.

The `f59e` circulation record now requires the reviewed current-year regular
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

This route relies on reviewed deduction figures; it does not calculate the
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

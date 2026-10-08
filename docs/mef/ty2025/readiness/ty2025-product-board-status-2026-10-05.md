# TY2025 board learning checkpoint — October 5, 2026

Historical status preserved during board compaction. Later evidence below supersedes earlier pending-run statements.

## Compacted status (2026-10-05)

The board has 52 open TODOs: 32 outside the named tax-form gaps and 20
inside. The open checklist below is authoritative. The [status checkpoint](docs/mef/ty2025/readiness/ty2025-product-board-status-2026-10-04.md)
preserves the route, fixture, PDF, schema, and release learnings removed from
this summary; the [completed ledger](docs/mef/ty2025/readiness/ty2025-product-board-completed-2026-10-01.md)
records 1344 bounded completed slices. A completed slice does not close its
parent form or release gate.

Work the existing non-named queue first where scope and source evidence are
settled. The [dependency audit](docs/mef/ty2025/inventory/ty2025-nonnamed-board-dependency-audit.md)
identifies independent work, product decisions, named-form prerequisites,
validation, and IRS ATS needs. A full local rerun started at `8c0cb4e2`
with real Poppler 26.09.0 passed **11,197/11,197**, 0 failed, 0 ignored in
34m04s. Its log is `/tmp/opentax-deno-task-test-poppler-2026-10-05.log`.
The later Form 7217 liquidating full-return XSD case passes 1/1 separately;
the all-route and ATS gates remain open. The current-source selected packet
has 175 exportable synthetic cases with 1,073 filled PDF pages; the latest
read-only source/hash/page/XSD replay also omits 14 blank Form 6251 pages and
passes with the corrected Form 8863 student identity. Additional bounded
slices verify Form 8911 native/PDF parity, cover joint taxpayer/spouse 1099-G
reconciliation, require exactly one primary IRS1040 document in the prepared
packet, clarify Form 4547's signature rule, pin the exact Form 8880 age cutoff,
capture ATS Scenario 1 Form 5695 answers and the separate line 19d door-cost
subtotal, and capture the checked QCD mark in ATS Scenario 8. The line 19e
door-cost overlap and missing line 22b itemization remain unresolved. Three additional bounded
Form 1098 slices verify ordinary 2025 refinance-point allocation, the
construction-refinance amortization route, and purchase points with an
existing mortgage; focused source/PDF and full-return XSD checks passed, and
the ordinary refinance and construction cases each produced a visually
reviewed three-page packet. Schedule R age-only and disability routes also
passed 16 focused native/PDF/XSD tests; underlying source-byte authentication
and wider benefit/status cases remain open. Form 7217 source, native, and PDF
tests pass 25/25, plus one partial ATS Scenario 12 XSD case. A bounded
recognized-gain full-return XSD case passes with $5,000 through Form 8949,
Schedule D, and Form 1040. The published $650 liquidating basis allocation
also passes full-return XSD with an offsetting $1 tamper rejection; wider
source/basis routes remain open. A three-loan,
two-qualified-home Form 1098 case also passes native, XSD, and filled-PDF
checks at $2,499 deductible interest. The bounded two-loan purchase-points
route now applies the same Pub. 936 ratio to interest and points above the
$750,000 average-balance limit: $16,569 reaches Schedule A and Form 1040,
with 82 focused source/native/PDF tests and two XSD cases passing on the
integrated branch. Its three-page filled packet visibly reconciles Schedule A
line 8a and Form 1040 line 12e. A current-head full rerun is pending. A bounded
MFS two-loan route uses the $375,000 debt limit only with reviewed
noncommunity-property and solely paid-interest evidence; 59 source tests and
one full-return XSD/PDF-build case pass at $15,012; all three filled pages
were visually reviewed. Its payment-workpaper
reference is not authenticated. Form 1098's
documented boundaries leave issuer-byte
authenticity, broader mortgage limits and points variants, business rules,
and ATS open. The retained Copy B parser now rejects malformed amount text,
invalid comma grouping, and negative values while still allowing a blank
optional box; the issuer's provenance and scanned-PDF appearance remain
unchecked. Form 8862 focused source/calculation/export-boundary tests pass
40/40, but native and PDF export still reject without authenticated prior IRS
notice contents; a positive ODC/AOTC export remains unverified.
The MFS route now has a separate selected three-page source/XML/PDF packet
with a complete visual checklist. Final export also rejects yearless or
wrong-owner positive W-2G sources, and malformed attached Schedule totals
can no longer bypass the Form 1040 join. Focused W-2G and return-wide suites
pass 194/194 and 13/13 respectively.
With real Poppler, the Form 8888, Form 8853, and Schedule D PDF assertions pass.
Three Form 3800 packet-count expectations were updated for the verified blank
Form 6251 page trim; its focused suite passes 14/14.
The bounded Form 1116 three-country Germany routes now use the IRS `GM`
code; two prepared packets pass local XSD and the interest route rejects
`DE` at both exports. The shared IRS country-code allowlist now checks retained
foreign-source paths. Form 1098-E checks a supplied borrower name against its
filer owner, and A2A submission may omit the optional electronic postmark.
The W-2G end-to-end fixture now supplies its required 2025 source year.
The integrated focused follow-up passes 163/163; a full rerun is pending after
one yearless legacy fixture caused the previous 11,210-pass run to fail.
The later IRS-code negative test now asserts source-intake rejection. Repeated
RRB-1099-R copies require distinct issued references, and SSA/RRB box 5 is
counted once when a lump-sum worksheet is present. Form 1040 prints the TY2025
IRS country name for foreign addresses; A2A evidence rejects unseen document
references; Scenario 13 records its unmarked U.S.-home checkbox. Two integrated
focused batches pass 112/112 and 108/108. A clean full rerun of these changes
is pending.
Further source guards reject case-variant SSA/RRB issued-copy references and
RRB pension duplicates with payer-spelling or recipient variants. Schedule B
now validates IRS country codes at intake and native export. Form 1116 PDF
country rows print names, and the corrected eight-page three-country packet
was visually reviewed against its source and native XML. The next integrated
focused batch passes 178/178; full regression on these later changes is pending.
Other country/source and visual review remain open.
Three more bounded source checks reject a conflicting Section B donee receipt
date for the reviewed Form 8283 unrelated-use route, duplicate Form 59E
circulation workpaper references and unreviewed zero-net records at Form 6251
export, and duplicate claimed-dependent SSNs before Form 8962 MAGI sums.
Their integrated focused tests pass 25/25; broader evidence and full regression
on these latest checks remain open.
Three further guards keep 2024 separate and 2025 joint Form 2210-F return
references distinct, bind first-year Roth Form 1099-R recipients to Form 8606
owners, and reject an unfiled zero-deduction Form 8995 business loss. Their
integrated calculator/source/native/PDF/XSD focused tests pass 147/147; filed
return and issuer provenance plus the latest full regression remain open.
Form 4255 now rejects repeated staged credit-line rows before Schedule 2
summation, and Form 8889 PDF instances check HSA owner identity and valid
computed line values. Their combined source/native/PDF focused tests pass
32/32; positive Form 4255 export and wider HSA evidence remain guarded.
The corrected-SLCSP Form 8962 route now allows one Marketplace record across
same-state policies but rejects a reused reference with conflicting retained
digests. Its integrated three- and four-policy focused cases pass 3/3;
Marketplace byte authenticity and wider policy paths remain open.
Form 7206 rejects retained plan/identity claims without computed lines while
allowing ambient Schedule C/SE context on returns with no Form 7206. Form 1116
Schedule B checks Schedule 3 against all parent category credits, and a 2025
refinance checks reviewed Form 1098 box 2 against its new-loan principal. Their
integrated source/native/PDF/XSD cases pass 42/42; wider source and ATS gates
remain open.
The real-Poppler full regression at `9d700e2d` passed 11,225/11,225. The
next full run at `615809a4` exposed one obsolete EIC duplicate-identity test
expectation after the earlier Form 8962 source guard; its corrected EIC/Form
8962 focused suites pass 10/10. The corrected code at `a268f60c` passed the
real-Poppler full regression: 11,233/11,233 in 40m17s, with no failed tests.
The broader filing and IRS ATS gates remain open.
Scenario 8's code-Q distribution and blank Form 1040 line 4a still need
reconciliation, as do the other open ATS source conflicts.
An October 5 official Scenario 1 packet recheck confirms its Form 5695
door-cost and line 22b source conflicts remain.
The remaining
11 of the prior 186 fixtures have explicit source or attachment guards; the
new 187th MFS fixture passes separately. Those checks do
not prove every route, every PDF page, IRS business-rule compliance, or ATS
acceptance. The
[validation batch](docs/mef/ty2025/testing/ty2025-form1040-validation-batch.md)
holds commands and artifact details.

The near-term goal is to finish existing filing work and prepare for MeF ATS
testing. The IRS currently marks ATS unavailable through October 13, 2026,
9:00 a.m. Eastern; its R10.A WSDL is scheduled for installation that day.
Recheck operational status and accepted TY2025 versions before transmission.
Seven staged/unregistered roots were rechecked against the crosswalk and live
registries; their documented evidence/calculation guards still apply.
Keep named-form parents and release gates open until their full
requirements are verified.


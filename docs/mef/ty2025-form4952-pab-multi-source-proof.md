# TY2025 multi-copy PAB investment-interest AMT refigure

The frozen Form 4952/Form 6251 parent requires current-year
private-activity-bond interest, paid debt, allocable deductions and the second
AMT Form 4952 to reconcile before export. The
[2025 Form 6251 instructions](https://www.irs.gov/pub/irs-prior/i6251--2025.pdf),
line 2c Steps 1–4, include otherwise deductible PAB debt interest on AMT Form
4952 line 1 and the **net** line-2g bond interest on line 4a; line 2c is regular
Form 4952 line 8 less AMT line 8. Line 2g first nets deductions that would have
been allowed if PAB interest were taxable. The
[2025 Form 4952 instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf),
line 5, exclude personal miscellaneous itemized expenses through 2025. A drafted
$500 personal custody-fee positive was abandoned; its separate unsealed draft
remains `/tmp/opentax-form4952-pab-multi-custody-draft-oct7` and is not tax
proof.

The new two-copy source includes one issued mixed 1099-INT with box 1 $18,000
and PAB boxes 8/9 $5,000, a second separately identified PAB-only issuer with
boxes 8/9 $4,000, and the unchanged paid $20,000 taxable-securities loan. A
separately identified $50,000 loan purchased the first PAB directly, with a
retained agreement, disbursement and purchase references, owner/bond identity,
lender statement and two dated $500 payments. Its
$1,000 allocable debt interest is absent from regular Form 4952 and refigured into AMT line 1. The second bond's reviewed expense is zero. Per-copy sources join Form 1040 line 2a ($9,000),
line 2b ($18,000), regular Form 4952 line 8/Schedule A line 9 ($18,000), AMT
Form 4952 line 1 ($21,000), line 4a ($26,000) and line 8
($21,000), Form 6251 line 2c (−$3,000) and net line 2g ($8,000). AMTI is
$445,000. With the $88,100 exemption, 28% AMT calculation less $4,782 is
$95,150; regular tax is $41,063, so Schedule 2 AMT is $54,087 and Form 1040
total tax $95,150. These operands derive independently from the retained issued
copies and paid records, not a supplied AMT difference.

The third issued PAB copy has distinct payer, account, bond and zero-expense
records, boxes 8/9 $2,000. It raises Form 1040 line 2a to $11,000 and Form 6251
net line 2g to $10,000; line 2c remains −$3,000. AMTI is $447,000, TMT/1040
total $95,710 and Schedule 2 AMT $54,647. Inventory reconciliation iterates all
identified copies rather than imposing an issuer-count ceiling.

A fourth, separately identified ordinary tax-exempt 1099-INT copy has box 8
$1,000 and no PAB box 9 or investment-interest claim. It raises Form 1040 line
2a to $12,000 while retaining Form 6251 line 2g at $10,000 and total tax at
$95,710. This checks that the issuer inventory does not misclassify ordinary
exempt interest as a PAB preference or Form 4952 investment income.

A separate two-issuer source retains the same bond copies and $1,000 bond-debt
interest but documents $27,000 actually paid on the taxable-securities loan (two
$13,500 payments matching the lender statement). AMT Form 4952 line 1 is
$28,000, while its net PAB line 4a is only $26,000, so line 8 is limited by
income at $26,000. Line 2c becomes −$8,000, line 2g remains $8,000 and AMTI is
$440,000; expected total tax is $93,750. A gross $27,000 line 4a would
incorrectly allow another $1,000 deduction in this boundary case.

The exact new two-copy public input is retained at
`/tmp/opentax-form4952-pab-multi-before-oct7/source.json`; the preceding
one-copy implementation rejects its new debt source at public parse, preserved
in `/tmp/opentax-form4952-pab-multi-before-control-oct7.log`. The final four
actual source, pending, carry, origin, native XML and filled-PDF packets are
under `/tmp/opentax-form4952-pab-multi-payment-final-oct7`: top-level two
issuer, `three-issuer`, `four-issuer` and `income-limited`. Each validates
against the full TY2025 v5.4 XSD and has nine pages with no widget or AcroForm
fields. The first three PDFs are byte-identical to personally reviewed v8
originals; the income-limited PDF's nine pages were rendered and personally
reviewed in `/tmp/opentax-form4952-pab-income-limited-render-oct7`. Physical
source and page hashes are retained in
`/tmp/opentax-form4952-pab-multi-payment-physical-manifest-oct7.json` alongside
the qualified prior-version archives.

Source and pending edits reject duplicate copy, loan and payment references,
including a payment record reused across the taxable and PAB loans; wrong owner,
bond, payment and preference amounts; the unsupported personal custody expense;
and direct native/PDF mutations. The literal prior-five replayer at
`/tmp/opentax-form4952-pab-multi-prior5-payment-final-oct7/report.json` passed
five actual saved sources and 111 pages: original source, normalized graph,
carry and page origins were exact; regenerated PDFs were byte-identical; XML
differed only in ReturnTs; every XML passed fresh full XSD. The production
start/end hash hold is
`/tmp/opentax-form4952-pab-multi-payment-final-production-held-oct7.json`. A
prior overlapping replay and early typed run are version-qualified; neither is
used as final-code proof. The pre-payment five-module typed compatibility run at
`/tmp/opentax-form4952-pab-multi-typed-held-oct7.log` passed nine tests with
zero failures. The final payment-reference guard passed the focused typed source
test at `/tmp/opentax-form4952-pab-multi-payment-final-oct7.log`. The final
five-module typed compatibility run at
`/tmp/opentax-form4952-pab-multi-payment-compat-oct7.log` passed nine tests with
zero failures. Shared-output invocations let the older one-copy module overwrite
their top-level packet after the new test; the authoritative four new packet
bytes are the separate `payment-final` archive. The custody draft remains
invalid and unsealed.

Independent source/math and all-page review is physically retained in
`/tmp/opentax-pab-multi-independent-v2-oct7/manifest.json` (88 files; its first
oracle failed on a wrong XML tag and was corrected). The final payment-reference
guard changes one production file; its four positive packets were source,
pending, carry, origin and PDF byte-equal to the reviewed version. That
independent 36-page review transfer and final eight-code-file hold are in
`/tmp/opentax-pab-payment-independent-supplement-oct7/manifest.json`.

The route does not assert issued-copy or lender authentication, prior accepted
carryovers, personal custody-fee deductibility, PAB OID/dividend coexistence
with AMT Form 4952, other Form 4952 elections, IRS business-rule acceptance or
ATS transport. Older line-2g-only positive workpapers remain under their
original source contract; they do not silently claim this new debt deduction.

# TY2025 Form 1116 line 1b alternative compensation source

Original build-pass checkpoint (2026-09-28; test status superseded below). The
[2025 Form 1116 instructions](https://www.irs.gov/instructions/i1116) require
line 1b when an employee has at least $250,000 of worldwide compensation and
uses an alternative basis to source foreign-service pay. The attachment must
identify the pay or fringe benefit, describe and compute the alternative
allocation, and compare the U.S. and foreign amounts under both methods.
Documentation explaining why the alternative basis is more accurate must be
retained.

The foreign-employer compensation input now carries the specific compensation
total, U.S. and foreign amounts under both the alternative and ordinary bases,
the statement descriptions, and a source document reference. Each pair must sum
to the specific total; the alternative foreign amount must equal the
foreign-service amount credited on Form 1116 line 1a. This bounded path proves
the $250,000 threshold from that one foreign-employer pay item alone. A return
needing W-2 wages or another pay item to reach the threshold still stops because
the source model does not attribute all compensation by employee. The Form 1116
item retains those facts in the general category. The native line 1b indicator,
`AltBasisCompensationSourceStmt`, and paid-tax conversion explanation attachment
are now built and linked as described below, pending the full batch. The PDF
maps the line 1b checkbox. A separate bounded one-employer general-category
projection is now built, with source and return reconciliation described below.
The original source/XML/PDF cases have now run with the affected focused suite below.

The MeF descriptor checks the Form 1116 item against its identified foreign-
employer source and rejects a missing or conflicting source. This path does not
claim an alternative basis for an unreported foreign-tax item or infer an
election from employer location. Foreign branch, section 951A, section 901(j),
treaty, and lump-sum category rules remain open, as do foreign capital-gain
adjustments, older carryover vintages, Schedule C redeterminations, and
full-batch XSD, PDF appearance, ATS, and business-rule verification.

The native `AltBasisCompensationSourceStmt` descriptor now runs the same
foreign-employer source, $250,000 item threshold, foreign-service allocation,
excluded-income and eligible-tax reconciliation before attempting an attachment.
The main native Form 1116 now also requires exactly one nonblank document ID for
that statement whenever line 1b is active. Previously, a direct build without
the document map could still emit a line 1b indicator with no linked statement.
Missing, blank, duplicate and valid-ID cases now pass focused checks. Previously,
a direct statement build could serialize an otherwise valid-looking line 1b
statement from `form_1116` fields and filer identity alone, even when the
foreign-employer source was missing or its amounts disagreed. A missing FEC,
tampered FEC allocation, and tampered Form 1116 line 1a item now have focused
fail-closed cases now pass focused checks. The main `IRS1116` descriptor retains its
existing check through the shared function. This closes a native attachment
escape; the separate narrow PDF route does not prove full return acceptance.

The
[2025 instructions for line 1b](https://www.irs.gov/pub/irs-prior/i1116--2025.pdf)
also require a comparison of the dollar amount sourced within and without the
United States under both the alternative and ordinary time/geographical bases.
The native statement's geographical-comparison element now prints those four
amounts rather than relying on free text. The retained `geographical_comparison`
and source document reference describe why the alternative basis is more
accurate. The PDF line 1b projection now also requires the same identified
foreign-employer source item before checking the box; its focused cases now pass.
Worldwide employee compensation still needs an owner-attributed W-2 and
foreign-employer model for the remaining mixed source cases, including non-box-1
compensation. Direct XML still rejects a missing conversion attachment; a
bundle-level positive case remains to be validated. No XSD or IRS acceptance is
claimed.

## Positive PDF audit (2026-09-28)

The local canonical 2025 PDF has a readable AcroForm tree and page widgets. The
[printed form](https://www.irs.gov/pub/irs-prior/f1116--2025.pdf) calls for
general-category box d, line 1b, Part I lines 1a–7, Part II line A's
foreign-currency and U.S.-dollar **other tax** columns (p) and (t), Part III
lines 9–24, and Part IV general-category line 28 and totals 32–35. The local
field tree identifies row A's other-tax entries as `f1_56[0]` and `f1_60[0]`,
and Part IV line 28 as `f2_20[0]`; the current descriptor maps only passive
interest columns (o)/(s) and line 27. Those additional field names are known,
but are not enough to produce a truthful positive PDF.

The `fec` source now carries the foreign-currency paid tax, currency code,
paid-date rate, conversion explanation and tax-source document reference for
Part II; it is not yet an authorized MeF/PDF attachment. The alternative
allocation proves its specific wage total and foreign-service portion, but not a
complete return-wide income inventory for Part I line 3e. Even a one-employer
case needs sourced Schedule A/standard deduction, other deduction/loss, Form
1040 line 14/15, regular-tax preference, Schedule 2 line 1z, and Schedule 3 line
1 facts to reconcile Parts I, III, and IV. A zero-deduction, one-wage case would
need affirmative absence evidence and the same mechanical return-component
reconciliation used by the bounded passive-interest projector; a free-standing
asserted total is insufficient. The existing passive projector still rejects
general-category items. A distinct projector now checks a one-employer general
case against that affirmative Part I-IV review, the identified FEC item, dated
foreign-currency tax, Form 1040 lines 1h/1z/9/11/14-16, regular-tax facts, and
Schedule 3 line 1. It fills box d, line 1b, Part I lines 1a-7, Part II row A's
other-tax columns (p)/(t), Part III lines 9-24, and Part IV line 28 and totals.
It rejects other income, deductions, exclusions, carryovers, mixed employers or
categories, and missing conversion facts. Focused cases now pass; the completed graph PDF and local XSD result are recorded below, while IRS acceptance remains open. The broader
general-category PDF path remains fail-closed.

## Paid-tax currency source contract

The [2025 Form 1116 instructions](https://www.irs.gov/instructions/i1116)
require both foreign-currency and U.S.-dollar amounts in Part II and use the
payment/withholding-date exchange rate for taxes claimed on a paid basis. They
also require a detailed attached explanation of how the rate was figured. The
bounded foreign-employer alternative-basis source therefore now requires a 2025
paid-tax date, `Paid` credit method, foreign tax currency/code/amount, positive
USD-per-unit rate, same conversion date, a rate explanation and a separate
tax-record reference. The source node checks the cent-rounded conversion against
its U.S.-dollar tax, requires no Form 2555 exclusion in this slice, and carries
the currency facts and wage-record reference to the general Form 1116 item. The
native Form 1116 and alternative-basis statement share a check of those same
numeric, date, tax-kind and source facts. Focused source and mismatch cases now pass.

The TY2025 v5.4 `IRS1116.xsd` explicitly permits a `BinaryAttachment` reference
at the Form 1116 document root. The bounded source path now builds a readable
PDF rate explanation from each identified foreign-employer tax item, listing its
wage ledger, tax-record reference, country, paid date, local currency amount,
USD-per-unit rate, U.S.-dollar tax and the source's detailed rate method. The
binary document is linked to the general-category native `IRS1116` root. Neither
the alternative-basis statement's allocation-computation field nor its
100-character geographical comparison is repurposed for the rate explanation.
Direct XML export without the attachment and mismatched source/attachment links
remain closed. The PDF generator and positive/negative link cases now pass. The local full-return XSD and rendered positive packet are recorded below; full-batch, business-rule, and ATS acceptance remain open.

## Positive graph checkpoint (2026-09-30)

A real graph fixture now reaches a positive Form 1116 from one identified
foreign employer: $300,000 total compensation, $140,000 alternatively sourced
to Germany, and $2,000 paid tax converted from EUR 1,600. The filed $15,750
standard deduction is entered on Part I line 3a and apportioned at the
140,000/300,000 five-decimal ratio; line 3g is $7,350 and line 7 is $132,650.
The calculator now rounds that allocated deduction to whole dollars before
producing the native document and PDF. Form 1040 lines 1h/1z, 12a, 15 and 16,
Form 1116 Parts I-IV, and Schedule 3 line 1 reconcile to a $2,000 credit.
The bundle links the alternative-basis native statement and a PDF explaining
the paid-tax currency conversion. A document-discovery phase validates the
attachment file and description before final IDs exist; the final phase
requires and links the actual IDs. Direct export without the attachment still
rejects.

The complete MeF return passes local TY2025 v5.4 `Return1040.xsd`. The six-page
return packet builds; Form 1040 page 2, Schedule 3, both Form 1116 pages, and
the last Form 8960 page were visually inspected. The retained local review PDF
is `.state/research/ty2025-form1116-alternative-compensation-full.pdf`
(SHA-256 `9b8faca15ba536db7a72331dface39015334548fa187c4be2d5f4c9c95612fa7`).
The affected focused run passed 110/110 tests. Uploaded wage and tax-record
bytes, mixed employers and deductions, other categories, wider carryovers,
IRS business rules, ATS acceptance, and the final bulk regression remain open.

## Same-employee second foreign-employer wages (implementation staged)

The [2025 line 1b instructions](https://www.irs.gov/instructions/i1116)
measure **total employee compensation from U.S. and foreign sources**, not
just the compensation item allocated on line 1a. A bounded two-record route
now permits one alternative-basis foreign-service pay item below $250,000 when
one additional foreign-employer record puts the **same employee's** combined
compensation at or above $250,000. Both records must carry that employee's SSN
and distinct wage-document references; the alternative item's reference must
match its statement. The second record must have only U.S.-service wages, no
foreign tax, no exclusion, and no alternative allocation. The existing dated
paid-tax, allocation and statement checks still apply to the first record.

Form 1116 calculation includes only the first item's foreign-service amount
on line 1a and includes both wages in worldwide gross income. Native MeF and
PDF projections independently match the combined wage inventory to the filer,
Form 1040 line 1h/1z, standard-deduction ratio, and Schedule 3 credit. The
source, complete-graph, native, PDF, and owner-tamper fixtures are authored
for the deferred bulk run. W-2 wages, non-box-1 compensation, mixed foreign
service/tax on the second employer, spouse wages, and uploaded wage-record byte
authentication remain closed.

## Same-employee three-employer compensation inventory (implementation staged)

The same line 1b route now accepts one alternatively sourced foreign-service
item plus two additional foreign-employer records for U.S.-service wages. All
three records must have the same employee SSN, positive compensation, distinct
wage-document references, and no foreign service, foreign tax, Form 2555
exclusion, or second alternative allocation on the two added records. The
employee's three wages together must reach the instruction's $250,000
threshold. The source node, native attachment, and PDF use the same inventory
check. The PDF now compares the alternative statement's *specific* pay item
total to that item's wage source while using all three wages for Form 1116
Part I line 3e and the standard-deduction ratio. This also corrects the
earlier two-employer PDF comparison, which compared one item to both wages.

An authored $200,000 alternative item and two separately identified $50,000
U.S.-service items yield $300,000 worldwide wages, $140,000 line 1a foreign
compensation, $7,350 allocated standard deduction, and a $2,000 Form 1116
credit on Schedule 3 and Form 1040. Native statement and currency attachment,
parent PDF, wrong-owner and duplicate-document fixtures are written for the
deferred batch. Issued wage and tax records remain unverified bytes; W-2
compensation, four or more employer records, spouse wages, another foreign-tax
item, and mixed income/deduction categories remain closed.

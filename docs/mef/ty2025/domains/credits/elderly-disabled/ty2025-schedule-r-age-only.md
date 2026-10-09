# TY2025 Schedule R age-only filing routes

The [2025 Schedule R](https://www.irs.gov/pub/irs-prior/f1040sr--2025.pdf)
uses box 1 for a qualifying single, head-of-household, or surviving-spouse
taxpayer age 65 or older; box 3 for two older joint filers; box 7 for one
older joint filer whose spouse did not retire on disability; and box 8 for an
older separate filer who lived apart from the spouse throughout 2025. The
respective line 10 amounts are $5,000, $7,500, $5,000, and $3,750. The
[instructions](https://www.irs.gov/pub/irs-prior/i1040sr--2025.pdf) set the
line 15 AGI thresholds at $7,500, $10,000, $10,000, and $5,000.

The age-only native and PDF routes now select those distinct boxes and use
those amounts. A positive return requires reviewed age-source references for
each older owner, a filed Form 1040 age and filing-status match, and, for
separate filers, a source reference and filed all-year-apart fact. Nontaxable
Social Security reconciles to Form 1040 lines 6a/6b; positive line 13b
benefits need source references and explicit review that they are qualifying
nontaxable pensions or veterans' pensions, rather than excluded military
disability payments. Schedule R line 22 must equal the calculated credit after its line 21
tax-liability limit and match Schedule 3 line 6d. The final Form 1040 credit
guard now permits an older joint-filing spouse and rejects a separate-filer
credit without all-year separation. Whole-dollar rounding is applied to the
line 17 half-AGI amount and line 20 credit.

The disability routes now select boxes 2, 4, 5, 6, and 9 in native XML and PDF.
Each under-65 qualifying owner needs a reviewed retirement and work-capacity
record, confirmation that the condition is expected to last at least one year
or result in death, taxable disability income source, and a signed current-year,
prior-year, or VA physician statement reference. A prior-year statement additionally requires
review of the 1983-or-earlier or signed-line-B condition. Disability income
cannot exceed the finalized Form 1040 wages or taxable pensions according to
the income source classification. Box 6 line 11 adds $5,000 for the older
spouse before capping by the $7,500 line 10 base. The PDF projects the Part II
prior-year checkbox when applicable. These source references record reviewed
facts; they do not authenticate document bytes.

The remaining evidence gate must be authoritative for every positive
Schedule R claim at graph input and native/PDF export. A separate optional
document-review helper would leave the free-text-reference route open, so it
does not close the physician, income, or benefit source gap.

The current CLI stores node inputs as JSON in `return.json`, then executes the
graph before loading attachment bytes. Its attachment loader reads only the
Form 8839 public-source manifest. `prepareReturn` passes those bytes to the
async MeF bundle, where every supplied PDF becomes a `BinaryAttachment` in the
submission packet. The synchronous `buildMefXml` and standalone `buildPdfBytes`
APIs can still run without that bundle; Form 8839 and Form 8994 explicitly
reject these direct paths for their byte-required claims. Schedule R has no
equivalent required source manifest, CLI loader, prepared-bundle reconciliation,
or direct-builder guard. Adding a hash field to its current input would not
prove the application saw the document bytes.

The product evidence standard must specify whether physician, retirement,
income, and benefit records are retained source evidence or IRS-submitted
attachments, and which reviewer assertion is sufficient for unstructured or
signed pages. If they are retained only, the current MeF `attachments` array
cannot carry them without also transmitting them. Implementing a single
required Schedule R source route needs that storage/packet distinction before
the free-text-reference path can be replaced without a bypass.

Focused Schedule R native and PDF tests pass 16/16, including TY2025 XSD cases
for the sourced single age-65 credit, joint/MFS age-only boxes, and disability
box 6. These do not authenticate the underlying age, residence, disability,
or benefit records, nor provide a graph-generated full-return XSD/filled-PDF
case for every status. All Schedule 3 priority combinations, business rules,
and ATS remain open; this evidence does not establish whole-form Schedule R
support.


## October 9: public-return matrix and separate-filer packets

A current-source audit at `cd305d338` exercises all nine Schedule R boxes through the public return graph, native descriptor, PDF descriptor and complete native builder. These are constructed source records, not IRS-provided examples or authenticated age, residence, medical or employer documents. The seven ordinary single/joint cases use $7,500/$10,000 AGI and the standard deduction; each reproduces the previously documented credit-limit block in Form 1040. Their tentative Schedule R credit is positive while available income tax is zero. The source node does not reduce its Schedule 3 deposit to that limit, and finalization rejects it. Downstream errors from incomplete finalized pending data are not separate proof of invalid source records. No completed return or PDF is counted for those seven cases.

Two retained MFS fixtures model all-year Florida residents living apart throughout 2025, with a spouse who itemizes, no taxpayer itemized expenses and no community-income allocation. The age-based fixture has $7,500 bank interest; the under-65 disability fixture has $7,500 taxable disability wages, $1,000 withholding and a current-year physician-statement review. The latter has no prior-year-statement checkbox. Both fixtures retain explicit source references, not authenticated underlying bytes.

The [2025 Form 1040 instructions](https://www.irs.gov/instructions/i1040gi) disallow the MFS standard deduction when the spouse itemizes and disallow the enhanced senior deduction for MFS. Thus each fixture has $7,500 taxable income. The [2025 Tax Table, page 3](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf) gives $753 tax for the MFS $7,500–7,550 row. The [2025 Schedule R](https://www.irs.gov/pub/irs-prior/f1040sr--2025.pdf) gives a $3,750 base and $5,000 AGI threshold for boxes 8/9: subtracting half of $2,500 leaves $2,500, whose 15% credit is $375. These expectations are independent rule arithmetic, not engine outputs used as ground truth.

| Full-return source | Schedule R box / line 11 | Schedule R line 22 / Schedule 3 line 6d | Form 1040 total tax | Settlement | PDF pages |
|---|---|---:|---:|---|---:|
| Age 65+, bank interest, spouse itemizes | 8 / skipped | 375 | 378 | 378 owed | 6 |
| Under 65, reviewed disability wages, spouse itemizes | 9 / 7,500 | 375 | 378 | 622 refund | 5 |

Both actual complete XML returns pass local TY2025 `2025v5.4` XSD. All 11 actual PDF pages were rendered and inspected, including Form 1040's MFS/spouse-itemizes/age marks, Schedule B's interest and foreign-account/trust answers, Schedule 3, both Schedule R pages, skipped line 11 for box 8, disability line 11 and Part II for box 9, final tax and settlement. No PDF widgets or AcroForm fields remain. The Schedule R amounts and form selection reconcile, but whole-packet presentation is qualified: both Form 1040 pages 1 print Riley Example in the joint-only spouse-name row as well as the MFS field. The 2025 name/address instructions require the MFS field instead of the joint row. This observation extends deferred identity item 68; no runtime repair was made.

The final typed four-file regression passes **48/0, zero ignored**, including the two new public-return/negative-source tests and 46 existing calculation/native/PDF checks. Missing residence or physician evidence rejects both complete native and PDF-descriptor preparation. Two initial type-check failures in the new test's PDF context were corrected by parsing the existing Schedule R schema; type checking was not bypassed.

The private nine-box exploration retains its authoring diagnostics: an initially dashed interest recipient TIN, an incorrect interest field name and omitted Schedule B/1-A review facts. The final matrix corrects those inputs; these diagnostics are not production defect claims. The initial positive audit packets used inherited Texas addresses. The retained production fixtures explicitly use Florida to avoid an unreviewed community-property assumption; their final packet run and regression are separate from the initial packets, with the same calculated taxes. Only the final two packets/11 pages are counted here.

Evidence is retained in `.state/research/schedule-r-full-return-audit-2026-10-09/`: all nine source/pending/outcome records, exploration and final packet scripts, native XML, PDF, rendered page hashes, terminal test logs and checkpoint. Earlier synthetic dependent/interest evidence remains historical and does not establish dependency eligibility. Physician/benefit/source authenticity, other filing statuses, tax-limit ordering, business rules and IRS acceptance remain open; this batch closes no broad board task.

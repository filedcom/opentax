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

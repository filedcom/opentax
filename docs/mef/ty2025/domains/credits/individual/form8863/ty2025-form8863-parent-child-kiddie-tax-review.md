# TY2025 paired education claim and dependent scholarship kiddie tax

## Existing gap and source definition

The previous paired parent/dependent proof filed children with zero taxable
income voluntarily for withheld-tax refunds. Existing Form 8615 already computed
ordinary and qualified-dividend family tax, but its public source contract took
parent tax and eligibility as supplied facts. This checkpoint joins an actual
positive-tax child return to the settled public parent return used for its tax.

[2025 Form 8615 instructions, pages 1–3](https://www.irs.gov/pub/irs-prior/i8615--2025.pdf)
include taxable scholarships outside W-2 reporting in unearned income. They
require a filing obligation, an applicable age/student/earned-support condition,
a living parent, and a nonjoint child return. Scholarships are excluded from
full-time student support. Actual personal-service compensation is earned for
the age/support test. A divorced, unremarried custodial parent's return supplies
the tax facts. Other parent-selection and sibling-allocation situations retain
their existing boundaries; this new source review proves the stated case.

[2025 Form 1040 instructions, dependent standard deduction and filing chart B](https://www.irs.gov/instructions/i1040gi)
count taxable scholarships as earned for those rules. The old automatic
Form 8615 check subtracted this deduction-earned amount, inadvertently removing
all retained taxable scholarships from the child's unearned income. Reviewed
packets now derive these different amounts separately. No earned-income scalar
is supplied on the public child input.

[2025 Form 8615, line 10](https://www.irs.gov/pub/irs-prior/f8615--2025.pdf)
uses the parent's income tax before education/dependent credits, with specified
special-tax exclusions. The reviewed parent's ordinary wage return has none of
those special taxes. Its line 16 is $7,955; its final tax of $5,955 is not the
Form 8615 parent tax source.

## Actual public packets

The child remains Taylor Example, born June 15, 2005, full-time for five retained
months, actually claimed by Alex Example. The owned school/source/payment and
parent dependency records are the same records retained in both public returns.
The parent pays $4,500 tuition. Issued Form 1098-T Box 1 is $4,500 and Box 5 is
$20,500: $500 tax-free aid, $8,000 performed teaching compensation, and $12,000
nonservice room/board scholarship. Separate award receipts, 225 performed
teaching hours, terms, taxable allocation and $12,000 actual nonqualified costs
reconcile the school ledger. The $500 free aid reduces credit expenses to
$4,000. Taxable awards go to the child and do not reduce that allocation.

| Packet | Child W-2 wages | Child Schedule 1 line 8r | Form 8615 line 1 | Support / earned |
| --- | ---: | ---: | ---: | ---: |
| `w2` | 10,000 | 12,000 | 12,000 | 32,500 / 10,000 |
| `line8r` | 2,000 | 20,000 | 20,000 | 32,500 / 10,000 |
| `line8r-half` | 2,000 | 20,000 | 20,000 | 20,000 / 10,000 |

The performed teaching compensation counts once for earned support in both
reporting cases. Outside W-2 scholarship reporting remains unearned for
Form 8615 line 1. Nonservice scholarship counts for the dependent deduction
and filing threshold, but not for earned support. Its actual room/board costs
are excluded from the full-time student's support denominator, with exact
source ID/amount joins. The exact-half public packet still requires Form 8615;
a $19,999 support calculation control does not meet that earned-support test.

All three children have $22,000 gross income/AGI, the $15,750 dependent standard
deduction, and $6,250 taxable income. Gross income exceeds the applicable filing
threshold. Family tax on $65,500 is $9,330; subtracting the parent's $7,955 yields
$1,375. Child regular tax is $628, so Form 8615 line 18 and child Form 1040
lines 16/24 are $1,375. Withholding of $300/$100 produces child balances due
of $1,075/$1,275. The child claims no education credit.

The actual public parent return stays at wages/AGI $75,000, deduction $15,750,
taxable income $59,250 and pre-credit income tax $7,955. Its refundable AOC is
$1,000; Schedule 3 education credit is $1,500; the other-dependent credit is
$500 after education-credit ordering; final tax is $5,955. Child income does
not enter parent AGI/MAGI.

## Joins and rejection boundaries

The source review retains divorce, year-end marital/life, residence-calendar and
complete family-child inventory records. The selected parent has 300 custody
nights and the other parent 65, with no remarriage and no other Form 8615 child.
A finite projection retains the actual finalized parent general, issued W-2,
1040, deduction, tax calculation, Schedule 3 and Schedule 8812 rows. The child's
parent facts are derived from those rows, independently checked against owned
wages, deduction and the IRS ordinary tax table, and compared to the actual
settled parent return and identity during parent native/PDF export. This avoids
a recursive snapshot while binding both complete public returns.

Native, PDF and complete preparation reject missing required Form 8615,
changed child/form/parent tax, after-credit parent tax, wrong parent/source
identity or wages, changed age/support/custody/remarriage/alive/sibling facts,
changed scholarship support amounts, and duplicate child education credit.
Standalone Form 1040/Form 8615 descriptor arguments are checked against the
retained source-derived tax even when supplied beside an unchanged pending
graph. The shared paired fixture also corrects the inherited child PDF display
name to Taylor Example.

The public calculation rejects missing positive-tax source review and manual
parent facts conflicting with the derived reviewed source. Existing generic
Form 8615 calculation/preferential branches remain present.

## Evidence and limits

Evidence is at `/tmp/opentax-f8863-parent-child-kiddie-tax-evidence`: each of
`w2`, `line8r` and `line8r-half` has parent/child source JSON, full Return1040 XML
and a filled PDF. Each complete XML validates against cached 2025v5.4
`Return1040.xsd`. Parent PDFs have seven pages and child PDFs five, for 36 pages.
The reopened PDFs have zero fields and zero Widget annotations. Rendered pages,
contact sheets, a structure report and an 18-file SHA-256 manifest are retained.

This is synthetic source-backed filing proof, not independent authentication of
issuers, custody, payments, school eligibility or awards. It proves one claimed
full-time dependent and one divorced/unremarried custodial parent with an
ordinary wage/standard-deduction return and no sibling allocation. Preferential
parent income, remarried/joint/higher-income-parent selection, siblings,
itemized deductions, Form 2555/Schedule D/Schedule J special taxes, and broader
source authenticity are not completed by this checkpoint. Earlier low-income
paired packets remain valid. This proof does not claim overall Form 8615 or
education completion.

Final verification on this isolated tree:

- `/tmp/opentax-kiddie-focused-final-v3.log`: **6 passed, 0 failed**,
  including three paired public positives, native/PDF/complete source conflicts,
  exact-half support calculation and public manual-source conflicts. This run
  wrote the final six packets after the child-name and standalone-slice fixes.
- `/tmp/opentax-kiddie-regression-final-v2.log`: **454 passed, 0 failed**,
  after those fixes and the final source-helper type cleanup. The 24 selected
  files cover dependent deductions, General, Schedule C/SE, existing education
  input/native/PDF and public branches, return arithmetic/start tests, and
  existing Form 8615 calculation/native/PDF/public ordinary and preferential
  tests. This is focused integration proof, not the repository's full suite.
- `/tmp/opentax-kiddie-artifact-check.log`: all 18 final source/XML/PDF hashes
  match. `all-page-review.txt` records the final 36-page visual inspection.
- `deno lint forms/f1040/nodes/inputs/taxes/investments/f8615/dependent-source-review.ts` passes;
  `git diff --check` passes.

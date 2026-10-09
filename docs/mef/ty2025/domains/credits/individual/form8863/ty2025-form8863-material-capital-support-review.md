# TY2025 Form 8863 material-capital claimant support review

## Rule and evidence

The
[2025 Form 8863 instructions, page 7](https://www.irs.gov/pub/irs-prior/i8863--2025.pdf)
limit earned income from a business in which capital and personal services both
materially produce income to a reasonable service-compensation allowance, capped
at 30% of the claimant's net profit after subtracting the deductible half of
self-employment tax.
[Publication 970, pages 20–21](https://www.irs.gov/pub/irs-prior/p970--2025.pdf)
provides the same definition. For a full-time student, scholarships are excluded
from support; nonservice scholarship income does not become earned income in
this test. The restriction uses the return claimant's earned income and support.

The existing claimant-owned personal-service source route remains available. The
new `personal_services_and_material_capital` branch requires its own capital and
service review, in addition to the complete owned Schedule C receipt/cost
inventory and matching retained public Schedule C copy:

- Deployed capital assets have distinct agreement and deployment references,
  claimant/business identity, an actual equipment/property rent or depreciation
  cost reference with its matching Schedule C field, and actual receipt joins.
- Performed services have distinct source records, claimant/business identity,
  actual receipt joins, whole performed hours and a matching, separately
  retained comparable-pay benchmark. Benchmark rates retain cents. All receipt
  sources must be reviewed for both capital use and personal services; every
  benchmark must be used. A separate reasonableness-review reference is
  required.
- Hours multiplied by the reviewed benchmark rate derive the reasonable service
  allowance. No supplied earned-income or reasonable-allowance scalar replaces
  this calculation. The permitted business earned amount is the smaller of that
  allowance and 30% of actual profit minus the filed half-SE deduction.

The new material-capital branch is scoped to one sole-proprietor business, so
the actual Schedule SE deduction is attributable to that business without
assuming a split among multiple businesses. Existing personal-service business
inventory behavior is preserved. Advanced business sources remain separate
boundaries.

## Fractional support evidence versus filed dollars

The
[2025 Form 1040 instructions, page 23](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
permit whole-dollar return/schedule amounts, require consistent rounding and
require summing cents before rounding an entered total. The
[2025 Schedule SE](https://www.irs.gov/pub/irs-prior/f1040sse--2025.pdf) places
half of line 12 on line 13 and Schedule 1 line 15. These packets use the actual
entered whole-dollar SE deduction when applying Form 8863's definition.

The support evidence is not a dollar line entered on the filed form. Its cents
are retained in public inputs. The 30% result is not rounded to whole dollars
before the comparison. Support records are validated as exact cents, summed in
integer cents, and compared to twice the earned amount in cents. Fractional-cent
support is rejected. This proves cents in this support comparison, not general
cents support throughout the tax engine or all business source fields.

## Actual public returns

The claimant operates a portrait-photography sole proprietorship using leased
camera, lighting and printing equipment. Paid advertising is $1,000, equipment
rent $12,000 and supplies $2,000. Client receipts, paid costs, equipment
lease/use records and performed-service records are separately referenced and
joined. The cap-binding review has 800 performed hours and a $25 comparable
hourly rate, producing a $20,000 reasonable allowance. The allowance-binding
review has 400 hours and a $15 benchmark, producing $6,000.

All cases retain issued Form 1098-T, tuition/payment and aid records: $4,500
qualified payments less $500 tax-free aid yield $4,000 AOC expenses. A separate
$8,000 nonservice scholarship for room/board is taxable Schedule 1 line 8r
income. The full-time student's $8,500 scholarship support is excluded from the
ordinary support denominator and none is added to earned support income.

| Case                             | Receipts / net profit | Filed SE tax / half deduction | Net after deduction | Permitted earned income | Ordinary support | Refundable / nonrefundable AOC |
| -------------------------------- | --------------------: | ----------------------------: | ------------------: | ----------------------: | ---------------: | -----------------------------: |
| Cap exact half                   |       45,011 / 30,011 |                 4,241 / 2,121 |              27,890 |                8,367.00 |        16,734.00 |                  1,000 / 1,500 |
| Cap below half                   |       45,011 / 30,011 |                 4,241 / 2,121 |              27,890 |                8,367.00 |        16,734.02 |                      0 / 1,697 |
| Fractional cap exact half        |       45,000 / 30,000 |                 4,238 / 2,119 |              27,881 |                8,364.30 |        16,728.60 |                  1,000 / 1,500 |
| Fractional cap below half        |       45,000 / 30,000 |                 4,238 / 2,119 |              27,881 |                8,364.30 |        16,728.62 |                      0 / 1,697 |
| Allowance exact half             |       45,000 / 30,000 |                 4,238 / 2,119 |              27,881 |                6,000.00 |        12,000.00 |                  1,000 / 1,500 |
| Allowance below half             |       45,000 / 30,000 |                 4,238 / 2,119 |              27,881 |                6,000.00 |        12,000.02 |                      0 / 1,697 |
| Fractional cap, qualifying child |       45,000 / 30,000 |                 4,238 / 2,119 |              27,881 |                8,364.30 |        16,728.60 |                  1,000 / 1,500 |

Every packet uses the actual public graph: Schedule C profit → Schedule SE →
Schedule 1 adjustment/income → AGI/MAGI → QBI → ordinary tax → education
credits. Actual AGI/MAGI is $35,890 for the integer cap pair and $35,881
otherwise. QBI deductions are $4,028 and $4,026 respectively; taxable income
$16,112 or $16,105 produces $1,697 single-filer ordinary tax. The source-tested
QBI amount uses full business net income after the SE deduction, consistent with
the [Form 8995 instructions](https://www.irs.gov/pub/irs-prior/i8995--2025.pdf),
rather than Form 8863's smaller reasonable-compensation allowance.

In the child packet, Schedule 8812 also uses the full $27,881 net business
earned income. Its credit-limit worksheet subtracts $1,500 education credit from
$1,697 ordinary tax: CTC is $197 and ACTC $1,700. Final total tax is $4,238 SE
tax. Thus the Form 8863 support limitation is not reused as a reduction of
income, QBI, dependent standard-deduction income or ACTC earned income.

## Verification and artifacts

The integration run passed 377 tests with zero failures (1m46s), including all
eight new tests: seven actual public positive packets and one set of
conflicting-source/native/PDF/export cases. It also includes the prior
personal-service, W-2/business, claimant ownership, mixed-school, education
source/native/PDF, general and Schedule C/SE calculation tests, return
arithmetic and public graph tests. Log:
`/tmp/opentax-material-capital-regression.log`. Each complete
`IRSReturn1040.xsd` validation uses the cached TY2025 2025v5.4 schema and local
`xmllint`; it is not IRS acceptance. Every filled PDF is reopened, has zero
remaining form fields, and has the expected 14 pages (16 for the child case).
All seven PDFs were also checked with pypdf for zero fields and zero widget
annotations. All 100 pages were rendered with Poppler and visually inspected in
five contact sheets; fractional refund/no-refund, Schedule SE and Schedule 8812
rows were inspected at larger size. The artifact snapshot includes page PNGs,
extracted text, contact sheets and `sha256.json`.

Artifacts are retained under `/tmp/opentax-f8863-material-capital-evidence/`:
`{cap-half,cap-below,fractional-half,fractional-below,allowance-half,allowance-below,fractional-child-credit}-{source-input.json,full-return.xml,filled-return.pdf}`.
The `--write-review-artifacts` flag reproduces them from the public test
fixture.

The negative cases reject wrong claimant/receipt/cost ownership, detached cost
or business joins, duplicate references, wrong capital/service owners, capital
cost references pointing at unrelated advertising, detached deployed-asset
receipts, duplicate assets or service/pay sources, unused/mismatched benchmarks,
missing capital review, altered retained C profit/expense/proprietor, missing
actual C source, altered SE/Schedule 1/2/AGI/QBI amounts, altered scholarship
income, and stale finalized tax/credit amounts. Valid changes to performed
hours, benchmark pay or support cents must recompute refund eligibility and
reject a stale filed packet. Fractional-cent support is also rejected.

## Limits

The new positives prove one claimant-owned ordinary Schedule C business with
material leased equipment and independently retained service/pay review. They
also prove both a binding 30% ceiling and a lower binding reasonable allowance,
including fractional-cap support boundaries. They do not prove multiple-business
SE-deduction allocation, farm/K-1 sources, COGS, home office, at-risk
limitations, other advanced business losses, or a new W-2/material-capital
mixture packet. Existing W-2/personal-service positives remain tested and
available.

Records and compensation benchmarks are retained synthetic evidence. Identity,
reference, amount and calculation joins enforce internal consistency; they do
not authenticate outside receipts, ownership, hours, comparable wages or the
material-capital factual judgment. Broader dependency, release, double-claim and
source-authentication parent work remains open. No child's income is added to a
parent return and no education completion claim is made beyond these packets.

## October 9 wage and material-capital complete-return checkpoint

Six additional public returns cover the previously unverified W-2/material-capital
mixture. The taxpayer has10000 wages (49119 in the phaseout case),30000 Schedule C
profit, and8000 nonservice taxable scholarship income. Issued wage records,
photography receipts, equipment rent, supplies, service hours and comparable pay
remain separately identified. Ordinary SE tax is4238 and its filed deduction2119.
The business support-income ceiling is8364.30; a lower reviewed service allowance
limits it to6000 in two cases. Wages are added after that limit. Full net business
income continues to determine AGI, QBI and ACTC earned income.

The [2025 Form8863 instructions, page7](https://www.irs.gov/pub/irs-prior/i8863--2025.pdf)
use a strict less-than-half support restriction, exclude full-time-student
scholarships from support, and limit material-capital business compensation to
the reasonable allowance or30% of net profit after deductible SE tax. Each
below-half case adds two cents to ordinary support; no whole-dollar rounding
changes that comparison. The [2025 tax tables](https://www.irs.gov/publications/p1040)
independently supply single-filer tax2711 for taxable24555 and8923 for63674.
Expected tax amounts are fixed from those rows, not copied from a preview run.

| Case | Ordinary support | AGI | Refundable AOC | Nonrefundable AOC | CTC / ACTC | Total tax | Refund |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Cap, exact half | 36728.60 | 45881 | 1000 | 1500 | 0 / 0 | 5449 | 551 |
| Cap, below half | 36728.62 | 45881 | 0 | 2500 | 0 / 0 | 4449 | 551 |
| Allowance, exact half | 32000.00 | 45881 | 1000 | 1500 | 0 / 0 | 5449 | 551 |
| Allowance, below half | 32000.02 | 45881 | 0 | 2500 | 0 / 0 | 4449 | 551 |
| MAGI phaseout, exact half | 114966.60 | 85000 | 500 | 750 | 0 / 0 | 12411 | 8089 |
| Qualifying child, exact half | 36728.60 | 45881 | 1000 | 1500 | 1211 / 989 | 4238 | 2751 |

Withholding is5000, or20000 in the phaseout case. QBI deduction is5576 throughout.
Education credit precedes CTC, leaving1211 ordinary tax for CTC; the remaining989
is ACTC. The equal refunds in the restricted/unrestricted pairs are expected:
there is enough ordinary tax to use the full nonrefundable2500 when the1000
refundable component is unavailable. The phaseout halves the2500 credit at
MAGI85000.

The focused typed run passes6/0 and rejects48 inconsistent pending graphs at
each complete native and PDF boundary: changed or missing wage review, wrong
support owner, missing W-2/C, changed SE wages or deduction, and stale refundable
AOC. The initial5/1 run rejected a fixture W-2 box4 value containing fractional
cents; the issued withholding values were corrected to cents before the final
run. No runtime or tax expectation was changed.

Private source/pending/expected/origin records, complete XML/PDFs, rendered pages
and logs are in `.state/research/form8863-wage-capital-2026-10-09/`. Structural,
rendered-review and grouped-regression results are recorded in the final
verification report. These synthetic source records prove internal joins, not
external authenticity or IRS acceptance. Multiple-business half-SE allocation,
farm/K-1 sources and the other existing education limits remain open.

Final verification: all six XML returns pass the retained TY2025v5.4 XSD; all86
pages were reviewed through27 unique page hashes. Grouped education regression
passes102/0. Student, school, W-2 and SE ownership and the under-24 native flag
reconcile. Child Schedule8812 pages8–9 precede C/SE despite attachment sequence,
and line10 prints blank instead of zero; existing deferred86/76 remain qualified.
The earlier verifier used the wrong child-credit XML field name; the corrected
check asserts `CTCODCAmt=1211`. No runtime changed and no IRS acceptance is claimed.

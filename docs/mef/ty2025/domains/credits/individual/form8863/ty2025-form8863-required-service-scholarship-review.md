# TY2025 Form 8863 required-service scholarship source review


## October 9 service-grant and business combination checkpoint

Six public-input returns combine a claimant-owned material-capital business,
ordinary W-2 wages and an 8,000 award for performed teaching required by its
terms. Two routes report the award in a separate W-2; four report it on Schedule
1 line 8r. The grant retains two disbursements, matched performance/hours and
terms, payer/recipient identity, reporting review and the school's box5 ledger.
These are synthetic source records, not authenticated external issuance.

The [2025 Form 8863 instructions](https://www.irs.gov/instructions/i8863)
include required performed-service awards in earned income and separately limit
material-capital business earnings to reasonable compensation capped at 30% of
profit after half-SE-tax deduction. The cases distinguish these definitions:
30,000 business profit less 2,119 half-SE deduction gives 27,881; the business
support contribution is 8,364.30 at the cap, or 6,000 under the documented lower
allowance. The separate 8,000 teaching award is included once in earned income.
It is not reduced by the business capital limit or added to Schedule C receipts.

| Case | Earned income for support | Ordinary support | AGI | Refundable / nonrefundable AOC | CTC / ACTC | Total tax | Refund |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Schedule1 award, cap, exact half | 26,364.30 | 52,728.60 | 45,881 | 1,000 / 1,500 | 0 / 0 | 5,449 | 551 |
| Schedule1 award, cap, below half | 26,364.30 | 52,728.62 | 45,881 | 0 / 2,500 | 0 / 0 | 4,449 | 551 |
| W-2 award, allowance, exact half | 24,000 | 48,000 | 45,881 | 1,000 / 1,500 | 0 / 0 | 5,449 | 551 |
| W-2 award, allowance, below half | 24,000 | 48,000.02 | 45,881 | 0 / 2,500 | 0 / 0 | 4,449 | 551 |
| Schedule1 award, MAGI phaseout | 65,483.30 | 130,966.60 | 85,000 | 500 / 750 | 0 / 0 | 12,411 | 8,089 |
| Schedule1 award, qualifying child | 26,364.30 | 52,728.60 | 45,881 | 1,000 / 1,500 | 1,211 / 989 | 4,238 | 2,751 |

Ordinary wages are 10,000, or 49,119 in the phaseout case. Withholding is 5,000,
or 20,000 for phaseout; the additional award W-2 has zero withholding. Native
and public checks distinguish wages18,000/business income30,000 from
wages10,000/business-plus-award38,000 without changing total income48,000.
The existing school tuition4,500 less tax-free aid500 yields4,000 qualified
expenses; taxable service compensation8,000 remains in the school assistance
inventory and income, without reducing qualified tuition. The child case keeps
the full business earnings for ACTC distinct from the AOTC material-capital cap;
ACTC earned income37,881 excludes the Schedule1 award under the
[Schedule8812 Earned Income Worksheet](https://www.irs.gov/instructions/i1040s8).
An initial fixture incorrectly supplied45,881; native/PDF accepted it. Deferred103
retains that original discrepancy. The corrected fixture yields line205,307
instead of6,507, with unchanged ACTC989 and final tax/refund.

Independent single-filer tax-table expectations are2,711 at taxable24,555 and
8,923 at taxable63,674; QBI deduction5,576 and SE tax4,238 apply throughout.
The [2025 Form 1040 tax table](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
was retained in the earlier wage/material-capital checkpoint. No calculation or
export guard was changed for this regression evidence.

Focused initial run: six passes; corrected child fixture: one final typed pass
(five unchanged cases filtered). Existing service-scholarship and wage/business
regression:14 passes, zero failures. Each case rejects12 changed native and12 fresh-PDF
exports: absent service inventory, wrong grant owner, altered payment amount,
changed/absent wage review, wrong support beneficiary, missing actual education
income or payroll, absent business, changed SE wage input, half-tax deduction
or refundable AOC. Totals are72 native and72 PDF rejections. Source, expected,
pending, complete XML/PDF and review evidence is retained privately under
`.state/research/form8863-service-business-2026-10-09/`.

Final evidence: six complete returns validate against TY2025 2025v5.4
Return1040.xsd (SHA256
`e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`).
All86 pages have retained rendered review: two new distinct pages visually
observed,28 distinct hashes matching previously reviewed packets. The corrected
child page9 exactly matches the prior wage/business child page. Fields/widgets
are absent from the flattened packets. The child packet repeats deferred76's
blank Schedule8812 line10 zero and deferred86's order before ScheduleC/SE.
Deferred103's original incorrect packet is separate and excluded from these
six corrected returns. Broader source authentication, business rules and IRS
acceptance remain open. Earlier benchmark/full-suite counts are not rerun here.

## Existing gap and official rule

The prior claimant source route counted issued W-2 wages, but did not retain
explicit scholarship service conditions. The not-on-W-2 education income model
only supported taxable nonqualified-expense allocations, which remained excluded
from Form 8863 earned support income. Issued Form 1098-T box 5 also required a
full tax-free expense reduction, preventing a truthful school-administered
taxable service award from retaining eligible paid tuition.

The
[2025 Form 8863 instructions, page 7](https://www.irs.gov/pub/irs-prior/i8863--2025.pdf)
include scholarship compensation for actually performed teaching, research or
other services required as a condition of the grant in earned income. Nonservice
scholarships are excluded from earned income; a full-time student's scholarship
support is excluded from the support comparison. The restriction belongs to the
return claimant.

[Publication 970, pages 5–7](https://www.irs.gov/pub/irs-prior/p970--2025.pdf)
generally makes required-service grant payments taxable, including when all
degree candidates must perform the services. It identifies specific exempt
programs separately. Amounts reported in W-2 box 1 go to Form 1040 line 1a;
taxable amounts outside box 1 go to Schedule 1 line 8r. This review proves
ordinary, nonexempt 2025 performed-service compensation, not those special
programs or future-service cases.

The
[2025 Form 1098-T instructions, page 4](https://www.irs.gov/pub/irs-prior/i1098et--2025.pdf)
include institution-administered/processed scholarships and grants for costs of
attendance in box 5. The new university-administered service award is retained
in the actual issued copy and school assistance ledger. Its taxable treatment is
established independently, rather than changing the issuer or removing it from
the source statement to make a credit possible.

## Source and calculation contract

The new `scholarship_for_required_services` education-income source retains:

- Claimant/student SSN, payer EIN/name, grant reference and award terms.
- Actual paid disbursements with date, amount, recipient, payer and grant joins.
- Actual performed-service records, dates and hours, the required award
  condition, matching terms reference, and the disbursement references for that
  service.
- A source-backed review that this award is outside the NHSC, armed-forces
  health professions and comprehensive work-college tax exclusions.
- Either a specific issued W-2 copy and payroll allocation reference, or a
  reviewed zero box 1 reporting amount and Schedule 1 reporting reference.

Every payment is assigned once to performed required services. Recipient/payer
and grant identities match; dates are within 2025 and performance periods are
valid. Actual payments must equal taxable compensation. Payment/performance
records cannot be reused across grants. No manually supplied earned-income
scalar replaces the disbursement total.

The claimant retains a matching copy of every required-service income record.
For issued W-2 compensation, the complete wage inventory already counts the
amount once. Outside W-2, the verified disbursement total is added to the
claimant's earned support income and independently emitted to Schedule 1 and the
AGI aggregator. Native/PDF preflight reconciles actual retained income sources,
issued wages, Schedule 1, final income/AGI, education MAGI and credit limits.
Multiple payroll allocations cannot exceed the same issued box 1 amount.

For the school-administered award, issued box 5 is $8,500: separately
inventoried $500 tax-free aid and $8,000 taxable required-service compensation.
Every aid record explicitly joins box 5. Only $500 reduces expenses. Native/PDF
filing requires the actual issued 1098-T copy and joins the taxable aid's
student, school/payer EIN/name, terms, amount and income reference to the actual
verified required-service compensation source. Existing nonservice and
missing-form aid routes remain available; this is not blanket support for
arbitrary taxable box 5 allocations.

## Actual public packets

All seven packets execute actual public inputs before complete native XML and
filled PDF export. The claimant is 20, single, a full-time student for five
months, with a living parent and an actual reviewed nonclaim. Tuition/payment
sources are $4,500; school aid is $500 tax-free, leaving $4,000 AOC expenses.
Service grants have independently retained $3,500 and $4,500 paid disbursements
and two actual teaching periods totaling 225 hours. A separate $8,000 nonservice
merit grant is paid directly by an external foundation for separately sourced
room/board, outside the university's administered box 5 ledger.

| Packet                               | W-2 wages | Schedule 1 line 8r | Earned support income | Ordinary support | AGI/MAGI | AOC refundable / nonrefundable |
| ------------------------------------ | --------: | -----------------: | --------------------: | ---------------: | -------: | -----------------------------: |
| Issued service W-2 exact half        |    26,000 |              8,000 |                26,000 |        52,000.00 |   34,000 |                  1,000 / 1,500 |
| Issued service W-2 below half        |    26,000 |              8,000 |                26,000 |        52,000.02 |   34,000 |                      0 / 1,955 |
| Service outside W-2 exact half       |    18,000 |             16,000 |                26,000 |        52,000.00 |   34,000 |                  1,000 / 1,500 |
| Service outside W-2 below half       |    18,000 |             16,000 |                26,000 |        52,000.02 |   34,000 |                      0 / 1,955 |
| Same-AGI nonservice control          |    18,000 |             16,000 |                18,000 |        52,000.00 |   34,000 |                      0 / 1,955 |
| Issued service W-2, qualifying child |    26,000 |              8,000 |                26,000 |        52,000.00 |   34,000 |                  1,000 / 1,500 |
| Outside W-2, MAGI phaseout           |    71,000 |             16,000 |                79,000 |       158,000.00 |   87,000 |                      300 / 450 |

Nonservice support of $8,500 ($16,500 in the two-nonservice-grant control) is
excluded from the full-time comparison. Actual ordinary food/lodging/education
support is independently inventoried; income receipts are not automatically
added to that denominator. Cents remain in the support evidence. Exactly half
permits the refund; an additional two cents changes the actual filed line 7
checkbox and refundable line 8.

Single-filer ordinary tax is $1,955 at taxable income $18,250 and $10,595 at
$71,250, independently asserted from the
[2025 Form 1040 tax tables, pages 70
and 76](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf). The child packet's
Schedule 8812 worksheet subtracts education credit $1,500 before CTC $455; ACTC
is $1,700 and final ordinary tax is zero. This child proof uses issued W-2
earned income; it does not assert that unreported scholarship compensation is
ACTC or EIC earned income.

The phaseout comparison removes the actual $8,000 service grant and its school
ledger entry: public AGI is then $79,000, ordinary tax $8,835 and total AOC
$2,500. Adding verified service compensation raises actual MAGI to $87,000 and
reduces total AOC to $750. It also brings earned support income to exactly half,
allowing $300 refundable credit. Both effects are tested.

## Verification and artifact snapshot

The new test file has seven full public positive packets and one collection of
source/native/PDF/complete-export conflicts. Complete XML validates locally
against cached TY2025 2025v5.4 `IRSReturn1040.xsd`; this is not IRS acceptance.
Filled PDFs are reopened and require zero fields and the expected seven pages
(nine for the child packet).

Final verification: **385 passed, 0 failed** in the combined education,
claimant/business, native XSD, PDF and return-arithmetic regression, retained at
`/tmp/opentax-service-scholarship-regression-final.log`. The focused new route
passed **8 tests, 0 failures** at
`/tmp/opentax-service-scholarship-focused-final.log`. All seven complete-return
XML packets validate against the cached complete schema. All **51 filled PDF
pages** were rendered and visually reviewed; reopened files have zero AcroForm
fields and zero widgets. Enlarged review checked Schedule 1 line 8r $16,000,
Form 8863 MAGI $87,000 / refundable $300 / nonrefundable $450, and Schedule 8812
CTC $455. The previous self-employed and material-capital artifact manifests
remain unchanged after this regression.

Artifacts are retained at `/tmp/opentax-f8863-service-scholarship-evidence/`:
`{w2-half,w2-below,line8r-half,line8r-below,nonservice-control,w2-child-credit,line8r-phaseout}-{source-input.json,full-return.xml,filled-return.pdf}`.
Run the test with `--write-review-artifacts` to reproduce them. `sha256.json`
records the 21 retained source JSON, complete XML and filled PDF files; the
rendered pages, contact sheets and extracted text are alongside them.

Negatives cover detached claimant/grant copies, wrong payer or recipient,
changed/duplicate disbursements, unrelated grant or award terms, absent service
conditions, incomplete/detached/duplicate performance-to-payment links, invalid
performance dates/hours, exempt-program claims on the ordinary taxable route,
missing actual income or W-2 copies, mismatched W-2 wages/owners/reporting,
duplicate records across grants, payroll over-allocation, altered Schedule 1,
AGI and finalized tax/credits, changed support with stale refund answers,
unjoined taxable box 5 aid, false tax-free treatment, incomplete box 5 ledgers,
missing actual issued 1098-T and changed child-credit ordering.

## Limits and next existing boundaries

This proves own-student ordinary required-service awards with actual 2025
performance, paid whole-dollar disbursements, both reporting routes, one issued
U.S. institution and complete box 5/source/income reconciliation. The existing
W-2, business and material-capital claimant routes remain tested.

Outside authentication of payer forms, grant terms, performance/hours and
payments remains open. These are retained synthetic source records; consistency
checks do not prove actual issuance or performance outside the return. Parent
claiming a dependent student's service-grant tuition while retaining the child's
separate income return is not newly proven. Special exempt programs, future
service compensation, multiple-school grant allocations, wider business/service-grant
mixtures beyond the October9 checkpoint, compensation cents across all joins, and other credits' earned-income
definitions have no new positive packet proof here. No broader education or
claimant ownership completion claim is made.

# TY2025 Form 8863 self-employed claimant support review

## Official calculation and source boundary

The
[2025 Form 8863 instructions, page 7](https://www.irs.gov/pub/irs-prior/i8863--2025.pdf)
define the claimant's business earned income as net profits after the deductible
half of self-employment tax. The 30% reasonable compensation ceiling applies
when both capital and personal services materially produce income; it does not
apply to a personal-service business without material income-producing capital.
The claimant's age and support determine the refund restriction. Nonservice
scholarships are excluded from a full-time student's support.
[Publication 970, pages 20–21](https://www.irs.gov/pub/irs-prior/p970--2025.pdf)
provides the same earned-income and scholarship distinction.

The source contract now accepts a claimant-owned personal-service Schedule C
snapshot, distinct owner/business receipt and cost records, and references for
ownership, personal services and the capital review. Every ordinary income and
expense field reconciles to the inventory. The existing Schedule C calculation
computes profit; no manually supplied business earned-income amount is accepted.
The retained public Schedule C copy must match the snapshot. W-2/business
mixtures additionally reconcile issued Social Security wages and tips.

[Schedule C instructions, page 14](https://www.irs.gov/pub/irs-prior/i1040sc--2025.pdf)
route net profit to Schedule 1 and Schedule SE. The
[2025 Schedule SE](https://www.irs.gov/pub/irs-prior/f1040sse--2025.pdf) applies
92.35% to net profit, separate Social Security and Medicare calculations, and
the half-tax deduction. The
[SE instructions](https://www.irs.gov/pub/irs-prior/i1040sse--2025.pdf) provide
the $176,100 Social Security wage base and combined income treatment. The
support calculation uses profit minus the filed half-tax deduction, rather than
substituting Schedule SE's 92.35% net earnings amount for business profit.

Native and PDF preflight reconcile actual C, SE, Schedule 1 income/deduction,
Schedule 2 SE tax, AGI aggregator and QBI source buckets. Existing education
income review independently joins the taxable scholarship to Schedule 1 line 8r,
final income and MAGI.
[Form 8995 instructions, page 2](https://www.irs.gov/pub/irs-prior/i8995--2025.pdf)
reduce QBI by the deductible half of SE tax. Existing Form 8995 preflight
reconciles its source and finalized deduction.

## Actual public return positives

Each packet starts with public inputs and executes the actual tax graph before
complete native serialization and filled PDF export. All have $4,500 tuition,
$500 tax-free scholarship and $8,000 separately sourced taxable room/board
scholarship. The latter is income, but neither scholarship is earned income;
$8,500 is excluded from the full-time student's ordinary support comparison.

| Case                               | W-2 wages | Receipts / costs / C profit | SE tax / deduction | Earned income | Ordinary support | AGI/MAGI | QBI deduction | AOC refundable / nonrefundable |
| ---------------------------------- | --------: | --------------------------: | -----------------: | ------------: | ---------------: | -------: | ------------: | -----------------------------: |
| Business exact half                |         0 |     36,000 / 6,000 / 30,000 |      4,238 / 2,119 |        27,881 |           55,762 |   35,881 |         4,026 |                  1,000 / 1,500 |
| Business below half                |         0 |     36,000 / 6,000 / 30,000 |      4,238 / 2,119 |        27,881 |           55,764 |   35,881 |         4,026 |                      0 / 1,697 |
| Mixed exact half                   |    10,000 |     26,000 / 6,000 / 20,000 |      2,826 / 1,413 |        28,587 |           57,174 |   36,587 |         3,717 |                  1,000 / 1,500 |
| Mixed below half                   |    10,000 |     26,000 / 6,000 / 20,000 |      2,826 / 1,413 |        28,587 |           57,176 |   36,587 |         3,717 |                      0 / 1,817 |
| Mixed exact half, qualifying child |    10,000 |     26,000 / 6,000 / 20,000 |      2,826 / 1,413 |        28,587 |           57,174 |   36,587 |         3,717 |                  1,000 / 1,500 |

Costs are independently inventoried advertising $2,000, office expense $1,500
and supplies $2,500. Single-filer tax-table amounts $1,697 and $1,817 are
asserted independently from the graph preview, using the
[2025 Form 1040 instructions, page 70](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf).
In the child packet, Schedule 8812's credit-limit worksheet subtracts $1,500
education credit from $1,817 ordinary tax: CTC is $317 and ACTC $1,700. Final
total tax is $2,826; SE tax remains payable after the nonrefundable credits.

Exactly half does not meet the instruction's “less than one-half” restriction;
the ordinary support increase of $2 makes earned income fall below half and
changes actual Form 8863 line 7 checkbox and refundable line 8.

## Verification and artifacts

- Focused new test file: six tests, zero failures. Five complete positive
  returns and one collection of conflicting source/export cases.
- Integration: 369 tests, zero failures; education node/source/native/PDF cases,
  existing owner and mixed-school packets, general and Schedule C/SE
  calculations, return arithmetic and public graph tests. Log:
  `/tmp/opentax-self-employed-regression.log`.
- Each complete return passes `xmllint` against the cached TY2025
  `IRSReturn1040.xsd`; this is local schema validation, not IRS acceptance.
- Five flattened PDFs have zero remaining form fields. Four contain 14 pages;
  the child packet contains 16. All 72 pages were rendered with Poppler and
  inspected in four contact sheets; SE, Form 8863 restriction and Schedule 8812
  credit rows were also inspected at larger size.
- Reproducible artifacts: run `form8863-self-employed.test.ts` with
  `--write-review-artifacts`. Actual public input JSON, complete XML and filled
  PDFs are under `/tmp/opentax-f8863-self-employed-evidence/`, including
  `mixed-child-credit-filled-return.pdf`. Existing claimant source fixtures were
  extracted to a shared module without changing their scenarios.

Negatives reject changed claimant/receipt ownership, mismatched cost/business
identity, duplicate receipt/cost references, changed or detached actual C
source, wrong proprietor, absent business review, changed SE profit or W-2
Social Security amounts, altered Schedule 1 profit/deduction, SE tax, AGI and
QBI upstream amounts, filed AGI and W-2 source changes. Native, PDF and complete
preparation reject these conflicts. Complete preparation also rejects altered
filed QBI, ordinary tax, total income, CTC and Schedule 8812 prior education
credit.

## Remaining limits

This proves ordinary claimant-owned personal-service businesses with the
reviewed nonmaterial-capital condition and whole-dollar source amounts. The new
positives do not prove the material-capital 30% compensation route, partnership
or farm earned income, inventory/COGS, home office, at-risk limitations,
employment-credit reductions, or other advanced business cost and loss cases.
These are explicit source-contract boundaries; broader historical education
branches remain unchanged. Multiple businesses and Social Security wage-cap
boundaries have no new positive packet proof here.

References and source inventories are retained synthetic evidence. This does not
authenticate an issuer, receipt, capital review or ownership record outside the
return. Broader dependency, release and double-claim authentication remain open
under their existing parent work; student business or scholarship income is not
assigned to a parent's return. Service-conditioned scholarship earned income and
deferred W-2 compensation have no new positive proof here.

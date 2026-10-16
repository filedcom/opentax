# TY2025 Form 8863 self-employed claimant support review

## October 9 multiple personal-service business checkpoint

Six ordinary public-input returns now exercise two or three claimant-owned
personal-service businesses, combined Schedule SE, individually reviewed QBI
allocations, and the education support test. Cases include W-2 wages, one SSTB,
and a qualifying child. This checkpoint adds regression evidence; it changes no
production calculation or export guard.

Each case has business profit 30,000, SE tax 4,238 and deductible half 2,119,
so business earned income is 27,881. Two-business QBI allocations deduct
1,412.67/706.33; three-business allocations deduct 706.34/706.33/706.33,
with reviewed cent-residual source records. Filed business QBI rows are
18,587/9,294 or three rows of 9,294. The latter row rounding does not change
the 5,576 business component. The taxable-income limit reduces the final
ordinary-case QBI deduction to 2,426 without wages or 4,426 with wages.

| Case | Wages | AGI | Ordinary tax | Nonrefundable / refundable AOC | CTC / ACTC | Total tax | Refund / owed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Two businesses, exact half | 0 | 27,881 | 973 | 973 / 1,000 | 0 / 0 | 4,238 | 0 / 3,238 |
| Two businesses, below half | 0 | 27,881 | 973 | 973 / 0 | 0 / 0 | 4,238 | 0 / 4,238 |
| Three businesses and wages, exact half | 10,000 | 37,881 | 1,889 | 1,500 / 1,000 | 0 / 0 | 4,627 | 1,373 / 0 |
| Three businesses and wages, below half | 10,000 | 37,881 | 1,889 | 1,889 / 0 | 0 / 0 | 4,238 | 762 / 0 |
| Two businesses including SSTB | 10,000 | 37,881 | 1,889 | 1,500 / 1,000 | 0 / 0 | 4,627 | 1,373 / 0 |
| Three businesses and qualifying child | 10,000 | 37,881 | 1,889 | 1,500 / 1,000 | 389 / 1,700 | 4,238 | 3,462 / 0 |

Tuition 4,500 less tax-free aid 500 yields 4,000 qualified expenses. Ordinary
support is twice earned income; the below-half cases add two cents. Wages add
10,000 to earned income and carry 5,000 withholding. No-wage cases have no
invented withholding or estimated payments. Independent single-filer tax-table
rows are 9,700–9,750 → 973 and 17,700–17,750 → 1,889 in the
[2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf).

Six separately retained variants add owned taxable scholarship 8,000. Their
public calculations complete without diagnostics, but both native and fresh PDF
exports reject the multiple-Schedule-C Form 8995 income join. That existing
check does not reconcile the additional Schedule 1 line 8r income. These are
blocked cases, not positive exports; their sources remain intact. New
`future_todo` item 102 records the gap and is not implemented here.

Focused typed regression: 12 passes, zero failures; existing self-employed and
material-capital tests: 14 passes, zero failures. Across the six ordinary cases,
60 native and 60 fresh-PDF mutations reject missing/duplicate business reviews,
wrong owners, reused receipt references, changed receipts, wrong support
beneficiaries, missing Schedule C, changed SE profit or half-tax deduction,
and changed refundable AOC. Private source, pending, expected, XML/PDF and
blocked-case evidence is retained under
`.state/research/form8863-multiple-business-2026-10-09/`.

Six XSD-valid complete returns retain 104 rendered pages (34 distinct hashes),
all visually observed. Names, school answers, support restriction checkbox,
C copies, combined SE, QBI rows and final tax/refund/owed agree with retained
sources and expected values. Flattened packets have no fields or widgets.
The child packet repeats deferred76: Schedule 8812 line10's instructed zero is
blank; it also repeats deferred86, placing sequence47 before Schedule C09/SE17.
Profitable Schedule C line32 boxes are blank in these cases. This review is
qualified evidence, not approval of all presentation or IRS business rules.
XSD: 2025v5.4 Return1040.xsd SHA256
`e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`.
No runtime changes or new full-suite/benchmark run; prior results retain their
original scope. External source authenticity and IRS acceptance remain open.

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
branches remain unchanged. The October 9 checkpoint above adds ordinary multiple-business proof.
Social Security wage-cap boundaries and the newly deferred taxable-scholarship
combination remain unproved here.

References and source inventories are retained synthetic evidence. This does not
authenticate an issuer, receipt, capital review or ownership record outside the
return. Broader dependency, release and double-claim authentication remain open
under their existing parent work; student business or scholarship income is not
assigned to a parent's return. Service-conditioned scholarship earned income and
deferred W-2 compensation have no new positive proof here.

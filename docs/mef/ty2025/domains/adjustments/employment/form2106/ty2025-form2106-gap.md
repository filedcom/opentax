# TY2025 Form 2106: employee business expenses

## October 9 travel, mileage and reimbursement checkpoint

The fee-basis filing route now also accepts sourced Part I transportation,
overnight travel and ordinary 50%-limited meals, plus one standard-mileage
vehicle per job. Owned vehicles require the first-business-year method history;
leased vehicles require standard mileage throughout the lease. The existing
schema requires mileage evidence, commuting/business/total distances, personal
availability answers and no personal/business conversion during the year.
Separately allocated mileage-record references must be distinct across jobs.

Both reimbursement columns must be at most their corresponding expenses, and
each job must retain a positive deduction. Line 7 amounts are already allocated
nonmeal/meal payments excluded from W-2 box 1; this route does not calculate a
single combined payment allocation. W-2 owner/employer joins, four-document
capacity and final wages/AGI reconciliation remain enforced. Actual vehicle
cost/depreciation, excess reimbursements and other employee categories remain
guarded. No calculation-node or PDF mapping was changed.

The [2025 instructions](https://www.irs.gov/pub/irs-prior/i2106--2025.pdf)
specify the 70-cent mileage rate, commuting exclusion, two reimbursement
columns and ordinary meal limit. The complete synthetic fixtures exercise:

| Case | Deduction | Taxable income | Tax | Refund | Pages |
| --- | ---: | ---: | ---: | ---: | ---: |
| Single, travel without a vehicle | 1,600 | 132,650 | 24,683 | 5,317 | 6 |
| Single, owned vehicle | 4,400 | 129,850 | 24,011 | 5,989 | 6 |
| Joint, spouse's leased vehicle | 5,100 | 113,400 | 14,776 | 15,224 | 6 |
| Joint, owned and leased vehicles in separate jobs | 9,500 | 109,000 | 13,808 | 16,192 | 8 |
| Single, meals only | 400 | 133,850 | 24,971 | 5,029 | 6 |
| Joint, nonmeal expenses fully reimbursed | 200 | 118,300 | 15,854 | 14,146 | 6 |

Each return has wages of 150,000 and withholding of 30,000. The mixed-expense
jobs use transportation 300, overnight travel 1,600, other expenses 200, meals
600, and separately paid nonmeal/meal reimbursements of 700/200. Owned mileage
is 4,000 of 10,000 total miles; leased mileage is 5,000 of 15,000. Each has
2,000 commuting miles. The meal-only case uses 1,000 meals less 200 reimbursed;
the fully reimbursed nonmeal case uses 2,100 in column A, leaving only the
200 allowed meal deduction.

The focused group passes **83 tests**, including all earlier job tests and six
new complete returns. All six failed at the old export guard before the
extension. **40 native and 40 fresh-PDF mutations reject**, covering changed
travel/mileage/meals, excess reimbursements in either column, wrong owners,
stale Schedule 1 amounts and shared mileage evidence.

All six returns pass cached TY2025v5.4 XSD with the same schema digest recorded
below. Independent verification checks every Part I amount, vehicle date,
mileage count, native fraction, checkbox answer, Schedule 1 reference and
final tax/refund. All **38 pages** were visually reviewed through 28 unique
page hashes: the leased percentage prints 33.33% and emits 0.3333 natively;
owned business use prints 40%. Vehicle answers and unused actual-cost sections
match source facts. Flattened packets retain no AcroForm fields or widgets.
Existing deferred qualifications remain: blank calculated-zero cells on
meal-only/fully-reimbursed Form 2106 and primary-only joint native header names.
These are not claimed as complete presentation parity or IRS acceptance.

Private evidence is retained in `.state/research/form2106-travel-2026-10-09/`.
Source, pending, expected totals, native/PDF output, origins, verification,
page-review map, visual review, test logs and hash manifest are included.
Expense/mileage/method-history references remain caller-supplied structured
records, not authenticated receipts or employer-issued bytes. Their substantive
qualification and provenance remain part of the open parent scope.

## October 9 multiple owned fee-basis jobs

The earlier line-4 checkpoint accepts one to four separately sourced fee-basis
state or local official jobs, including a spouse on a joint return. Each job
has positive line 4 expenses and no vehicle, transportation, travel, meals or
reimbursements. The cached TY2025v5.4 ReturnData1040 schema permits at most four
IRS2106 documents; a fifth job remains rejected.

Each employee SSN/employer EIN pair must be distinct and match exactly one
positive W-2 with the same normalized employer name. Expense-record references
must be distinct, preventing the same unallocated ledger from being claimed
by multiple jobs. Two spouses may work for the same employer when each has a
separately owned W-2 and expense record. Additional ordinary W-2s are allowed,
but every wage owner must be the taxpayer or a joint-filing spouse.

The existing staged reconciliation checks job names/SSNs, each calculated
line 10, aggregate Schedule 1 line 12 and its AGI contribution, Schedule 1
line 26 and Form 1040 line 10. This remains a wages-only return boundary:
Form 1040 lines 1a/1z/9 equal all W-2 wages, line 8 is zero and AGI equals
wages less adjustments. Native output emits one IRS2106 per job, with unique
IDs referenced by Schedule 1; the PDF emits one official two-page copy per job.

The [2025 Form 2106 instructions](https://www.irs.gov/pub/irs-prior/i2106--2025.pdf)
direct fee-basis official line 10 expenses to Schedule 1 line 12 whether or
not the filer itemizes. The public input retains appointment, fee schedule,
expense and reimbursement references. These are reviewed structured facts in
synthetic fixtures, not authenticated issuer document bytes.

### Retained complete-return evidence

All five fixtures have wages of 150,000 and federal withholding of 30,000.

| Case | Jobs | Deduction | AGI | Taxable income | Tax | Refund | Pages |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Single, two employers | 2 | 3,000 | 147,000 | 131,250 | 24,347 | 5,653 | 8 |
| Joint, spouse expenses and ordinary taxpayer wages | 1 | 1,200 | 148,800 | 117,300 | 15,634 | 14,366 | 6 |
| Joint, both owners | 2 | 3,000 | 147,000 | 115,500 | 15,238 | 14,762 | 8 |
| Joint, same employer with separate owned W-2s | 2 | 3,000 | 147,000 | 115,500 | 15,238 | 14,762 | 8 |
| Joint, two jobs per owner | 4 | 8,400 | 141,600 | 110,100 | 14,050 | 15,950 | 12 |

The focused source/calculation/staging/export/attachment/Schedule 1 group
passes **77 tests**, including six new tests. Complete native and fresh PDF
builders reject **53 mutations each** covering owner/employer mismatches,
duplicate jobs/W-2s, shared expense references, stale amounts and nonjoint
spouse filing status. The pre-change five return tests failed at the old
one-job guard. The four-document capacity test separately rejects a fifth job.

All five complete returns validate against cached TY2025v5.4 Return1040.xsd
(SHA-256 `e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`).
Independent checks reconcile every job and W-2, Schedule 1 reference IDs and
final tax/refund. All **42 PDF pages** were reviewed using 20 unique rendered
page hashes with exact matches accounting for repeated pages. Names, SSNs,
filing/digital-asset marks, amounts, per-job copies and blank vehicle sections
were inspected. Packets have no remaining AcroForm fields or widget annotations.
The joint native return header retains the existing primary-only name-line
qualification; individual Form 2106 owner names and joint printed Form 1040
and Schedule 1 names reconcile. This is already deferred identity work.

Private evidence: `.state/research/form2106-multiple-jobs-2026-10-09/`, including
source/pending/expected records, XML/PDF, page origins, renders, test log,
verification report, visual review and hash manifest. Initial three-job
artifacts are separately retained and excluded from these final counts.
Local schema success is not IRS business-rule validation or ATS acceptance.

## Earlier selected-packet evidence

The October 4 one-job county-official case retained six reviewed pages:
line 4/6/8/9/10 expenses of 1,200, Schedule 1 lines 12/26 and Form 1040 line 10
of 1,200, and AGI of 48,800 from wages of 50,000. Its selected manifest passed
hashes, page origins and local XSD; see the
[validation batch](../../../../testing/ty2025-form1040-validation-batch.md).
The October 9 group supersedes the earlier written-but-unrun test notes.

## Remaining boundaries

- Source references do not authenticate W-2, appointment, qualification,
  expense or reimbursement documents. Multiple jobs for one owner/employer
  need an allocation contract before relaxing the distinct-pair boundary.
- Reservists require trip-level travel, federal per-diem caps and qualifying
  service allocation; performing artists require owner-wide employer, gross
  arts income, greater-than-10% expense, AGI and marital reconciliation.
- The calculator supports line-4 impairment expenses, but that filing route
  remains guarded. Standard mileage now has the fee-basis route above. Impairment expenses belong
  on Schedule A line 16, with itemization and other contributors reconciled.
- Actual vehicles require sourced basis, limits, election history and
  depreciation. Special meal limits, combined-payment allocation and excess
  reimbursements remain outside the verified route; excess reimbursements need
  exact W-2/Form 1040 line 1a treatment.
- Broader income combinations, final coordinated batch, business rules,
  source authenticity and IRS ATS remain open. The parent board task is not
  closed by these bounded fee-basis checks.

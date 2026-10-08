# TY2025 Form 2106: employee business expenses

## Current selected-packet evidence (2026-10-04)

The bounded fee-basis county-official route now has a six-page visual,
source, native-XML, and PDF replay review. Form 2106 prints $1,200 on lines
4/6/8/9/10, Schedule 1 lines 12/26 and Form 1040 line 10 print $1,200, and
Form 1040 AGI is $48,800 from $50,000 wages. The retained selected manifest
passed artifact hashes, page origins, and local TY2025v5.4 XSD; details and
digest are in the [validation batch](../../../../testing/ty2025-form1040-validation-batch.md).
The remaining source and branch boundaries below are still open.

## One fee-basis official's unreimbursed line-4 expense (written, unrun)

A bounded native and PDF filing route now accepts one taxpayer job as a
fee-basis state or local official with positive documented Form 2106 line-4
business expense, no vehicle, travel, transportation, meals, or reimbursement.
The employee name/SSN and employer name/EIN must match exactly one positive
W-2. The calculated Form 2106 line 10 must equal Schedule 1 line 12 and its
AGI contribution; Schedule 1 line 26 must equal Form 1040 line 10, and the
one-W-2 wages and resulting AGI must match Form 1040 lines 1a, 1z, 9, and 11.
Native MeF now emits one `IRS2106` document and the PDF descriptor fills the
official two-page form from the same calculated lines. The attachment guard
continues to reject all other Form 2106 shapes. A full-return positive case and
job, W-2, Schedule 1, and Form 1040 tamper cases are authored but unrun.

The appointment, fee schedule, expense ledger, and reimbursement ledger are
entered source references; their document bytes and the W-2's authenticity are
not independently verified. The route excludes spouse/multiple jobs,
reservists, performing artists, impairment expenses, mileage/actual vehicle,
meals, and excess reimbursements. Local XSD/business-rule validation, filled
PDF review, and IRS ATS remain pending the coordinated batch. The [2025 Form
2106 instructions](https://www.irs.gov/instructions/i2106) direct fee-basis
official expenses from Form 2106 line 10 to Schedule 1 line 12.

## Current boundary

The public `f2106s` source is now one strict record per job with employee/owner
identity, employer, a typed qualification branch, Part I expense lines,
separately allocated column A/B reimbursements, and a Part II vehicle method.
The canonical line calculator supports fee-basis officials and line-4-only
impairment expenses. It computes standard-mileage vehicle expense where a
complete Part II source is present. Fee-basis deductions go to Schedule 1 line
12/AGI and impairment deductions only to Schedule A line 16. Reservist and
performing-artist calculations reject until their cross-trip/owner-wide rules
are implemented. The one-job fee-basis route above can now export; other
nonempty `f2106s` remain blocked by `attachment-coverage.ts`.

The [2025 Form 2106 instructions](https://www.irs.gov/instructions/i2106) direct
impairment-related work expenses to Schedule A line 16, and the
[2025 Schedule A instructions](https://www.irs.gov/instructions/i1040sca) list
them there. The
[2025 Form 2106](https://www.irs.gov/pub/irs-prior/f2106--2025.pdf) requires a
separate form for the job with employee name, occupation, SSN, Part I
expense/reimbursement columns, and potentially Part II vehicle details.

## Remaining native MeF and PDF boundaries

`form2106_staged.ts` projects one strict job through the
same calculated lines into TY2025 `IRS2106` XML and the official two-page PDF
AcroForm. Its proposed per-job contribution records the owner, employment
reference, line 10 amount, and exclusive destination: fee-basis official to
Schedule 1 line 12 (then Form 1040 line 10 via Schedule 1 line 26), or
impairment expenses to Schedule A line 16 (then Form 1040 line 12e only when
itemizing). The projected line 1a reimbursement contribution is exactly zero;
any excess column A reimbursement rejects before either staged export. The
native vehicle-use ratio is a 0–1 fraction; the PDF prints the percentage. These
remain proposed joins for the other branches. The bounded fee-basis route now
registers native and PDF descriptors and checks finalized return amounts.
Projection tests are written but unrun.

The direct Schedule 1 line 12 path now survives node finalization and maps to
the TY2025 MeF `BusExpnsReservistsAndOthersAmt` element (with Form 2106 document
IDs when available) and the canonical PDF page-2 `f2_01` widget. A staged
reconciliation reads `f2106`, Schedule 1, Schedule A, AGI-aggregator,
standard-deduction, and Form 1040 values from the executor pending graph. It
matches each job's name and SSN to taxpayer or spouse; requires fee-basis line
10 sums to equal Schedule 1 line 12 and the AGI contribution; and requires
Schedule 1 line 26 to equal Form 1040 line 10. For impairment jobs it requires
their sum to equal Schedule A line 16, the finalized itemized total to equal
Form 1040 line 12e, and no standard deduction selection. This intentionally
rejects another Schedule A line 16 contributor until per-source provenance is
retained, instead of attributing an unknown share to Form 2106. Reconciliation
tests are written but unrun, and the Form 2106 export guard remains active
outside the fee-basis route.

- Each job, expense, eligibility, and reimbursement record currently has a
  caller-supplied source reference, not verified document bytes. The executor
  cannot yet authenticate W-2 and expense-log document bytes. The fee-basis
  route joins employee SSN and employer EIN/name to one W-2 but cannot establish
  that a caller-supplied source fact is genuine. A
  valid-looking source object is not evidence of the tax facts.
- Reservist deductions still reject because the source lacks trip-level travel,
  federal per-diem caps, and allocation of Form 2106 line 10 to qualifying
  reserve service. The actual-vehicle branch captures Part II
  operating/rental/depreciation claims but rejects because section D basis,
  limits, election history, and business-use computation are not yet sourced.
- Performing-artist employers, wages, gross arts income, AGI before deduction,
  and marital facts are typed, but the greater-than-10%-of-gross-income test
  applies to owner-wide performing-arts activity, not one job. The node rejects
  this branch until all jobs, actual W-2s, and finalized Form 1040 AGI/filing
  status are reconciled.
- Part I now computes both reimbursement columns before the 50% meal limit. It
  calculates excess column A reimbursement but refuses tax routing until that
  amount is reconciled to Form 1040 line 1a and the W-2 treatment. Special
  meal-percentage branches remain excluded.
- Schedule A line 16 can include other unrelated deductions and the itemization
  decision is separate from an above-the-line adjustment. The executor does not
  yet preserve per-job contribution provenance through the finalized Schedule
  1/Schedule A totals. The staged join can check strict aggregate equality but
  cannot prove each job's contribution to those totals or bind the result to an
  emitted native `IRS2106` document and filled PDF.

## Next implementation slice

Bind source references to reviewed W-2/employment, expense, reimbursement, and
mileage document bytes; reconcile performing-artist AGI against the finalized
Form 1040. Preserve per-job contribution identities
through Schedule 1 and Schedule A; implement trip-level reservist and
actual-vehicle branches or keep rejecting them. Extend the registered native
`IRS2106` and official PDF route only as each branch gains exact line 10 and
any excess line 1a reconciliation. Validate XSD/business rules and filled PDF
in the agreed single batch before treating this as filing acceptance.

The old loose category-only input shape was intentionally replaced, not accepted
through a compatibility shim. Focused source, calculation, and routing tests
were written but not run during the build-first phase.

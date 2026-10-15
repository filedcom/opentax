# Current TY2026 student-loan interest route

Implemented October 15, 2026. The public source claim is
`student_loan_interest`; filer identities and dependency eligibility come from
`general`. This is part of the incremental source registry, not a filing product.

## Sources checked

- [Rev. Proc. 2025-32 §4.29](https://www.irs.gov/irb/2025-45_IRB) supplies the
  2026 phaseout: $85,000–$100,000 for single/HOH/QSS and $175,000–$205,000 jointly.
- [2026 Forms 1098-E/T instructions](https://www.irs.gov/pub/irs-pdf/i1098et.pdf)
  establish borrower/lender copies, corrections, the per-lender/borrower $600
  reporting threshold, and box 2 treatment of pre-September-2004 loans.
- [Publication 970, chapter 4](https://www.irs.gov/publications/p970) supplies
  qualification, payment allocation, excluded funding and Worksheet 4-1.
  The shared $2,500 cap is statutory; annual phaseouts come from the 2026 source.
- [IRS Topic 456](https://www.irs.gov/taxtopics/tc456) describes the actual
  dependency-claim condition. The source review records who is claimed on
  another return and checks consistency with general's claimability answers.
- The draft `i1040gi--dft.pdf` URL still served **2025** instructions when checked.
  Final 2026 instructions remain a release gate.

## Implementation contract

`inputs/student-loan-source.ts` retains loan agreements, borrower/student
identities, historic relationship and education reviews, lender/account keys,
original/refinanced/consolidated/revolving loan type, opening fee/capitalized
interest balances, payment allocation records, funding and issued copies.
A current statement can cover several loans; its box 1 must equal their allocated
amounts. The existing 2025 copy/correction validator is reused. Masked borrower
TINs require an owner review and matching last four digits. Repeated loans,
allocations, payment records, current copies and superseded originals fail.

Payment cash is allocated to stated interest, accrued origination fees,
capitalized interest, then principal. Fees accrue according to a retained,
reviewed reasonable allocation schedule, and cannot exceed the unpaid balance.
Unpaid fees and capitalized interest remain in the workpaper for later years.
Box 1 is reconciled to the computed components; it is never added a second time.
Paid but omitted old-loan fees/capitalized interest require the old-loan date,
box 2 and allocation evidence. Unissued-form records also retain a lender review;
reportable interest below $600 is aggregated across that lender's loans to the
borrower, not tested separately for each account.

The calculation retains both eligible and disallowed loan records. It applies
legal obligation, qualified use, student/institution/timing, related-lender and
employer-plan facts. Refinances/consolidations require original-loan references
and the same-borrower/use review. Student relationships are assessed at borrowing,
so a historic dependent need not be claimed on the current return. Employer and
other tax-free repayment assistance, tax-free 529 earnings allocated to interest,
and interest deductible elsewhere are excluded without overlapping deductions.
Gifts and taxable employer payments remain eligible when the loan qualifies.

MFS and actual dependency claims disallow the deduction. Claimability by itself
is retained separately and does not override the actual-claim review. The shared
return cap applies once across both spouses. `nodes/agi.ts` then uses the shared
phaseout with the 2026 configuration, producing Schedule 1 line 21, Form 1040
line 10 and AGI once. The existing Schedule 1 PDF and bundle print the adjusted
amount; no lender-copy PDF is attached to the return.

## Verification and remaining work

The source tests cover payment ordering, carried balances, old/new reporting,
funding exclusions, qualification, historic dependents, refinancing, duplicates,
masked TINs, corrections, the reporting threshold, combined statements, joint
cap and phaseout boundaries. An end-to-end PDF test reconciles $3,000 paid
interest at $190,000 joint MAGI to a $1,250 deduction and $188,750 AGI, and checks
that a fully phased-out claim alone does not select Schedule 1. A four-page
synthetic joint draft was rendered and visually inspected.

The AGI boundary test includes finalized taxable Social Security, the foreign
income exclusion addback and other adjustments. A positive claim with gross
Social Security but no finalized taxable amount is rejected, preventing the
shared provisional-MAGI shortcut from silently omitting taxable benefits.
The current public source path still lacks the SSA and Form 2555/4563/territory
owners. Foreign housing deduction and territory exclusions therefore require
explicit zero-source reviews; those source routes and any coordinated SSA
worksheet calculation remain unfinished. Final 2026 worksheet reconciliation,
current MeF serialization/rules, public catalog/CLI and ATS acceptance remain
required. The node ledger stays `audit-required`.

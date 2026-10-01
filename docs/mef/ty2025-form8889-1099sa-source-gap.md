# TY2025 Form 8889 distribution source boundary (build pass, unrun)

The [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889) say
line 14a is the total of HSA distributions shown in Form 1099-SA box 1. The
[2025 Form 1099-SA instructions](https://www.irs.gov/pub/irs-prior/i1099sa--2025.pdf)
put excess contributions returned to the account holder under distribution code
2, with box 2 earnings included in box 1. They also say box 1 does not report
excess employer contributions and related earnings **returned to the employer**.
These are different transactions and must not share a source rule.

Every positive owner-specific line 14a now requires distinct 2025 Form 1099-SA
records whose recipient SSN matches the HSA beneficiary and whose box 1 amounts
sum to line 14a. Multiple ordinary source forms can sum to the same line. The
existing 2025 employer-excess withdrawal route is narrowed to a payment to the
HSA account holder: the entered source reference must identify its sole code-2
Form 1099-SA, box 1 must equal withdrawn principal plus earnings, and box 2 must
equal those earnings. Its amount remains on lines 14a and 14b; the earnings
still reach Schedule 1 other income. A payment in 2026 does not claim a 2025
Form 1099-SA or distribution line.

An employer-returned excess is **not** this owner-payment route. Correct source,
employer payroll treatment, HSA line 9 and Form 5329 treatment for that
transaction remain an in-scope build gap, not an approved exclusion. The current
typed source does not identify a return to the employer, so it must not be
inferred from a missing Form 1099-SA. Trustee documents and employer records
remain entered references, not independently authenticated documents.

Focused positive owner-payment, missing/mismatched code-2, source-free ordinary
distribution, wrong-recipient, wrong-box-1, and multiple ordinary Forms 1099-SA
cases are written but unrun. The full test, XSD, filled-PDF, IRS-rule, and ATS
gates remain pending.

## Personal contribution with a partly medical distribution (written, unrun)

One single primary HSA owner can now carry a personal contribution alongside
one code-1 Form 1099-SA distribution that was partly spent on one reviewed,
unreimbursed medical expense. This route requires twelve self-only eligible
months, an owner-matched 1099-SA box 1 and one medical receipt reference, a
positive deduction, and a positive taxable remainder with an explicit zero
exception. The Form 8889 calculator determines lines 13, 15, 16, and 17b;
native and PDF export recompute the owner form and match Schedule 1 deduction
and income, Schedule 2's 20% tax, and Form 1040 lines 8, 10, and 23. A bare
matching printed form or an altered source/return cannot use this route.
The [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889)
direct those line destinations and the additional-tax rule.

Employer funding, multiple 1099-SA forms or medical receipts, age-65 or
disability exceptions, prior excess, and testing-period events are outside
this narrow mixed path. The entered trustee and receipt references are not
authenticated document bytes. Positive and tamper fixtures are authored for
the deferred combined validation pass.

# Form 2555 line 50 to Schedule 1-A Part I: source boundary

The [2025 Form 2555](https://www.irs.gov/pub/irs-prior/f2555--2025.pdf)
puts a positive housing **deduction** on line 50, then Schedule 1 line 24j.
The [2025 Schedule 1-A](https://www.irs.gov/pub/irs-prior/f1040s1a--2025.pdf)
adds that amount on Part I line 2c to compute modified AGI. The checked-in
TY2025 v5.4 Schedule 1 XSD has `HousingDeductionAmt` at line 24j; it is not
part of `TotalIncomeExclusionAmt` at line 8d. The old
`line8d_foreign_housing_deduction` input was therefore an incorrect line
identity. A positive value now rejects at Schedule 1 calculation and native
and PDF export instead of being added to line 8d. The AGI aggregator also
rejects the obsolete input before parsing; no housing amount can alter AGI,
the Form 8962 modified AGI addback, or related computations through that path.

## Why the present source cannot produce line 50

The structured physical-presence Form 2555 source models one foreign employer
and foreign wages only. It requires `no_other_foreign_earned_income: true`.
Those wages are employer-provided amounts on line 34, so line 35 is 1 and
line 36 consumes the qualified housing amount on line 33. That makes line 46
zero and leaves no Part IX housing deduction. The source calculation types
line 50 as literal zero. The positive Schedule 1-A Form 2555 path accordingly
requires line 50 zero and has no line 2c amount.

The [2025 Form 2555 instructions](https://www.irs.gov/pub/irs-prior/i2555--2025.pdf)
say a person whose Part IV foreign earned income is entirely self-employment
income skips lines 34–35 and enters zero on line 36. Part IX can be completed
only when line 33 exceeds line 36 **and** line 27 exceeds line 43. It computes
line 46 as line 33 less line 36, line 47 as line 27 less line 43, line 48 as
the smaller amount, and line 50 as line 48 plus any permitted line 49
carryover. A 2024 carryover requires the prior Form 2555 lines 46 and 48 and
the current-year unused line 47 capacity. These are independent facts absent
from today's employee-wages-only source.

## Required positive source contract

1. Identify the owner by SSN and establish a full Form 2555 eligibility
   period, tax home, election history, and foreign address. For a self-employed
   route, retain the named business, income and expense workpapers, source
   documents, foreign-service allocation, and exact Schedule C line 31,
   Schedule SE, and Form 2555 Part IV line 20a reconciliation. Do not use the
   legacy bare `foreign_self_employment_income` preview as filing proof.
2. Retain each 2025 qualified housing expense, payer, date, foreign household,
   location, source-document reference, and section 119/other deduction overlap
   review. Recompute lines 28–33 using the 2025 location limit and qualifying
   days. Establish line 34 employer-provided amounts separately from
   self-employment income, and calculate lines 35–36.
3. Calculate the foreign earned income exclusion and related disallowed
   deductions on lines 37–45. Do not assume zero line 44 for an unreviewed
   self-employed business. Compute lines 46–48. Either source and verify 2024
   Form 2555 lines 46/48 and the line 49 carryover worksheet, or affirm with a
   referenced review that no carryover exists. Then calculate line 50.
4. Send line 50 to Schedule 1 line 24j and its adjustment totals, Form 1040
   AGI, the Foreign Earned Income Tax Worksheet's line 2a stacking amount,
   and Schedule 1-A lines 2c/2e/3. Reconcile line 45 separately to Schedule 1
   line 8d and Schedule 1-A line 2b. The Form 1040 line 13b phaseouts must use
   the final Schedule 1-A MAGI. Native XML must use `HousingDeductionAmt` in
   the Schedule 1 XSD and the corresponding Schedule 1-A field; the filled
   Schedule 1 PDF must print line 24j. Both must match the filed Form 2555
   line 50 and reject changed source, duplicate expense, wrong owner, and
   missing prior-year carryover evidence.

This is a required implementation contract, not a supported positive route.
The focused boundary tests reject a proposed $1,000 housing deduction at the
calculation node, native Schedule 1, and filled PDF projection, and reject
obsolete AGI aggregator input even before export. Full-return
XSD, visual PDF, IRS business rules, and ATS acceptance for positive line 50
remain unverified.

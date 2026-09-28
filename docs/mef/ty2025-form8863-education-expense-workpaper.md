# TY2025 Form 8863 education-expense workpaper

Status: bounded implementation with focused cases written but not yet run.

The [IRS 2025 Form 8863 instructions](https://www.irs.gov/instructions/i8863) say the 1098-T box 1 amount may differ from the actual 2025 payments, AOC course materials can be bought away from the school when needed for a course, and LLC materials qualify only when they must be paid to the institution for enrollment or attendance. Tax-free educational assistance, refunds, and expenses used for other tax benefits reduce the amount available for the credit.

For a claimed AOC or LLC student, native MeF and PDF now require one U.S. institution that supplied a 2025 Form 1098-T plus `education_expense_workpaper`. The workpaper records Form 1098-T boxes 1 and 5, document/payment references, paid tuition and eligible material categories, and disjoint reductions. The adjusted amount must exactly equal the applicable Part III expense input. The bounded route treats all box 5 scholarships as tax-free assistance applied to qualified expenses. Taxable or nonqualified-use scholarship allocation is not inferred from box 5 and is outside this route. It rejects LLC materials bought outside the institution and any course materials whose qualifying conditions are not affirmed.

When more than one student contributes to a positive credit, their Form 1098-T document references and education payment references must be distinct. A reused reference rejects before a credit is emitted, so the same sourced payment cannot be counted twice.
One payment legitimately split between students remains open until the source
model records the payment total and per-student allocations; rejecting the
shared reference is a current filing boundary, not a product-scope exclusion.

The tax node now requires this workpaper for every student contributing to a positive AOC or LLC credit; an asserted adjusted expense alone cannot create Schedule 3 or refundable Form 1040 output. Native/PDF export additionally require the final Form 1040 filing status, MAGI, line 18, refundable line 29, Schedule 3 line 3, and the Credit Limit Worksheet source lines to reconcile; direct positive native assembly without finalized return context rejects. The tax-node line 19 calculation and builder output must still be checked in the full batch. Neither payment references nor Form 1098-T numbers constitute independent verification of source documents.

Open paths: no 1098-T with a permitted IRS exception; multiple or foreign institutions; scholarship allocation outside the fully tax-free case; external proof of tuition/payment, enrollment, prior AOC years, disallowance and TIN timing; PDF appearance, TY2025 XSD and IRS business-rule validation, and ATS acceptance. The focused cases are unrun under the agreed single-batch gate.

# TY2025 Schedule 1 line 8z source ledger gap

Build-stage audit, 2026-09-28. The checked-in TY2025 Schedule 1 schema has one
`OtherIncomeTotalAmt` on line 8z and an optional linked
`OtherIncomeTypeStatement` containing type-and-amount rows. The current build
registers that statement for named components such as Form 8814, HSA excess
earnings, Form 1099-G trade adjustment assistance, and Form 6198 at-risk
adjustments. Form 8621 now carries its QEF, mark-to-market, and section 1291
amounts separately into Schedule 1, AGI, and this statement. Those rows and
their parent link are written but unrun. Nonbusiness Form 1099-NEC payments now
aggregate once from the reviewed payer items, preserving their Schedule 1/AGI
total and a typed statement row. A reviewed Form 1098 box 4 prior-year
mortgage-interest recovery likewise has one sourced Schedule 1/AGI amount and
a distinct type row.

Two generic scalar keys, `line8z_other` and `line8z_other_income`, remain a real
source-provenance gap. The sink cannot infer the IRS statement's required type
from a merged number. The MeF and PDF projections now reject a nonzero generic
amount instead of inventing a label. That is a temporary fail-closed boundary,
not an approved exclusion or completion of these filing paths.

| Generic deposit       | Current producer files                                                               | Missing source-to-statement decision                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `line8z_other`        | `f3115`, `f8873`, `f5471`, `f1099m`, `k1_partnership` | Confirm the 2025 income line and character for each fact pattern; retain a typed source type, amount and source identity through Schedule 1 and AGI.     |
| `line8z_other_income` | `k1_s_corp`, `f3115`, `clergy`, `f8915d`, `k1_trust`, `f1099patr`           | Resolve pass-through, disaster, housing and cooperative classifications separately; preserve each signed source row and its filed destination. |

The executor accumulates colliding scalar output keys as an array. These two
sink schemas currently expect numbers, so a return with multiple generic
producers may fail to parse before it even reaches the new export guard. A
direct typed source ledger should replace the generic scalar deposits in the
producer nodes, feed the same signed rows to AGI and Schedule 1, and create one
statement row per supported source. This is not a request for a second accepted
API shape or a scalar fallback. Source-document authenticity, correct tax
character, a populated statement, full-batch tests, XSD, filled-PDF review, IRS
business rules and ATS acceptance all remain open.

The former Form 1099-K gross-payment line-8z route is removed for TY2025.
An explicitly classified hobby payment now enters line 8j with the same
amount in AGI, including multi-payer aggregation. This does not classify
personal-item sales, erroneous reports, reimbursements, or business receipts
as hobby income. Those need their own transaction facts and destinations.

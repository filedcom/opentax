# TY2026 Form 5329 graph contract

Sources: pinned [2026 draft Form 5329](corpus/draft/f5329.pdf)
(SHA-256 `f8822ccc8d14eca9424255d3b9606a8c210143ad8a317018f50222d03740edbe`)
and [draft instructions](corpus/draft/i5329.pdf)
(SHA-256 `55f531aad380ec1ac63cc697e0f5d0cd603c503e18cebd9fb04b0bd46633aa35`).
The form is still a draft, so its fields and instructions must be checked
against the final version before filing.

## Implemented Part I branch

The registered TY2026 `f1099r` source accepts a single-code 1 distribution
whose box 2a equals box 1 and whose source facts affirm that the full amount
is subject to additional tax. It also requires a fact identifying whether a
SIMPLE IRA distribution occurs within its first two years. That fact must
agree with the 7b IRA/SEP/SIMPLE checkbox when true. If no statement has the
early SIMPLE fact, the complete 10% tax goes directly to Schedule 2 line 5,
as the instructions permit for an all-code-1 set of statements. If an early
SIMPLE statement is present, the Form 5329 Part I node calculates:

| Form 5329 line | Current calculation |
| --- | --- |
| 1 | Sum of eligible regular early and early SIMPLE taxable distributions |
| 2 | Zero; exception claims are not yet accepted |
| 3 | Line 1 less line 2 |
| 4 | 10% of the regular portion plus 25% of the early SIMPLE portion, rounded to whole dollars |

Line 4 feeds 2026 Schedule 2 line 5, its Part II tax total feeds Form 1040
line 23, and the PDF builder reconciles all three values. The pinned draft
has a cover sheet and three printed pages; the output copies only those
three printed pages after filling recipient name, SSN, and lines 1, 3, and
4. Line 2 stays blank because no exception is claimed. A rendered sample was
visually checked. An ordinary code 7 statement may coexist with this branch.

## Required expansion

1. Add each Part I exception code and amount with its instruction-specific
   evidence and validation; then support partial distributions, rollovers,
   and statements whose box 2a is not the taxable base. Do not infer the
   25% SIMPLE rate from 7b alone, which also marks other IRA and SEP sources.
2. Split taxpayer and spouse into separate Form 5329 nodes and PDFs when
   both have early distributions. The current combined branch rejects that
   case when a Form 5329 is required.
3. Map Parts II–X, including excess contributions and RMD shortfalls, from
   their source forms and carryovers. The current node does not emit them.
4. Compare the final TY2026 form and instructions, then build the current
   MeF elements, attachment, validation rules, and ATS cases. The May v1
   MeF package is research only; this path has no current TY2026 MeF output.

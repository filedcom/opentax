# TY2026 vehicle-loan interest source and Schedule 1-A graph

Snapshot: September 27, 2026. The IRS [December 2026 Form
1098-VLI](corpus/authorities/f1098vli--2026.pdf), [instructions](corpus/authorities/i1098vli--2026.pdf),
and [2026-39 bulletin with final regulations](corpus/authorities/irb26-39.pdf)
are pinned at SHA-256 `5518ddcaac288ff567da4ce5e2267de9371d42d73f762939c46515e0d041e060`,
`9b6499edf218b56b54711284d9bc7a249ef7524546feb0088e167125031e5ae4`,
and `d7771a6ba17cb11242ac1dfeb23c71b5ac042b6d58666f16181b66b859a530a1`.
The [2026 Schedule 1-A draft](corpus/draft/f1040s1a.pdf) specifically names
1098-VLI box 1 at Part IV. A lender issues one statement per specified
passenger vehicle loan with at least $600 of reportable interest; the
issuance threshold is not a recipient deduction floor.

## Source-to-return contract

| Source | 2026 calculation and filing handoff |
| --- | --- |
| Lender, payer, account, boxes 2a–2d year/make/model/VIN | Deduplicate corrected statements, refinanced/serviced accounts and co-borrowers at the **loan** level; preserve the owner's VIN and loan identity. Match 2026 Schedule 1-A line 28a/28b per-VIN rows and continuation when over two vehicles. A VIN alone is insufficient to decide the interest owner or whether two statements cover one loan. |
| Box 3a origination, 3b lender acquisition, box 4 opening principal | Check the original debt was incurred after 2024 for purchase of a qualifying **new**, U.S.-assembled passenger vehicle and secured by a first lien. Box 3b is a lender-transfer date, not new taxpayer borrowing. Limit an eligible refinance to the outstanding qualified debt at refinance; allocate added principal and interest pro rata. Exclude trade-in negative equity or unrelated financed amounts. Track original obligor and the death exception to obligor changes. |
| Box 1 interest | Reconcile interest actually paid/accrued by the taxpayer, valid third-party payments, prepaid accrual and the qualifying loan portion. Obtain eligible interest even when a lender did not issue a form below $600, with payment and debt evidence. Preserve the gross allowed amount and the part actually deducted on Schedule C/E/F or Form 4835; claim no dollar twice. A mixed-use vehicle can qualify when expected personal use **at origination** exceeded 50%; later use does not retest that initial condition. |
| Box 5 prior-year interest refund/credit | Link to the paid and deducted tax year, compute a tax-benefit recovery or other required correction using that return, and keep the current box 1 separate. Same-year refunds are already netted from the lender's box 1 under the instructions. A prior-year credit used toward current payments can appear in both current box 1 and box 5, so a blanket subtraction would misstate both years. |
| Boxes 6/7 original use and final U.S. assembly | Validate these flags using vehicle purchase documentation/VIN/manufacturer evidence. The form's boxes are source facts; an unchecked or missing box is not a license to assume eligibility. Also check permitted vehicle type, public-road use, at least two wheels and gross vehicle weight rating under 14,000 pounds. |
| Return worksheet | Send qualified per-loan interest less amounts actually deducted on business schedules to Schedule 1-A line 28 column (iii), sum line 29, cap at **$10,000** on line 30, then reduce by **$200 for each $1,000 or fraction** of MAGI above $100,000 ($200,000 MFJ) on lines 31–36. Reconcile line 36 to Schedule 1-A line 44, 1040 line 13a, taxable income, printed PDF, and current MeF. Keep the taxpayer's MAGI and any Form 2555/territory addbacks as a year-specific calculation, not a user-supplied final answer. |

## Current implementation boundary

The shared [`schedule1a` node](../../forms/f1040/nodes/intermediate/forms/schedule1a/index.ts)
and dedicated [2026 PDF](https://github.com/filedcom/opentax/blob/2ed64bdd639597466a903200bfee189d38a65e7f/forms/f1040/2026/pdf/schedule1a.ts) already
calculate the $10,000 cap, $200 phaseout and per-VIN form rows, including a
continuation page test. The input only carries VIN, a caller-supplied
`qualified_interest_paid`, an optional business deduction and optional
original-use/assembly flags. The node rejects explicit `false` flags but
accepts absent flags. It has no lender/form source, origination/first-lien,
vehicle category/weight, purchase financing, refinancing, payer, refund,
payment date or third-party evidence. The PDF prints derived rows from
these sparse facts; it cannot prove box 1 reconciliation or eligibility.

The [Schedule E](SCHEDULEE-GRAPH.md), [Schedule F](SCHEDULEF-GRAPH.md)
and [Form 4835](FORM4835-GRAPH.md) plans identify their **new, distinct**
2026 vehicle-interest lines. Schedule C also needs a business-interest
route. Feed one allocation record to those activity owners and Schedule
1-A, and account for any Form 8990 business-interest limit before treating
a business amount as actually deducted. Do not infer a Schedule 1-A amount
from a business vehicle-expense total. The current focused registry/PDF
slice is a tested calculator, not an intake for the final 1098-VLI source.

## Build and acceptance

1. Add one 2026 vehicle-loan source record per payer/account/original debt
   with VIN, lender, year/make/model, purchase and refinancing documents,
   qualifying principal, original-use/assembly evidence, use expectation,
   actual annual interest, business allocation and refund-year history.
2. Calculate and validate eligibility and interest before the existing
   Schedule 1-A node. Require affirmative source evidence for the flags;
   deduplicate lender changes and co-borrower records. Reconcile each
   business deduction with Schedule C/E/F/4835 and Form 8990.
3. Print all Part IV rows and continuation, reconcile 1040 line 13a, and
   determine from the selected v4-or-later MeF package whether Form
   1098-VLI data itself, a statement or only Schedule 1-A detail is filed.
4. Test no form issued below $600, corrected/duplicate statements, two
   loans on one VIN, lender transfer versus refinancing, extra refinance
   principal, first-lien failure, used/non-U.S.-assembled/overweight
   vehicle, co-borrower payment, mixed use, business-interest limit,
   same-year versus prior-year box 5, >2 VINs, $10,000 cap and MAGI
   fractions. Preserve TY2025 regressions for the shared Schedule 1-A node.

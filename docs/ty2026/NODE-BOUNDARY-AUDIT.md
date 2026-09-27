# TY2026 boundary audit for the remaining TY2025 graph nodes

Snapshot: September 27, 2026. The generated [191-node inventory](node-coverage.csv)
is the exhaustive registry worklist. The [parity queue](PARITY-QUEUE.md) and
specialist contracts map forms with PDF/MeF serializers. The **85 nodes below**
were not named individually in those plans. This document assigns each a
route owner and a coding decision, without treating its TY2025 registration
as evidence of a valid TY2026 filing route.

## Shared acceptance rule

For each node, read the existing source module from `node-coverage.csv` and
pin the current 2026 authority before registering it. Trace every declared
output to a registered TY2026 recipient and every amount to its 1040 line.
If a tax form or statement must be filed, add its PDF and current MeF route;
an amount-only graph edge is insufficient. Keep the original source identity
through deductions, limits, credits and carryforwards. A metadata-only input
must have an explicit filing or application use, or remain outside the
TY2026 registry. Test the supported TY2025 case against the 2026 source and
retain a TY2025 regression.

| Route owner | Nodes from the 2025 registry | TY2026 coding decision |
| --- | --- | --- |
| Income and information-return intake | `f1098`, `f1099g`, `f1099k`, `f1099oid`, `f1099m`, `f1099nec`, `rrb1099r`, `f1098e`, `f4852`, `household_wages` | Reconcile each payer/payee record to one taxable-income, deduction, wage-tax or withholding destination. Route mixed-use records by business/activity and owner. Use [Schedule 1](SCHEDULE1-GRAPH.md), [interest](INTEREST-GRAPH.md), [SSA/RRB benefits](SSA-BENEFITS-GRAPH.md), [Schedule C](SCHEDULEC-GRAPH.md), [Schedule F](SCHEDULEF-GRAPH.md), [Form 8959](FORM8959-GRAPH.md) and [deductions](DEDUCTION-GRAPH.md) as owners. Recheck current information-return revisions and 1099-K classification/threshold rules. File a substitute Form 4852 only when required, rather than treating its numbers as an ordinary W-2. |
| K-1, foreign disclosure and basis | `k1_trust`, `k1_s_corp`, `f5471`, `f8805`, `f8288`, `f8833`, `f8840`, `f8843`, `f8854`, `f8938`, `f8082`, `f114`, `form7203`, `f8594` | Preserve entity, activity, owner, country and affected-year IDs. K-1 income/basis and loss limits feed [Schedule E](SCHEDULEE-GRAPH.md), [at-risk](FORM6198-GRAPH.md), [passive](FORM8582-GRAPH.md), [QBI](QBI-COOPERATIVE-GRAPH.md), [capital](CAPITAL-GAIN-GRAPH.md), [foreign tax](FORM1116-GRAPH.md) and [NIIT](FORM8960-GRAPH.md). Separate foreign information filings, withholding credits and treaty/residency disclosure from actual 1040 income. Form 7203 stock/debt basis and Form 8594 asset-allocation records need their own filed-output decision; do not infer that all 2025 graph inputs were electronically filed. |
| Deductions, adjustments and method/carryover elections | `f3903`, `sep_retirement`, `ltc_premium`, `sales_tax_deduction`, `f8917`, `f8873`, `nol_carryforward`, `educator_expenses`, `self_employed_health_insurance`, `ira_deduction_worksheet`, `f3115`, `f8697`, `f8866`, `f8903`, `ppp_forgiveness`, `f970` | Use one source ledger before [Schedule 1](SCHEDULE1-GRAPH.md), [deduction choice](DEDUCTION-GRAPH.md), [retirement basis](FORM8606-GRAPH.md), [self-employed insurance](FORM7206-GRAPH.md), [business losses](FORM461-GRAPH.md) and [QBI](QBI-COOPERATIVE-GRAPH.md). Verify 2026 eligibility and origin-year limits for every carryforward. Distinguish a current-return deduction from a Form 3115 accounting-method change, Form 970 inventory election, or an older-year/taxpayer election that merely supplies state. Decide explicitly whether a printed or binary attachment is required. |
| Business credit source and passive release | `f8994`, `f5884`, `f6478`, `f6765`, `f8881`, `f8882`, `f8908`, `f8941`, `f8874`, `f3468`, `f8609`, `f8820`, `f8896`, `f8844`, `f8864`, `form8582cr` | These source nodes cannot claim a TY2026 general business credit merely by sending a number to Schedule 3 line 6a. For each live credit, pin its current form/termination or carryforward rule, calculate source amount and activity/passive status, release through Form 8582-CR where applicable, then pass a provenance-bearing record to [Form 3800](GENERAL-BUSINESS-CREDIT-GRAPH.md). [Forms 5884/6765/8994](FORM5884-6765-8994-GRAPH.md) now have source-specific contracts. Reconcile tax-liability limit, origin year, transfer/elective-payment choice, Form 3800 lines, Schedule 3 line 6a, PDF and current MeF. Retire a current-year source only on authority, while preserving valid carryforwards. |
| Tax, payment and rate worksheets | `schedule_r`, `f4255`, `f8801`, `f5405`, `f8611`, `f8828`, `f4970`, `f2210`, `schedule_j`, `form6251`, `rate_28_gain_worksheet`, `unrecaptured_1250_worksheet`, `qdcgtw`, `form8978_reporting_year`, `lump_sum_ss`, `f59e`, `f2439`, `f1040es` | Order income tax and preferential-rate worksheets before AMT and credit limits; keep additional taxes separate from withholding, estimated payments and refundable credits. [Schedule 2/6251](PDF-SCHEDULE2-6251-MAP.md), [capital gain](CAPITAL-GAIN-GRAPH.md), [SSA lump-sum](SSA-BENEFITS-GRAPH.md), [Form 8978](MEF-REMAINDER.md), [1040 settlement](PDF-F1040-MAP.md) and [Schedule 3](PDF-SCHEDULE3-MAP.md) own the destinations. Confirm whether each source is a filed form, worksheet, prior-year tax computation or information-return credit. Run the full return to catch ordering and double counting. |
| Filing, consent and application metadata | `f9465`, `f8958`, `f8379`, `f8332`, `f1310`, `f8867`, `f14039`, `f911`, `f843`, `f8965`, `jointOccupancyStatementNode` | These nodes have **no declared downstream graph target** in their TY2025 modules. Determine whether each creates a required 2026 return answer, separate form, binary attachment, consent, mailing/application process, or only supports an older-year return. Keep filing metadata in the 2026 product only with a documented UI/validation/PDF/MeF or out-of-band workflow. [Joint occupancy](FORM8826-8835-STATEMENTS.md) is a TY2025 Form 5695 regression case; the pinned 2026 form is carryforward-only. |

## Highest-risk source-code findings to resolve before bulk registration

The [Form 3468 facility plan](FORM3468-GRAPH.md) now specifies the largest
investment-credit source in the business-credit row, including its seven
printed parts and distinct Form 3800 destinations.
The [Form 4255 recapture plan](FORM4255-GRAPH.md) specifies the credit-history
and Schedule 2 side of that ledger.
The [Form 1099-K plan](FORM1099K-GRAPH.md) now gives the income-intake row
its transaction-level reconciliation, 2026 cash-tip fields and explicit
separation of payer reporting thresholds from recipient taxability.
The [1099-MISC/NEC plan](FORM1099MISC-NEC-GRAPH.md) adds their 2026 tip
and overtime boxes without duplicating the underlying activity receipt.
The [Form 1099-G plan](FORM1099G-GRAPH.md) specifies the currently rejected
family-leave, business-refund, agriculture and CCC branches.
The [Forms 1098/1098-E plan](FORM1098-1098E-GRAPH.md) supplies mortgage
debt/use, reported-points and 2026 MIP rules plus qualified student-loan
source and MAGI checks for this intake row.

1. The business credit group contains direct `schedule3` outputs, including
   [`f8994`](../../forms/f1040/nodes/inputs/f8994/index.ts). The 2026 route
   must build a Form 3800 source record and its filed evidence before the
   Schedule 3 total. The same audit applies to every named credit node.
2. [`form8978_reporting_year`](https://github.com/filedcom/opentax/blob/2ed64bdd639597466a903200bfee189d38a65e7f/forms/f1040/nodes/intermediate/worksheets/form8978_reporting_year/index.ts)
   allocates negative affected-year tax among tax offsets, Schedule 2 and
   Schedule 3. Reconcile its current source totals with the [Form 8978
   contract](MEF-REMAINDER.md) and printed 2026 lines, including the
   `AnyOtherTaxesStatement` document.
3. `jointOccupancyStatementNode` produces no downstream graph result;
   preserving it in TY2026 would not recreate the 2025 Form 5695
   attachment. The 2026 sunset decision belongs with the 5695 plan.
4. The TY2025 registry includes many `P1`/`P2` inputs without a TY2025 PDF
   descriptor or MeF serializer. The target is **verified TY2026 filing
   behavior**, not copying registration counts. Decide attachment needs
   using current IRS authority and the current MeF accepted-form list.

This document and the generated inventory are a work queue. No row is
`verified` until its calculation, validation, filed output and full-return
test evidence are recorded in the TY2026 implementation.

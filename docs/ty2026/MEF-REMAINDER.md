# TY2026 MeF remainder: Forms 8911/8978 and supporting documents

Snapshot: September 27, 2026. This names the TY2025 MeF modules that the
broader [parity queue](PARITY-QUEUE.md) covered only by family. It specifies
their calculation and attachment ownership; current TY2026 XSD and reject
rules remain a release gate.

## Form 8911 and Schedule A — refueling property

The IRS [December 2025 form](corpus/authorities/f8911--2025.pdf),
[Schedule A](corpus/authorities/f8911sa--2025.pdf) and
[instructions](corpus/authorities/i8911--2025.pdf) explicitly apply to tax
years beginning in 2025 **or later** until superseded. Their inventories
have [15](pdf-fields-f8911.csv) and [35](pdf-fields-f8911sa.csv) fields.
The instructions end eligibility for property placed in service **after
June 30, 2026**; dates in TY2026 therefore split an active and expired
period. Recheck the current IRS product, eligible census-tract list and
MeF release before filing.

- One Schedule A per qualifying property, with item count on Form 8911,
  service and construction dates, location/11-digit GEOID, original use,
  cost net of §179 and eligible associated cost. Separate personal from
  business/investment use for mixed-use property. Verify qualifying main
  home on the personal side and project/PWA or Form 7220 facts on the
  business side.
- Business credit uses 6% or the 30% PWA rate, subject to its per-item
  $100,000 cap and Form 3800. Pass-through-only individuals may report
  directly on Form 3800 under the instructions. Personal credit uses 30%
  with a $1,000 per-item cap, then Form 8911 lines 5–10 tax/AMT limit and
  **2026 Schedule 3 line 6j**. Apply Form 3800 and personal credit ordering
  only once in the return-wide credit resolver.
- The shared [`f8911` node](../../forms/f1040/nodes/inputs/f8911/index.ts)
  accepts one property and blocks any business use. TY2025
  [`IRS8911`](https://github.com/filedcom/opentax/blob/2ed64bdd639597466a903200bfee189d38a65e7f/forms/f1040/2025/mef/forms/f8911.ts) and
  [`IRS8911ScheduleA`](https://github.com/filedcom/opentax/blob/2ed64bdd639597466a903200bfee189d38a65e7f/forms/f1040/2025/mef/forms/f8911_schedule_a.ts)
  serialize that personal-only case. Replace the single-property input
  with property rows, derive credit limits from the 2026 return rather
  than caller-supplied tax totals, and add PDF/MeF per-property links.
  Test June 30/July 1 service dates, multiple and mixed-use items, census
  tract rejection, PWA/7220, pass-through-only and AMT limiting cases.

## Form 8978, Schedule A and other-tax statement

The current IRS [Form 8978](corpus/authorities/f8978--2023.pdf) and
[Schedule A](corpus/authorities/f8978sa--2023.pdf) are January 2023
revisions, with [December 2024 instructions](corpus/authorities/i8978--2024.pdf).
The PDF inventories have [91](pdf-fields-f8978.csv) and
[154](pdf-fields-f8978sa.csv) widgets. Keep BBA audit and AAR sources,
Form 8986 adjustment identity, affected-year tax rules and reporting-year
timing separate from ordinary current-year income.

- Per affected year, reconcile original and corrected income, deductions,
  income tax, AMT, credits, liability, penalty and interest. Schedule A
  carries each adjustment with its tracking identifier. A Form 8978 has
  up to four affected-year columns; multiple Forms 8978 require one linked
  Schedule A apiece. AAR reporting must precede audit reporting where both
  arise, and the audited form's originally reported amounts must reflect
  prior AAR effects when the instructions require it.
- Sum each Form 8978 line 14 into the reporting-year return. A **positive**
  line 14 increases income tax; for a **negative** line 14, the existing
  reporting-year worksheet first offsets applicable tax and can place a
  remaining credit on pinned 2026 [Schedule 3](corpus/draft/f1040s3.pdf)
  line 6l. The [Schedule 2](corpus/draft/f1040s2.pdf) line 17z reduction
  and `AnyOtherTaxesStatement` must match that worksheet. Reconcile this
  allocation against final 2026 return instructions. Keep penalties and
  interest distinct from line 14. Never substitute a marginal-rate estimate
  for affected-year recomputation.
- The shared [`f8978` node](../../forms/f1040/nodes/inputs/f8978/index.ts)
  already retains year columns and routes positive/negative totals through
  different nodes. The TY2025 [`IRS8978`](https://github.com/filedcom/opentax/blob/2ed64bdd639597466a903200bfee189d38a65e7f/forms/f1040/2025/mef/forms/f8978.ts),
  [`IRS8978ScheduleA`](https://github.com/filedcom/opentax/blob/2ed64bdd639597466a903200bfee189d38a65e7f/forms/f1040/2025/mef/forms/f8978_schedule_a.ts)
  and tax-computation PDF statement need a current MeF parent/link check.
  Build both printable forms, one Schedule A and computation statement per
  filing, and validate their document IDs and amount sums. Test mixed
  positive/negative years, AAR then audit, four/>four years, multiple
  filings, penalty/interest, and a net negative line 14.

## Remaining supporting serializers

| TY2025 component | Source ownership and TY2026 acceptance |
| --- | --- |
| `foreign_employer_wages` | This single module contributes **two** runtime descriptors (`fec_record` and `wages_not_shown_schedule`). The public workbook lists `FECRecord` at form level (row 191) and `WagesNotShownSchedule` at 1040 line 1h (row 804). The TY2025 code emits both only from [Form 2555](FORM2555-GRAPH.md) filing details; 2026 source wages must retain employer/country/amount even without a §911 claim. Confirm XSD filing conditions and reconcile line 1h, Form 2555, Form 1116 and any W-2 exclusion without duplicated income. |
| `f1116_direct_expense_statement` | [Form 1116](FORM1116-GRAPH.md) owns each category/country source column, directly allocable expense and explanation. Emit a `ForeignIncmRelatedExpensesStmt` per applicable group, link it to that Form 1116 Part I column, and reconcile expense totals to the foreign-tax limit. Current MeF document order and IDs must be checked. |
| `f4136_diesel_government_sales_statement` | [Form 4136](FORM4136-GRAPH.md) line 6a government diesel sales need each purchaser name/EIN/gallons. The TY2025 `ToWhomDieselFuelSoldStatement` groups buyers; keep claim/business provenance and reconcile gallons to the line and any per-business Schedule A. Check 2026 instructions and MeF tag/placement. |
| `f4835_at_risk` | This is an `IRS6198` produced for a loss-making [Form 4835](FORM4835-GRAPH.md), not a distinct IRS form. Use the [Form 6198 contract](FORM6198-GRAPH.md) per activity with source liabilities/carryforward; reconcile 4835 line 34b, Schedule E and the Form 6198 attachment. |
| `f8283_vehicle_statement` | A claimed noncash vehicle deduction can require a Form 1098-C or equivalent donee statement and a document reference on Form 8283. Preserve donor, donee, VIN/vehicle, sale or significant-intervening-use facts, gross proceeds and dates; attach only when the claimed deduction and current [Form 8283 authority](corpus/authorities/f8283--2025.pdf) require it. [ATS 2](ATS-SCENARIO-02.md) has a separate deduction-choice conflict. |
| `f8621_excess_statement` | [Form 8621](FORM8621-GRAPH.md) Part V excess distribution/stock disposition needs a per-event, per-PFIC-year allocation and interest explanation. Emit and link `TaxationOfExcessDistriStmt` for each affected Form 8621; its totals must equal Part V and 2026 Schedule 2 lines 19a/b. |
| `f8936_schedule_a` | [Form 8936](FORM8936-GRAPH.md) needs a Schedule A for every eligible vehicle, VIN, acquisition/service dates, credit and personal/business allocation. Reconcile Schedule A documents to the main Form 8936, Schedule 2/3, Form 3800 and any dealer transfer. Its TY2025 serializer is a starting XML shape only. |
| `schedule_8812` | [Schedule 8812](SCHEDULE2-8812.md) is a filed MeF form, not merely a 1040 calculated credit. Rebuild TY2026 child/other-dependent eligibility, phaseout, nonrefundable limit and refundable ACTC Part II-B, then reconcile the PDF attachment to 1040 lines 19/28. The TY2025 serializer calls `calculateSchedule8812Lines(2025, ...)` and must use the 2026 graph and current XSD. |

Each component closes only after its source, graph amount, PDF or statement,
MeF root/reference and active reject rules agree in a complete return.

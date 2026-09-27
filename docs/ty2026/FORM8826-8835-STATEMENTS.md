# TY2026 credit forms and statement-only MeF routes

Snapshot: September 27, 2026. This closes a discovery gap in the TY2025
[84-module MeF inventory](mef-coverage.csv). These are implementation
contracts, not TY2026 registered routes. A source statement is a separate
filed document when the current MeF schema requires it; its amount must
reconcile to the return graph.

## Form 8826 — disabled access credit

The IRS [current product page](https://www.irs.gov/forms-pubs/about-form-8826)
continues to publish the [September 2017 Form 8826](corpus/authorities/f8826--2017.pdf),
which includes its instructions on page 2. Its [18 PDF fields](pdf-fields-f8826.csv)
are pinned. This is a current continuous-use authority, subject to a final
2026 product and MeF check.

- Preserve each business and pass-through K-1 source. A business qualifies
  based on prior-year gross receipts **at most $1 million or** prior-year
  full-time employees **at most 30**, with controlled-group aggregation.
  Validate expenditure purpose and the post-1990 facility barrier rule.
- Lines 1–8: eligible costs, $250 floor, $10,000 capped difference, 50%
  self-earned credit, pass-through credits, then a $5,000 total cap. A
  pass-through-only individual reports the credit on Form 3800 without a
  separate Form 8826. A self-earned credit requires Form 8826.
- Reduce the deduction/capitalized cost and avoid other credits by the
  self-earned **line 6** amount. A controlled-group member needs its share
  statement. Release passive credits through Form 8582-CR before Form 3800;
  Form 3800 applies the tax-liability limit and feeds Schedule 3 line 6a.
- The shared [`f8826` node](../../forms/f1040/nodes/inputs/f8826/index.ts)
  calculates a capped source and blocks passive credits, but is not in the
  TY2026 registry. The TY2025 [`IRS8826` serializer](https://github.com/filedcom/opentax/blob/2ed64bdd639597466a903200bfee189d38a65e7f/forms/f1040/2025/mef/forms/f8826_draft.ts)
  omits the direct pass-through-only document by design. Build the current
  PDF and MeF route, controlled-group attachment, Form 8582-CR handoff and
  explicit cost-basis/deduction reduction. Validate 0/$250/$10,250 costs,
  combined credit over $5,000, passive K-1 and pass-through-only cases.

## Form 8835 — renewable electricity production credit

The IRS [product page](https://www.irs.gov/forms-pubs/about-form-8835) still
serves [2025 Form 8835](corpus/authorities/f8835--2025.pdf) and its
[2025 instructions](corpus/authorities/i8835--2025.pdf). These **97 PDF
fields** in the [inventory](pdf-fields-f8835.csv) are a comparison map, not
a TY2026 PDF authority. The IRS [2026 §45 notice](https://www.irs.gov/irb/2026-26_irb)
publishes calendar-year 2026 inflation factors and reference prices, so
the 2025 printed rates/calculation cannot be assumed for 2026 sales.

- Model **one facility per Form 8835**, with construction/service dates,
  resource, kWh produced and sold, facility registration, owner, address,
  coordinates, nameplate capacity, tax-exempt bond financing, and elections.
  Part II computes resource rates, phaseout, bond reduction, increased
  credit, domestic-content and energy-community bonuses, then elected
  transfer/elective payment and Form 3800 source credit.
- Retain facility-specific proof: registration, prevailing wage and
  apprenticeship (including Form 7220 when required), domestic-content
  certification, bonus and transfer records. Reconcile transfers against
  [Schedule A (Form 3800)](corpus/authorities/f3800a--2025.pdf) and avoid
  claiming the transferred amount again in the return credit. Preserve
  eligible older facilities rather than deciding solely from TY2026.
- The shared [`f8835` node](../../forms/f1040/nodes/inputs/f8835/index.ts)
  has a literal `calendar-year 2025` phaseout assumption and TY2025 rates;
  the TY2025 [`IRS8835` serializer](https://github.com/filedcom/opentax/blob/2ed64bdd639597466a903200bfee189d38a65e7f/forms/f1040/2025/mef/forms/f8835.ts)
  requires selected binary statements. Before coding, obtain the 2026 form,
  instructions, applicable 2026 rate notice, current Form 3800 and MeF
  schema/rules; map any changed lines and attachment types. Test multiple
  facilities, fiscal-year sales crossing years, phaseout, bonds, each bonus,
  transfer/elective payment, and zero remaining Form 3800 credit.

## Statement and return-document ownership

| TY2025 MeF module | TY2026 source and calculation contract | Current filed-output decision |
| --- | --- | --- |
| `any_other_taxes_statement` | The TY2025 serializer emits a negative `AnyOtherTaxesStatement` for a Form 8978 reporting-year reduction at Schedule 2 line 17z. Keep the Form 8978 adjustment and Schedule 2 amount in one ledger, including sign and original year. | Recheck 2026 Form 8978, Schedule 2 line and current `AnyOtherTaxesStatement` schema/rule. Never emit a free-standing negative statement without the matching Schedule 2 amount and Form 8978 support. |
| `ccc_loan_accrual_statement` and `ccc_loan_statement` | Preserve per-loan description/amount, farm/activity ID, cash versus accrual method, election and forfeiture year. The first module serves Schedule F accrual Part III; the second serves Schedule F cash line 5a and Form 4835. [Schedule F](SCHEDULEF-GRAPH.md) and [Form 4835](FORM4835-GRAPH.md) own taxable income. | The [pinned 2026 Schedule F instructions](corpus/draft/i1040sf.pdf) require loan-detail statements; current MeF determines XML tags and attachment count. Match each statement to its owning Schedule F or 4835 document and avoid duplicating a K-1 or 1099 receipt. |
| `crop_insurance_deferral_statement` | Keep the §451(f) election by single trade/business, damaged crop, date/cause, payment date/amount/carrier, normal-next-year practice and origin year. The [2026 Schedule F draft](corpus/draft/f1040sf.pdf) and [its instructions](corpus/draft/i1040sf.pdf) set line 6c as deferral to **2027** and line 6d as amount deferred from **2025**. The TY2025 serializer's text literally says `after 2025`, which must change with the loss year. | Generate the statement for every qualifying Schedule F or Form 4835 source, reconcile receipt versus taxable amount and following-year ledger, and verify current `PostponementCropInsDsstrStmt` schema. [Publication 225](https://www.irs.gov/publications/p225) is a comparator for statement content. |
| `foreign_employer_wages` | [Form 2555](FORM2555-GRAPH.md) owns foreign employer, address, wage and exclusion facts. The TY2025 module creates `FECRecord` and `WagesNotShownSchedule`; both need to agree with wages not on W-2, Form 1040 wages, and any excluded amount. | Recheck current MeF parent/root placement and FEC permission under [Pub. 4164](https://www.irs.gov/pub/irs-pdf/p4164.pdf). Emit only when a verified foreign-employer wage source requires it; validate foreign address and identity. |
| `joint_occupancy_statement` | The 2025 statement allocates fuel-cell and home-improvement costs/credit among occupants. [2026 Form 5695](FORM5695-CREDIT-GRAPH.md) is **carryforward only**, so a new 2026 energy expense does not create this statement. | Preserve the 2025 serializer for prior-year/amended returns. Do not register a TY2026 joint-occupancy statement unless final IRS instructions add a qualifying 2026 path. The [IRS correction to 2025 joint occupancy](https://www.irs.gov/forms-pubs/correction-to-the-2025-instructions-for-form-5695-joint-occupancy-calculation) remains a TY2025 regression source. |

Before a TY2026 MeF implementation, check each XML root, type, cardinality,
parent relationship, binary-document reference and business rule against the
**current** TY2026 e-Services package. The downloaded May v1 package is a
research starting point, not final filing proof. Close a statement only after
its source amount, owning form, and XML document reconcile in a full return.

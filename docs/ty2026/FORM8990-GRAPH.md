# TY2026 Form 8990 business-interest limitation contract

Source snapshot: [draft Form 8990, Rev. December
2026](corpus/draft/f8990.pdf), SHA-256
`c9faa031d14b89c8e3d32ea2bff2c0485bcdb3e5df8bb338c11bd88a7bb11429`.
The current [Instructions for Form 8990, Rev. December
2025](corpus/authorities/i8990--2025.pdf), SHA-256
`001d2a9c1f4ca0d74226bc763d73049f5088ab2d5c3f2553b2dfa107de19a2f3`,
are a **prior-revision comparator**, not authority for the draft's new line
numbers. The `i8990--dft.pdf` URL still serves 2025. [Rev. Proc.
2025-32](corpus/authorities/rp-25-32.pdf) §4.30 and [IRS §163(j)
FAQ](https://www.irs.gov/newsroom/questions-and-answers-about-the-limitation-on-the-deduction-for-business-interest-expense)
set the **2026 three-year average gross-receipts threshold at $32 million**.
Verify the final form/instructions, any 2026 guidance, current MeF XSD and
business rules before filing.

## Interest and business records

Keep one return-level §163(j) calculation with source-keyed interest rows:
owner, activity, debt, lender, use-of-proceeds allocation, interest expense
or income, current deduction versus capitalization, floor-plan financing,
excepted/nonexcepted business and entity/K-1 identifiers. Keep three prior
tax years' gross receipts with aggregation and pass-through shares, tax
shelter classification, and elected real-property/farming/utility status.
An excepted election affects [Form 4562](FORM4562-GRAPH.md) depreciation
method/bonus eligibility; it is not merely a switch that bypasses Form 8990.
Personal and investment interest remain outside business-interest expense,
with [Form 4952](https://www.irs.gov/forms-pubs/about-form-4952) handling
investment-interest limits where applicable.

Carry disallowed business interest by **owner, origin year, source activity,
deductible/capitalizable character, and partnership ID**. Partnership excess
business interest expense (EBIE) is released only against the appropriate
partnership's later excess taxable income (ETI) or excess business interest
income (EBII) under the instructions. S-corporation ETI/EBII are distinct
shareholder inputs. Preserve CFC/group ID and election facts for a Form
5471-linked instance when present. The small-business exception needs the
full gross-receipts test and tax-shelter/exception decision; a missing
receipts input is unresolved, not proof the limit applies or does not.

## Printed 2026 calculation

| Section / lines | Source, calculation and handoff |
| --- | --- |
| Header A–D | Foreign-entity name/EIN/reference ID, CFC-group membership, specified-group parent and safe-harbor election. These controls may change which lines are completed and whether a separate Form 5471-linked instance is needed. |
| I, 1–6 | Separate **currently deductible** business interest (1), **currently capitalizable** interest (2; a 2026 expansion), prior-year disallowed interest other than partnership carryover (3), released partner EBIE from Schedule A line 48(h) (4), and floor-plan interest (5). Line 6 totals them. Do not collapse current interest, capitalizable interest and old EBIE into one expense. |
| I, 7–24 | Tentative taxable income (7) is converted to adjusted taxable income (ATI): additions lines 8–16 include nonbusiness deductions, interest, NOL, QBI, **business depreciation/amortization/depletion at line 12**, pass-through losses, partner ETI and S-corp ETI; line 17 totals additions. Reductions lines 18–22 include nonbusiness income, business interest income, pass-through income and CFC inclusion adjustments; line 23 totals reductions. Line 24 combines 7, 17 and 23. The exact signed-item treatment and ATI floor must follow the final instructions, not AGI or a direct Schedule 1 amount. |
| I, 25–35 | Current business interest income plus pass-through EBII (25–27); line 28 = 30% of ATI; lines 29/30 add interest income and floor-plan interest; line 31 is the limit. Line 32 allows the lesser of limit or line 6, line 33 reserves the **capitalized** portion, line 34 is the current-year deduction, and line 35 is disallowed interest. Allocate line 34 back to the original Schedule C/E/F/4835/K-1/asset destinations and maintain the line-35 carryforward by source. |
| II, 36–41 | Partnership-level EBIE, ETI and EBII are allocated to partners; the partnership does not retain its own EBIE carryforward. K-1 statement facts must match each partner's Schedule A rows. |
| III, 42–46 | S-corporation ETI/EBII allocated to shareholders, separately from partnership EBIE. Reconcile the K-1 source and shareholder Schedule B rows. |
| Schedule A, 47–48 | Per-partnership name/EIN, current and prior EBIE, total, ETI, EBII, EBIE treated as paid/accrued and year-end EBIE carryforward. This **precedes Part I** for a partner with pass-through §163(j) items. |
| Schedule B, 49–50 | Per-S-corporation name/EIN and current ETI/EBII, also before Part I where required. The printed page has finite rows; support official continuation statements. |

The limit operates on otherwise deductible interest **before** final
Schedule C/E/F profit, passive loss, [Form 461](FORM461-GRAPH.md) excess
business loss, QBI and AGI. For capitalized interest, send the allowed
portion to the asset/basis ledger before depreciation or disposition. For
excepted real-property and farming businesses, link the election to the
affected [Schedule E](SCHEDULEE-GRAPH.md), [Schedule F](SCHEDULEF-GRAPH.md)
and Form 4562 asset classes. Avoid a cycle when ATI uses tentative taxable
income: snapshot pre-§163(j) deductions and derive the limit once, then
recompute source activity profit and downstream totals.

## Current code boundary

- Shared `form8990` uses TY2025-style aggregate fields and line comments:
  current BIE, one prior carryforward, floor-plan, tentative income, NOL,
  QBI, depreciation and business-interest income. Its ATI shortcut omits
  nonbusiness/pass-through/CFC adjustments and the 2026 capitalizable
  interest branch. It uses the correct configured **$32 million** threshold
  but cannot derive the three-year/aggregated test or elective exceptions.
- Schedule C sends gross mortgage/other interest into Form 8990 only when
  `subject_to_163j` is set; Schedule E sends already-disallowed mortgage and
  other-interest totals. The shared node then adds disallowance to Schedule
  1/AGI as **other income**, rather than allocating the deductible amount
  back to the original expenses and assets. Its one carryforward loses
  entity, source, year and capitalized/deductible character. This also risks
  a wrong Schedule SE, QBI, passive and Form 461 base.
- It returns no form result when there is **no disallowance**, even though
  Form 8990 may still be required for BIE, EBIE/ETI/EBII or CFC facts.
  TY2025 MeF serializes seven raw aggregate tags and the PDF descriptor
  maps seven old positions; neither constructs Part I, Schedule A/B,
  instances or 2026 cross-form reconciliation. The [draft PDF
  inventory](pdf-fields-f8990.csv) has **138 terminal widgets**, all in
  the field tree, on three printed pages plus the draft cover.
- `form8990` is absent from the TY2026 registry/PDF builder, with no TY2026
  MeF or current business-rule validation. The 2025 serializer's tag list
  is not evidence of the authorized 2026 XSD.

## Build order and acceptance

1. Pin final 2026 instructions/form and current MeF release. Confirm the
   2026 $32 million test, CFC rules, capitalizable-interest scope, pass-
   through schedules, exceptions/elections and interest/ATI allocation.
2. Implement source-keyed interest, gross-receipts and entity-ledger facts;
   classify excepted and nonexcepted trades, deductible versus capitalized
   interest and each partnership/S-corp item. Apply entity-level Form 8990
   results before partner/shareholder Schedule A/B, then calculate the
   individual return's Part I. Carry disallowances by origin and entity.
3. Compute all printed lines and allocate line 34 allowed interest to
   owning expense/asset rows. Reconcile line 35 and EBIE against 2027
   records. Run Form 8582, Form 461, Schedule SE, QBI and AGI after the
   activity profit is settled. Preserve TY2025 regressions if shared nodes
   change.
4. Fill and visually inspect all 138 draft widgets and continuation rows;
   emit authorized 2026 MeF form instances and statements from the same
   calculated record. Compare PDF, XML, source schedules/K-1, depreciation
   basis and complete 1040 figures with current XSD/rules.
5. Test $32 million below/at/above, aggregation and tax-shelter exceptions,
   an electing rental/farm business with ADS effects, capitalized interest,
   current/prior disallowed interest, interest income and floor-plan interest,
   ATI with NOL/QBI/depreciation and mixed nonbusiness income, multiple
   partnership EBIE vintages released by the **same** partnership's ETI/EBII,
   S-corp ETI/EBII, CFC facts, full allowance with a required form, and a
   disallowed loss feeding passive/EBL limits. Verify source deduction and
   next-year records, not only a Schedule 1 total.

This is the source and implementation contract. TY2026 calculation, PDF,
validation, MeF and end-to-end filing evidence remain open.

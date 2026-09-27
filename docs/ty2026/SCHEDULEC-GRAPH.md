# TY2026 Schedule C implementation contract

Sources: pinned [2026 draft Schedule C](corpus/draft/f1040sc.pdf) (hash in the
[manifest](corpus/manifest.json)), final [2026 Publication 15-A](corpus/authorities/p15a--2026.pdf),
[draft 2026 Schedule SE instructions](corpus/draft/i1040sse.pdf),
the [2026 mileage authorities](CONSTANTS.md), and the
[13-page ATS scenario 2](ATS-SCENARIO-02.md). The IRS draft Schedule C PDF
has a cover plus two printed pages. The [109-widget inventory](pdf-fields-f1040sc.csv)
records each AcroForm field, tooltip, physical page, and button on-state.
Final Schedule C instructions are not yet available for 2026 in the pinned
instruction ledger; recheck them before filing acceptance.

## Source and line contract

| Printed area | Required per-activity input/result | Current graph gap |
| --- | --- | --- |
| Header, A–J | Owner identity, activity ID, six-digit code, address, accounting method, material participation, new-business flag, and Forms 1099 obligation answers. A `statutory_employee` flag belongs to a specific activity, not to the whole return. | Shared `schedule_c` takes an array of activities, but its W-2 `statutory_wages` and withholding inputs are aggregate fields that its `compute` method does not consume. The W-2 node emits statutory box 1 only to those unused fields, while excluding it from 1040 line 1a. Link each W-2 to one activity or reject an unmatched W-2. |
| Lines 1–7 | Gross receipts include the linked statutory W-2 box 1 once; reconcile 1099-NEC/MISC/K and cash receipts by activity, returns, COGS, and other income. Check the statutory box when its income enters line 1. | `line_1_gross_receipts` is required on each shared item, but it is independent of the W-2 output; a duplicate user entry could double count, while no entry loses the income. Build a single owner for the finalized receipt total. |
| Lines 8–27b | Each deductible expense with source and limitation; line 9 from vehicle calculation, line 13 from depreciation, line 16a mortgage, **16b vehicle loan**, **16c other interest**, plus Part V detail. | Shared item calls 16b `line_16b_interest_other` and the TY2025 MeF serializer sends it to `MortgageInterestPaidOtherAmt`. The 2026 draft has a new 16b vehicle-loan slot and shifts other to 16c. Keep debt, business-use percentage, Form 8990 limit, and Schedule 1-A personal-use interest allocation tied to the same source. |
| Lines 28–32 | Calculate total expenses, tentative and allowed net, home-office limit, loss at-risk answer, Form 6198 linkage and suspended loss. | Shared helper calculates net and a simplified at-risk path. Finish full limitations and preserve gross/allowed amounts by activity for downstream forms. In ATS 2, expenses sum $2,555; line 30 is explicitly zero, but line 1 is blank and needs W-2/activity reconciliation. |
| Part III | Inventory method, opening/purchases/labor/materials/other, ending inventory and COGS. | Existing helper covers numerical COGS; validate method and source records, especially for services versus inventory businesses. |
| Part IV | Date in service; 2026 line **44a business**, **44b commuting**, **44c other** miles; availability and written-record answers. | Shared input names 44a as **total miles**, 44b as business, 44c as commuting, 44d as other. The TY2025 serializer maps by meaning, but a 2026 PDF model must use the new printed labels. Reconcile three categories to the total trip log and split business miles Jan–Jun versus Jul–Dec. ATS 2: 648 × 72.5¢ = $469.80 → line 9 $470. |
| Part V | Itemized other expenses and line 48 total → line 27b once, with continuation when page capacity is exceeded. | Shared helper adds both direct 27b amount and Part V entries; require reconciliation so the same cost is not counted twice. |

## Graph ownership and calculation order

1. Create per-activity records before aggregating. Each input statement
   carries owner, activity ID, payer and source ID, tax year, and amount. Route
   a box-13 statutory W-2's box 1 to that activity's line 1, box 2 to 1040
   line 25a, and box 3/5 to wage-base calculations. Ordinary W-2 box 1 goes
   to 1040 line 1a. The [shared W-2 node](../../forms/f1040/nodes/inputs/w2/index.ts)
   already excludes statutory wages from line 1a, but its Schedule C output
   is not consumed by the shared Schedule C node; this is a source-loss bug
   if reused as-is for TY2026.
2. Calculate vehicle/depreciation/interest/home-office allowed amounts before
   Schedule C. Apply the half-year business mileage function, Form 4562 and
   [Form 8829](FORM8829-GRAPH.md) attachment/carryforward rules, debt
   allocation, and Form 8990 if applicable.
   Keep source inputs distinct from already allowed line amounts.
3. Calculate each Schedule C line 31 after at-risk and passive limitations,
   then aggregate allowed line 31 amounts once to 2026 Schedule 1 line 3
   and Form 1040 line 8. Preserve per-activity amounts for QBI and carryovers.
   A statutory employee's Schedule C net does **not** enter Schedule SE line
   2; the pinned 2026 Schedule SE instructions say so explicitly. Other
   self-employment activities combine under their own SE rules.
4. Send qualified business income through the [joint deduction resolver](DEDUCTION-GRAPH.md)
   and [cooperative patron route](QBI-COOPERATIVE-GRAPH.md). The shared node
   currently sends Schedule C net directly to the simplified Form 8995 node
   and labels all positive net `auto_se_earned_income` for Schedule 8812,
   including statutory net. Audit the 2026 earned-income worksheet and QBI
   activity classification; do not infer QBI from gross receipts alone.

## PDF, MeF, and acceptance

- **PDF:** map all 109 pinned draft widgets, not just page 1 totals. Key
  positions: statutory checkbox `Page1.Line1_ReadOrder.c1_6[0]`, line 1
  `Page1.f1_13[0]`, new 16b `Page1.Lines8-16c_ReadOrder.f1_29[0]`, 16c
  `f1_31[0]`, line 31 `Page1.f1_51[0]`, and Part IV business/commuting/other
  fields `Page2.f2_12[0]`–`f2_14[0]`. Use the full names in the CSV.
  Render both printed pages and any Part V continuation per activity.
- **MeF:** start from the current authorized 2026 `IRS1040ScheduleC` XSD,
  not the TY2025 serializer. The old serializer has a statutory indicator and
  Part IV meaning-based mappings but only one other-interest element and
  old source keys. Diff the 2026 vehicle-interest element, line/checkbox
  topology, at-risk attachment references and current business rules. One
  calculated activity result must feed both XML and PDF.
- **ATS 2:** verify James's box-13 W-2 box 1 reaches Schedule C once and not
  Form 1040 line 1a; June's ordinary W-2 reaches line 1a; both W-2 box 2
  amounts reach line 25a; 648 pre-July miles produce $470; statutory net is
  excluded from SE. The packet's Schedule C line 1 is blank and its
  landscaping activity does not clearly match the beverage employer, so
  provenance must be resolved or carried as an explicit ATS-only assumption
  before claiming a final numeric line 31.
- **Regression:** run TY2025 ordinary and statutory W-2 cases, multiple
  activities, line 16b interest, COGS, Form 6198, Form 8829, Form 4562, and
  Part IV source reconciliation. A complete TY2026 return then passes
  calculation, validation, PDF, current XSD/rules, and ATS together.

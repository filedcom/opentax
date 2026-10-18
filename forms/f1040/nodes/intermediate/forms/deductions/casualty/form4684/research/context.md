# Form 4684 — Casualties and Thefts

## Purpose
Computes deductible casualty and theft losses for personal and business property. Routes to different nodes depending on property type.

## IRS References
- Form 4684 and Instructions (TY2025)
- IRC §165(h) — Losses by Individuals; Limitations on Personal Casualty Losses
- IRC §165(h)(5) as amended by TCJA 2017

## Constants
- **Per-casualty floor (line 11):** $100, or $500 for a qualified disaster loss
- **AGI floor (line 17):** 10% of Form 1040 line 11b, applied on Schedule A (`line18.ts`)
- **TCJA rule:** Personal casualty losses are deductible only for federally declared disasters, or against personal casualty gains (Worksheet 1-1)

## Input Schema — Personal Property (Section A)
- `personal_casualties[]` — one Form 4684 through line 12 per casualty: `description`, `casualty_date`, `kind` (`federally_declared_disaster`, `qualified_disaster`, `not_federally_declared`), FEMA `DR-`/`EM-` number for declared disasters, `qualified_disaster_confirmed`, and up to four `properties` (type, location, date acquired, lines 2, 3, 5 and 6)

## Input Schema — Business Property (Section B)
- `business_fmv_before` / `business_fmv_after` — FMV before and after
- `business_basis` — adjusted basis
- `business_insurance` — insurance reimbursement
- `business_is_section_1231` — true = §1231 property → form4797; false = capital → schedule_d
- Filing details for a long-term business casualty: `business_property_description`, `business_property_location`, `business_acquired_date`, `business_casualty_date`, and `business_casualty_description`. The TY2025 MeF builder requires these facts and verifies the property was held more than one year.

## Compute Logic — Personal
1. Per property: line 4 gain when reimbursement exceeds basis; otherwise lines 7–9
2. Per casualty: line 10 total, line 11 floor, line 12
3. Line 13 gains; line 14 adds declared-disaster line 12 amounts plus non-federal losses up to line 13 (Worksheet 1-1); a net gain (line 13 > line 14) is refused
4. Line 15 net qualified disaster loss → `schedule_a.net_qualified_disaster_loss` (line 16 when itemizing) and `standard_deduction.net_qualified_disaster_loss` (increased standard deduction, Form 1040 line 12e Exception 5)
5. Line 16 → `schedule_a.form4684_line16_loss`; Schedule A finalizes line 15 as line 16 less 10% of AGI (line 18)

## Compute Logic — Business
1. `rawLoss = min(fmv_decline, basis) - insurance`
2. `business_is_section_1231 = true` → `form4797.ordinary_gain_form4684: -loss` (Form 4684 line 38a to Form 4797 line 14)
3. `business_is_section_1231 = false` → `schedule_d.line_11_form2439: -loss` (capital loss)

## Output Nodes
- `scheduleA` (Form 4684 line 16 for Schedule A line 15; net qualified disaster loss for line 16)
- `standard_deduction` (net qualified disaster loss)
- `schedule_d` (capital loss — business non-§1231)
- `form4797` (ordinary loss — business §1231)

## MeF status

A single long-term trade or business casualty loss now emits Form 4684 Section B lines 19 through 28 and 34 through 38a, linked to Form 4797 line 14. The XML builder recalculates the loss from the same basis, value, and reimbursement facts as the tax node and rejects a mismatch between the two forms. This path has an end-to-end TY2025v5.4 XSD test. Section A files one IRS4684 per personal casualty with lines 13 through 18 on the first, reconciled with Schedule A line 15 (`CalcAdjGroIncmMnsTotNetLossAmt`) and the net qualified disaster loss. A non-itemizer with a net qualified disaster loss files Schedule A with only line 16 (the loss and the standard deduction, in `OtherMiscDeductionsStmt`) and line 17. Form 6251 with that increased standard deduction is refused because its line 2a/line 3 split is not modeled. Personal and business casualties together, net personal casualty gains, and short-term/investment business casualties are refused.

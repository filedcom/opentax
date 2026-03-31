# Form 4684 — Casualties and Thefts

## Purpose
Computes deductible casualty and theft losses for personal and business property. Routes to different nodes depending on property type.

## IRS References
- Form 4684 and Instructions (TY2025)
- IRC §165(h) — Losses by Individuals; Limitations on Personal Casualty Losses
- IRC §165(h)(5) as amended by TCJA 2017

## TY2025 Constants
- **Per-event floor:** $100 (IRC §165(h)(1))
- **AGI floor:** 10% of AGI (IRC §165(h)(2))
- **TCJA rule:** Personal casualty losses deductible ONLY for federally declared disasters

## Input Schema — Personal Property (Section A)
- `personal_fmv_before` / `personal_fmv_after` — FMV before and after event
- `personal_basis` — adjusted cost basis
- `personal_insurance` — insurance reimbursement received
- `is_federal_disaster` — must be true for any personal loss deduction (TCJA)
- `agi` — for 10% floor calculation

## Input Schema — Business Property (Section B)
- `business_fmv_before` / `business_fmv_after` — FMV before and after
- `business_basis` — adjusted basis
- `business_insurance` — insurance reimbursement
- `business_is_section_1231` — true = §1231 property → form4797; false = capital → schedule_d

## Compute Logic — Personal
1. `is_federal_disaster !== true` → return `[]`
2. `rawLoss = min(fmv_decline, basis) - insurance`
3. After $100 floor: `max(0, loss - 100)`
4. After 10% AGI floor: `max(0, afterFloor - agi × 0.10)`
5. Routes to `scheduleA.line_15_casualty_theft_loss`

## Compute Logic — Business
1. `rawLoss = min(fmv_decline, basis) - insurance`
2. `business_is_section_1231 = true` → `form4797.ordinary_gain: -loss`
3. `business_is_section_1231 = false` → `schedule_d.line_11_form2439: -loss` (capital loss)

## Output Nodes
- `scheduleA` (line 15 — personal losses)
- `schedule_d` (capital loss — business non-§1231)
- `form4797` (ordinary loss — business §1231)

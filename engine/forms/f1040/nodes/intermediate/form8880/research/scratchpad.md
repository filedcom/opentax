# Form 8880 — Scratchpad

## Research Notes

### TY2025 AGI limits and credit rates (Rev Proc 2024-40 / IRS i8880 2025)

| Filing Status | 50% credit | 20% credit      | 10% credit       | 0% (above limit) |
| ------------- | ---------- | --------------- | ---------------- | ---------------- |
| Single / MFS / QSS | ≤$23,000 | $23,001–$25,000 | $25,001–$38,250 | >$38,250 |
| HOH           | ≤$34,500  | $34,501–$37,500 | $37,501–$57,375  | >$57,375 |
| MFJ           | ≤$46,000  | $46,001–$50,000 | $50,001–$76,500  | >$76,500 |

### Max eligible contributions per person: $2,000
### Contributions come from:
- Traditional IRA contributions
- Roth IRA contributions
- 401(k) / 403(b) / 457(b) / SIMPLE / SARSEP elective deferrals (W-2 Box 12 D/E/G)
- Voluntary after-tax contributions to qualified retirement plans

### Distributions reduce contributions (Line 2):
- IRA distributions received in test period (2 years prior, current year, plus up to tax filing date of following year)
- Other retirement plan distributions

### Output: Schedule 3 Line 4 (nonrefundable credit)
- Credit is limited to tax liability (but we accept income_tax_liability as an input for the credit limit)
- For simplicity: credit = min(eligible_contributions × rate, income_tax_liability)
  - If income_tax_liability not provided: route full credit to schedule3

### MFS restriction
- MFS filers can claim the credit (unlike some other credits); no restriction

### Eligibility requirements (not modeled as hard blocks, soft validation):
- Must be 18 or older
- Cannot be full-time student
- Cannot be claimed as dependent on another return
- These are flags we accept but use as disqualifiers

## Implementation decisions

1. Schema accepts per-person contributions (taxpayer + optional spouse for MFJ)
2. `elective_deferrals` from W-2 is aggregated across both spouses by the W-2 node
   - Need to split or accept separate fields: `elective_deferrals_taxpayer` + `elective_deferrals_spouse`
   - Actually W-2 sends a single `elective_deferrals` field — this is the combined total from all W-2s
   - For MFJ we need taxpayer/spouse split. Let's accept both `elective_deferrals_taxpayer` and
     `elective_deferrals_spouse` since the W-2 node would need to differentiate by TSJ
   - Looking at W-2 node: it sums Box12 D+E+G across all regular items. The W-2 node routes TSJ=J items
     together. For simplicity, we accept `elective_deferrals` (total), plus direct IRA contribution fields.
   - Actually: let's look at the actual W-2 output:
     `outputs.push({ nodeType: form8880.nodeType, input: { elective_deferrals: deg } })`
     This is a single field. The form8880 node needs to allocate between taxpayer/spouse.
   - Decision: accept `elective_deferrals` (total, from W-2) + per-person IRA contributions
     - For MFJ: user can enter `ira_contributions_taxpayer` + `ira_contributions_spouse`
     - For non-MFJ: `ira_contributions` (taxpayer only)
     - Elective deferrals split: `elective_deferrals_taxpayer` + `elective_deferrals_spouse`
       (W-2 node sends single `elective_deferrals`; we treat it as taxpayer-only unless a spouse field exists)

3. For the credit computation:
   - Each person: eligible = min(contributions - distributions, 2000), where contributions >= 0
   - Total eligible = taxpayer_eligible + spouse_eligible
   - Rate = based on AGI and filing status
   - Credit = total_eligible × rate
   - Output → schedule3 line4_retirement_savings_credit

## W-2 elective deferrals question
The W-2 node sends a single `elective_deferrals` field. This represents the sum of Box 12 D+E+G
across all W-2s for the return. The TSJ (Taxpayer/Spouse/Joint) handling in the W-2 node should
separate them. Looking at W-2 box12NodeOutputs — it uses regularItems() which doesn't filter by TSJ.
So the combined total lands in form8880. We'll treat this as taxpayer-side unless spouse_deferrals is
separately provided.

Actually for form8880 we should accept:
- `elective_deferrals_taxpayer` (optional)
- `elective_deferrals_spouse` (optional)
- `ira_contributions_taxpayer` (optional) — traditional + Roth IRA
- `ira_contributions_spouse` (optional)
- `distributions_taxpayer` (optional) — disqualifying distributions
- `distributions_spouse` (optional)
- `agi` (optional)
- `filing_status` (optional)
- `income_tax_liability` (optional) — for credit limit

The W-2 currently sends `elective_deferrals` (no suffix). We'll accept `elective_deferrals` too
and treat it as taxpayer-only for backward compatibility.

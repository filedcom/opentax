# LTC Premium — Long-Term Care Insurance Premium Worksheet

## Overview

The LTC Premium Worksheet computes the eligible (deductible) long-term care insurance premium for each insured person. The eligible amount is the lesser of (a) the actual annual premium paid or (b) the age-based dollar limit set by Rev. Proc. 2024-40. The eligible amount flows to Schedule A as a medical expense (IRC §213(d)(10)).

Only premiums paid for a "qualified long-term care insurance contract" under IRC §7702B are eligible. One worksheet entry per insured person (taxpayer and/or spouse each have their own entry).

**IRS Form:** No standalone form — LTC Premium Worksheet is built into Schedule A instructions
**Drake Screen:** LTC
**Node Type:** input (per-person array)
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/10960

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| `age` | `number` (integer, 0–130) | Yes | Age of insured as of December 31, 2025 | The insured's age determines the applicable dollar limit. Age on the last day of the tax year is used. | IRC §213(d)(10); Rev. Proc. 2024-40 §3.34 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| `actual_premium_paid` | `number` (nonnegative) | Yes | Annual LTC insurance premium paid | The total annual premium paid for the qualified LTC contract during tax year 2025. | IRC §213(d)(10) | https://www.irs.gov/instructions/i1040sca |
| `is_qualified_contract` | `boolean` | Yes | Is this a qualified LTC contract under IRC §7702B? | Only premiums for qualified contracts are eligible. A qualified LTC contract must: be guaranteed renewable, have no cash surrender value, provide only qualified LTC services. | IRC §7702B | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section7702B |

---

## Calculation Logic

### Step 1 — Validate qualified contract
If `is_qualified_contract !== true`, eligible amount = 0. No output is emitted for non-qualified contracts.
Source: IRC §213(d)(10); IRC §7702B

### Step 2 — Determine age-based limit
Look up the age bracket for the insured's age (as of December 31, 2025):
- Age ≤ 40: $480
- Age 41–50: $900
- Age 51–60: $1,800
- Age 61–70: $4,770
- Age 71+: $5,970

Source: Rev. Proc. 2024-40, §3.34, Table (TY2025 amounts); IRC §213(d)(10)

### Step 3 — Compute eligible premium
```
eligible = min(actual_premium_paid, age_limit)
```

### Step 4 — Aggregate across all persons
Sum eligible amounts across all items (taxpayer + spouse each enter separately).

### Step 5 — Route to Schedule A
The aggregate eligible LTC premium flows to Schedule A as a medical expense. Schedule A then applies the 7.5% AGI floor.

Source: IRC §213(d)(10); Schedule A Instructions Line 1

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| `line_1_medical` | `schedule_a` | `is_qualified_contract === true` AND `eligible > 0` | IRC §213(d)(10); Schedule A Line 1 | https://www.irs.gov/pub/irs-pdf/f1040sa.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Age ≤ 40 limit | $480 | Rev. Proc. 2024-40 §3.34; IRC §213(d)(10) | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| Age 41–50 limit | $900 | Rev. Proc. 2024-40 §3.34; IRC §213(d)(10) | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| Age 51–60 limit | $1,800 | Rev. Proc. 2024-40 §3.34; IRC §213(d)(10) | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| Age 61–70 limit | $4,770 | Rev. Proc. 2024-40 §3.34; IRC §213(d)(10) | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| Age 71+ limit | $5,970 | Rev. Proc. 2024-40 §3.34; IRC §213(d)(10) | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (per insured person)"]
    AGE["age"]
    PREM["actual_premium_paid"]
    QUAL["is_qualified_contract"]
  end
  subgraph node["ltc_premium"]
    FILTER["Reject non-qualified contracts"]
    LIMIT["age_limit = lookup(age)"]
    ELIGIBLE["eligible = min(premium, limit)"]
    SUM["Sum across all persons"]
  end
  subgraph outputs["Downstream Nodes"]
    SA["schedule_a.line_1_medical"]
  end
  AGE --> LIMIT
  PREM --> ELIGIBLE
  QUAL --> FILTER
  FILTER --> ELIGIBLE
  LIMIT --> ELIGIBLE
  ELIGIBLE --> SUM
  SUM -->|"sum > 0"| SA
```

---

## Edge Cases & Special Rules

1. **Non-qualified contract produces zero output.** Only IRC §7702B qualified contracts are eligible. If `is_qualified_contract` is false or omitted, the premium is entirely ineligible and no output is emitted.

2. **Premium capped at age-based limit, not reduced to zero.** If `actual_premium_paid > age_limit`, eligible = age_limit (not zero). The person still gets a deduction up to the cap.

3. **Age boundary — exactly 40.** A person who is exactly 40 on December 31, 2025, uses the ≤40 bracket ($480).

4. **Age boundary — exactly 41.** A person who is exactly 41 uses the 41–50 bracket ($900).

5. **Age boundary — exactly 71.** A person who is exactly 71 uses the 71+ bracket ($5,970).

6. **Both spouses can each enter LTC premiums separately.** The taxpayer and spouse may each have their own LTC policy; they enter separate items. Each is independently capped, then the eligible amounts are summed before flowing to Schedule A.

7. **Schedule A AGI floor applies downstream.** The `ltc_premium` node passes the gross eligible amount to `schedule_a.line_1_medical`. Schedule A then subtracts 7.5% of AGI. The LTC node does NOT apply the AGI floor — that is Schedule A's responsibility.

8. **Employer-paid LTC premiums.** Employer-paid LTC premiums are generally not deductible as a medical expense. The `actual_premium_paid` should reflect only the amounts paid by the taxpayer (not employer-paid amounts excluded from W-2).

9. **LTC benefits are separate from premiums.** LTC benefit payments received (not premiums paid) are addressed under IRC §7702B(a); this node only handles premium deductibility.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Rev. Proc. 2024-40 (TY2025 inflation adjustments) | 2024 | §3.34 (LTC eligible premium limits) | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | N/A |
| IRC §213(d)(10) — Qualified LTC premiums as medical expense | Current | §213(d)(10) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section213 | N/A |
| IRC §7702B — Qualified LTC insurance contracts | Current | §7702B | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section7702B | N/A |
| Schedule A (Form 1040) Instructions | 2025 | Line 1 (medical expenses) | https://www.irs.gov/instructions/i1040sca | N/A |
| IRS Publication 502 (Medical and Dental Expenses) | 2024 | Long-term care insurance section | https://www.irs.gov/pub/irs-pdf/p502.pdf | N/A |
| Drake Software KB — LTC Premium Worksheet | Current | LTC screen | https://kb.drakesoftware.com/Site/Browse/10960 | N/A |

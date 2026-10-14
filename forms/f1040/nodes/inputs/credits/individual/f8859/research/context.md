# f8859 — Form 8859: Carryforward of the DC First-Time Homebuyer Credit

## Overview
Form 8859 tracks carryforwards of the DC first-time homebuyer credit (IRC §1400C). The credit itself expired after December 31, 2011, so no new credits can be generated for TY2025. However, taxpayers who had unused credit from prior years (TY2011 and earlier) may still carry forward and apply that credit against their current-year tax liability. The credit is nonrefundable — it is limited to the taxpayer's tax liability and cannot generate a refund. The carryforward routes to Schedule 3 as a nonrefundable credit.

**IRS Form:** Form 8859
**Drake Screen:** 8859
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** N/A

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| carryforward_amount | number (nonneg) | No | Prior year unused DC homebuyer credit | Unused DC first-time homebuyer credit carried forward from prior year(s) | IRC §1400C(b)(3); Form 8859 Line 4 | https://www.irs.gov/pub/irs-pdf/f8859.pdf |

---

## Calculation Logic

### Step 1 — Apply carryforward to current year liability
The carryforward amount is the unused DC first-time homebuyer credit from prior years. For TY2025, no new credit can be earned (credit expired after 2011). The available carryforward is applied directly against tax liability as a nonrefundable credit.
Source: IRC §1400C(b)(3); Form 8859 instructions; Treas. Reg. §1.1400C-1.

### Step 2 — Route to Schedule 3
The available credit routes to Schedule 3 (Part I, nonrefundable credits). In the engine, Schedule 3 aggregates nonrefundable credits into line 8 → Form 1040 line 20.
Source: Form 8859 instructions; Schedule 3, Part I, line 6z or equivalent other credit line.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line6z_general_business_credit (or appropriate other credit field) | schedule3 | carryforward_amount > 0 | IRC §1400C; Form 8859 instructions | https://www.irs.gov/pub/irs-pdf/f8859.pdf |

Note: The DC first-time homebuyer credit is a nonrefundable credit. In the schedule3 node, the closest available field for "other nonrefundable credits" is line6z_general_business_credit (used as an aggregation point for other credits not broken out separately). This maps to Schedule 3, Part I, line 6z (other credits).

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| New credit generation | $0 (expired after 2011) | IRC §1400C; Consolidated Appropriations Act 2012 | https://www.law.cornell.edu/uscode/text/26/1400C |
| Nonrefundable limit | Limited to tax liability | IRC §1400C(b)(3) | https://www.law.cornell.edu/uscode/text/26/1400C |
| Carryforward period | Indefinite (per IRC §1400C) | IRC §1400C(b)(3) | https://www.law.cornell.edu/uscode/text/26/1400C |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry"]
    A[carryforward_amount]
  end
  subgraph node["f8859 Node"]
    B[credit = carryforward_amount]
  end
  subgraph outputs["Downstream Nodes"]
    C[schedule3: line6z_general_business_credit]
  end
  inputs --> node --> outputs

---

## Edge Cases & Special Rules

1. **No new credits**: The credit expired after 2011. The only input field is the carryforward from prior years. A fresh-start taxpayer in 2025 with no prior carryforward will produce zero output.
2. **Nonrefundable**: The credit cannot exceed current-year tax liability. The schedule3 node handles this aggregation; the f8859 node just passes the carryforward amount.
3. **Zero carryforward**: If carryforward_amount is 0 or absent, no output is emitted.
4. **Carryforward source**: The carryforward comes from Form 8859 prior-year (line 5 on prior Form 8859, or from original credit computation for the last eligible year TY2011 or earlier).

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8859 | 2025 | All | https://www.irs.gov/pub/irs-pdf/f8859.pdf | N/A |
| IRC §1400C | - | §1400C | https://www.law.cornell.edu/uscode/text/26/1400C | N/A |
| Rev. Proc. 2024-40 | 2024 | TY2025 constants | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | N/A |

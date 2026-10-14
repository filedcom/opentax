# Depletion — Oil, Gas & Mineral Depletion Worksheet

## Overview
This node captures depletion deductions for mineral, oil, and gas interests. Taxpayers with natural resource properties must compute depletion each year and deduct the larger of cost depletion or percentage depletion. The node routes the computed deduction to Schedule C (business property) or Schedule E (royalty/rental mineral interest).

**IRS Form:** No standalone form — Depletion Worksheet (supplemental)
**Drake Screen:** DEPL
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** N/A

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| property_type | enum(OIL_GAS, COAL, METALS, OTHER_MINERAL) | yes | Property Type | Type of mineral/resource for percentage depletion rate lookup | IRC §613, §613A | https://www.law.cornell.edu/uscode/text/26/613 |
| method | enum(COST, PERCENTAGE) | yes | Method | Depletion method selected (taxpayer uses the greater) | IRC §611 | https://www.law.cornell.edu/uscode/text/26/611 |
| gross_income | number >= 0 | yes | Gross Income | Gross income from the property for percentage depletion net income limit | IRC §613(a) | https://www.law.cornell.edu/uscode/text/26/613 |
| deductible_expenses | number >= 0 | yes | Deductible Expenses | Deductible costs attributable to the property (to compute net income) | IRC §613(a) | https://www.law.cornell.edu/uscode/text/26/613 |
| adjusted_basis | number >= 0 | conditional | Adjusted Basis | Depletable basis in the property — required for cost depletion | IRC §611(b) | https://www.law.cornell.edu/uscode/text/26/611 |
| estimated_reserves | number > 0 | conditional | Estimated Reserves | Remaining recoverable units — required for cost depletion | IRC §611(b) | https://www.law.cornell.edu/uscode/text/26/611 |
| units_produced | number >= 0 | no | Units Produced | Total units extracted during the year | IRC §611(b) | https://www.law.cornell.edu/uscode/text/26/611 |
| units_sold | number >= 0 | yes | Units Sold | Units sold during the year — basis for cost depletion | IRC §611(b) | https://www.law.cornell.edu/uscode/text/26/611 |
| taxable_income_before_depletion | number >= 0 | conditional | Taxable Income | Taxpayer's taxable income before depletion — required for 65% cap (oil/gas) | IRC §613A(d)(1) | https://www.law.cornell.edu/uscode/text/26/613A |
| is_independent_producer | boolean | no | Independent Producer | True if taxpayer qualifies as independent oil/gas producer (not a retailer/refiner) | IRC §613A(c) | https://www.law.cornell.edu/uscode/text/26/613A |
| purpose | enum(SCHEDULE_C, SCHEDULE_E) | yes | Purpose | Where deduction routes: Schedule C (business) or Schedule E (royalty/rental) | IRC §611, Pub 535 | https://www.irs.gov/publications/p535 |

---

## Calculation Logic

### Step 1 — Cost Depletion
Cost depletion = (adjusted_basis / estimated_reserves) × units_sold
Source: IRC §611(b); Treas. Reg. §1.611-2

### Step 2 — Percentage Depletion Rate
Rate by property_type:
- OIL_GAS: 15% (independent producers/royalty owners; IRC §613A(c))
- COAL: 10% (IRC §613(b))
- METALS: 15% for gold, silver, copper, iron ore; 22% for sulphur/uranium and certain other metals; 14% for other metal mines
- OTHER_MINERAL: 5%–14% depending on mineral (use 14% for "all other minerals" per §613(b))

### Step 3 — Percentage Depletion Computation
Gross percentage depletion = gross_income × rate

### Step 4 — Net Income Limit (all properties)
Property net income = gross_income − deductible_expenses
Percentage depletion capped at: min(gross_percentage, net_income × 1.00)
Source: IRC §613(a): "shall not exceed 100 percent of the taxpayer's taxable income from the property"
Note: For general minerals under §613, limit is 50% of net income. Only oil/gas uses 100%.

### Step 5 — 65% of Taxable Income Limit (oil/gas only)
For OIL_GAS: percentage depletion further capped at 65% of taxable_income_before_depletion
Source: IRC §613A(d)(1)

### Step 6 — Greater of Cost or Percentage
depletion_deduction = max(cost_depletion, percentage_depletion_allowed)

### Step 7 — Route to downstream node
If purpose = SCHEDULE_C → depletion_deduction to schedule_c.depletion
If purpose = SCHEDULE_E → depletion_deduction to schedule_e.depletion

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| depletion_deduction | schedule_c | purpose === SCHEDULE_C && deduction > 0 | IRC §611 | https://www.law.cornell.edu/uscode/text/26/611 |
| depletion_deduction | schedule_e | purpose === SCHEDULE_E && deduction > 0 | IRC §611 | https://www.law.cornell.edu/uscode/text/26/611 |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Oil/Gas percentage depletion rate (independent producer) | 15% | IRC §613A(c) | https://www.law.cornell.edu/uscode/text/26/613A |
| Coal percentage depletion rate | 10% | IRC §613(b) | https://www.law.cornell.edu/uscode/text/26/613 |
| Metals (gold, silver, copper, iron ore) percentage depletion rate | 15% | IRC §613(b) | https://www.law.cornell.edu/uscode/text/26/613 |
| Sulphur/uranium and certain metals percentage depletion rate | 22% | IRC §613(b) | https://www.law.cornell.edu/uscode/text/26/613 |
| Other metal mines percentage depletion rate | 14% | IRC §613(b) | https://www.law.cornell.edu/uscode/text/26/613 |
| Other minerals (default) percentage depletion rate | 14% | IRC §613(b) | https://www.law.cornell.edu/uscode/text/26/613 |
| Net income limit (general minerals) | 50% of net income | IRC §613(a) | https://www.law.cornell.edu/uscode/text/26/613 |
| Net income limit (oil/gas) | 100% of net income | IRC §613(a) | https://www.law.cornell.edu/uscode/text/26/613 |
| 65% taxable income limit (oil/gas only) | 65% of taxable income | IRC §613A(d)(1) | https://www.law.cornell.edu/uscode/text/26/613A |
| Independent producer daily oil limit | 1,000 barrels/day | IRC §613A(c)(3) | https://www.law.cornell.edu/uscode/text/26/613A |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    A[property_type, method, gross_income, deductible_expenses, adjusted_basis, estimated_reserves, units_sold, taxable_income_before_depletion, purpose]
  end
  subgraph node["depletion node"]
    B[Cost Depletion = basis/reserves × units_sold]
    C[Percentage Depletion = gross_income × rate]
    D[Apply net income limit]
    E[Apply 65% cap for oil/gas]
    F[Deduction = max of cost vs percentage]
  end
  subgraph outputs["Downstream Nodes"]
    G[schedule_c.depletion]
    H[schedule_e.depletion]
  end
  A --> B
  A --> C
  C --> D
  D --> E
  B --> F
  E --> F
  F --> G
  F --> H
```

---

## Edge Cases & Special Rules

1. **Cost depletion only if basis > 0 and reserves > 0**: If adjusted_basis = 0 or estimated_reserves = 0, cost depletion = 0.
2. **Percentage depletion for oil/gas requires is_independent_producer**: If not independent producer, percentage depletion is not available for oil/gas (major integrated companies cannot claim it).
3. **COST method forced**: If method = COST, skip percentage depletion entirely.
4. **PERCENTAGE method forced**: If method = PERCENTAGE, skip cost depletion and apply percentage depletion.
5. **Net income can be zero**: If gross_income <= deductible_expenses, net income = 0, percentage depletion = 0.
6. **65% cap applies only to OIL_GAS**: Coal, metals, and other minerals are NOT subject to the 65% cap.
7. **50% net income limit for non-oil/gas minerals**: IRC §613(a) limits general mineral depletion to 50% of net income from the property.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRC §613 | current | Percentage depletion rates | https://www.law.cornell.edu/uscode/text/26/613 | N/A |
| IRC §613A | current | Oil/gas special rules | https://www.law.cornell.edu/uscode/text/26/613A | N/A |
| IRC §611 | current | Depletion allowance general | https://www.law.cornell.edu/uscode/text/26/611 | N/A |

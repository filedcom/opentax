# Auto Expense — Vehicle Expense Worksheet

## Overview

The Auto Expense Worksheet computes deductible business vehicle expenses for Schedule C (self-employment), Schedule E (rental/S-corp/partnership), or Schedule F (farm). Two methods are available: (1) Standard mileage rate, (2) Actual expense method. Each vehicle is entered as a separate item. The computed deductible amount flows to the appropriate destination schedule based on the vehicle's `purpose` field.

**IRS Form:** No standalone form — Part IV of Schedule C; supported by Form 4562 for actual method depreciation
**Drake Screen:** AUTO
**Node Type:** input (per-vehicle array)
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/10793

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| `vehicle_description` | `string` | Yes | Description of vehicle | Year, make, model of the vehicle (e.g., "2022 Toyota Camry"). | Rev. Proc. 2019-46 | https://www.irs.gov/pub/irs-drop/rp-19-46.pdf |
| `placed_in_service_date` | `string` | Yes | Date first placed in service | Date the vehicle was first placed in business service (YYYY-MM-DD or MM/DD/YYYY). Required for depreciation calculations. | IRC §168; Form 4562 | https://www.irs.gov/pub/irs-pdf/f4562.pdf |
| `business_miles` | `number` (integer, nonneg) | Yes | Business miles driven | Number of miles driven for business purposes during 2025. | Rev. Proc. 2019-46; IRS Pub. 463 | https://www.irs.gov/pub/irs-pdf/p463.pdf |
| `total_miles` | `number` (integer, positive) | Yes | Total miles driven | Total miles driven on the vehicle during 2025 (business + commuting + other). Used to compute business-use percentage. | IRS Pub. 463 | https://www.irs.gov/pub/irs-pdf/p463.pdf |
| `method` | `AutoMethod` enum (`"standard"` \| `"actual"`) | Yes | Standard mileage or actual expense method | Determines which calculation method to use. | Rev. Proc. 2019-46; IRC §280F | https://www.irs.gov/pub/irs-drop/rp-19-46.pdf |
| `actual_expenses` | `object` (see sub-fields) | If method = "actual" | Actual vehicle expenses breakdown | Required when method = "actual". See sub-fields below. | IRC §280F | https://www.irs.gov/instructions/i4562 |
| `actual_expenses.depreciation` | `number` (nonneg) | No | Depreciation (from Form 4562) | MACRS depreciation on the vehicle. | IRC §168; §280F | https://www.irs.gov/pub/irs-pdf/f4562.pdf |
| `actual_expenses.gas_oil` | `number` (nonneg) | No | Gas and oil | Actual gasoline and oil costs during the year. | IRS Pub. 463 | https://www.irs.gov/pub/irs-pdf/p463.pdf |
| `actual_expenses.repairs` | `number` (nonneg) | No | Repairs and maintenance | Actual repair and maintenance costs. | IRS Pub. 463 | https://www.irs.gov/pub/irs-pdf/p463.pdf |
| `actual_expenses.insurance` | `number` (nonneg) | No | Insurance | Business-portion of vehicle insurance. | IRS Pub. 463 | https://www.irs.gov/pub/irs-pdf/p463.pdf |
| `actual_expenses.registration` | `number` (nonneg) | No | License and registration fees | Annual vehicle registration fees. | IRS Pub. 463 | https://www.irs.gov/pub/irs-pdf/p463.pdf |
| `actual_expenses.lease_payments` | `number` (nonneg) | No | Lease payments | Lease payments for leased vehicles (subject to inclusion amount rules). | IRC §280F(c); IRS Pub. 463 | https://www.irs.gov/pub/irs-pdf/p463.pdf |
| `actual_expenses.other` | `number` (nonneg) | No | Other actual expenses | Other vehicle-related business expenses (tires, tolls, parking). | IRS Pub. 463 | https://www.irs.gov/pub/irs-pdf/p463.pdf |
| `purpose` | `AutoPurpose` enum | Yes | Destination schedule | Where the deduction flows: SCHEDULE_C, SCHEDULE_E, or SCHEDULE_F. | Schedule C/E/F | N/A |

---

## Calculation Logic

### Step 1 — Validate inputs
- `business_miles` must be ≤ `total_miles`
- `total_miles` must be > 0 (required to compute business percentage)
- If method = "actual" and `actual_expenses` is not provided, treat all actual expenses as zero

### Step 2 — Compute business-use percentage
```
business_pct = business_miles / total_miles
```
Business percentage is capped at 1.0 (100%).

Source: IRS Pub. 463, Chapter 4; IRC §280F

### Step 3 — Compute deductible expense

**Standard mileage method:**
```
deductible = business_miles × 0.70
```
(70 cents per mile for TY2025 per IRS Notice 2025-5)

**Actual expense method:**
```
total_actual = depreciation + gas_oil + repairs + insurance + registration + lease_payments + other
deductible = total_actual × business_pct
```

Source: Rev. Proc. 2019-46; IRS Notice 2025-5; IRS Pub. 463

### Step 4 — Aggregate by purpose
Sum deductible amounts separately for SCHEDULE_C, SCHEDULE_E, and SCHEDULE_F vehicles.

### Step 5 — Route to downstream schedules
- SCHEDULE_C → `schedule_c.line_9_car_truck_expenses`
- SCHEDULE_E → `schedule_e.expense_auto_travel`
- SCHEDULE_F → `schedule_f.line10_car_truck`

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| `line_9_car_truck_expenses` | `schedule_c` | purpose = SCHEDULE_C AND deductible > 0 | Schedule C Line 9 | https://www.irs.gov/pub/irs-pdf/f1040sc.pdf |
| `expense_auto_travel` | `schedule_e` | purpose = SCHEDULE_E AND deductible > 0 | Schedule E expenses | https://www.irs.gov/pub/irs-pdf/f1040se.pdf |
| `line10_car_truck` | `schedule_f` | purpose = SCHEDULE_F AND deductible > 0 | Schedule F Line 10 | https://www.irs.gov/pub/irs-pdf/f1040sf.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Standard mileage rate (business) | $0.70/mile (70 cents) | IRS Notice 2025-5 | https://www.irs.gov/pub/irs-drop/n-25-05.pdf |
| Business percentage cap | 100% (1.0) | IRS Pub. 463 | https://www.irs.gov/pub/irs-pdf/p463.pdf |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (per vehicle)"]
    DESC["vehicle_description"]
    DATE["placed_in_service_date"]
    BMILES["business_miles"]
    TMILES["total_miles"]
    METHOD["method: standard | actual"]
    ACTUAL["actual_expenses (object)"]
    PURPOSE["purpose: SCHEDULE_C | E | F"]
  end
  subgraph node["auto_expense"]
    PCT["business_pct = business/total"]
    CALC["deductible = miles×0.70 OR actual×pct"]
    AGG["Aggregate by purpose"]
  end
  subgraph outputs["Downstream Nodes"]
    SC["schedule_c.line_9_car_truck_expenses"]
    SE["schedule_e.expense_auto_travel"]
    SF["schedule_f.line10_car_truck"]
  end
  BMILES --> PCT
  TMILES --> PCT
  METHOD --> CALC
  ACTUAL --> CALC
  BMILES --> CALC
  PCT --> CALC
  PURPOSE --> AGG
  CALC --> AGG
  AGG -->|"SCHEDULE_C > 0"| SC
  AGG -->|"SCHEDULE_E > 0"| SE
  AGG -->|"SCHEDULE_F > 0"| SF
```

---

## Edge Cases & Special Rules

1. **Standard mileage rate cannot be used if MACRS depreciation was claimed.** Once actual expenses with MACRS depreciation are used, the taxpayer is locked into actual method for that vehicle in all subsequent years (Rev. Proc. 2019-46 §4.02). The node accepts the `method` field as-entered; it does not enforce the prior-year restriction (that is a data-entry constraint).

2. **Business miles cannot exceed total miles.** If `business_miles > total_miles`, this is invalid data. The node throws a validation error.

3. **Zero business miles = zero deduction.** If `business_miles = 0`, no output is emitted regardless of method.

4. **Standard mileage includes depreciation.** When using the standard mileage rate, the rate already includes a depreciation component. No additional depreciation deduction is allowed for a vehicle using the standard mileage rate.

5. **Commuting miles are never deductible.** Miles from home to a regular workplace are commuting miles and are excluded from business miles. The node accepts `business_miles` as entered.

6. **Listed property rules (§280F).** Vehicles are "listed property" under IRC §280F. If business use is ≤ 50%, MACRS depreciation is not allowed and straight-line must be used. The node does not enforce this — it takes `depreciation` as entered.

7. **Mixed-use vehicles.** The business percentage calculation (business_miles / total_miles) allocates total actual expenses to business use. This is the standard substantiation method per Pub. 463.

8. **Multiple vehicles, same purpose.** If two SCHEDULE_C vehicles are entered, their deductible amounts are summed into a single output to schedule_c.

9. **Total miles = 0 is invalid.** Division by zero for business_pct. The node throws if total_miles = 0.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Notice 2025-5 (2025 standard mileage rate) | 2025 | Business mileage rate (70¢) | https://www.irs.gov/pub/irs-drop/n-25-05.pdf | N/A |
| Rev. Proc. 2019-46 (Standard mileage rate rules) | 2019 | §4 | https://www.irs.gov/pub/irs-drop/rp-19-46.pdf | N/A |
| IRS Publication 463 (Travel, Gift, Car Expenses) | 2024 | Chapter 4 (Car Expenses) | https://www.irs.gov/pub/irs-pdf/p463.pdf | N/A |
| IRC §280F (Listed property limitations) | Current | §280F | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section280F | N/A |
| Schedule C (Form 1040) | 2025 | Part II Line 9 | https://www.irs.gov/pub/irs-pdf/f1040sc.pdf | N/A |
| Schedule E (Form 1040) | 2025 | Part I expenses | https://www.irs.gov/pub/irs-pdf/f1040se.pdf | N/A |
| Schedule F (Form 1040) | 2025 | Part II Line 10 | https://www.irs.gov/pub/irs-pdf/f1040sf.pdf | N/A |
| Drake Software KB — AUTO Screen | Current | Vehicle expense worksheet | https://kb.drakesoftware.com/Site/Browse/10793 | N/A |

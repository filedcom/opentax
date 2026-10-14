# Form 6478 — Biofuel Producer Credit

## Overview
This node captures qualified biofuel production data (fuel type and gallons) and computes the biofuel producer credit under IRC §6478 / §6426. The credit is a general business credit that flows to Schedule 3 line 6z. Eligible producers include alcohol fuel mixture blenders, biodiesel mixture blenders, cellulosic biofuel producers, second-generation biofuel producers, and small agri-biodiesel producers.

**IRS Form:** 6478
**Drake Screen:** 6478
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/13508

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| fuel_entries | FuelEntry[] | No | Fuel entries | Array of per-fuel-type production records | IRC §6426, §6478 | https://www.irs.gov/pub/irs-pdf/i6478.pdf |
| fuel_entries[].fuel_type | BiofuelType (enum) | Yes | Fuel Type | Type of qualified fuel: alcohol_mixture, biodiesel_mixture, cellulosic_biofuel, second_generation_biofuel, small_agri_producer | IRC §6426(b–e), §40, §40A | https://www.irs.gov/pub/irs-pdf/i6478.pdf |
| fuel_entries[].gallons | number (≥0) | Yes | Gallons | Qualified gallons produced or sold during the tax year | Form 6478 Line 1 | https://www.irs.gov/pub/irs-pdf/i6478.pdf |
| fuel_entries[].credit_rate_override | number (≥0) | No | Rate Override | Optional override for the statutory credit rate per gallon | IRC §6426 | https://www.irs.gov/pub/irs-pdf/i6478.pdf |

**BiofuelType enum values:**

| Enum Value | IRS Description | Credit Rate | IRC Section |
|------------|----------------|-------------|-------------|
| alcohol_mixture | Alcohol mixture credit (ethanol ≥190 proof blended into motor fuel) | $0.45/gal | §6426(b) |
| biodiesel_mixture | Biodiesel mixture credit (biodiesel blended into diesel fuel) | $1.00/gal | §6426(c) |
| cellulosic_biofuel | Cellulosic biofuel producer credit | $1.01/gal | §40(b)(6) |
| second_generation_biofuel | Second-generation biofuel producer credit | $1.01/gal | §40(b)(6) |
| small_agri_producer | Small agri-biodiesel producer credit | $0.10/gal | §40A(b)(2) |

---

## Calculation Logic

### Step 1 — Per-entry credit
For each fuel entry: `credit = gallons × (credit_rate_override ?? CREDIT_RATES[fuel_type])`
Rounded to 2 decimal places.
Source: IRC §6426, §6478 Line 2 instructions — https://www.irs.gov/pub/irs-pdf/i6478.pdf

### Step 2 — Total credit
Sum all per-entry credits: `total = Σ entryCredit(entries)`
Source: Form 6478 Line 3 — https://www.irs.gov/pub/irs-pdf/i6478.pdf

### Step 3 — Route to general business credit
If total > 0, emit to Schedule 3 line 6z.
Source: Form 6478 Line 4 → Schedule 3 Line 6z → Form 3800 — https://www.irs.gov/pub/irs-pdf/i6478.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line6z_general_business_credit | schedule3 | total credit > 0 | Form 6478 Line 4; Schedule 3 Line 6z | https://www.irs.gov/pub/irs-pdf/f1040s3.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Alcohol mixture credit rate (ethanol ≥190 proof) | $0.45/gallon | IRC §6426(b)(2); statutory rate | https://www.law.cornell.edu/uscode/text/26/6426 |
| Biodiesel mixture credit rate | $1.00/gallon | IRC §6426(c)(2); statutory rate | https://www.law.cornell.edu/uscode/text/26/6426 |
| Cellulosic biofuel producer credit rate | $1.01/gallon | IRC §40(b)(6)(A); statutory rate | https://www.law.cornell.edu/uscode/text/26/40 |
| Second-generation biofuel producer credit rate | $1.01/gallon | IRC §40(b)(6)(A); statutory rate | https://www.law.cornell.edu/uscode/text/26/40 |
| Small agri-biodiesel producer credit rate | $0.10/gallon | IRC §40A(b)(2); statutory rate | https://www.law.cornell.edu/uscode/text/26/40A |
| Small agri-biodiesel production capacity limit | 60,000,000 gallons/year | IRC §40A(b)(5)(B) | https://www.law.cornell.edu/uscode/text/26/40A |
| Alcohol proof threshold for full rate | ≥190 proof | IRC §6426(b)(4)(A) | https://www.law.cornell.edu/uscode/text/26/6426 |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry"]
    fe["fuel_entries[]<br/>fuel_type + gallons"]
  end
  subgraph node["f6478 (Biofuel Producer Credit)"]
    ec["entryCredit()<br/>gallons × rate"]
    tc["totalCredit()<br/>sum all entries"]
  end
  subgraph outputs["Downstream Nodes"]
    s3["schedule3<br/>line6z_general_business_credit"]
  end
  fe --> ec --> tc --> s3

---

## Edge Cases & Special Rules

1. **Empty entries**: If `fuel_entries` is empty or undefined, total credit is 0 — no output emitted.
2. **Alcohol proof requirement**: The $0.45/gal rate applies only to ethanol ≥190 proof blended into a qualified mixture. Lower-proof alcohol uses the lower §6426(b)(4)(B) rate ($0.45 reduced proportionally) — the node captures this via `credit_rate_override`.
3. **Small agri-biodiesel capacity cap**: Producers exceeding 60M gallons/year capacity are ineligible for the small producer credit (IRC §40A(b)(5)(B)). Eligibility gating is not enforced in the node — it's the tax preparer's responsibility.
4. **Mixture vs. pure fuel**: The alcohol mixture and biodiesel mixture credits require blending into a qualified mixture for sale or use as fuel. Pure (unblended) production does not qualify under §6426; use `cellulosic_biofuel` or `second_generation_biofuel` for those.
5. **Rate override**: `credit_rate_override` allows preparers to enter a different rate when IRS guidance or corrections apply (e.g., reduced rate for alcohol below 190 proof).
6. **Non-refundable general business credit**: The credit is non-refundable; any excess is subject to Form 3800 carryback (1 year) and carryforward (20 years) rules. The node only emits to Schedule 3; Form 3800 handles carryover logic.
7. **Excise tax relationship**: The biofuel credit under §6478 is claimed against income tax. A separate excise tax credit/refund under §6427 is claimed on Form 8849. These are mutually exclusive — do not double-count.
8. **TY2025 rates**: All rates are set by statute (not CPI-indexed). Rev Proc 2024-40 does not adjust these rates.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 6478 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i6478.pdf | .research/docs/i6478.pdf |
| IRC §6426 — Alcohol Fuel, Biodiesel, Alternative Fuel Mixture Credits | current | §6426(b–e) | https://www.law.cornell.edu/uscode/text/26/6426 | N/A |
| IRC §6478 — Biofuel Producer Credit | current | §6478 | https://www.law.cornell.edu/uscode/text/26/6478 | N/A |
| IRC §40 — Alcohol, Cellulosic Biofuel, Second-Gen Biofuel Credits | current | §40(b)(6) | https://www.law.cornell.edu/uscode/text/26/40 | N/A |
| IRC §40A — Biodiesel and Renewable Diesel Fuels Credit | current | §40A(b)(2),(5) | https://www.law.cornell.edu/uscode/text/26/40A | N/A |
| Rev Proc 2024-40 (TY2025 inflation adjustments) | 2024 | §3 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | .research/docs/rp-24-40.pdf |

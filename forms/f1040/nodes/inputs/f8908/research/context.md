# Form 8908 — Energy Efficient Home Credit

## Overview
Computes the IRC §45L Energy Efficient Home Credit for eligible contractors who build or manufacture qualifying new energy-efficient homes sold or leased to another person for use as a residence. TY2025 credit amounts: $2,500 (ENERGY STAR / 50% energy savings) or $5,000 (DOE Zero Energy Ready Home). Routes to Schedule 3 line 6z.

**IRS Form:** 8908
**Drake Screen:** 8908
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/14042

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| f8908s | HomeItem[] | Yes (min 1) | Homes | Array of qualifying home records; one per home sold/leased | Form 8908 | https://www.irs.gov/pub/irs-pdf/i8908.pdf |
| home_address | string | No | Home address | Address of the qualifying home | Form 8908 col (a) | https://www.irs.gov/pub/irs-pdf/i8908.pdf |
| construction_type | ConstructionType enum | Yes | Construction type | single_family, manufactured_home, or multifamily | Form 8908; IRC §45L(c) | https://www.irs.gov/pub/irs-pdf/i8908.pdf |
| energy_certification | EnergyCertification enum | Yes | Energy certification | energy_star_50pct, zero_energy_ready, or energy_star_45ach | Form 8908; IRC §45L(b) | https://www.irs.gov/pub/irs-pdf/i8908.pdf |
| credit_amount_override | number (≥0) | No | Credit override | Override per-home credit amount (bypasses statutory amount) | — | — |

**EnergyCertification values:**
| Value | Credit Amount | Description |
|-------|--------------|-------------|
| energy_star_50pct | $2,500 | ENERGY STAR certified, meets 50% energy savings standard |
| zero_energy_ready | $5,000 | DOE Zero Energy Ready Home (ZERH) certification |
| energy_star_45ach | $2,500 | ENERGY STAR Multifamily (45 ACH threshold) |

---

## Calculation Logic

### Step 1 — Per-home credit
If `credit_amount_override` provided: use that value.
Otherwise: `zero_energy_ready → $5,000`; all others → `$2,500`.
Source: IRC §45L(b); Form 8908 — https://www.irs.gov/pub/irs-pdf/i8908.pdf

### Step 2 — Total credit
`total = Σ homeCredit(homes)`

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line6z_general_business_credit | schedule3 | total > 0 | Form 8908 → Schedule 3 Line 6z | https://www.irs.gov/pub/irs-pdf/f1040s3.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| ENERGY STAR / 50% energy savings credit | $2,500 per home | IRC §45L(b)(1)(A); IRA §13304 | https://www.law.cornell.edu/uscode/text/26/45L |
| DOE Zero Energy Ready Home credit | $5,000 per home | IRC §45L(b)(1)(B); IRA §13304 | https://www.law.cornell.edu/uscode/text/26/45L |
| Prevailing wage bonus (multifamily only) | $2,500 → $5,000 | IRC §45L(b)(3); IRA §13304 | https://www.law.cornell.edu/uscode/text/26/45L |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry (per home)"]
    h["f8908s[]\nconstruction_type + energy_certification"]
  end
  subgraph node["f8908 (Energy Efficient Home Credit)"]
    hc["homeCredit()"]
    tc["totalCredit()"]
  end
  subgraph outputs["Downstream Nodes"]
    s3["schedule3\nline6z_general_business_credit"]
  end
  h --> hc --> tc --> s3

---

## Edge Cases & Special Rules

1. **Contractor-only credit**: Only eligible contractors (those who constructed the home) may claim this credit — not the home buyer. Node does not enforce this.
2. **Prevailing wage for multifamily**: Multifamily homes can get the higher ZERH credit ($5,000 vs $2,500) but only if prevailing wage requirements are met (IRC §45L(b)(3)). Use `credit_amount_override` for the adjusted amount.
3. **IRA expansion (TY2023+)**: The Inflation Reduction Act increased credit amounts from $2,000/$1,000 to $2,500/$5,000 and added ZERH certification tier.
4. **Certification required**: Homes must be certified by an eligible certifier. Preparer responsibility.
5. **Non-refundable**: Excess carries forward via Form 3800.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8908 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8908.pdf | .research/docs/i8908.pdf |
| IRC §45L — Energy Efficient Home Credit | current | §45L(b–c) | https://www.law.cornell.edu/uscode/text/26/45L | N/A |
| IRA §13304 (expanded §45L) | 2022 | §13304 | https://www.congress.gov/bill/117th-congress/house-bill/5376 | N/A |

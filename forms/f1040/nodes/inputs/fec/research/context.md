# fec — Foreign Employer Compensation

## Overview
Captures wages received from a foreign employer that did not issue a US W-2 and
did not withhold US taxes. US citizens and residents must report worldwide income,
including wages from foreign employers (IRC §61; §911).
This node captures self-reported foreign compensation on a per-employer basis.
The amounts flow to Form 1040 line 1a (wages). They may be partially or fully
excluded via Form 2555 (Foreign Earned Income Exclusion), which is handled by a
separate node. This node captures the gross foreign compensation only.

**IRS Form:** Form 1040 (FEC screen)
**Drake Screen:** FEC
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com (screen FEC)

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| foreign_employer_name | string | Yes | Foreign employer name | Name of the foreign employer | IRC §61; IRS Pub 54 | https://www.irs.gov/publications/p54 |
| country_code | string | Yes | Country code | ISO 3166-1 alpha-2 country code of the foreign employer | IRS Pub 54 | https://www.irs.gov/publications/p54 |
| compensation_amount | number (nonneg) | Yes | Compensation amount | Amount in foreign currency (raw, pre-conversion) | IRS Pub 54 | https://www.irs.gov/publications/p54 |
| currency | string? | No | Currency code | ISO 4217 currency code (e.g., "EUR", "GBP") | IRS Pub 54 | https://www.irs.gov/publications/p54 |
| compensation_usd | number (nonneg) | Yes | Compensation (USD) | Amount converted to US dollars at average exchange rate | IRC §61; IRS Pub 54; Rev Rul 78-281 | https://www.irs.gov/publications/p54 |
| description | string? | No | Description | Optional description of the position/employment | IRS Pub 54 | https://www.irs.gov/publications/p54 |

---

## Calculation Logic

### Step 1 — Aggregate USD compensation across all items
total_compensation_usd = sum of compensation_usd across all items
Source: Form 1040 instructions line 1a; IRC §61; IRS Pub 54

### Step 2 — Route to f1040 line 1a
total_compensation_usd → f1040.line1a_wages
Source: Form 1040 line 1a instructions — wages includes foreign employer compensation

Note: The Foreign Earned Income Exclusion (Form 2555) is handled by a separate
intermediate node and will reduce taxable income at a later stage. This node
captures gross compensation.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line1a_wages | f1040 | compensation_usd > 0 (sum) | IRC §61; Form 1040 instructions line 1a | https://www.irs.gov/pub/irs-pdf/i1040gi.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Foreign Earned Income Exclusion limit (2025) | $130,000 (est; Rev Proc 2024-40 or successor) | IRS Rev Proc 2024-40 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| Exchange rate source | IRS-approved annual average rates (Pub 54) | IRS Pub 54 | https://www.irs.gov/publications/p54 |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (FEC screen)"]
    foreign_employer_name
    country_code
    compensation_usd
    compensation_amount
    currency
    description
  end
  subgraph node["fec Node"]
    total["total_compensation_usd = sum(compensation_usd)"]
  end
  subgraph outputs["Downstream Nodes"]
    f1040_1a["f1040 line1a_wages"]
  end
  inputs --> node --> f1040_1a
```

---

## Edge Cases & Special Rules

1. **Currency conversion required**: Taxpayer must convert foreign currency to USD using the IRS-approved average annual exchange rate for the tax year. This node stores the pre-converted amount (compensation_amount) and the USD equivalent (compensation_usd).
2. **FEIE**: The Foreign Earned Income Exclusion (Form 2555) may exclude some or all of these wages. The exclusion is applied by the form2555 intermediate node, not here.
3. **FICA**: Foreign employers generally are not required to withhold US FICA taxes. The taxpayer may owe self-employment tax equivalent via Schedule SE in some circumstances, but this node does not emit to schedule_se (that's determined by the nature of the employment relationship, not the foreign employer status alone).
4. **Multiple employers**: One entry per foreign employer; amounts summed across all items.
5. **Zero USD compensation**: If compensation_usd = 0 for all items (e.g., excluded by treaty), no output is emitted.
6. **US citizen abroad**: Even if the taxpayer lives abroad, worldwide income is taxable. This node does not apply any exclusion.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Pub 54 (Tax Guide for US Citizens Abroad) | 2024 | Ch. 5 | https://www.irs.gov/publications/p54 | N/A |
| Form 1040 Instructions | 2024 | Line 1a | https://www.irs.gov/pub/irs-pdf/i1040gi.pdf | N/A |
| IRC §61 | current | Gross income | https://uscode.house.gov | N/A |
| Rev Rul 78-281 | 1978 | Currency conversion | https://www.irs.gov | N/A |

# Form 8938 — Statement of Specified Foreign Financial Assets

## Overview
Disclosure-only form. Reports specified foreign financial assets when aggregate value exceeds filing thresholds under IRC §6038D (FATCA). No tax computation — produces zero outputs. The node validates and stores the foreign asset information.

**IRS Form:** 8938
**Drake Screen:** 8938
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/14055

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| lives_abroad | boolean | No | Lives abroad | True if taxpayer qualifies as living abroad (higher thresholds) | Form 8938 instructions; IRC §6038D(a)(2) | https://www.irs.gov/pub/irs-pdf/i8938.pdf |
| filing_status | string | No | Filing status | "single", "mfj", "mfs", etc. for threshold determination | Form 8938 | https://www.irs.gov/pub/irs-pdf/i8938.pdf |
| max_value_all_assets | number (≥0) | No | Maximum aggregate value | Highest aggregate value of all specified assets during year | Form 8938 Part I | https://www.irs.gov/pub/irs-pdf/i8938.pdf |
| year_end_value_all_assets | number (≥0) | No | Year-end aggregate value | Aggregate value at year-end | Form 8938 Part I | https://www.irs.gov/pub/irs-pdf/i8938.pdf |
| assets | AssetSchema[] | No | Individual assets | Per-asset detail entries | Form 8938 Parts II–V | https://www.irs.gov/pub/irs-pdf/i8938.pdf |
| has_pfic | boolean | No | PFIC assets | True if any assets are Passive Foreign Investment Companies | Form 8938 Part II | https://www.irs.gov/pub/irs-pdf/i8938.pdf |
| foreign_tax_credit_claimed | boolean | No | Foreign tax credit | True if FTC claimed for income from these assets | Form 8938 | https://www.irs.gov/pub/irs-pdf/i8938.pdf |

**Asset fields:**
| asset_type | ForeignAssetType enum | No | Asset type | bank_account, brokerage_account, foreign_stock, foreign_bond, foreign_partnership_interest, foreign_trust_interest, foreign_pension_plan, other | Form 8938 Parts II–V |
| description | string | No | Description | Asset description | Form 8938 |
| country | string | No | Country | ISO 2-letter country code | Form 8938 |
| max_value_during_year | number (≥0) | No | Max value | Maximum value during year | Form 8938 |
| year_end_value | number (≥0) | No | Year-end value | Value at December 31 | Form 8938 |
| income_reported | boolean | No | Income reported | Whether income was reported on return | Form 8938 |
| income_reported_on | string | No | Reported on | Location of income on return (e.g. "Schedule B") | Form 8938 |

---

## Calculation Logic

### Step 1 — Validate and store
`inputSchema.parse(rawInput)` — no computation performed.
Returns `{ outputs: [] }`.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| (none) | — | Disclosure only; no tax-computation outputs | IRC §6038D; Form 8938 | https://www.irs.gov/pub/irs-pdf/i8938.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Single/MFS in US — year-end threshold | >$50,000 | IRC §6038D; Reg §1.6038D-2 | https://www.law.cornell.edu/uscode/text/26/6038D |
| Single/MFS in US — max value threshold | >$75,000 | IRC §6038D; Reg §1.6038D-2 | https://www.law.cornell.edu/uscode/text/26/6038D |
| MFJ in US — year-end threshold | >$100,000 | IRC §6038D; Reg §1.6038D-2 | https://www.law.cornell.edu/uscode/text/26/6038D |
| MFJ in US — max value threshold | >$150,000 | IRC §6038D; Reg §1.6038D-2 | https://www.law.cornell.edu/uscode/text/26/6038D |
| Single living abroad — year-end threshold | >$200,000 | Reg §1.6038D-2(a)(2)(i) | https://www.law.cornell.edu/cfr/text/26/1.6038D-2 |
| Single living abroad — max value threshold | >$300,000 | Reg §1.6038D-2(a)(2)(i) | https://www.law.cornell.edu/cfr/text/26/1.6038D-2 |
| MFJ living abroad — year-end threshold | >$400,000 | Reg §1.6038D-2(a)(2)(ii) | https://www.law.cornell.edu/cfr/text/26/1.6038D-2 |
| MFJ living abroad — max value threshold | >$600,000 | Reg §1.6038D-2(a)(2)(ii) | https://www.law.cornell.edu/cfr/text/26/1.6038D-2 |
| Failure-to-file penalty | $10,000 | IRC §6038D(d)(1) | https://www.law.cornell.edu/uscode/text/26/6038D |
| Continued failure penalty | Up to $50,000 | IRC §6038D(d)(2) | https://www.law.cornell.edu/uscode/text/26/6038D |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry"]
    thresh["lives_abroad + filing_status"]
    vals["max_value_all_assets\nyear_end_value_all_assets"]
    assets["assets[]\nper-asset detail"]
  end
  subgraph node["f8938 (FATCA Disclosure)"]
    val["validate only\noutputs: []"]
  end
  thresh & vals & assets --> val

---

## Edge Cases & Special Rules

1. **FBAR is separate**: Form 8938 (FATCA) and FBAR (FinCEN 114) are different requirements. Some assets require both; some only one.
2. **PFIC reporting**: If `has_pfic = true`, additional Form 8621 reporting may be required.
3. **Threshold OR test**: Filing required if EITHER the year-end value OR the maximum-during-year value exceeds the threshold.
4. **No computation**: The node stores data only. Tax preparation software uses this for form generation; no credits or deductions flow from this node.
5. **Duplicate asset reporting**: Assets reported on Form 8938 may also appear on other forms (Schedule B, Schedule E). The `income_reported_on` field documents this.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8938 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8938.pdf | .research/docs/i8938.pdf |
| IRC §6038D — FATCA | current | §6038D(a–d) | https://www.law.cornell.edu/uscode/text/26/6038D | N/A |
| Reg §1.6038D-2 (thresholds) | current | §1.6038D-2 | https://www.law.cornell.edu/cfr/text/26/1.6038D-2 | N/A |

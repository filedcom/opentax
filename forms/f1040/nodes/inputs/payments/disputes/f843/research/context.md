# f843 — Form 843: Claim for Refund and Request for Abatement

## Overview
Form 843 is used to claim a refund of taxes (other than income taxes), or to request abatement of interest, penalties, or additions to tax. It is an administrative/informational form — it does not compute tax amounts that flow into the 1040 computation pipeline. The node captures the claim data for recordkeeping and filing purposes.

**IRS Form:** Form 843
**Drake Screen:** 843
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/Form-843

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| calendar_year | number (4-digit) | No | Line 1: Calendar year or fiscal year | Year in which the taxes were paid or assessed | Form 843, Line 1 | https://www.irs.gov/pub/irs-pdf/f843.pdf |
| tax_type | enum (income/employment/estate/gift/excise) | No | Line 3: Type of tax | Type of tax for which refund/abatement is claimed | Form 843, Line 3 | https://www.irs.gov/pub/irs-pdf/f843.pdf |
| period_from | string (date) | No | Line 1: From date | Start of period for which tax was paid/assessed | Form 843, Line 1 | https://www.irs.gov/pub/irs-pdf/f843.pdf |
| period_to | string (date) | No | Line 1: To date | End of period for which tax was paid/assessed | Form 843, Line 1 | https://www.irs.gov/pub/irs-pdf/f843.pdf |
| amount_to_be_refunded | number | No | Line 7: Amount | Amount to be refunded or abated | Form 843, Line 7 | https://www.irs.gov/pub/irs-pdf/f843.pdf |
| reason_for_claim | enum | No | Line 5a: Reason | Reason for filing claim | Form 843, Line 5a | https://www.irs.gov/pub/irs-pdf/f843.pdf |
| penalty_section | string | No | Line 4: Section | IRC section under which penalty was assessed | Form 843, Line 4 | https://www.irs.gov/pub/irs-pdf/f843.pdf |
| explanation | string | No | Line 7: Explanation | Detailed explanation of claim | Form 843, Line 7 | https://www.irs.gov/pub/irs-pdf/f843.pdf |

---

## Calculation Logic

### Step 1 — Pass-through capture
Form 843 does not perform tax computations. It captures claim/abatement data for filing purposes. No outputs are emitted.
Source: IRS Form 843 Instructions, 2024 — https://www.irs.gov/pub/irs-pdf/i843.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| (none) | None | Informational only — no tax routing | Form 843 Instructions | https://www.irs.gov/pub/irs-pdf/i843.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| None | N/A | Form 843 is administrative — no TY2025 constants | N/A |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry"]
    calendar_year
    tax_type
    amount_to_be_refunded
    reason_for_claim
    explanation
  end
  subgraph node["f843 — Form 843"]
  end
  subgraph outputs["Downstream Nodes"]
    none["(none — administrative form)"]
  end
  inputs --> node --> outputs

---

## Edge Cases & Special Rules

- Form 843 cannot be used to claim a refund of income taxes (use Form 1040-X instead). Source: Form 843 Instructions, p.1.
- The amount field (line 7) is optional — a zero or absent amount is valid (e.g., penalty abatement requests may not specify a dollar amount).
- tax_type enum values map to IRS checkboxes: employment, estate, gift, excise, penalty/interest. "income" is excluded per IRS instructions (income tax refunds use Form 1040-X).
- reason_for_claim covers: IRS error (interest due to IRS error), erroneous written advice, reasonable cause (penalty abatement), other.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 843 | 2024 | All lines | https://www.irs.gov/pub/irs-pdf/f843.pdf | .research/docs/f843.pdf |
| Form 843 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i843.pdf | .research/docs/i843.pdf |

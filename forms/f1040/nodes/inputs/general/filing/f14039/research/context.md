# f14039 — Identity Theft Affidavit

## Overview
This node captures IRS Form 14039 (Identity Theft Affidavit) data. This form is filed when a taxpayer believes their SSN was used fraudulently to file a tax return or for other identity theft purposes. It triggers the IRS Identity Protection Program and is primarily informational/procedural — it produces no direct tax computation. The form causes the IRS to flag the account and issue an Identity Protection PIN (IP PIN) for future filings.

**IRS Form:** IRS Form 14039
**Drake Screen:** 1403 (Drake screen code)
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** N/A (administrative form, not a tax computation form)

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| incident_type | enum | yes | "Type of identity theft" | Whether the theft disrupted filing (filing_disruption) or occurred for other reasons (other) | Form 14039, Section A | https://www.irs.gov/pub/irs-pdf/f14039.pdf |
| identity_theft_description | string | yes | "Description of identity theft" | Taxpayer's description of the identity theft incident | Form 14039, Section B | https://www.irs.gov/pub/irs-pdf/f14039.pdf |
| police_report_number | string | no | "Police report number" | Optional police report or other law enforcement case number | Form 14039, Section B | https://www.irs.gov/pub/irs-pdf/f14039.pdf |
| date_of_incident | string | no | "Date of incident" | Date the taxpayer first became aware of the identity theft | Form 14039, Section B | https://www.irs.gov/pub/irs-pdf/f14039.pdf |

---

## Calculation Logic

### Step 1 — No tax computation
Form 14039 is an administrative/procedural form only. It triggers the IRS Identity Protection Program but produces no tax line entries or computations.
Source: IRS Form 14039 Instructions, General Instructions — https://www.irs.gov/pub/irs-pdf/f14039.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| (none — informational only) | — | No tax routing; purely administrative | Form 14039 Instructions | https://www.irs.gov/pub/irs-pdf/f14039.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| None | — | Form 14039 has no monetary thresholds or constants | — |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    incident_type
    identity_theft_description
    police_report_number
    date_of_incident
  end
  subgraph node["f14039 — Identity Theft Affidavit"]
    validate["validate required fields"]
  end
  subgraph outputs["Downstream Nodes"]
    note["(none — administrative only)"]
  end
  inputs --> node --> note
```

---

## Edge Cases & Special Rules

1. **Not a tax form**: Form 14039 does not affect tax liability, refund, or any tax line.
2. **Two incident types**: "Filing disruption" means someone already filed using the taxpayer's SSN; "other" covers other identity theft uses.
3. **IP PIN**: After submitting Form 14039, the IRS typically issues an Identity Protection PIN for future returns.
4. **Supporting docs**: Taxpayers should attach a copy of a government-issued ID and supporting documentation.
5. **Filing method**: Can be mailed or faxed to the IRS; not e-filed separately but captured by Drake for practitioner records.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Form 14039 | 2024 | All | https://www.irs.gov/pub/irs-pdf/f14039.pdf | N/A |
| IRS Form 14039 Instructions | 2024 | General Instructions | https://www.irs.gov/pub/irs-pdf/f14039.pdf | N/A |
| IRS Identity Theft Info | — | Identity Protection | https://www.irs.gov/identity-theft-fraud-scams/identity-protection | N/A |

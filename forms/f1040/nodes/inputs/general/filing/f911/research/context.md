# f911 — Request for Taxpayer Advocate Service Assistance

## Overview
This node captures IRS Form 911 (Request for Taxpayer Advocate Service Assistance). This form is filed when a taxpayer is experiencing a significant hardship due to IRS actions and needs help from the Taxpayer Advocate Service (TAS). TAS is an independent organization within the IRS. The form is purely informational and procedural — it produces no tax computation and routes to no downstream tax nodes.

**IRS Form:** IRS Form 911
**Drake Screen:** 911
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** N/A (administrative form, not a tax computation form)

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| hardship_type | enum | yes | "Type of hardship" | Category of hardship: economic_hardship / systemic_problem / fair_treatment / other | Form 911, Section I | https://www.irs.gov/pub/irs-pdf/f911.pdf |
| taxpayer_description | string | yes | "Description of problem" | Taxpayer's description of the tax problem and hardship experienced | Form 911, Section II | https://www.irs.gov/pub/irs-pdf/f911.pdf |
| requested_relief | string | yes | "Relief requested" | What relief or action the taxpayer is requesting from TAS | Form 911, Section II | https://www.irs.gov/pub/irs-pdf/f911.pdf |
| contact_info | string | no | "Best contact information" | Best phone number or address for TAS to reach the taxpayer | Form 911, Section I | https://www.irs.gov/pub/irs-pdf/f911.pdf |

---

## Calculation Logic

### Step 1 — No tax computation
Form 911 is an administrative/procedural request form only. It enables the Taxpayer Advocate Service to intervene on behalf of the taxpayer but produces no tax line entries or computations.
Source: IRS Form 911 Instructions, General Instructions — https://www.irs.gov/pub/irs-pdf/f911.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| (none — informational only) | — | No tax routing; purely administrative | Form 911 Instructions | https://www.irs.gov/pub/irs-pdf/f911.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| None | — | Form 911 has no monetary thresholds or constants | — |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    hardship_type
    taxpayer_description
    requested_relief
    contact_info
  end
  subgraph node["f911 — TAS Assistance Request"]
    validate["validate required fields"]
  end
  subgraph outputs["Downstream Nodes"]
    note["(none — administrative only)"]
  end
  inputs --> node --> note
```

---

## Edge Cases & Special Rules

1. **Not a tax form**: Form 911 does not affect tax liability, refund, or any tax line.
2. **Four hardship types**: Economic hardship (IRS actions causing financial difficulty), systemic problem (recurring IRS processing errors), fair treatment (taxpayer rights issue), other.
3. **TAS criteria**: TAS accepts cases when taxpayer faces significant hardship, system failure, or rights violation.
4. **Alternative filing**: Can be submitted directly to a TAS office by mail or fax; Drake captures for practitioner records.
5. **Timely action**: TAS can issue a Taxpayer Assistance Order (TAO) requiring the IRS to take or stop an action.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Form 911 | 2024 | All | https://www.irs.gov/pub/irs-pdf/f911.pdf | N/A |
| IRS Form 911 Instructions | 2024 | General Instructions | https://www.irs.gov/pub/irs-pdf/f911.pdf | N/A |
| IRS Taxpayer Advocate Service | — | TAS overview | https://www.taxpayeradvocate.irs.gov | N/A |

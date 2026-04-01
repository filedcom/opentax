# f56 — Form 56: Notice Concerning Fiduciary Relationship

## Overview
Form 56 is filed with the IRS to notify them when a fiduciary relationship is established or terminated. A fiduciary (executor, administrator, trustee, guardian, etc.) uses this form to take on or release responsibility for the taxpayer's tax obligations. This is a purely informational/administrative form — it has no tax computation and produces no numeric outputs that affect the 1040.

**IRS Form:** Form 56
**Drake Screen:** 56
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/12668

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| fiduciary_type | enum (FiduciaryType) | Yes | Part I, Line 1 | Type of fiduciary relationship being established | Form 56 Part I, Box 1a–1g; IRC §6903 | https://www.irs.gov/pub/irs-pdf/f56.pdf |
| fiduciary_name | string | Yes | Part I | Name of the fiduciary | Form 56 Part I header | https://www.irs.gov/pub/irs-pdf/f56.pdf |
| fiduciary_address | string | Yes | Part I | Address of the fiduciary | Form 56 Part I | https://www.irs.gov/pub/irs-pdf/f56.pdf |
| estate_or_trust_name | string | No | Part I | Name of the estate or trust (if applicable) | Form 56 Part I | https://www.irs.gov/pub/irs-pdf/f56.pdf |
| effective_date | string | Yes | Part I, Line 2a | Date fiduciary authority begins (MM/DD/YYYY) | Form 56 Part I, Line 2a | https://www.irs.gov/pub/irs-pdf/f56.pdf |
| revocation_termination_date | string | No | Part III | Date authority ends (if terminating) | Form 56 Part III, Line 7 | https://www.irs.gov/pub/irs-pdf/f56.pdf |

---

## Calculation Logic

### Step 1 — Validate and pass through
No computation. Parse input with Zod schema and return empty outputs.
Source: IRS Form 56 Instructions, "Purpose of Form" — https://www.irs.gov/pub/irs-pdf/i56.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| (none) | (none) | Administrative form — no tax computation outputs | Form 56 Instructions, "Purpose of Form" | https://www.irs.gov/pub/irs-pdf/i56.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| (none) | — | Administrative form; no numeric constants | N/A |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    F56["Form 56 fields"]
  end
  subgraph node["f56 Node"]
    validate["Validate & parse"]
  end
  subgraph outputs["Downstream"]
    none["(no outputs)"]
  end
  F56 --> validate --> none
```

---

## Edge Cases & Special Rules

- Fiduciary type `other` allows free-form description of non-standard relationships.
- `revocation_termination_date` is only present when the form is used to terminate (not establish) a fiduciary relationship.
- This form has no effect on tax computation; it is purely administrative notification to IRS.
- `effective_date` is required for all filings (Part I, Line 2a).
- The node stores the data in-engine for audit purposes but routes nothing to f1040.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Form 56 | 2025 | Part I – Notice of Fiduciary Relationship | https://www.irs.gov/pub/irs-pdf/f56.pdf | f56.pdf |
| IRS Instructions for Form 56 | 2025 | Purpose of Form; Part I | https://www.irs.gov/pub/irs-pdf/i56.pdf | i56.pdf |
| IRC §6903 | — | Notice of Fiduciary Relationship | https://www.law.cornell.edu/uscode/text/26/6903 | N/A |

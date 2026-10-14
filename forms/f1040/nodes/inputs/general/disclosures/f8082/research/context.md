# f8082 — Form 8082: Notice of Inconsistent Treatment or Administrative Adjustment Request (AAR)

## Overview

Form 8082 is filed by partners, S corporation shareholders, or trust/estate beneficiaries who report items from a pass-through entity inconsistently with what the entity reported on Schedule K-1. It is also used to request an Administrative Adjustment Request (AAR) under BBA audit procedures (Bipartisan Budget Act of 2015). The form is a notification/disclosure to the IRS — no tax is computed and no output flows downstream. It must be attached to the taxpayer's return.

**IRS Form:** Form 8082
**Drake Screen:** 8082
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** N/A

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| entity_type | EntityType enum | Yes | Type of entity | PARTNERSHIP, S_CORP, TRUST, or ESTATE | IRC §6222, §6227; Form 8082 Part I | https://www.irs.gov/pub/irs-pdf/f8082.pdf |
| entity_name | string | Yes | Name of pass-through entity | Legal name of the partnership, S corp, trust, or estate | Form 8082 line 1a | https://www.irs.gov/pub/irs-pdf/f8082.pdf |
| entity_ein | string | Yes | EIN of pass-through entity | Employer Identification Number of the entity | Form 8082 line 1b | https://www.irs.gov/pub/irs-pdf/f8082.pdf |
| schedule_k1_item_description | string | Yes | Description of item | Description of the K-1 item being reported inconsistently | Form 8082 Part I column (a) | https://www.irs.gov/pub/irs-pdf/f8082.pdf |
| amount_as_reported | number | Yes | Amount as reported on K-1 | The amount shown on Schedule K-1 from the entity | Form 8082 Part I column (b) | https://www.irs.gov/pub/irs-pdf/f8082.pdf |
| amount_as_claimed | number | Yes | Amount as claimed on return | The amount the taxpayer is reporting on their return | Form 8082 Part I column (c) | https://www.irs.gov/pub/irs-pdf/f8082.pdf |
| reason_for_inconsistency | string | No | Reason for inconsistency | Explanation of why the taxpayer is reporting differently | Form 8082 Part I | https://www.irs.gov/pub/irs-pdf/f8082.pdf |

---

## Calculation Logic

### Step 1 — No computation
Form 8082 is a disclosure/notice form only. No tax is computed. The node captures the fields for informational purposes and attaches to the return. compute() returns empty outputs.

Source: Form 8082 Instructions, General Information section — "This form is used to notify the IRS of an inconsistent treatment."

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| (none) | — | Always — notice/disclosure form only | IRC §6222(b); Form 8082 instructions | https://www.irs.gov/instructions/i8082 |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| N/A | N/A | No numeric thresholds — notice form only | Form 8082 instructions |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    user["entity_type, entity_name, entity_ein, schedule_k1_item_description, amount_as_reported, amount_as_claimed, reason_for_inconsistency"]
  end
  subgraph node["f8082"]
    capture["Capture inconsistency data"]
  end
  subgraph outputs["No downstream outputs"]
    none["(notice form — no routing)"]
  end
  inputs --> node --> outputs
```

---

## Edge Cases & Special Rules

1. **BBA AAR**: Under the Bipartisan Budget Act (BBA), partners/shareholders may file Form 8082 as an Administrative Adjustment Request (AAR) to correct a previously filed return. Same form, different Part (Part II for AAR).
2. **Multiple inconsistencies**: One form per inconsistent item. Each item is a separate entry in the per-item array.
3. **No penalty if disclosed**: Filing Form 8082 protects the taxpayer from the inconsistent-treatment penalty under IRC §6222(c).
4. **Must attach to return**: Form 8082 must be attached to the tax return — it is not filed separately.
5. **Pass-through entity types**: Only partnerships (IRC §6222), S corporations, trusts, and estates file Form 8082.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8082 | 2024 | All | https://www.irs.gov/pub/irs-pdf/f8082.pdf | f8082.pdf |
| Instructions for Form 8082 | 2024 | General Instructions | https://www.irs.gov/instructions/i8082 | i8082.pdf |
| IRC §6222 | Current | Treatment of partnership items | https://www.law.cornell.edu/uscode/text/26/6222 | N/A |
| IRC §6227 | Current | Administrative adjustment requests | https://www.law.cornell.edu/uscode/text/26/6227 | N/A |

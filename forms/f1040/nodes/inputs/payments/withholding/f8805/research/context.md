# f8805 — Form 8805: Foreign Partner's Information Statement of Section 1446 Withholding Tax

## Overview
Form 8805 is issued by a partnership to a foreign partner showing the §1446 withholding tax paid on effectively connected income (ECI) allocable to that partner. The foreign partner claims the §1446 withholding shown on Form 8805 as a payment/credit on their US tax return, reducing their tax liability. One Form 8805 per partnership from which the taxpayer received ECI.

**IRS Form:** 8805
**Drake Screen:** 8805
**Node Type:** input (per-item array — one per Form 8805 received)
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/8805

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| partnership_name | string | yes | Partnership name | Name of the partnership that withheld and issued Form 8805 | Form 8805 Box 1; IRC §1446 | https://www.irs.gov/pub/irs-pdf/f8805.pdf |
| partnership_ein | string | no | Partnership EIN | EIN of the partnership | Form 8805 Box 2; Reg. §1.1446-3 | https://www.irs.gov/pub/irs-pdf/f8805.pdf |
| ordinary_eic_allocable | number (nonneg) | no | Ordinary ECI allocable | Ordinary effectively connected income allocable to this partner | Form 8805 Box 4; IRC §1446(a) | https://www.irs.gov/pub/irs-pdf/i8805.pdf |
| section_1446_tax_withheld | number (nonneg) | no | §1446 tax withheld | Total §1446 withholding tax paid by the partnership on this partner's behalf | Form 8805 Box 6; IRC §1446(b) | https://www.irs.gov/pub/irs-pdf/i8805.pdf |
| total_tax_withheld | number (nonneg) | no | Total tax withheld | Total withholding tax (may equal section_1446_tax_withheld for most cases) | Form 8805 Box 8; IRC §1446 | https://www.irs.gov/pub/irs-pdf/i8805.pdf |

---

## Calculation Logic

### Step 1 — Aggregate withholding credits
Total §1446 withholding credit = sum of section_1446_tax_withheld (or total_tax_withheld if section_1446_tax_withheld is absent) across all Form 8805 items.
Source: IRC §1446(d); Reg. §1.1446-3(d); Form 8805 instructions

### Step 2 — Route to Schedule 3 (payments/credits)
The total withholding credit flows to Schedule 3 Part II as an additional payment reducing tax liability.
Source: IRC §1446(d); Schedule 3 line 13 (other payments/refundable credits); Form 8805 instructions

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| total_1446_credit | schedule3 | total_1446_credit > 0 | IRC §1446(d); Schedule 3 Part II | https://www.irs.gov/pub/irs-pdf/i8805.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| §1446 withholding rate — individual foreign partners | 37% | IRC §1446(b)(2)(A); Rev. Proc. 2024-40 top marginal rate | https://www.irs.gov/pub/irs-pdf/i8805.pdf |
| §1446 withholding rate — corporate foreign partners | 21% | IRC §1446(b)(2)(B); TCJA §13001 | https://www.irs.gov/pub/irs-pdf/i8805.pdf |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Per Form 8805 Received"]
    partnership_name
    partnership_ein
    ordinary_eic_allocable
    section_1446_tax_withheld
    total_tax_withheld
  end
  subgraph node["f8805 — Form 8805"]
    agg["Sum 1446 credits across items"]
  end
  subgraph outputs["Downstream"]
    schedule3["schedule3\n(line13_1446_withholding)"]
  end
  inputs --> node --> schedule3
```

---

## Edge Cases & Special Rules

1. If both section_1446_tax_withheld and total_tax_withheld are present, use section_1446_tax_withheld as the credit amount (it is the direct §1446 withholding).
2. If section_1446_tax_withheld is absent but total_tax_withheld is present, fall back to total_tax_withheld.
3. If all withholding amounts are zero or absent, return empty outputs (no credit to report).
4. Multiple partnerships: each Form 8805 is one array item; credits are summed across all items.
5. ECI must be reported as income on the return — this node only handles the withholding credit side; the income side flows through k1_partnership or similar nodes.
6. §1446 withholding flows to Schedule 3 Part II line 13 (other payments) per IRS Form 1040 instructions.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8805 | 2024 | All boxes | https://www.irs.gov/pub/irs-pdf/f8805.pdf | f8805.pdf |
| Instructions for Form 8805 | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8805.pdf | i8805.pdf |
| IRC §1446 | current | Partnership withholding on ECI | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section1446 | — |
| Reg. §1.1446-3 | current | Withholding tax payment | https://www.ecfr.gov/current/title-26/chapter-I/subchapter-A/part-1/section-1.1446-3 | — |

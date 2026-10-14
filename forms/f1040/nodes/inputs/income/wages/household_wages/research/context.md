# household_wages — Household Employee Wages

## Overview
Captures wages received BY a taxpayer who worked as a household employee
(nanny, housekeeper, caretaker, etc.) for a private household employer.
This is the EMPLOYEE side — distinct from Schedule H (employer side).
Household employee wages are reported on a W-2 issued by the household employer.
They flow to Form 1040 line 1b (household employee wages not reported on a W-2 are
also reportable here per IRS instructions).

**IRS Form:** Form 1040 (line 1b)
**Drake Screen:** HSH (also accessible via "3 > Household Employee" link)
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com (screen HSH)

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| wages_received | number (nonneg) | Yes | Wages received | Gross wages received as household employee (W-2 Box 1 equivalent) | IRC §3401(a)(3); Form 1040 line 1b instructions | https://www.irs.gov/pub/irs-pdf/i1040gi.pdf |
| federal_income_tax_withheld | number (nonneg) | No | Federal tax withheld | Federal income tax withheld by household employer (W-2 Box 2) | IRC §3401; Form 1040 instructions | https://www.irs.gov/pub/irs-pdf/i1040gi.pdf |
| social_security_wages | number (nonneg) | No | SS wages | Social security wages (W-2 Box 3) — same as wages_received if FICA applies | IRC §3121(a)(7) | https://www.irs.gov/pub/irs-pdf/i1040gi.pdf |
| medicare_wages | number (nonneg) | No | Medicare wages | Medicare wages (W-2 Box 5) | IRC §3121(a)(7) | https://www.irs.gov/pub/irs-pdf/i1040gi.pdf |
| ss_tax_withheld | number (nonneg) | No | SS tax withheld | Social security tax withheld (W-2 Box 4) | IRC §3101; IRS Pub 926 | https://www.irs.gov/publications/p926 |
| medicare_tax_withheld | number (nonneg) | No | Medicare tax withheld | Medicare tax withheld (W-2 Box 6) | IRC §3101; IRS Pub 926 | https://www.irs.gov/publications/p926 |
| employer_name | string? | No | Employer name | Name of the household employer (informational) | IRS Pub 926 | https://www.irs.gov/publications/p926 |
| employer_ein | string? | No | Employer EIN | Employer Identification Number (informational) | IRS Pub 926 | https://www.irs.gov/publications/p926 |

---

## Calculation Logic

### Step 1 — Aggregate wages to f1040 line 1b
total_wages = sum of wages_received across all items
Source: Form 1040 instructions, line 1b — "Household employee wages not reported on Form W-2"
and W-2 household wages; IRC §3401(a)(3)

### Step 2 — Aggregate federal withholding (informational — routed to f1040 line 25c)
total_withheld = sum of federal_income_tax_withheld across all items
Source: Form 1040 line 25c — other withholding (household)

Note: For household employees, both the wages and withholding flow to 1040.
The f1040 node aggregates line 25c from multiple sources.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line1b_household_wages | f1040 | wages_received > 0 | Form 1040 line 1b; IRC §3401(a)(3) | https://www.irs.gov/pub/irs-pdf/i1040gi.pdf |
| line25c_other_withholding | f1040 | federal_income_tax_withheld > 0 | Form 1040 line 25c | https://www.irs.gov/pub/irs-pdf/i1040gi.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Household employee FICA threshold (employer pays if cash wages ≥) | $2,800 | Rev Proc 2024-40; IRS Pub 926 | https://www.irs.gov/publications/p926 |
| SS wage base (employee-side) | $176,100 | Rev Proc 2024-40 | https://www.irs.gov/publications/p926 |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (HSH screen)"]
    wages_received
    federal_income_tax_withheld
    social_security_wages
    medicare_wages
    ss_tax_withheld
    medicare_tax_withheld
    employer_name
    employer_ein
  end
  subgraph node["household_wages Node"]
    total_wages["total_wages = sum(wages_received)"]
    total_withheld["total_withheld = sum(fed_tax_withheld)"]
  end
  subgraph outputs["Downstream Nodes"]
    f1040_1b["f1040 line1b_household_wages"]
    f1040_25c["f1040 line25c_other_withholding"]
  end
  inputs --> node --> f1040_1b
  inputs --> node --> f1040_25c
```

---

## Edge Cases & Special Rules

1. **No W-2 issued**: Household employees who received cash wages of $2,800+ in 2025 where no W-2 was issued still owe taxes. Wages are still entered on this screen and flow to line 1b.
2. **Multiple employers**: One entry per household employer; amounts summed across all.
3. **FICA withholding**: If the household employer withheld FICA, it appears in ss_tax_withheld and medicare_tax_withheld. These are credit fields on the return (Form 1040 line 25 area). For simplicity, this node only routes wages (line 1b) and income tax withholding (line 25c).
4. **Wages under $2,800**: Below the threshold, household employee wages may not have FICA withheld but income tax may still be withheld. Wages are still taxable income and go to line 1b.
5. **Not Schedule H**: Schedule H is for the EMPLOYER reporting FUTA/FICA obligations. This node is for the EMPLOYEE reporting wages received.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Pub 926 (Household Employer's Tax Guide) | 2024 | All | https://www.irs.gov/publications/p926 | N/A |
| Form 1040 Instructions | 2024 | Line 1b, line 25c | https://www.irs.gov/pub/irs-pdf/i1040gi.pdf | N/A |
| IRC §3401(a)(3) | current | Definition of wages (household) | https://uscode.house.gov | N/A |
| IRC §3121(a)(7) | current | FICA — household employees | https://uscode.house.gov | N/A |

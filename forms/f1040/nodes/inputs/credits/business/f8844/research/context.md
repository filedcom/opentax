# f8844 — Form 8844: Empowerment Zone Employment Credit

## Overview
Form 8844 computes the Empowerment Zone Employment Credit for employers who hire employees who both live and work in an IRS-designated empowerment zone. The credit is 20% of qualified zone wages, capped at $15,000 per employee per year (maximum $3,000 credit per employee). This is a per-employee credit that is part of the General Business Credit (IRC §38, §1396) and flows to Schedule 3.

**IRS Form:** 8844
**Drake Screen:** 8844
**Node Type:** input (per-item array)
**Tax Year:** 2025
**Drake Reference:** N/A

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| employee_name | string | No | Employee records | Name of qualified zone employee (informational) | Form 8844 instructions | https://www.irs.gov/pub/irs-pdf/f8844.pdf |
| qualified_zone_wages | number (nonnegative) | Yes | Payroll records | Total wages paid to the employee during the year | IRC §1396(b); Form 8844 line 1 | https://www.irs.gov/pub/irs-pdf/f8844.pdf |
| employee_lives_in_zone | boolean | Yes | Employee certification | Employee's principal residence is in the empowerment zone | IRC §1396(d)(1)(A); Form 8844 instructions | https://www.irs.gov/pub/irs-pdf/f8844.pdf |
| employee_works_in_zone | boolean | Yes | Employer records | Employee performs substantially all services in the empowerment zone | IRC §1396(d)(1)(B); Form 8844 instructions | https://www.irs.gov/pub/irs-pdf/f8844.pdf |

---

## Calculation Logic

### Step 1 — Qualification Check
An employee qualifies only if BOTH employee_lives_in_zone AND employee_works_in_zone are true.
If either is false (or not provided), the employee is excluded from the credit.
Source: IRC §1396(d)(1); Form 8844 instructions; https://www.irs.gov/pub/irs-pdf/i8844.pdf

### Step 2 — Capped Wages
capped_wages = min(qualified_zone_wages, WAGE_CAP) where WAGE_CAP = $15,000
Source: IRC §1396(b); Form 8844 line 1 per employee; https://www.irs.gov/pub/irs-pdf/f8844.pdf

### Step 3 — Credit per Employee
credit_per_employee = capped_wages × 20%
Maximum credit per employee = $3,000 (20% × $15,000)
Source: IRC §1396(a); Form 8844 line 2; https://www.irs.gov/pub/irs-pdf/f8844.pdf

### Step 4 — Total Credit
total_credit = sum of credit_per_employee for all qualified employees
Source: Form 8844 line 3; https://www.irs.gov/pub/irs-pdf/f8844.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line6z_general_business_credit | schedule3 | total_credit > 0 | IRC §38; Schedule 3 line 6z | https://www.irs.gov/pub/irs-pdf/f1040s3.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Wage cap per employee | $15,000 | IRC §1396(b) | https://www.irs.gov/pub/irs-pdf/i8844.pdf |
| Credit rate | 20% | IRC §1396(a) | https://www.irs.gov/pub/irs-pdf/i8844.pdf |
| Maximum credit per employee | $3,000 | IRC §1396(a) + (b) | https://www.irs.gov/pub/irs-pdf/i8844.pdf |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (per employee)"]
    N[employee_name optional]
    W[qualified_zone_wages]
    L[employee_lives_in_zone]
    Z[employee_works_in_zone]
  end
  subgraph node["f8844 Node"]
    C[compute per-employee credit]
    T[sum total credit]
  end
  subgraph outputs["Downstream"]
    S3[schedule3.line6z_general_business_credit]
  end
  inputs --> node --> outputs
```

---

## Edge Cases & Special Rules

1. **Both location tests must be met**: employee_lives_in_zone AND employee_works_in_zone must both be true. If either is false, no credit for that employee.
2. **Wages capped at $15,000**: wages above $15,000 are ignored for credit calculation.
3. **No credit if qualified_zone_wages = 0**: employee with zero wages produces $0 credit.
4. **Multiple employees**: credit is computed per employee, then summed.
5. **employee_name is optional**: purely informational, does not affect computation.
6. **Wage deduction reduced**: the employer's wage deduction is reduced by the credit amount per IRC §280C. This is handled by the employer's return, not computed here.
7. **Empowerment zones**: Zones designated by HUD/IRS; verification of zone designation is preparer responsibility.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRC §1396 | — | Empowerment zone employment credit | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section1396 | — |
| IRC §38 | — | General business credit | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section38 | — |
| Form 8844 instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8844.pdf | — |

# Form 8826 — Disabled Access Credit

## Overview

Computes the Disabled Access Credit under IRC §44 for small businesses that
incur eligible access expenditures to comply with the Americans with
Disabilities Act (ADA). Eligibility: preceding-year gross receipts ≤$1M OR ≤30
full-time employees (either condition suffices). Credit = 50% × (eligible
expenditures − $250), capped at $5,000. The present graph routes the source
credit directly to Schedule 3 line 6a; it still needs the Form 3800
tax-liability limit before filing.

**IRS Form:** 8826 **Drake Screen:** 8826 **Node Type:** input **Tax Year:**
2025 **Drake Reference:** https://kb.drakesoftware.com/Site/Browse/14021

---

## Input Fields

| Field                               | Type                | Required | Source / Label                              | Description                                                                      | IRS Reference                                   | URL                                       |
| ----------------------------------- | ------------------- | -------- | ------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------- |
| eligible_expenditures               | number (≥0)         | Yes      | Eligible expenditures                       | Amounts paid or incurred to comply with ADA (Line 1)                             | Form 8826 Line 1; IRC §44(c)                    | https://www.irs.gov/pub/irs-pdf/i8826.pdf |
| prior_year_gross_receipts           | number (≥0)         | Yes      | Preceding-year gross receipts               | Include predecessor and common-control receipts; ≤$1M qualifies                  | Form 8826 instructions, Eligible Small Business | https://www.irs.gov/pub/irs-pdf/f8826.pdf |
| prior_year_full_time_employee_count | nonnegative integer | Yes      | Preceding-year full-time employee headcount | An employee is full-time at ≥30 hours/week for ≥20 calendar weeks; ≤30 qualifies | Form 8826 instructions, Eligible Small Business | https://www.irs.gov/pub/irs-pdf/f8826.pdf |

---

## Calculation Logic

### Step 1 — Eligibility check

`eligible = (prior_year_gross_receipts ≤ $1,000,000) OR (prior_year_full_time_employee_count ≤ 30)`
Both facts are required to prevent missing information from being treated as
eligibility. If neither qualifies, credit = 0. Source: IRC §44(b); Form 8826
instructions — https://www.irs.gov/pub/irs-pdf/f8826.pdf

### Step 2 — Compute credit

`cappedExpenses = min(eligible_expenditures, $10,250)`
`credit = min((cappedExpenses − $250) × 50%, $5,000)` If eligible_expenditures ≤
$250: credit = 0. Source: IRC §44(a); Form 8826 Line 4 —
https://www.irs.gov/pub/irs-pdf/i8826.pdf

---

## Output Routing

| Output Field                   | Destination Node | Condition  | IRS Reference                                                                                            | URL                                         |
| ------------------------------ | ---------------- | ---------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| line6a_general_business_credit | schedule3        | credit > 0 | Form 8826 line 8 → Form 3800 Part III line 1e → Schedule 3 line 6a after Form 3800 limit (not yet wired) | https://www.irs.gov/pub/irs-pdf/f1040s3.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant                             | Value        | Source                          | URL                                           |
| ------------------------------------ | ------------ | ------------------------------- | --------------------------------------------- |
| Gross receipts eligibility limit     | $1,000,000   | IRC §44(b)(1); statutory        | https://www.law.cornell.edu/uscode/text/26/44 |
| Full-time employee eligibility limit | 30 employees | IRC §44(b)(2); statutory        | https://www.irs.gov/pub/irs-pdf/f8826.pdf     |
| Expenditure floor (non-creditable)   | $250         | IRC §44(a)(1); statutory        | https://www.law.cornell.edu/uscode/text/26/44 |
| Maximum eligible expenditures        | $10,250      | IRC §44(a)(2); statutory        | https://www.law.cornell.edu/uscode/text/26/44 |
| Credit rate                          | 50%          | IRC §44(a); statutory           | https://www.law.cornell.edu/uscode/text/26/44 |
| Maximum credit                       | $5,000       | (10,250 − 250) × 50%; statutory | https://www.law.cornell.edu/uscode/text/26/44 |

---

## Data Flow Diagram

flowchart LR subgraph inputs["Data Entry"] exp["eligible_expenditures"]
gr["prior_year_gross_receipts"] fte["prior_year_full_time_employee_count"] end
subgraph node["f8826 (Disabled Access Credit)"] elig["isEligible()"]
credit["computeCredit()"] end subgraph outputs["Downstream Nodes"]
s3["schedule3\nline6a_general_business_credit (gross, not yet Form 3800
limited)"] end gr & fte --> elig --> credit exp --> credit --> s3

---

## Edge Cases & Special Rules

1. **OR eligibility**: Either preceding-year receipts ≤$1M OR full-time
   headcount ≤30 suffices; both values must be known.
2. **$250 floor**: First $250 of expenditures is not creditable; the credit
   starts at expenditures above $250.
3. **$10,250 cap**: Expenditures above $10,250 do not generate additional
   credit; max credit is $5,000.
4. **Eligible expenditures**: Must be for removing barriers or providing
   auxiliary aids to comply with ADA. Examples: ramps, accessible parking,
   Braille materials, sign-language interpreters.
5. **New businesses**: A business in its first year can report zero prior-year
   receipts and employees.
6. **Non-refundable**: Credit offsets income tax only; excess carries forward
   via Form 3800.
7. **IRC §190 interaction**: Some expenditures qualifying for §44 may also
   qualify for the §190 barrier removal deduction. Amounts used for the §44
   credit reduce the §190 deduction.

---

## Sources

| Document                              | Year                           | Section  | URL                                           | Saved as                    |
| ------------------------------------- | ------------------------------ | -------- | --------------------------------------------- | --------------------------- |
| Form 8826 with instructions           | 2017 revision, current IRS PDF | All      | https://www.irs.gov/pub/irs-pdf/f8826.pdf     | N/A                         |
| IRC §44 — Disabled Access Credit      | current                        | §44(a–c) | https://www.law.cornell.edu/uscode/text/26/44 | N/A                         |
| Rev Proc 2024-40 (TY2025 adjustments) | 2024                           | §3       | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | .research/docs/rp-24-40.pdf |

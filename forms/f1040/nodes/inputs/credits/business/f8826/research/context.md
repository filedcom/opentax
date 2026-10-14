# Form 8826 — Disabled Access Credit

## Overview

Computes the Disabled Access Credit under IRC §44 for small businesses that
incur eligible access expenditures to comply with the Americans with
Disabilities Act (ADA). Self-earned eligibility requires preceding-year gross
receipts ≤$1M OR ≤30 full-time employees (either condition suffices). Line 6 is
50% × (eligible expenditures − $250); line 7 adds partnership and S corporation
credits; combined line 8 is capped at $5,000. The present graph routes the
source amount to Form 3800, where a positive claim stops until its tax-liability
limit is wired.

**IRS Form:** 8826 **Drake Screen:** 8826 **Node Type:** input **Tax Year:**
2025 **Drake Reference:** https://kb.drakesoftware.com/Site/Browse/14021

---

## Input Fields

| Field                               | Type                 | Required               | Source / Label                              | Description                                                                                                                                          | IRS Reference                                   | URL                                       |
| ----------------------------------- | -------------------- | ---------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------- |
| eligible_expenditures               | number (≥0)          | Yes                    | Eligible expenditures                       | Amounts paid or incurred to comply with ADA (Line 1)                                                                                                 | Form 8826 Line 1; IRC §44(c)                    | https://www.irs.gov/pub/irs-pdf/i8826.pdf |
| prior_year_gross_receipts           | number (≥0)          | For self-earned credit | Preceding-year gross receipts               | Include predecessor and common-control receipts; ≤$1M qualifies                                                                                      | Form 8826 instructions, Eligible Small Business | https://www.irs.gov/pub/irs-pdf/f8826.pdf |
| prior_year_full_time_employee_count | nonnegative integer  | For self-earned credit | Preceding-year full-time employee headcount | An employee is full-time at ≥30 hours/week for ≥20 calendar weeks; ≤30 qualifies                                                                     | Form 8826 instructions, Eligible Small Business | https://www.irs.gov/pub/irs-pdf/f8826.pdf |
| subject_to_passive_activity_limit   | boolean              | Yes                    | Passive-activity answer                     | Positive passive credit stops until Form 8582-CR is integrated                                                                                       | Form 3800 Part III column (d)                   | https://www.irs.gov/instructions/i3800    |
| pass_through_credits                | array of K-1 sources | No                     | Form 8826 line 7                            | Entity type, EIN, credit amount, and per-source passive classification. Pass-through-only claim goes directly on Form 3800 without filing Form 8826. | Form 8826 lines 7-8                             | https://www.irs.gov/pub/irs-pdf/f8826.pdf |

---

## Calculation Logic

### Step 1 — Eligibility check

`eligible = (prior_year_gross_receipts ≤ $1,000,000) OR (prior_year_full_time_employee_count ≤ 30)`
Both facts are required to prevent missing information from being treated as
eligibility for a self-earned credit. Pass-through-only credit does not need the
recipient's own receipts or employee count. If neither qualifies, the
self-earned credit = 0. Source: IRC §44(b); Form 8826 instructions —
https://www.irs.gov/pub/irs-pdf/f8826.pdf

### Step 2 — Compute credit

`cappedExpenses = min(eligible_expenditures, $10,250)`
`line6 = max(0, min(eligible_expenditures − $250, $10,000)) × 50%`
`line7 = sum(pass_through_credits)`
`line8 = min(eligible_self_line6 + line7, $5,000)` If eligible_expenditures ≤
$250: self-earned line 6 = 0. Source: IRC §44(a); Form 8826 lines 4-8 —
https://www.irs.gov/pub/irs-pdf/i8826.pdf

---

## Output Routing

| Output Field         | Destination Node | Condition  | IRS Reference                                                                                                                                     | URL                                    |
| -------------------- | ---------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| f8826_credit_entries | f3800            | line 8 > 0 | Form 8826 line 8 or direct pass-through source → Form 3800 Part III line 1e. Positive claims stop before Schedule 3 until Form 3800 is finalized. | https://www.irs.gov/instructions/i3800 |

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
gbc["f3800\nline 1e source entry; positive credit stops until limitation"] end
gr & fte --> elig --> credit exp --> credit --> gbc

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
8. **Passive activity**: A positive source credit marked passive currently
   stops. It needs Form 8582-CR before the Form 3800 tax-liability limit.
9. **Pass-through-only**: The IRS does not require a separate Form 8826 when the
   taxpayer's only disabled-access credit comes from a partnership or S
   corporation. The Form 3800 draft omits the Form 8826 document reference in
   that case; the K-1 source-document bundle is still open.
10. **Combined cap**: Line 8 caps self-earned plus pass-through credit at
    $5,000. When that cap binds, source amounts are allocated pro rata in cents
    using the largest remainders. Filed K-1 source reconciliation and
    carryforward identity remain open.

---

## Sources

| Document                              | Year                           | Section  | URL                                           | Saved as                    |
| ------------------------------------- | ------------------------------ | -------- | --------------------------------------------- | --------------------------- |
| Form 8826 with instructions           | 2017 revision, current IRS PDF | All      | https://www.irs.gov/pub/irs-pdf/f8826.pdf     | N/A                         |
| IRC §44 — Disabled Access Credit      | current                        | §44(a–c) | https://www.law.cornell.edu/uscode/text/26/44 | N/A                         |
| Rev Proc 2024-40 (TY2025 adjustments) | 2024                           | §3       | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | .research/docs/rp-24-40.pdf |

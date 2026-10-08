# Form 6765 — Credit for Increasing Research Activities

## Overview
Computes the R&D tax credit under IRC §41 using either the Regular method (Section A: 20% of excess QRE over fixed base) or the Alternative Simplified Credit (Section B: 14% of excess current QRE over 50% of 3-year prior average QRE). The credit is a general business credit flowing to Schedule 3 line 6z. Startup companies (≤5 years, no income tax) may elect to offset payroll tax instead (IRC §41(h)).

**IRS Form:** 6765
**Drake Screen:** 6765
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/13516

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| method | ResearchMethod enum | Yes | Credit method | "regular" (Section A) or "asc" (Section B) | Form 6765 Part selection | https://www.irs.gov/pub/irs-pdf/i6765.pdf |
| regular_wages | number (≥0) | No | Qualified wages | Wages paid to employees for qualified research | Form 6765 Section A Line 1 | https://www.irs.gov/pub/irs-pdf/i6765.pdf |
| regular_supplies | number (≥0) | No | Qualified supplies | Supplies used in qualified research | Form 6765 Section A Line 2 | https://www.irs.gov/pub/irs-pdf/i6765.pdf |
| regular_contract_research | number (≥0) | No | Contract research | Amounts paid to third parties for qualified research (65% qualifying) | Form 6765 Section A Line 3 | https://www.irs.gov/pub/irs-pdf/i6765.pdf |
| energy_consortium_payments | number (≥0) | No | Energy consortium | Payments to energy research consortia (100% qualifying) | Form 6765 Section A Line 4 | https://www.irs.gov/pub/irs-pdf/i6765.pdf |
| regular_base_amount | number (≥0) | No | Base amount | Computed fixed base amount (Line 8) | Form 6765 Section A Line 8 | https://www.irs.gov/pub/irs-pdf/i6765.pdf |
| gross_receipts | number (≥0) | No | Gross receipts | Gross receipts for fixed-base % computation (reference only) | Form 6765 Section A | https://www.irs.gov/pub/irs-pdf/i6765.pdf |
| asc_current_qre | number (≥0) | No | Current QRE | Current-year qualified research expenses for ASC method | Form 6765 Section B Line 21 | https://www.irs.gov/pub/irs-pdf/i6765.pdf |
| asc_prior_avg_qre | number (≥0) | No | Prior 3-yr avg QRE | Average QRE for the 3 prior tax years | Form 6765 Section B Line 22 | https://www.irs.gov/pub/irs-pdf/i6765.pdf |
| payroll_tax_election | boolean | No | Payroll tax election | True = startup elects to offset payroll tax (IRC §41(h)) | Form 6765 Section D | https://www.irs.gov/pub/irs-pdf/i6765.pdf |
| payroll_tax_credit_elected | number (≥0) | No | Payroll tax credit amount | Amount of credit to apply against payroll tax (≤ credit, ≤ $500k) | Form 6765 Section D Line 44 | https://www.irs.gov/pub/irs-pdf/i6765.pdf |

---

## Calculation Logic

### Step 1 — Regular method QRE (Section A)
`QRE = wages + supplies + (contract_research × 0.65) + energy_consortium_payments`
Contract research rate: 65% per IRC §41(b)(3).
Source: IRC §41(b); Form 6765 Section A Lines 1–5 — https://www.irs.gov/pub/irs-pdf/i6765.pdf

### Step 2 — Regular credit
`credit = max(0, QRE − base_amount) × 0.20`
Source: IRC §41(a)(1); Form 6765 Line 9 — https://www.irs.gov/pub/irs-pdf/i6765.pdf

### Step 3 — ASC method (Section B, alternative)
`base = round(asc_prior_avg_qre × 0.50)`
`credit = round(max(0, asc_current_qre − base) × 0.14)`
If no QREs in any prior 3 years: apply 6% rate per IRC §41(c)(5)(B) using credit_rate_override.
Source: IRC §41(c)(5); Form 6765 Section B Lines 21–24 — https://www.irs.gov/pub/irs-pdf/i6765.pdf

### Step 4 — Payroll tax election (Section D)
If `payroll_tax_election = true`:
`elected = min(payroll_tax_credit_elected, fullCredit, $500,000)`
`remainder = fullCredit − elected`
Only `remainder` flows to Schedule 3. `elected` offsets payroll tax (reported separately on payroll forms).
Source: IRC §41(h); Form 6765 Section D — https://www.irs.gov/pub/irs-pdf/i6765.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line6z_general_business_credit | schedule3 | credit > 0 AND (no payroll election OR remainder > 0) | Form 6765 Line 35; Schedule 3 Line 6z | https://www.irs.gov/pub/irs-pdf/f1040s3.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Regular method credit rate | 20% of excess QRE | IRC §41(a)(1); statutory | https://www.law.cornell.edu/uscode/text/26/41 |
| ASC credit rate (standard) | 14% of excess QRE | IRC §41(c)(5)(A); statutory | https://www.law.cornell.edu/uscode/text/26/41 |
| ASC credit rate (startup, no prior QRE) | 6% of current QRE | IRC §41(c)(5)(B); statutory | https://www.law.cornell.edu/uscode/text/26/41 |
| Contract research qualifying rate | 65% of amounts paid | IRC §41(b)(3); statutory | https://www.law.cornell.edu/uscode/text/26/41 |
| Energy consortium qualifying rate | 100% of payments | IRC §41(b)(3)(C); statutory | https://www.law.cornell.edu/uscode/text/26/41 |
| ASC base fraction | 50% of 3-yr prior avg | IRC §41(c)(5)(A); statutory | https://www.law.cornell.edu/uscode/text/26/41 |
| Payroll tax election annual cap | $500,000 | IRC §41(h)(1)(B); statutory | https://www.law.cornell.edu/uscode/text/26/41 |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry"]
    method["method (regular|asc)"]
    regA["Section A: wages, supplies,\ncontract, energy, base"]
    secB["Section B: current_qre, prior_avg_qre"]
    payroll["Payroll election + amount"]
  end
  subgraph node["f6765 (R&D Credit)"]
    qre["regularQRE() or ascCredit()"]
    credit["computeCredit()"]
    ptax["payroll tax split"]
  end
  subgraph outputs["Downstream Nodes"]
    s3["schedule3\nline6z_general_business_credit"]
  end
  method --> qre
  regA --> qre
  secB --> qre
  qre --> credit --> ptax --> s3
  payroll --> ptax

---

## Edge Cases & Special Rules

1. **Must choose one method**: Regular and ASC are mutually exclusive. Once ASC is elected for any year, the taxpayer cannot switch back to the Regular method without IRS consent.
2. **ASC startup 6% rule (implementation gap)**: When `asc_prior_avg_qre = 0` because the taxpayer has NO QREs in any of the 3 prior years (true startup), the rate is 6% × current QRE per IRC §41(c)(5)(B). The current code incorrectly applies 14% × current QRE when priorAvg = 0. Use `credit_rate_override` or handle with a flag in future.
3. **Contract research 65% rule**: Only 65% of amounts paid to third parties qualifies. In-house research is 100%. University consortium payments are different (see IRC §41(b)(3)(C)).
4. **Fixed-base percentage cap**: Regular method base amount cannot exceed 16% of gross receipts × average of 3 prior years (IRC §41(c)(3)). Node accepts `regular_base_amount` as pre-computed.
5. **Payroll tax election — startup only**: Only available to companies ≤5 years old with no income tax liability (IRC §41(h)(4)). Node does not enforce eligibility.
6. **Payroll tax cap**: Election is capped at $500k/year. The elected amount reduces the Schedule 3 credit by exactly that amount.
7. **IRC §280C wage reduction**: Taxpayers not making the §280C(c)(3) election must reduce their wage deduction by the credit amount. This affects the wage deduction in Schedule C/E, not this node.
8. **AMT interaction**: The R&D credit may offset AMT for eligible small businesses (IRC §38(c)(6)). Form 3800 handles this.
9. **Carryover**: Non-refundable; excess carries back 1 year, forward 20 years (Form 3800).
10. **New reporting (TY2024+)**: IRS requires detailed information on qualified research activities — separate attachment may be needed for Section B claims.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 6765 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i6765.pdf | .research/docs/i6765.pdf |
| IRC §41 — Credit for Increasing Research Activities | current | §41(a–h) | https://www.law.cornell.edu/uscode/text/26/41 | N/A |
| Rev Proc 2024-40 (TY2025 adjustments) | 2024 | §3 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | .research/docs/rp-24-40.pdf |
| IRC §280C — Denial of double benefit | current | §280C(c) | https://www.law.cornell.edu/uscode/text/26/280C | N/A |

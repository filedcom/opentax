# PPP Forgiveness — Paycheck Protection Program Loan Forgiveness (Informational)

## Overview

This node captures PPP (Paycheck Protection Program) loan forgiveness amounts for individual federal returns. PPP loan forgiveness is **excluded from gross income** under CARES Act §1106(i) (P.L. 116-136, signed March 27, 2020) and confirmed by CAA 2021 §276 (P.L. 116-260, signed December 27, 2020).

Under current law (post-CAA 2021 §276), expenses paid with forgiven PPP funds **ARE fully deductible** — Congress reversed the original IRS position in Notice 2020-32, which had disallowed those deductions. Therefore, PPP forgiveness has **zero net federal tax impact** for individual filers: no income added, no deductions reduced.

This node is **informational/passthrough only** — it validates and stores the forgiven amount for recordkeeping, state tax engine use, and Rev. Proc. 2021-48 election tracking. It produces no federal output.

**IRS Form:** N/A (no dedicated IRS form; reported on return as excluded income — not on a line)
**Drake Screen:** PPP2
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** N/A (no public Drake KB article found)

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| forgiven_amount | number (nonnegative) | Yes | PPP2 screen — "Amount Forgiven" | Dollar amount of PPP loan principal forgiven by lender. The full amount is excluded from gross income. | CARES Act §1106(i); CAA 2021 §276; IRC §61 (exclusion from) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section636m&num=0&edition=prelim |
| loan_number | string | No | PPP2 screen — "SBA Loan Number" | SBA-assigned loan number for reference / recordkeeping. Does not affect tax calculation. | N/A (administrative reference only) | N/A |
| forgiveness_year | number (integer, 4-digit) | No | PPP2 screen — "Year Forgiveness Received" | Tax year in which forgiveness was granted or accrued. Used for Rev. Proc. 2021-48 timing election tracking. | Rev. Proc. 2021-48, §3 (2021-49 I.R.B. 764) | https://www.irs.gov/pub/irs-drop/rp-21-48.pdf |

---

## Calculation Logic

### Step 1 — Parse and validate input
Zod schema enforces: `forgiven_amount` ≥ 0 (required); `loan_number` optional string; `forgiveness_year` optional 4-digit integer.
Throw on schema violations.

Source: CARES Act §1106(i), P.L. 116-136, §1106(i) — "For purposes of the Internal Revenue Code of 1986, any amount which (but for this subsection) would be includible in gross income of the eligible recipient by reason of forgiveness described in subsection (b) shall be excluded from gross income."

### Step 2 — No federal tax computation
PPP forgiveness is fully excluded from federal gross income. Expenses paid with forgiven proceeds are fully deductible (CAA 2021 §276). No amount flows to any 1040 income or deduction line.

Source: CAA 2021 §276(a)–(b), P.L. 116-260, enacted December 27, 2020 — "no amount shall be included in the gross income of the eligible recipient ... and no deduction shall be denied ... by reason of the exclusion from gross income."

### Step 3 — Return empty outputs
Node emits `{ outputs: [] }`. State tax engines may read `forgiven_amount` from the node's stored input for non-conforming state calculations.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| (none) | (none) | PPP forgiveness is fully excluded from federal gross income — no output routing for federal 1040 | CARES Act §1106(i); CAA 2021 §276 | https://www.irs.gov/pub/irs-drop/n-21-06.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Federal gross income exclusion | 100% of forgiven amount, no cap | CARES Act §1106(i); CAA 2021 §276(a) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section636m |
| Expense deductibility | Fully allowed (no disallowance) | CAA 2021 §276(b), P.L. 116-260 | https://www.congress.gov/116/plaws/publ260/PLAW-116publ260.pdf |
| Rev. Proc. 2021-48 election options | 3 (year of forgiveness; year of application; year of safe harbor) | Rev. Proc. 2021-48 §3, 2021-49 I.R.B. 764 | https://www.irs.gov/pub/irs-drop/rp-21-48.pdf |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (PPP2 screen)"]
    A[forgiven_amount]
    B[loan_number - optional]
    C[forgiveness_year - optional]
  end
  subgraph node["ppp_forgiveness node"]
    D[Validate schema]
    E[No federal computation]
  end
  subgraph outputs["Federal Outputs"]
    F[outputs = empty array]
  end
  A --> D
  B --> D
  C --> D
  D --> E --> F
```

---

## Edge Cases & Special Rules

1. **forgiven_amount = 0**: Valid input (partial forgiveness still pending, or no forgiveness received). Produces empty outputs. No error.

2. **Partial forgiveness**: Only the forgiven portion is excluded. The unforgiven remainder is a regular loan (debt). This node captures only the forgiven amount — unforgiven portions are not tracked here.

3. **Rev. Proc. 2021-48 timing elections**: Taxpayers who received PPP forgiveness in a year other than when expenses were paid may need to elect which year to exclude. `forgiveness_year` stores the year for reference. Three elections available:
   - Election 1: Exclude in the year expenses were paid (i.e., apply to tax year the qualifying expenses were incurred)
   - Election 2: Exclude in the year the application for forgiveness was submitted
   - Election 3: Exclude in the year forgiveness was granted (default)
   Source: Rev. Proc. 2021-48, §3, 2021-49 I.R.B. 764.

4. **State non-conformity**: Many states (CA, TX, etc.) did not conform to the federal exclusion or deduction allowance. State-specific adjustments are the state engine's responsibility. This node provides `forgiven_amount` as a data source for state calculations.

5. **Second Draw PPP (PPP2)**: Both first-draw and second-draw PPP loan forgiveness are excluded under the same rules. The Drake screen PPP2 covers both; this node handles either.

6. **Economic Injury Disaster Loan (EIDL) advances**: EIDL emergency advance grants are also excluded from gross income (CARES Act §1110(e)(4)). These are NOT captured by this node — they would be a separate informational node if needed.

7. **Basis adjustments for S-corps/partnerships**: Rev. Proc. 2021-49 provides basis adjustment rules for pass-through entities. Those adjustments flow through K-1 nodes, not this node.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| CARES Act, P.L. 116-136 | 2020 | §1106(i) — PPP forgiveness gross income exclusion | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section636m | N/A |
| CAA 2021, P.L. 116-260 | 2020 | §276 — Deductibility of expenses; exclusion confirmed | https://www.congress.gov/116/plaws/publ260/PLAW-116publ260.pdf | N/A |
| IRS Notice 2020-32 | 2020 | Original position (REVERSED): disallowed deductions | https://www.irs.gov/pub/irs-drop/n-20-32.pdf | .research/docs/n-20-32.pdf |
| IRS Notice 2021-06 | 2021 | Clarified CAA 2021 §276 application | https://www.irs.gov/pub/irs-drop/n-21-06.pdf | .research/docs/n-21-06.pdf |
| Rev. Proc. 2021-48 | 2021 | Three elections for timing of PPP forgiveness exclusion | https://www.irs.gov/pub/irs-drop/rp-21-48.pdf | .research/docs/rp-21-48.pdf |
| Rev. Proc. 2021-49 | 2021 | Basis adjustments for partnerships/S-corps (not 1040 individual) | https://www.irs.gov/pub/irs-drop/rp-21-49.pdf | N/A |

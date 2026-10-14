# f8867 — Form 8867: Paid Preparer's Due Diligence Requirements

## Overview
Form 8867 is a compliance form required for paid tax preparers when a return claims the Earned Income Tax Credit (EITC), Child Tax Credit/Additional Child Tax Credit (CTC/ACTC), American Opportunity Tax Credit (AOTC), or Head of Household (HOH) filing status. It documents the preparer's due diligence: that the preparer interviewed the taxpayer, reviewed required documentation, and completed knowledge-based questions. The form produces no tax computation output — it is a compliance checklist only. The IRC §6695(g) penalty for failing to file is $600 per failure per return (TY2025, inflation-adjusted). This node captures preparer compliance data and emits no downstream tax outputs.

**IRS Form:** Form 8867
**Drake Screen:** 8867
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** N/A (compliance-only, no federal tax computation)

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| credits_claimed | array of CreditClaimed enum | No | Credits/benefits claimed | Which credits/benefits are claimed: EITC, CTC, AOTC, HOH | Form 8867, Part I (line 1) | https://www.irs.gov/pub/irs-pdf/f8867.pdf |
| taxpayer_interview_conducted | boolean | No | Interview conducted? | Did the preparer conduct an interview with the taxpayer? | Form 8867, Part I (line 2) | https://www.irs.gov/pub/irs-pdf/f8867.pdf |
| documentation_reviewed | boolean | No | Documentation reviewed? | Did the preparer review documents supporting the credits? | Form 8867, Part II/III/IV/V | https://www.irs.gov/pub/irs-pdf/f8867.pdf |
| knowledge_questions_satisfied | boolean | No | Knowledge questions answered? | Were any knowledge-based inconsistency questions resolved? | Form 8867, Part II-V per credit | https://www.irs.gov/pub/irs-pdf/f8867.pdf |
| records_retained | boolean | No | Records retained? | Did the preparer retain a copy of documents relied upon? | Form 8867 instructions, p. 4 | https://www.irs.gov/pub/irs-pdf/i8867.pdf |

---

## Calculation Logic

### Step 1 — No tax computation
Form 8867 is a due diligence checklist. It has no arithmetic that affects tax liability, credits, or deductions. The node captures compliance data only. compute() returns empty outputs.
Source: IRC §6695(g); Form 8867 instructions; Rev. Proc. 2024-40.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| (none) | (none) | Compliance form only — no tax computation output | IRC §6695(g) | https://www.law.cornell.edu/uscode/text/26/6695 |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Penalty per failure (IRC §6695(g)) | $600 | Rev. Proc. 2024-40, §3.57 (inflation-adjusted) | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| Credits requiring Form 8867 | EITC, CTC/ACTC, AOTC, HOH | IRC §6695(g) | https://www.law.cornell.edu/uscode/text/26/6695 |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry (Preparer Compliance)"]
    A[credits_claimed]
    B[taxpayer_interview_conducted]
    C[documentation_reviewed]
    D[knowledge_questions_satisfied]
    E[records_retained]
  end
  subgraph node["f8867 Node"]
    F[compute: no tax calculation]
  end
  subgraph outputs["Downstream Nodes"]
    G[none — compliance only]
  end
  inputs --> node --> outputs

---

## Edge Cases & Special Rules

1. **No tax effect**: Form 8867 has no bearing on the taxpayer's tax liability. It is only a preparer compliance form.
2. **Penalty is on the preparer, not taxpayer**: The §6695(g) $600 penalty applies to the tax return preparer, not captured in this computation engine.
3. **HOH is a filing status, not a credit**: Despite Form 8867 covering HOH due diligence, HOH is a filing status. The node captures it as a CreditClaimed enum value for completeness.
4. **Multiple credits**: A single Form 8867 covers all applicable credits claimed on one return. The credits_claimed field is an array of enums.
5. **Self-prepared returns**: Form 8867 is required only for paid preparers. Self-prepared returns do not require it, but the node may still be populated if a preparer was involved.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8867 | 2025 | All | https://www.irs.gov/pub/irs-pdf/f8867.pdf | N/A |
| Form 8867 Instructions | 2025 | All | https://www.irs.gov/pub/irs-pdf/i8867.pdf | N/A |
| IRC §6695(g) | - | §6695(g) | https://www.law.cornell.edu/uscode/text/26/6695 | N/A |
| Rev. Proc. 2024-40 | 2024 | §3.57 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | N/A |

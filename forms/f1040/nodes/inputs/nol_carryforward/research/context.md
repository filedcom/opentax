# NOL Carryforward — Net Operating Loss Carryforward Deduction

## Overview

This node captures net operating loss (NOL) carryforward amounts from prior tax years. Each item represents one year's NOL. The node computes the deductible NOL amount and routes it to Schedule 1, Line 8a as a negative number (reducing other income).

Under TCJA (P.L. 115-97), NOL carrybacks were eliminated for most losses arising after 12/31/2017. Post-2017 NOLs carry forward indefinitely but are limited to 80% of current-year taxable income (before the NOL deduction). Pre-2018 NOLs follow the old rules: up to 100% of income, 20-year carryforward.

**IRS Form:** No dedicated form for carryforward input. Drake uses Wks_CARRY screen. IRS Form 1045 Schedule A used for refund claims.
**Drake Screen:** LOSS (Wks_CARRY — NOL worksheet)
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/12435

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| `year` | `number` (integer, positive) | Yes | Drake LOSS screen — Year of loss | The tax year in which the NOL arose. Used for distinguishing pre-2018 from post-2017 NOLs. | IRC §172(b) | https://www.irs.gov/pub/irs-pdf/p536.pdf |
| `nol_amount` | `number` (nonnegative) | Yes | Drake LOSS screen — NOL carryforward amount | The NOL carryforward amount available from the specified year (after any prior absorptions). | IRC §172(b)(1); Pub 536 | https://www.irs.gov/pub/irs-pdf/p536.pdf |
| `nol_type` | `NolType` enum | Yes | Drake LOSS screen — Type | PRE2018: arose before 1/1/2018 (100% income limit, 20-yr carryforward). POST2017: arose after 12/31/2017 (80% income limit, indefinite carryforward). | IRC §172(a); TCJA P.L. 115-97 | https://www.irs.gov/pub/irs-pdf/p536.pdf |
| `current_year_taxable_income` | `number` | Yes (top-level) | Drake LOSS screen — Current year taxable income | Current-year taxable income before the NOL deduction. Required to compute the 80% limitation for post-2017 NOLs. May be negative if other losses exist. | IRC §172(a)(2)(B) | https://www.irs.gov/pub/irs-pdf/p536.pdf |

---

## Calculation Logic

### Step 1 — Separate pre-2018 and post-2017 NOLs
Items are partitioned by `nol_type`:
- PRE2018: subject to 100% income limit
- POST2017: subject to 80% income limit

### Step 2 — Apply pre-2018 NOL deduction
```
pre2018_available = sum of nol_amount for all PRE2018 items
pre2018_deduction = min(pre2018_available, max(0, current_year_taxable_income))
```
Pre-2018 NOLs can offset up to 100% of current-year taxable income. If taxable income is zero or negative, no deduction.

Source: IRC §172(b)(1)(A) (pre-TCJA rules preserved for pre-2018 losses); Pub 536.

### Step 3 — Apply post-2017 NOL deduction
```
income_after_pre2018 = current_year_taxable_income - pre2018_deduction
post2017_available = sum of nol_amount for all POST2017 items
post2017_limit = max(0, income_after_pre2018 × 0.80)
post2017_deduction = min(post2017_available, post2017_limit)
```
Post-2017 NOLs are limited to 80% of taxable income remaining after pre-2018 deductions.

Source: IRC §172(a)(2)(B); TCJA P.L. 115-97; Pub 536, Chapter 1.

### Step 4 — Total NOL deduction
```
total_nol_deduction = pre2018_deduction + post2017_deduction
```

### Step 5 — Route to Schedule 1
If `total_nol_deduction > 0`, emit one output to `schedule1.line8a_nol_deduction` as a positive number (schedule1 treats it as reducing income by convention).

Source: Schedule 1 (Form 1040), Part I, Line 8a; IRS instructions for Schedule 1.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| `line8a_nol_deduction` | `schedule1` | Total NOL deduction > 0 | Schedule 1 (Form 1040), Part I, Line 8a | https://www.irs.gov/pub/irs-pdf/f1040s1.pdf |

**Note:** `schedule1` is a sink node (assembles the printed form only). It does NOT feed `agi_aggregator`. The NOL deduction reduces adjusted gross income and must therefore also be sent to `agi_aggregator` — currently this is handled via `schedule1.line8a_nol_deduction` which `schedule1`'s `otherIncome()` function negates. No separate `agi_aggregator` output is needed because NOL appears in Schedule 1 Part I (additional income section) rather than Part II (deductions section).

## Schema Extension Required

**CRITICAL:** Before implementing the `nol_carryforward` node, verify that `forms/f1040/nodes/outputs/schedule1/index.ts` already includes `line8a_nol_deduction` in its `inputSchema`. As of the research date, the `schedule1` schema already contains:
```typescript
// Line 8a — Net operating loss (NOL) deduction (IRC §172; negative entry reducing income)
line8a_nol_deduction: z.number().nonnegative().optional(),
```

And the `otherIncome()` function already negates it:
```typescript
(input.line8a_nol_deduction !== undefined ? -(input.line8a_nol_deduction) : 0)
```

**No schema extension to `schedule1` is required** — the `line8a_nol` / `line8a_nol_deduction` field already exists. Verify the field name (`line8a_nol_deduction`) before writing tests. The `agi_aggregator` does NOT need a separate `line8a_nol` field because the NOL deduction is captured in Schedule 1 Part I (income section), not Part II (above-the-line deductions). The `agi_aggregator` handles NOL through its `line8z_other` or equivalently as a gross income reduction.

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Post-2017 NOL income limitation | 80% of current-year taxable income | IRC §172(a)(2)(B); TCJA P.L. 115-97 | https://www.irs.gov/pub/irs-pdf/p536.pdf |
| Pre-2018 NOL income limitation | 100% of current-year taxable income | IRC §172(b)(1)(A) (pre-TCJA) | https://www.irs.gov/pub/irs-pdf/p536.pdf |
| Post-2017 NOL carryforward period | Indefinite | IRC §172(b)(1)(A)(ii) as amended by TCJA | https://www.irs.gov/pub/irs-pdf/p536.pdf |
| Pre-2018 NOL carryforward period | 20 years | IRC §172(b)(1)(A)(i) (pre-TCJA) | https://www.irs.gov/pub/irs-pdf/p536.pdf |
| Post-2017 NOL carryback | Generally not allowed | IRC §172(b)(1)(A)(i) as amended by TCJA | https://www.irs.gov/pub/irs-pdf/p536.pdf |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    CYTI["current_year_taxable_income"]
    ITEMS["nol items: year, nol_amount, nol_type"]
  end

  subgraph node["nol_carryforward"]
    PART["Partition: PRE2018 vs POST2017"]
    PRE["pre2018_deduction = min(sum, taxable_income)"]
    POST["post2017_deduction = min(sum, 80%×remaining_income)"]
    TOTAL["total = pre2018_deduction + post2017_deduction"]
  end

  subgraph outputs["Downstream"]
    S1["schedule1.line8a_nol_deduction"]
  end

  CYTI --> PRE
  CYTI --> POST
  ITEMS --> PART
  PART --> PRE
  PART --> POST
  PRE --> TOTAL
  POST --> TOTAL
  TOTAL -->|"total > 0"| S1
```

---

## Edge Cases & Special Rules

1. **Post-2017 80% limitation.** The 80% limit applies to taxable income *before* the NOL deduction. If current-year taxable income is $100,000 and the taxpayer has a $90,000 post-2017 NOL, only $80,000 is deductible.

2. **Pre-2018 NOLs applied first.** The IRS generally applies pre-2018 NOLs before post-2017 NOLs when computing the 80% limitation base. This node applies pre-2018 first, reducing income available for the 80% post-2017 test.

3. **Zero or negative current-year taxable income.** If current-year taxable income ≤ 0, neither pre-2018 nor post-2017 NOLs produce a deduction in the current year. No output is emitted.

4. **Multiple years of NOLs.** Multiple items can be provided (e.g., 2020 NOL and 2021 NOL). They are summed by type before the income limitation is applied. The node does not track which specific year's NOL is consumed — that's a data-entry and carryforward tracking concern.

5. **Node does not compute the remaining carryforward.** The node only computes the deductible amount for the current year. The caller is responsible for tracking remaining carryforwards after absorption.

6. **Line 8a is a deduction presented as a positive number in the node output.** Schedule 1 handles the sign (it appears as a negative/reduction in other income at the form level).

7. **Excess business loss interaction.** Form 461 limits excess business losses; those interact with the NOL calculation at a higher level. This node takes current_year_taxable_income as given and does not re-derive it.

8. **COVID relief.** CARES Act allowed 5-year carryback for 2018–2020 NOLs. Those elections would have been made in prior years; this node handles only carryforward amounts as provided.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Publication 536 (Net Operating Losses) | 2024 | All chapters | https://www.irs.gov/pub/irs-pdf/p536.pdf | .research/docs/p536.pdf |
| IRC §172 — Net Operating Loss Deduction | Current | §172(a),(b) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section172 | N/A |
| TCJA P.L. 115-97, §13302 — NOL modifications | 2017 | §13302 | https://www.congress.gov/115/plaws/publ97/PLAW-115publ97.pdf | N/A |
| Schedule 1 (Form 1040) | 2025 | Part I, Line 8a | https://www.irs.gov/pub/irs-pdf/f1040s1.pdf | N/A |
| IRS Form 1045 Schedule A | 2024 | Schedule A | https://www.irs.gov/pub/irs-pdf/f1045.pdf | N/A |
| Drake Software KB — NOL Carryforward | Current | Wks_CARRY screen | https://kb.drakesoftware.com/Site/Browse/12435 | N/A |

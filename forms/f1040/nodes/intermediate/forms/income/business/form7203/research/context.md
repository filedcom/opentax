# Form 7203 — S Corporation Shareholder Stock and Debt Basis Limitations

## Overview

Form 7203 calculates an S corporation shareholder's adjusted stock basis and debt basis to determine how much of the S corporation's losses and deductions can be deducted on the shareholder's individual return. Losses are limited to the shareholder's basis (stock + debt). Excess losses are suspended and carried forward indefinitely.

This intermediate node receives merged K-1 data from the k1_s_corp input node plus user-entered beginning basis information, then posts a disallowed add-back to schedule1 when basis is insufficient to absorb all losses.

**IRS Form:** Form 7203
**Drake Screen:** K1S > "Basis (7203)" tab
**Node Type:** intermediate
**Tax Year:** 2025
**Drake Reference:** N/A (no specific KB article found)

---

## Input Fields

Fields received from k1_s_corp node's routed output plus user-entered beginning basis. This is an intermediate node — all fields are received as a flat merged object.

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| `stock_basis_beginning` | number ≥ 0 | No | Line 1 | Beginning stock basis at start of tax year | Form 7203 Part I, Line 1 | https://www.irs.gov/instructions/i7203 |
| `additional_contributions` | number ≥ 0 | No | Line 2 | Capital contributions and stock acquisitions during year | Form 7203 Part I, Line 2 | https://www.irs.gov/instructions/i7203 |
| `ordinary_income` | number ≥ 0 | No | K-1 Box 1 (income) | Ordinary business income from S-corp K-1 (increases basis); only positive amounts | IRC §1367(a)(1); Form 7203 Part I Line 3 | https://www.irs.gov/instructions/i7203 |
| `tax_exempt_income` | number ≥ 0 | No | K-1 Box 16 Code A | Tax-exempt income increasing basis | IRC §1367(a)(1)(A); Form 7203 Line 3 | https://www.irs.gov/instructions/i7203 |
| `distributions` | number ≥ 0 | No | K-1 Box 16 Code D | Nondividend distributions reducing stock basis | IRC §1367(a)(2)(A); Form 7203 Line 6 | https://www.irs.gov/instructions/i7203 |
| `nondeductible_expenses` | number ≥ 0 | No | K-1 Box 16 Code C | Nondeductible, non-capital expenses reducing basis | IRC §1367(a)(2)(D); Form 7203 Line 8a | https://www.irs.gov/instructions/i7203 |
| `ordinary_loss` | number ≥ 0 | No | K-1 Box 1 (loss, abs value) | Current year ordinary business loss (positive amount) | IRC §1366(a)(1); Form 7203 Part III Col (a) | https://www.irs.gov/instructions/i7203 |
| `prior_year_unallowed_loss` | number ≥ 0 | No | Carryforward | Prior year suspended losses carried forward (positive amount) | IRC §1366(d)(2); Form 7203 Part III Col (b) | https://www.irs.gov/instructions/i7203 |
| `debt_basis_beginning` | number ≥ 0 | No | Line 21 | Beginning adjusted debt basis (may be less than face value if reduced in prior years) | IRC §1367(b)(2); Form 7203 Part II Line 21 | https://www.irs.gov/instructions/i7203 |
| `new_loans` | number ≥ 0 | No | Line 17 | New loans from shareholder to S-corp during year | IRC §1367(b)(2)(A); Form 7203 Part II Line 22 | https://www.irs.gov/instructions/i7203 |

---

## Calculation Logic

### Step 1 — Compute Stock Basis Increases (Part I Lines 1–4)
Start with beginning stock basis. Add contributions and income items.

```
stock_basis_after_increases =
  (stock_basis_beginning ?? 0) +
  (additional_contributions ?? 0) +
  (ordinary_income ?? 0) +
  (tax_exempt_income ?? 0)
```

Source: IRC §1367(a)(1); Form 7203 Part I Lines 1–4; https://www.irs.gov/instructions/i7203

### Step 2 — Reduce for Distributions (Part I Line 6)
Nondividend distributions reduce stock basis (but not below zero). Excess creates capital gain (outside scope of this node).

```
stock_basis_after_distributions =
  max(0, stock_basis_after_increases - (distributions ?? 0))
```

Source: IRC §1367(a)(2)(A); Form 7203 Part I Lines 5–7; https://www.irs.gov/instructions/i7203

### Step 3 — Reduce for Nondeductible Expenses (Part I Lines 8–9)
Nondeductible, non-capital expenses reduce stock basis but not below zero. Applied before losses.

```
stock_basis_after_nonded =
  max(0, stock_basis_after_distributions - (nondeductible_expenses ?? 0))
```

Source: IRC §1367(a)(2)(D); Reg. 1.1367-1(f) ordering; Form 7203 Part I Lines 8–9; https://www.irs.gov/instructions/i7203

### Step 4 — Compute Tentative Stock Basis Available for Losses (Part I Line 10)
This is the maximum loss deductible from stock basis.

```
tentative_stock_basis = stock_basis_after_nonded
```

Source: Form 7203 Part I Line 10; https://www.irs.gov/instructions/i7203

### Step 5 — Compute Total Debt Basis Available for Losses (Part II Lines 21–29)
Debt basis = beginning debt basis + new loans. Losses are then allocated to debt basis only after stock basis is exhausted.

```
tentative_debt_basis =
  (debt_basis_beginning ?? 0) +
  (new_loans ?? 0)
```

Source: IRC §1367(b)(2); Form 7203 Part II Lines 21–22, 29; https://www.irs.gov/instructions/i7203

### Step 6 — Compute Total Loss Pool (Part III Columns a + b)
Combine current year loss with prior year suspended losses.

```
total_loss_pool =
  (ordinary_loss ?? 0) +
  (prior_year_unallowed_loss ?? 0)
```

Source: IRC §1366(d)(2); Form 7203 Part III Lines Col(a) + Col(b); https://www.irs.gov/instructions/i7203

### Step 7 — Allocate Losses to Stock Basis (Part III Column c)
Losses are first absorbed by stock basis.

```
allowed_from_stock = min(total_loss_pool, tentative_stock_basis)
remaining_loss = total_loss_pool - allowed_from_stock
```

Source: IRC §1366(d)(1)(A); Form 7203 Part III Col(c); https://www.irs.gov/instructions/i7203

### Step 8 — Allocate Remaining Losses to Debt Basis (Part III Column d)
If stock basis is insufficient, losses spill over to debt basis.

```
allowed_from_debt = min(remaining_loss, tentative_debt_basis)
```

Source: IRC §1366(d)(1)(B); Form 7203 Part III Col(d); https://www.irs.gov/instructions/i7203

### Step 9 — Compute Total Allowed Loss and Disallowed (Column e)
```
total_allowed_loss = allowed_from_stock + allowed_from_debt
disallowed_loss = total_loss_pool - total_allowed_loss
```

Source: IRC §1366(d)(2); Form 7203 Part III Col(e); https://www.irs.gov/instructions/i7203

### Step 10 — Post Disallowed Add-Back to Schedule 1
The k1_s_corp node already posted the full loss to schedule1 via `line5_schedule_e`. If form7203 finds that some loss is disallowed, it posts a positive add-back to reduce the net deduction.

```
if (disallowed_loss > 0) → emit schedule1 { basis_disallowed_add_back: disallowed_loss }
```

Source: IRC §1366(d)(1); Schedule 1 Part I; https://www.irs.gov/instructions/i7203

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| `basis_disallowed_add_back` | schedule1 | disallowed_loss > 0 | IRC §1366(d)(1); Form 7203 Part III Col(e) | https://www.irs.gov/instructions/i7203 |
| `basis_disallowed_add_back` | agi_aggregator | disallowed_loss > 0 | IRC §1366(d)(1); AGI computation | https://www.irs.gov/instructions/i7203 |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Basis floor | $0 (zero) | IRC §1367(a) — basis cannot go below zero | https://www.irs.gov/instructions/i7203 |
| Loss allocation order | Stock basis first, then debt basis | Reg. 1.1366-2(a)(1) | https://www.irs.gov/instructions/i7203 |
| No dollar thresholds | N/A | Form 7203 has no income phase-outs or fixed dollar limits | N/A |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Upstream Inputs"]
    k1_s_corp["k1_s_corp\n(ordinary_loss, ordinary_income,\ndistributions, nondeductible_expenses)"]
    user["User Entry\n(stock_basis_beginning, debt_basis_beginning,\nnew_loans, additional_contributions,\nprior_year_unallowed_loss, tax_exempt_income)"]
  end
  subgraph node["form7203"]
    calc["1. Stock basis increases\n2. Subtract distributions\n3. Subtract nondeductibles\n4. Compute debt basis\n5. Allocate losses to stock\n6. Overflow to debt\n7. Compute disallowed"]
  end
  subgraph outputs["Downstream Nodes"]
    s1["schedule1\nbasis_disallowed_add_back"]
    agg["agi_aggregator\nbasis_disallowed_add_back"]
  end
  k1_s_corp --> node
  user --> node
  node --> s1
  node --> agg
```

---

## Edge Cases & Special Rules

1. **Basis cannot go below zero** — each reduction step uses `max(0, ...)`.
2. **No loss, no output** — if total_loss_pool is 0, return empty outputs immediately.
3. **Loss fully within basis** — if total basis ≥ total loss pool, disallowed = 0, no output.
4. **Zero basis, full disallowance** — entire loss pool suspended if both stock and debt basis = 0.
5. **Stock basis reduced by distributions before losses** — distributions are applied to stock basis before the loss comparison, per IRC §1367(a)(2) ordering and Reg. 1.1367-1(f).
6. **Nondeductible expenses before losses** — applied after distributions but before losses.
7. **Debt basis used only after stock exhausted** — losses flow first to stock basis, then to debt basis (IRC §1366(d)(1)).
8. **Prior year carryforward included in loss pool** — suspended losses from prior years are added to current year losses before applying basis limit.
9. **Ordinary income offsets loss pool** — ordinary_income increases stock basis before loss limitation is applied (not a direct offset to losses, but increases the basis available).
10. **Open account debt ≥ $25,000** — reclassified as formal note; not modeled here (simplification: use debt_basis_beginning as provided).

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Form 7203 Instructions | 2024 | All Parts | https://www.irs.gov/instructions/i7203 | N/A |
| IRC §1366 | — | Loss limitations | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section1366 | N/A |
| IRC §1367 | — | Adjustments to basis | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section1367 | N/A |
| Reg. 1.1366-2 | — | Shareholder's share of items | N/A | N/A |
| Reg. 1.1367-1(f) | — | Ordering of basis adjustments | N/A | N/A |

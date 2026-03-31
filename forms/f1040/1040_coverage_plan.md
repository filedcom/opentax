# 1040 Coverage Plan — Drake Parity

> Generated: 2026-04-01

## Current State

- **247 screens** tracked in `nodes/inputs/screens.json` (Drake screen-code reference)
- **115 have node implementations** → 46.6% coverage
- **132 screens missing** node coverage

---

## Gap Classification

Of the 132 missing screens:

| Category | Count | In Scope |
|---|---|---|
| Computational gaps | ~48 | ✅ Yes — need new nodes |
| Complex / international | ~22 | ✅ Yes — professional coverage |
| Admin / operational | ~35 | ❌ No — no computation |
| Tabs extending existing nodes | ~27 | ⚠️ Partial — schema extensions |

**Admin screens excluded** (no tax computation): ELEC, MISC, PRNT, EF, PMT, IFP, PIN/8879/8878,
CONS, USE, DISC, 2848, 4506, 843, 911, COMM, IDS, DOCS, FAQ, FAFS, W-4, W-4P, W-9, W7, 7216,
56, STEX (~35 screens).

---

## Phase 1: Self-Employed & Business Owner Gaps

> Highest ROI — affects 30%+ of complex returns

### 1.1 SEP/SIMPLE/Solo 401(k) Deduction
- **Screen:** `SEP`
- **What:** Above-the-line SE retirement deduction (Schedule 1, line 16)
- **New node:** `inputs/sep_retirement/index.ts`
- **Wires to:** `schedule1` (line 16)

### 1.2 NOL Carryforward Tracking
- **Screens:** `LOSS` (Wks_CARRY), `NOL` (Form 1045)
- **What:** Net operating loss carryforwards; reduces current-year income (Schedule 1, line 8a)
- **New node:** `inputs/nol_carryforward/index.ts`
- **Wires to:** `schedule1`

### 1.3 General Business Credit (Form 3800)
- **Screens:** `3800`, `GBC` (carryforward/carryback worksheet)
- **What:** Composite credit combining 30+ individual credits; Schedule 3 line 6
- **New node:** `inputs/f3800/index.ts`
- **Wires to:** `schedule3`
- **MeF builder:** `mef/f3800.ts`

### 1.4 QBI Business Aggregation
- **Screen:** `BAN`
- **What:** §199A aggregation elections for multiple trades/businesses
- **Extend:** `intermediate/form8995/` and `intermediate/form8995a/` to accept groupings
- **No new node** — extend existing schema

### 1.5 K-1 QBI Additional Data
- **Screen:** `K199`
- **What:** QBI amounts, W-2 wages, UBIA from K-1s feeding 8995-A
- **Extend:** `k1_partnership`, `k1_s_corp`, `k1_trust` input schemas with QBI fields
- **No new node** — extend existing schemas

### 1.6 Form 2106 — Employee Business Expenses
- **Screen:** `2106`
- **What:** Reserved employees (Armed Forces, performing artists, fee-based govt officials)
- **New node:** `inputs/f2106/index.ts`
- **Wires to:** `schedule1` (line 12)
- **MeF builder:** `mef/f2106.ts`

---

## Phase 2: Deduction & Credit Worksheets

### 2.1 Long-Term Care Premium Worksheet
- **Screen:** `LTC`
- **What:** Age-based eligible LTC premium limits → Schedule A
- **New node:** `inputs/ltc_premium/index.ts`
- **Wires to:** `schedule_a`

### 2.2 State & Local Sales Tax Deduction Worksheet
- **Screen:** `STAX`
- **What:** General sales tax deduction vs. state income tax election (Schedule A, line 5)
- **New node:** `inputs/sales_tax_deduction/index.ts`
- **Wires to:** `schedule_a`

### 2.3 Auto Expense Worksheet
- **Screen:** `AUTO`
- **What:** Business vehicle: actual cost vs. standard mileage for Schedule C, E, F
- **New node:** `inputs/auto_expense/index.ts`
- **Wires to:** `schedule_c`, `schedule_e`, `schedule_f`

### 2.4 Oil & Gas Depletion Worksheet
- **Screen:** `DEPL`
- **What:** Percentage or cost depletion for mineral/oil/gas interests
- **New node:** `inputs/depletion/index.ts`
- **Wires to:** `schedule_c`, `schedule_e`

### 2.5 Passive Activity Credit Limitations (Form 8582-CR)
- **Screen:** `CR`
- **What:** Limits passive activity credits (mirrors 8582 for losses)
- **New intermediate node:** `intermediate/form8582cr/index.ts`
- **Wires to:** `schedule3`
- **MeF builder:** `mef/f8582cr.ts`

### 2.6 Lump-Sum Social Security Distribution Worksheet
- **Screen:** `LSSA`
- **What:** Special computation for prior-year SS benefits paid as lump sum
- **New node:** `inputs/lump_sum_ss/index.ts`
- **Wires to:** `ssa1099` (extends), `f1040` income calculation

---

## Phase 3: Special Tax Situations

### 3.1 Clergy / Ministerial Income
- **Screen:** `CLGY`
- **What:** Housing allowance exclusion, parsonage value, SE tax on ministerial income
- **New node:** `inputs/clergy/index.ts`
- **Wires to:** `schedule_se`, `schedule_c`

### 3.2 Disaster Retirement Distributions (Form 8915-F / 8915-D)
- **Screens:** `915F`, `915D`
- **What:** COVID/disaster distributions, 3-year income spreading, repayments
- **New nodes:** `inputs/f8915f/index.ts`, `inputs/f8915d/index.ts`
- **Wires to:** `f1040` (income), `schedule3` (repayment credit)
- **MeF builders:** `mef/f8915f.ts`, `mef/f8915d.ts`

### 3.3 First-Time Homebuyer Credit Repayment (Form 5405)
- **Screen:** `HOME`
- **What:** Annual 1/15 repayment of 2008 credit; sale triggers full repayment
- **New node:** `inputs/f5405/index.ts`
- **Wires to:** `schedule2` (other taxes)
- **MeF builder:** `mef/f5405.ts`

### 3.4 Household Employee Wages (HSH)
- **Screen:** `HSH`
- **What:** W-2 wages received from household employer; distinct from employer-side Schedule H
- **Extend:** `inputs/schedule_h/index.ts` or new `inputs/household_wages/index.ts`
- **Wires to:** `f1040` line 1a

### 3.5 Foreign Employer Compensation
- **Screen:** `FEC`
- **What:** Wages from foreign employers without US W-2 or withholding
- **New node:** `inputs/fec/index.ts`
- **Wires to:** `f1040` line 1a

### 3.6 Qualified Small Employer HRA (QSEHRA)
- **Screen:** `QSE`
- **What:** Employer HRA reimbursements affecting PTC eligibility (Form 8962)
- **New node:** `inputs/qsehra/index.ts`
- **Wires to:** `form8962`

---

## Phase 4: Specialty Credits & Rare Forms

Each follows the same pattern: new input node → wire to schedule2/3 → MeF builder.

| Screen | Form | What | Est. complexity |
|---|---|---|---|
| `8917` | Form 8917 | Tuition & Fees deduction (expired fed; state use) | Low |
| `8867` | Form 8867 | Paid Preparer Due Diligence Checklist | Low |
| `8859` | Form 8859 | DC First-Time Homebuyer Credit | Low |
| `8820/DRUG` | Form 8820 | Orphan Drug Credit | Low |
| `8828` | Form 8828 | Federal Mortgage Subsidy Recapture | Low |
| `8835` | Form 8835 | Renewable Electricity Production Credit | Low |
| `8844` | Form 8844 | Empowerment Zone Employment Credit | Low |
| `8864` | Form 8864 | Biodiesel / Renewable Diesel / SAF Credit | Low |
| `8896` | Form 8896 | Low-Sulfur Diesel Production Credit | Low |
| `8912` | Form 8912 | Credit to Holders of Tax Credit Bonds | Low |
| `8978` | Form 8978 | Partner's Additional Reporting Year Tax | Medium |
| `8611` | Form 8611 | LIHTC Recapture | Low |
| `PPP2` | N/A | PPP Loan forgiveness (informational only) | Low |

---

## Phase 5: International & Complex Returns

Required for professional firms handling international clients.

| Screen(s) | Form | What | Est. complexity |
|---|---|---|---|
| `5471` + `SCHA`–`SCHQ` (14 screens) | Form 5471 + Schedules A/B/C/F/G/I/J/M/O/P/Q/R | CFC information returns | Very High |
| `8621` | Form 8621 | PFIC shareholder return | High |
| `8805` | Form 8805 | Foreign partner §1446 withholding | Medium |
| `8833` | Form 8833 | Treaty-based return position disclosure | Low |
| `8840` | Form 8840 | Closer connection exception statement | Low |
| `8843` | Form 8843 | Statement for exempt individuals | Low |
| `8854` | Form 8854 | Initial/annual expatriation statement | Medium |
| `965A/C/D/E` | Forms 965-A/C/D/E | §965 repatriation tax | High |
| `NR`, `NR2`, `NR3` | Form 1040-NR + Schedule NEC/OI | Nonresident alien return | Very High |
| `8873` | Form 8873 | Extraterritorial income exclusion | Medium |
| `8288` | Form 8288-A | FIRPTA withholding statement | Medium |
| `8082` | Form 8082 | Notice of inconsistent treatment | Low |
| `SSA2`, `RRB2` | SSA/RRB-1042S | Nonresident SS/railroad benefits | Low |

---

## Existing Node Extensions (No New Nodes)

These Drake screens map to tabs or additional data on nodes that already exist. Extend the
existing Zod schemas — no new nodes required.

| Screen | What | Existing Node |
|---|---|---|
| `K1S > Pre-2018 Basis` | Pre-2018 S-corp carryover losses/deductions | `k1_s_corp` |
| `K1P > Pre-2018 Basis` | Pre-2018 partner carryover losses/deductions | `k1_partnership` |
| `K1S > Pre-2018 At-Risk` | S-corp at-risk basis pre-2018 | `k1_s_corp` |
| `K1P > Pre-2018 At-Risk` | Partner at-risk basis pre-2018 | `k1_partnership` |
| `K1P > Basis Wkst` | Partner basis worksheet | `k1_partnership` |
| `K1S > Basis (7203)` | Form 7203 S-corp stock/debt basis | `k1_s_corp` → new `intermediate/form7203/` |
| `K1F` | Trust K-1 additional (verify vs. existing `k1_trust`) | `k1_trust` |
| `CIDP` | Form 4835 additional scenario tab | `f4835` |
| `59E` | AMT §59(e) unamortized deduction (Form 1045 AMT) | AMT workflow |

---

## Coverage Trajectory

| After Phase | New Nodes | Est. Coverage |
|---|---|---|
| Current | — | 115/247 = **46.6%** |
| Phase 1 | +6 | ~121/247 |
| Phase 2 | +6 | ~127/247 |
| Phase 3 | +6 | ~133/247 |
| Phases 1–3 complete | 18 | **~133/220 non-admin = ~60%** |
| + Phase 4 | +13 | ~146/247 |
| + Phase 5 | +8–12 | ~155–158/247 |
| + Schema extensions | +0 new nodes | ~164/247 |
| **Full completion** | ~39–47 total | **~85–90% of computational screens** |

> The remaining ~10–15% are niche forms (5471 CFC schedules, 1040-NR) that represent <1% of
> filed returns but are required for professional-grade completeness.

---

## Implementation Pattern (Each Node)

Every new input node follows `CLAUDE.md` conventions:

```
forms/f1040/nodes/inputs/<node>/
  index.ts          ← Zod itemSchema + inputSchema + TaxNode class + singleton export
```

Steps per node:
1. Define `itemSchema` (per-document fields) and `inputSchema` (array of items + any top-level flags)
2. Implement `compute()` — pure functions, no mutation, early returns, small helpers
3. Declare `outputNodes = new OutputNodes([...])` for compile-time routing safety
4. Register in `forms/f1040/2025/registry.ts`
5. Add `filed_tax_node_type_code` to `nodes/inputs/screens.json`
6. Add MeF builder in `forms/f1040/mef/` if form has IRS XML element
7. Write tests (unit + at least one integration scenario)

---

## Verification

Track coverage progress:
```bash
cat forms/f1040/nodes/inputs/screens.json | python3 -c "
import json,sys
d=json.load(sys.stdin)
cov=[s for s in d if s.get('filed_tax_node_type_code')]
print(f'{len(cov)}/{len(d)} covered ({100*len(cov)/len(d):.1f}%)')
"
```

After each phase, run full test suite and a return-level validation:
```bash
deno task test
deno run -A cli/main.ts return validate --returnId <id> --format text
```

Add a new scenario to `docs/scenarios.md` for each phase's representative case.

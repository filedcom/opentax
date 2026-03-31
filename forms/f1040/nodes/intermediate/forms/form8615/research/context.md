# Form 8615 — Tax for Certain Children Who Have Unearned Income (Kiddie Tax)

## Purpose
The "kiddie tax" — applies the parent's marginal rate to a child's net unearned income above $2,600 (TY2025). Routes additional tax to **Schedule 2 line 17d**.

## IRS References
- Form 8615 and Instructions (TY2025)
- IRC §1(g) — Certain Unearned Income of Minor Children Taxed as if Parent's Income
- Rev. Proc. 2024-40

## TY2025 Constants
- **NUI threshold:** $2,600 (net unearned income above which kiddie tax applies; IRC §1(g)(4)(A)(ii)(I))
- **Standard deduction floor:** $1,300 (IRC §1(g)(4)(A)(ii)(II))
- TY2025 tax brackets for MFJ, Single/HOH, MFS — full 7-bracket tables embedded

## Applicability
Child must be: under 19, OR under 24 and full-time student, AND at least one parent alive. The caller determines eligibility — this node computes the tax amount only.

## Input Schema
- `net_unearned_income` — child's NUI (pre-computed; engine does not derive the $1,300 floors)
- `parent_taxable_income` — parent's taxable income (Form 8615 line 7)
- `parent_filing_status` — determines bracket table for parent
- `parent_tax` — parent's regular tax on their income alone (line 8)

## Compute Logic
1. `taxableNUI = max(0, net_unearned_income - $2,600)`
2. If `taxableNUI = 0` → `{ outputs: [] }`
3. Select bracket table based on `parent_filing_status`
4. `combinedTax = taxFromBrackets(parent_income + taxableNUI, brackets)`
5. `kiddieTax = max(0, combinedTax - parent_tax)`
6. Routes to `schedule2.line17d_kiddie_tax`

## Output Nodes
- `schedule2` (line 17d)

## Key Design Notes
- `net_unearned_income` is provided pre-computed (caller handles the two $1,300 deduction floors).
- Tax brackets are the parent's brackets — the computation adds child's NUI on top of parent's income to find the incremental tax.
- MFJ and QSS use the same bracket table.

# Schedule H — Household Employment Taxes

## Purpose
Computes employer FICA taxes, employee withholding, and FUTA for household employees (nannies, housekeepers, etc.). Total household employment tax routes to **Schedule 2 line 7a**.

## IRS References
- Schedule H and Instructions (TY2025)
- IRC §3510 — FICA threshold for household employees
- IRC §3121(a)(1) — Social Security wage base
- IRS Pub. 926 (2025), "Household Employer's Tax Guide"
- Rev. Proc. 2024-40

## TY2025 Constants
- **FICA threshold:** $2,800 per employee (IRC §3510)
- **SS wage base:** $176,100 (IRC §3121(a)(1))
- **SS rate:** 6.2% employer + 6.2% employee
- **Medicare rate:** 1.45% employer + 1.45% employee
- **FUTA quarterly threshold:** $1,000 (triggers federal unemployment filing)

## Input Schema
- `total_cash_wages` — total wages paid to all household employees
- `fica_wages` — FICA-subject wages (auto-computed if not provided: ≥$2,800 threshold applies)
- `ss_wages` — SS wages (capped at SS wage base)
- `medicare_wages` — all FICA wages (no cap)
- `federal_income_tax_withheld` — FIT withheld (only if employee requested via W-4)
- `employee_ss_withheld` — employee SS share withheld (6.2%)
- `employee_medicare_withheld` — employee Medicare share withheld (1.45%)
- `futa_wages` — wages subject to FUTA (generally ≤$7,000/employee)
- `futa_tax` — net FUTA after state credit (typically 0.6%)

## Compute Logic
1. `ficaWages` — use `fica_wages` if provided; else if `total_cash_wages >= $2,800`, all wages are FICA
2. `ssWages = min(ficaWages, $176,100)`
3. `medicareWages = fica_wages` (no cap)
4. `totalTax = empSsTax(6.2%) + empMedicareTax(1.45%) + empSsWithheld + empMedicareWithheld + fedWithheld + futa`
5. Employee shares computed from rates if explicit withholding not provided
6. Routes `round(totalTax)` to `schedule2.line7a_household_employment`

## Output Nodes
- `schedule2` (line 7a)

## Key Design Notes
- Employee withholding fields default to computed rates when not explicitly provided (auto-computation).
- Auto-FICA threshold: if `total_cash_wages >= $2,800`, all wages become FICA wages (node applies threshold automatically).
- Both employer AND employee shares are included in the total (employer pays both on Schedule H).

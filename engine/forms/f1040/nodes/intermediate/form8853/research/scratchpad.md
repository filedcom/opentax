# Form 8853 Scratchpad

## Key Findings

### Section A — Archer MSAs
- Line 1: Employer contributions (from W-2 Box 12 code R) — already routed here by w2 node
- Line 2: Taxpayer contributions to Archer MSA
- Line 3: Limitation = min(65% self-only deductible, 75% family deductible) × eligible months / 12
  - Self-only HDHP: deductible $2,850–$4,300; 65% limit
  - Family HDHP: deductible $5,700–$8,550; 75% limit
- Line 4: Compensation from employer maintaining HDHP
- Line 5: Deduction = min(line2, line3, line4) → Schedule 1 Part II line 23
- Part II distributions:
  - Line 6a: Total distributions (from 1099-SA box 1)
  - Line 6b: Rollovers + withdrawn excess
  - Line 6c: 6a - 6b
  - Line 7: Qualified medical expenses
  - Line 8: Taxable distributions = max(0, 6c - 7) → Schedule 1 line 8e
  - Line 9b: 20% additional tax on line 8 (unless exception applies) → Schedule 2 line 17e

### Section B — Medicare Advantage MSA
- Line 10: Total distributions from Medicare Advantage MSA (1099-SA)
- Line 11: Qualified medical expenses
- Line 12: Taxable = max(0, line10 - line11) → Schedule 1 line 8e
- Line 13b: 50% additional tax on line 12 (unless exception) → Schedule 2 line 17f
  - Exception: death, disability (not age 65 like Archer MSA)

### Section C — Long-Term Care (LTC) Insurance Contracts
- Line 17: Gross LTC payments (per diem/periodic, from 1099-LTC box 1)
- Line 18: Amount from qualified LTC insurance contracts
- Line 19: Accelerated death benefits (chronically ill)
- Line 20: Lines 18 + 19 (total per diem payments)
- Line 21: $420/day × days in LTC period (2025 per diem limit from Rev. Proc. 2024-40)
- Line 22: Costs incurred for qualified LTC services
- Line 23: Larger of line 21 or line 22 (exclusion amount)
- Line 24: Reimbursements for qualified LTC services
- Line 25: Per diem limitation = line 23 - line 24
- Line 26: Taxable payments = max(0, line20 - line25) → Schedule 1 line 8e

## Constants (TY2025)
- Per diem limit: $420/day (Rev. Proc. 2024-40 §2.62)
- HDHP self-only: min deductible $2,850, max deductible $4,300, max OOP $5,700
- HDHP family: min deductible $5,700, max deductible $8,550, max OOP $10,500
- Archer MSA self-only contribution limit: 65% of HDHP annual deductible
- Archer MSA family contribution limit: 75% of HDHP annual deductible
- Additional 20% tax on taxable Archer MSA distributions (non-qualified)
- Additional 50% tax on taxable Medicare Advantage MSA distributions (non-qualified)

## Output Routing
- Schedule 1 line 8e: Taxable Archer MSA distributions (line 8)
- Schedule 1 line 8e: Taxable Medicare Advantage MSA distributions (line 12)
- Schedule 1 line 8e: Taxable LTC payments (line 26)
- Schedule 1 line 23: Archer MSA deduction (line 5)
- Schedule 2 line 17e: 20% additional tax (line 9b)
- Schedule 2 line 17f: 50% additional tax (line 13b)

## Design Decision
The line 3 limitation (monthly chart) is complex per-month calculation.
We accept the pre-computed limitation amount as an input field (line3_limitation_amount)
rather than requiring month-by-month eligibility — the screen/UI computes that.

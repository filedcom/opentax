# Form 4972 — Scratchpad

## Research Notes

### Upstream
- f1099r routes to form4972 when:
  - distribution code = "5" (prohibited transaction / lump-sum), OR
  - exclude_4972 = true (taxpayer elects Form 4972 treatment)
- Input arrives as: `{ lump_sum_amount: box1_gross_distribution }`
- Also needs box3_capital_gain for Part II election
- Also needs pre_1974_participation flag for Part II

### Form 4972 Structure
- Part I: Eligibility check (must pass ALL)
  - Q1: Were you born before Jan 2, 1936? (OR participant in plan died and participant was born before 1/2/1936)
  - Q2: Was it a total distribution? (box2b_total_dist = true)
  - Q3: Did the plan participant use the lump-sum election after 1986? (only once in lifetime)
  - Q4: Was the participant in the plan for 5+ years (unless death distribution)?
- Part II: Capital gain election (20%)
  - Line 6: Pre-1974 capital gain = box3_capital_gain (from 1099-R)
  - Line 7: Tax = line6 × 20%
- Part III: 10-year averaging
  - Line 8: Adjusted total taxable amount
  - Line 9: Subtract line 6 (pre-1974 capital gain) → ordinary income portion
  - Line 10: Death benefit exclusion (if applicable, up to $5,000 — eliminated for post-1984 plans)
  - Line 11: 1/10 of (line 9 - line 10)
  - Line 12: Compute tax on line 11 using 1986 rate schedule (single filer)
  - Line 13: Multiply line 12 × 10 = tentative tax on total
  - Line 14: 1/10 of minimum distribution allowance (MDA)
  - Lines 15-17: MDA computation
  - Line 18: Tax from Part III
- Output: tax flows to Schedule 2, line 7

### 1986 Tax Rate Schedule (used for Part III)
Single filer brackets (from Form 4972 instructions):
- $0–$2,480: 11%
- $2,480–$3,670: 12%
- $3,670–$5,940: 14%
- $5,940–$8,200: 15%
- $8,200–$12,840: 16%
- $12,840–$17,270: 18%
- $17,270–$22,900: 20%
- $22,900–$26,700: 23%
- $26,700–$34,500: 26%
- $34,500–$43,800: 30%
- $43,800–$60,600: 34%
- $60,600–$85,600: 38%
- $85,600–$109,400: 42%
- $109,400–$162,400: 45%
- $162,400–$215,400: 49%
- Over $215,400: 50%

### Minimum Distribution Allowance (MDA)
MDA = lesser of: $10,000 OR 50% of the total taxable amount
Reduced by: 20% × (total taxable amount - $20,000) [if total taxable > $20,000]
If total taxable ≤ $20,000: MDA = lesser of $10,000 or 50% × total taxable
Effective range: MDA phases out completely when total taxable ≥ $70,000

### Output routing
- Form 4972 tax → Schedule 2, line 7 (lump-sum tax)
- Capital gain portion (Part II tax) → also included in the Schedule 2 line 7 total

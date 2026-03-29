# Form 8839 — Scratchpad

## Research Notes

### Drake Screen
Screen code: "8839" — confirmed in screens.json.
Description: "Qualified Adoption Expenses"

### Key TY2025 Numbers (Rev Proc 2024-40 / IRS Instructions Dec 8 2025)
- Max credit per child: $17,280
- Max exclusion per child: $17,280
- Phase-out start (MAGI): $259,190
- Phase-out end (MAGI): $299,190
- Phase-out range: $40,000
- Refundable portion cap per child: $5,000 (new for 2025)
- Filing status restriction: MFS generally cannot claim (exceptions apply)

### Form Structure
- Part I: Child information (per child columns)
- Part II: Adoption Credit calculation
- Part III: Employer-provided adoption benefits exclusion

### Part II Credit Flow
1. Line 2: Max credit ($17,280 per child)
2. Line 3: Prior year credit already claimed for same child
3. Line 5: Qualified adoption expenses paid
4. Special needs: Line 5 = $17,280 minus prior year credit (even if $0 expenses)
5. Line 6: Smaller of line 2-3 or line 5 (capped to max minus prior)
6. Line 7: MAGI (from MAGI worksheet)
7. Line 8: Phase-out threshold ($259,190)
8. Lines 9-10: Phase-out fraction = (MAGI - 259190) / 40000, capped [0,1], 3 decimal places
9. Line 11a per child: credit after phase-out
10. Line 11b per child: refundable amount (min(line11a, 5000))
11. Line 11c: sum of 11b across children (total refundable)
12. Line 12: total of line 11a across children
13. Line 13: total refundable = line 11c → Form 1040 line 30
14. Line 14: line 12 (total pre-limit credit)
15. Line 16: line 14 minus prior year carryforward used
16. Line 17: nonrefundable credit (after credit limit worksheet) → Schedule 3 line 6c
17. Line 18: carryforward to 2026

### Part III Exclusion Flow
- Line 19: Max exclusion ($17,280 per child)
- Line 22: Total employer benefits received (all years for same child)
- Line 23: Excludable benefits (min of line 19 and line 22)
- The W-2 Box 12T amounts are already excluded from Box 1 wages
- For our node: track exclusion amount for informational output to f1040 line 1f (taxable adoption benefits if any exceed exclusion)

### Upstream
- W2 node: sends { adoption_benefits: amount } when Box 12T > 0
- Direct user input: qualified expenses per child, special_needs flag, MAGI

### Downstream
- Schedule 3 line 6c: nonrefundable adoption credit
- Form 1040 line 30: refundable adoption credit (new field needed)
- Form 1040 line 1f: taxable employer benefits (if benefits exceed exclusion limit)

### MFS Exception
- MFS filers generally cannot claim adoption credit/exclusion
- Exception: legally separated or lived apart from spouse last 6 months — but for simplicity, we block MFS at the schema level with a flag

### Carryforward
- Unused nonrefundable credit can carry forward 5 years
- We accept prior_year_credit_carryforward as input field
- We don't model future years in this node

### f1040 Schema Addition Needed
- line30_refundable_adoption: z.number().nonnegative().optional()
- line1f_taxable_adoption_benefits: z.number().nonnegative().optional() (if excess benefits)

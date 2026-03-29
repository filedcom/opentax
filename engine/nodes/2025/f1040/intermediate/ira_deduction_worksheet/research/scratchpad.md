# IRA Deduction Worksheet — Scratchpad

## Key Logic (IRS Pub 590-A / Schedule 1 Line 20)

### Phase-out Mechanics
- Deduction phases out linearly between lower and upper MAGI thresholds
- Reduction ratio = (MAGI - lower) / (upper - lower)
- Reduced limit = max_contribution × (1 - reduction_ratio), rounded up to nearest $10
- IRS rounding rule: if reduced amount is not multiple of $10, round UP to next $10
- Minimum deduction: if not zero, floor is $200 (per IRS Pub 590-A)
- Final deductible = min(actual_contribution, reduced_limit)

### Active Participant Definition
- An "active participant" is someone covered by an employer plan (401k, pension, etc.) for any part of the year
- W-2 Box 13 retirement plan checkbox = active participant

### Spouse Active Participant
- If taxpayer is NOT active participant but spouse IS (MFJ only):
  - Different phase-out range applies: $236,000–$246,000 MAGI (TY2025)
  - This is the non-covered spouse phase-out

### Not Active Participant (no employer plan)
- If neither taxpayer nor spouse (for MFJ) is active participant: fully deductible
- No phase-out applies

### Filing Status Groups
- Single / HOH / QSS: use single phase-out range
- MFJ: active participant uses MFJ range; non-covered spouse uses $236k-$246k range
- MFS: special rules — $0–$10,000 phase-out if active participant (effectively eliminated)

## Notes
- No Drake screen found in screens.json
- Schedule 1 Line 20 needs to be added to schedule1 output schema

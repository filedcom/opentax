# Tax Engine Audit — taxcalcbench
> Updated: 2026-04-09 | Branch: main | 75/97 pass, 22 fail

Command: `deno run --allow-read --allow-write --allow-run taxcalcbench/run_benchmark.ts`

Tolerance: ±$5 on `line24_total_tax`, `line35a_refund`, `line37_amount_owed`.

---

## Summary

```
Results: 75 PASS  22 FAIL  out of 97 cases
```

---

## Failing Cases by Root Cause

### Root Cause 1 — k1_partnership over-inflates AGI and tax

All single-filer cases with `k1_partnership`. Engine over-computes tax by a fixed delta (~$8,852 or ~$10,508) suggesting a specific k1 income field is double-counted or misrouted.

| Case | Correct Tax | Eng Tax | Δ | Correct Owed | Eng Owed |
|------|-------------|---------|---|--------------|----------|
| 54-single-w2-k1-1099r-1099int-1099div-1099b | 325,672 | 336,180 | +10,508 | 314,486 | 324,994 |
| 65-single-w2-k1-1099r-1099int-1099div | 325,559 | 336,067 | +10,508 | 314,373 | 324,881 |
| 66-single-w2-k1-1099r-1099int-1099div | 325,559 | 336,067 | +10,508 | 314,373 | 324,881 |
| 69-single-w2-k1-1099r-1099int-1099div-1099b | 297,908 | 308,416 | +10,508 | 286,722 | 297,230 |
| 87-single-w2-k1-1099r-1099int-1099div | 297,796 | 308,303 | +10,508 | 286,610 | 297,117 |
| 89-single-w2-k1-1099r-1099int-1099div | 297,796 | 308,303 | +10,508 | 286,610 | 297,117 |
| 57-single-w2-k1-1099r-1099int-1099div-1099b | 321,232 | 330,084 | +8,852 | 310,046 | 318,898 |
| 74-single-w2-k1-1099r-1099int-1099div-1099b | 293,468 | 302,320 | +8,852 | 282,282 | 291,134 |

The consistent $10,508 / $8,852 deltas point to a fixed income amount (likely k1 box1 or a specific k1 field) being counted twice. At 37% marginal rate: $10,508 → ~$28,400 extra income; $8,852 → ~$23,924. Two variants of k1 income amounts.

Also in this group — 10M income variants:

| Case | Correct Tax | Eng Tax | Δ |
|------|-------------|---------|---|
| 56-single-w2-k1-1099r-1099int-1099div-1099b (10M) | 4,464,296 | 4,781,782 | +317,486 |
| 73-single-w2-k1-1099r-1099int-1099div-1099b (10M) | 4,073,932 | 4,391,419 | +317,487 |

Same +$317,487 delta across both 10M cases — same double-counting, larger base.

**Related k1 cases with payment/owed mismatch (tax correct, withholding wrong):**

| Case | Correct Tax | Eng Tax | Correct Owed | Eng Owed | Δ Owed |
|------|-------------|---------|--------------|----------|--------|
| 61-single-w2-k1-1099r-1099int-1099div | 35,605 | 35,605 | 17,224 | 18,015 | +792 |
| 82-single-w2-k1-1099r-1099int-1099div | 35,943 | 35,343 | 17,561 | 17,753 | +192 |

Case 61: tax exact, owed wrong → payments under-counted. Case 82: tax slightly off + owed wrong.

**K1 case with estimated tax payments:**

| Case | Correct Tax | Eng Tax | Δ | Correct Owed | Eng Owed |
|------|-------------|---------|---|--------------|----------|
| 70-single-w2-k1-1099r-1099int-1099div-1099b-estimated-tax | 291,662 | 293,566 | +1,904 | 26,479 | 28,383 |

Smaller delta — k1 over-count partially offset by estimated tax payments, or different k1 amounts.

**K1 case with over-refund (engine over-taxes on a refund case):**

| Case | Correct Tax | Eng Tax | Δ | Correct Refund | Eng Refund |
|------|-------------|---------|---|----------------|------------|
| 95-single-w2-k1-1099r-1099int-1099div-1099b | 283,347 | 285,088 | +1,741 | 16,734 | 14,992 | -1,742 |

---

### Root Cause 2 — SALT cap not applied

MFJ cases: engine does not cap state+local taxes at $10,000 ($5,000 MFS). Engine under-taxes because it applies full SALT deduction, reducing taxable income more than it should.

| Case | Correct Tax | Eng Tax | Δ | Note |
|------|-------------|---------|---|------|
| 86-mfj-w2 | 41,537 | 39,113 | -2,424 | AGI exact, SALT deduction too large |
| 76-mfj-w2-1099int-1099b | 104,954 | 103,280 | -1,674 | MFJ with investments |
| 90-mfj-w2-1099int-1099div-1099b | 251,376 | 252,187 | +811 | MFJ investments (also STCG, see below) |

Fix: Schedule A node must cap line 5d (total SALT) at $10,000 for MFJ.

---

### Root Cause 3 — STCG taxed at preferential LTCG rate (should be ordinary)

Single-filer cases with `f1099b` Part A (short-term) gains. Engine applies QDCG preferential rate to STCG, under-taxing.

| Case | Correct Tax | Eng Tax | Δ | Correct Owed | Eng Owed |
|------|-------------|---------|---|--------------|----------|
| 58-single-w2-1099int-1099div-1099b | 118,731 | 119,536 | +805 | 25,648 | 26,453 |
| 75-single-w2-1099int-1099div-1099b | 117,627 | 118,432 | +805 | 24,544 | 25,349 |
| 94-single-w2-1099r-1099int-1099div-1099b | 152,867 | 153,078 | +211 | 4,525 | 4,737 |
| 67-single-w2-1099r-1099int-1099div-1099b-ssa | 35,919 | 35,933 | +14 | 3,221 | 3,235 |
| 91-single-w2-1099int-1099div-1099b-ssa | 3,972 | 4,032 | +60 | 2,779 | 2,840 |

Cases 58 and 75 have identical +$805 Δ — same f1099b composition, different form combos. Fix: f1099b Part A ("A") → route as ordinary income, not to QDCG worksheet.

---

## Priority Order

| # | Root Cause | Cases | Max Δ | Fix |
|---|-----------|-------|-------|-----|
| 1 | k1 over-counts income (10M) | 56, 73 | +317k | Find which k1 field doubles at 10M scale |
| 2 | k1 over-counts income (~$900k) | 54, 57, 65, 66, 69, 74, 87, 89 | +10,508 | Same fix as above — consistent $10,508 delta |
| 3 | k1 + estimated tax | 70 | +1,904 | Same k1 fix, smaller impact |
| 4 | k1 + refund direction | 95 | +1,741 | Same k1 fix |
| 5 | k1 payment mismatch | 61, 82 | +792 owed | k1 affecting withholding routing |
| 6 | SALT cap missing (MFJ) | 76, 86, 90 | -2,424 | Cap Schedule A line 5d at $10,000 MFJ |
| 7 | STCG at LTCG rate | 58, 67, 75, 91, 94 | +805 | Route f1099b Part A as ordinary income |

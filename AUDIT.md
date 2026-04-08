# Tax Engine Audit
> Generated: 2026-04-09 | Branch: main

---

## Test Suite

### Unit + Integration Tests (`deno task test`)

Command: `deno test --allow-read --allow-write --allow-run=xmllint`

```
ok | 6080 passed | 0 failed | 48 ignored (31s)
```

**All unit and integration tests pass.**

> Note: Running bare `deno test` (no flags) produces 58 spurious failures — all permission errors, not logic bugs. Always use `deno task test`.

---

### CCH Benchmark (`testcases/run_bench.ts`)

Command: `deno run --allow-read --allow-write --allow-run testcases/run_bench.ts`

```
Results: 0 PASS  26 FAIL  0 SKIP  out of 26 CCH cases
Tolerance: ±$5 on total_tax, refund, and amount_owed
```

**26/26 cases fail.** Failures cluster into distinct patterns:

---

## CCH Benchmark Failures

### Pattern A — Consistent small overstatement: W2 + investments + k1_partnership (single)

| Case | Scenario | CCH Tax | Eng Tax | Δ |
|------|----------|---------|---------|---|
| 019c9663 | Oliver K. Filed — single | 306,731 | 309,981 | +3,250 |
| 019caf68 | Oliver K. Filed — single (dup) | 306,731 | 309,981 | +3,250 |

Input nodes: `w2, f1099int, f1099div, f1099b, f1099r, k1_partnership`

Consistent +$3,250 delta across two variants of the same case. AGI also overstated (866k→906k). Likely a specific income item being over-counted or a deduction being missed.

---

### Pattern B — AGI inflation: W2 + investments + k1_partnership, high income

| Case | Scenario | CCH AGI | Eng AGI | CCH Tax | Eng Tax | Δ |
|------|----------|---------|---------|---------|---------|---|
| 019cd29c | Oliver K. Filed — single (10M) | 10,600,972 | 11,248,263 | 4,348,076 | 4,359,891 | +11,815 |
| 019cd370 | Oliver K. Filed — single + estimated pmts | 850,922 | 894,333 | 298,282 | 304,341 | +6,059 |
| 019d0cd2 | Oliver K. Filed — single + estimated pmts | 862,646 | 906,057 | 304,266 | 309,879 | +5,613 |

Input nodes: `w2, f1099int, f1099div, f1099b, f1099r, k1_partnership` (some have `f1040es`)

AGI is consistently inflated. Tax overstatement tracks AGI overstatement. Root cause is upstream of tax calculation — likely a k1 or investment income node double-counting income.

**019d07c8** is a more extreme case of the same type:

| Case | CCH AGI | Eng AGI | CCH Tax | Eng Tax | Δ |
|------|---------|---------|---------|---------|---|
| 019d07c8 | 2,318,977 | 906,057 | 910,150 | 309,879 | -600,271 |

Here AGI is vastly *under*stated (2.3M→906k), causing a massive under-tax. Same input set with `f1040es`. The f1040es node or some large income source is not being ingested.

---

### Pattern C — Massive under-tax: W2 + f1099div + f1099b (single, ~$457k AGI)

| Case | Scenario | CCH AGI | Eng AGI | CCH Tax | Eng Tax | Δ |
|------|----------|---------|---------|---------|---------|---|
| 019cd91b | Eileen F. Figone — single | 457,477 | 457,477 | 110,839 | 2,660 | **-108,179** |
| 019d21f5 | Eileen F. Figone — single (dup) | 457,477 | 457,477 | 110,839 | 2,660 | **-108,179** |
| 019d21f6 | Eileen F. Figone — single (dup) | 457,477 | 457,477 | 110,839 | 2,660 | **-108,179** |

Input nodes: `w2, f1099div, f1099int, f1099b`

AGI is correct but tax is $108k short. Engine produces a $97k refund instead of $0. This is the most severe bug. The engine computes grossly incorrect tax from correctly ingested income. Likely cause: capital gains from `f1099b` or qualified dividends from `f1099div` are not flowing into the tax calculation (Form 8949 / Schedule D not wiring to 1040 tax computation, or QDCG tax rate worksheet not applied to a $457k income).

---

### Pattern D — Over-tax: k1_partnership + f1040es + f1099r (mfj, no W2)

| Case | Scenario | CCH AGI | Eng AGI | CCH Tax | Eng Tax | Δ |
|------|----------|---------|---------|---------|---------|---|
| 019cddd6 | John S. Moore — mfj | 240,331 | 193,470 | 10,512 | 25,461 | **+14,949** |
| 019ce2ac | John S. Moore — mfj (dup) | 240,331 | 193,470 | 10,512 | 25,461 | **+14,949** |

Input nodes: `f1099int, f1099r, k1_partnership, f1040es`

AGI is *under*stated (240k→193k) but tax is *over*stated (+15k). This contradicts the normal tax/AGI correlation — suggests a specific deduction or income exclusion is wrong. Could be k1 passive loss, or f1099r distribution being taxed at wrong rate, or MFJ bracket/deduction issue.

---

### Pattern E — Zero tax: investments only (single)

| Case | Scenario | CCH AGI | Eng AGI | CCH Tax | Eng Tax | Δ |
|------|----------|---------|---------|---------|---------|---|
| 019cdfb1 | Mary Coles — single | 100,757 | 82,315 | 7,249 | 0 | **-7,249** |
| 019ce36f | Mary Coles — single (dup) | 100,757 | 82,315 | 7,249 | 0 | **-7,249** |

Input nodes: `f1099b, f1099div, f1099int, f1099r`

No W2. Engine produces $0 tax and a spurious $653 refund. AGI also understated (101k→82k). Investment-only return with no wages — the engine likely isn't routing capital gains / dividends to 1040 tax lines at all without a W2 anchor.

---

### Pattern F — Small under-tax: W2 + investments + k1_partnership (single)

| Case | Scenario | CCH Tax | Eng Tax | Δ |
|------|----------|---------|---------|---|
| 019cf656 | Michael L. Harper — single | 35,933 | 35,238 | -695 |

Input nodes: `f1099div, f1099int, f1099r, k1_partnership, w2`

Small $695 shortfall. AGI also understated (198k→192k). Minor income routing gap.

---

### Pattern G — Moderate over-tax: W2 + f1099r (single)

| Case | Scenario | CCH AGI | Eng AGI | CCH Tax | Eng Tax | Δ |
|------|----------|---------|---------|---------|---------|---|
| 019cf75d | Daniel Sisler — single | 184,870 | 189,105 | 29,668 | 34,452 | +4,784 |
| 019cf79f | Daniel Sisler — single (dup) | 184,870 | 189,105 | 29,668 | 34,452 | +4,784 |
| 019cf7a4 | Daniel Sisler — single (dup) | 184,870 | 189,105 | 29,668 | 34,452 | +4,784 |

Input nodes: `f1099int, f1099r, w2`

AGI inflated +$4k, tax inflated +$4,784. Likely f1099r taxable amount being over-counted (e.g., not applying basis/exclusion ratio, or not handling Box 2b total distribution correctly).

---

### Pattern H — Over-tax: W2 only (HOH)

| Case | Scenario | CCH AGI | Eng AGI | CCH Tax | Eng Tax | Δ |
|------|----------|---------|---------|---------|---------|---|
| 019cf75f | Jill R. Geerts — hoh | 77,129 | 78,083 | 4,583 | 6,195 | +1,612 |
| 019cf760 | Jill R. Geerts — hoh (dup) | 77,129 | 78,083 | 4,583 | 6,195 | +1,612 |
| 019cf761 | Jill R. Geerts — hoh (dup) | 77,129 | 78,083 | 4,583 | 6,195 | +1,612 |
| 019cf77e | Jill R. Geerts — hoh (dup) | 77,129 | 78,083 | 4,583 | 6,195 | +1,612 |
| 019cf7a2 | Jill R. Geerts — hoh (dup) | 77,129 | 78,083 | 4,583 | 6,195 | +1,612 |
| 019cf7a6 | Jill R. Geerts — hoh (dup) | 77,129 | 78,083 | 4,583 | 6,195 | +1,612 |

Input nodes: `w2` only

Simplest possible case. AGI slightly inflated (+$954) and tax inflated (+$1,612). The delta is disproportionate to AGI difference, suggesting a HOH standard deduction or bracket issue in addition to the AGI error.

---

### Pattern I — Moderate over-tax: W2 + f1099int (mfj)

| Case | Scenario | CCH AGI | Eng AGI | CCH Tax | Eng Tax | Δ |
|------|----------|---------|---------|---------|---------|---|
| 019cf77b | Zechariah J. Van Daalwyk — mfj | 160,244 | 160,244 | 13,752 | 18,152 | +4,400 |

Input nodes: `f1099int, w2`

AGI is exact but tax overstated by $4,400. Pure tax calculation error for MFJ with interest income. Likely MFJ bracket table or standard deduction wrong.

---

### Pattern J — Lyle C. Spence mfj under-tax (investments + f1099r only)

| Case | Scenario | CCH AGI | Eng AGI | CCH Tax | Eng Tax | Δ |
|------|----------|---------|---------|---------|---------|---|
| 019cbfe2 | Lyle C. Spence — mfj | 129,223 | 93,951 | 10,959 | 6,556 | -4,403 |
| 019cbff6 | Lyle C. Spence — mfj (dup) | 129,223 | 93,951 | 10,959 | 6,556 | -4,403 |

Input nodes: `f1099b, f1099div, f1099int, f1099r`

No W2. AGI understated (~35k gap), tax understated. Investment-only MFJ return not fully ingesting income.

---

## Cross-Cutting Themes

### Theme 1: AGI Inflation/Deflation

Most cases show AGI mismatch before tax is even computed. This points to income node bugs upstream:
- `k1_partnership` may be double-counting or misrouting income (Patterns A, B, D, F)
- `f1099b`/`f1099div` without W2 may not reach AGI at all (Patterns E, J)
- `f1040es` may corrupt AGI in some cases (Pattern B's 019d07c8)

### Theme 2: Tax Calculation Errors Independent of AGI

Pattern C (Eileen) and Pattern I (Van Daalwyk) have correct AGI but wrong tax. This means the tax computation layer itself has bugs:
- QDCG/qualified dividend preferential rate may not be applied
- MFJ bracket tables may be wrong
- AMT may not be triggering at high income levels

### Theme 3: Investment-Only Returns Completely Broken

Patterns E and J (no W2, investment income only) produce wrong AGI and zero or near-zero tax. The engine may require a W2 as an anchor for income routing.

### Theme 4: HOH Tax Slightly Wrong on Simplest Case

Pattern H is W2-only HOH and still fails. This suggests a fundamental issue with HOH standard deduction or tax brackets even before complex income types are considered.

---

## Priority Order

| # | Pattern | Max Δ | Fix Approach |
|---|---------|-------|--------------|
| 1 | C — Eileen (massive under-tax) | -$108,179 | Debug QDCG/Schedule D → 1040 tax line wiring |
| 2 | D/B 019d07c8 — AGI collapse | -$600k | Debug f1040es and k1 income routing |
| 3 | E/J — investment-only $0 tax | -$7,249+ | Debug capital gains routing without W2 |
| 4 | H — HOH simple W2 over-tax | +$1,612 | Check HOH standard deduction + brackets |
| 5 | I — MFJ AGI-exact over-tax | +$4,400 | Check MFJ bracket table / standard deduction |
| 6 | G — f1099r inflation | +$4,784 | Check f1099r taxable amount calculation |
| 7 | D — Moore MFJ over-tax | +$14,949 | Check k1 / f1099r interaction for MFJ |
| 8 | A/B — k1 AGI inflation (small) | +$3,250–11,815 | Check k1_partnership income routing |
| 9 | F — Harper small delta | -$695 | Minor k1 or f1099div routing gap |

---

## Infrastructure Note

`deno bench` without flags fails with `NotCapable: Requires read access`. The bench harness (`testcases/run_bench.ts`) should be run via:
```
deno run --allow-read --allow-write --allow-run testcases/run_bench.ts
```
or add a `deno task bench:cch` entry to `deno.json`.

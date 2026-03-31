# Income Tax Calculation — Form 1040 Line 16

## Purpose
Computes regular income tax from the rate bracket tables for the given tax year and filing status. Routes regular tax to **Form 1040 line 16** and feeds **Form 6251** (AMT) the information it needs to compute the AMT comparison.

## IRS References
- IRC §1(a)–(d) — Tax Imposed
- Rev. Proc. 2024-40, §3.01 — TY2025 tax bracket tables

## TY2025 Tax Brackets
### MFJ / QSS (IRC §1(a))
10% up to $23,850; 12% $23,850–$96,950; 22% $96,950–$206,700; 24% $206,700–$394,600; 32% $394,600–$501,050; 35% $501,050–$751,600; 37% over $751,600

### Single (IRC §1(c))
10% up to $11,925; 12% $11,925–$48,475; 22% $48,475–$103,350; 24% $103,350–$197,300; 32% $197,300–$250,525; 35% $250,525–$626,350; 37% over $626,350

### HOH (IRC §1(b))
10% up to $17,000; 12% $17,000–$64,850; 22% $64,850–$103,350; 24% $103,350–$197,300; 32% $197,300–$250,500; 35% $250,500–$626,350; 37% over $626,350

### MFS (IRC §1(d))
Same as Single through $250,525; 35% $250,525–$375,800; 37% over $375,800

## Input Schema
- `taxable_income` — Form 1040 line 15 (taxable income; required, nonnegative)
- `filing_status` — `FilingStatus` enum (required)

## Compute Logic
1. Look up `yearBrackets = BRACKETS_BY_YEAR[ctx.taxYear]` — throws if year not found
2. If `taxable_income = 0` → `{ outputs: [] }`
3. `brackets = bracketsForStatus(filing_status)` — select table
4. `tax = taxFromBrackets(income, brackets)` — find highest bracket where `income > b.over`, compute `base + (income - over) × rate`
5. Emit two outputs:
   - `f1040.line16_income_tax: tax`
   - `form6251.{ regular_tax: tax, regular_tax_income: taxable_income, filing_status }`

## Output Nodes
- `f1040` (line 16)
- `form6251` (feeds AMT computation)

## Key Design Notes
- **Phase 1 only**: bracket-table regular tax. QDCG/preferential rates (0%/15%/20%) handled by separate qdcgtw node in Phase 2.
- QSS uses MFJ brackets.
- `taxFromBrackets()` uses pre-computed `base` amounts — equivalent to summing tax across all lower brackets.
- `ctx.taxYear` is used to look up the year-specific bracket table; throws explicitly if year is missing from `BRACKETS_BY_YEAR`.

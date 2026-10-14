# AGI Aggregator — Research Context

## IRS Authority

**IRC §62** — Definition of Adjusted Gross Income.  
AGI = Gross Income − above-the-line deductions listed in §62(a).

**Form 1040 (2025), Line 11** — Adjusted gross income.  
Computed as: Line 9 (total income) − Line 10 (Schedule 1 Part II adjustments).

**Schedule 1, Part I** — Additional Income (Lines 1–10).  
**Schedule 1, Part II** — Adjustments to Income (Lines 11–26).

## Computation

### Gross Income (F1040 Lines 1z–8, Schedule 1 Part I)

All items of income under IRC §61, including:
- Wages, salaries, tips (W-2 Box 1)
- Taxable interest (Schedule B)
- Ordinary dividends (Schedule B)
- Taxable IRA/pension distributions (1099-R)
- Taxable Social Security benefits (SSA-1099 worksheet)
- Capital gains/losses (Schedule D)
- Business income/loss (Schedule C)
- Rental/royalty/partnership/S-corp (Schedule E)
- Farm income/loss (Schedule F)
- Unemployment compensation (1099-G)
- Other income (Schedule 1 line 8 items: COD income, prizes, etc.)

### Exclusions from Gross Income (reduce before AGI)
- Foreign earned income exclusion — IRC §911, Form 2555 (Schedule 1 line 8d)
- Foreign housing deduction — IRC §911(c)(3), Form 2555
- Savings bond interest exclusion — IRC §135, Form 8815 (Schedule 1 line 8b)

### Above-the-Line Deductions (IRC §62(a))
Subtracted from gross income to arrive at AGI (Schedule 1 Part II):
- HSA deduction — IRC §223(a), Form 8889 (line 13)
- Depreciation adjustment — Form 4562 (line 13)
- Moving expenses, military only — IRC §217, Form 3903 (line 14)
- Deductible SE tax — IRC §164(f), Schedule SE (line 15)
- SE health insurance — IRC §162(l), Form 7206 (line 17)
- Early withdrawal penalty — IRC §62(a)(9) (line 18)
- IRA deduction — IRC §219, IRA Deduction Worksheet (line 20)
- Archer MSA deduction — IRC §220, Form 8853 (line 23)
- §501(c)(18)(D) pension — IRC §501(c)(18)(D), W-2 Box 12 Code H (line 24f)

### Add-backs (increase income)
- Form 6198 at-risk disallowance add-back (previously deducted loss)
- Form 8990 §163(j) disallowed business interest add-back

### AGI Floor
AGI cannot be negative (loss limitation rules and passive activity rules prevent net negative AGI in practice). `Math.max(0, gross − exclusions − deductions)`.

## Outputs

| Target | Field | Notes |
|--------|-------|-------|
| f1040 | line11_agi | F1040 line 11 |
| standard_deduction | agi | Required input for standard/itemized determination |
| schedule_a | agi | Required for AGI-based floors (medical, misc) |

## TY2025 Notes

No inflation-adjusted amounts in AGI computation itself — those are in downstream nodes (standard deduction, deduction phase-outs). The AGI formula is mechanical: sum income, subtract exclusions and §62 deductions.

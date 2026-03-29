# Form 8829 — Scratchpad

## Purpose
Compute the allowable home office deduction for Schedule C (and Schedule F/E) based on actual home expenses (mortgage interest, insurance, utilities, etc.) and the business-use percentage.

## Inputs received (from upstream nodes)
- `mortgage_interest` — from f1098 node (when user designates mortgage as "For: 8829")
- Additional fields entered directly on the Drake 8829 screen: total/business area, insurance, utilities, rent, repairs, other operating expenses, depreciation basis, first business use month, etc.

## Fields / lines identified

### Part I — Business Percentage
- Line 1: Total area of home (sq ft)
- Line 2: Area used exclusively and regularly for business (sq ft)
- Line 3: (Days used for daycare / 365) — only for daycare facilities
- Line 4: Multiply Line 2 by Line 3 (daycare only)
- Line 5: Add Lines 2 + 4 (daycare: total qualifying area)
- Line 7: Business percentage = Line 5 / Line 1

### Part II — Deductible Expenses
- Line 8: Gross income limitation (Schedule C line 29 equivalent — tentative profit)
- Line 9: Casualty losses (direct)
- Line 10: Deductible mortgage interest (itemizer — already claimed on Schedule A)
- Line 11: Real estate taxes (itemizer — already claimed on Schedule A)
- Lines 12-13: Excess casualty loss total + business pct applied
- Lines 14-15: Excess mortgage interest + taxes
- Line 16: Insurance (indirect × business pct)
- Line 17: Real estate taxes (if standard deduction filer)
- Line 18: Deductible mortgage interest (if standard deduction filer or excess)
- Line 19: Rent (indirect × business pct)
- Line 20: Repairs and maintenance (indirect × business pct)
- Line 21: Utilities (indirect × business pct)
- Line 22: Other expenses (indirect × business pct)
- Line 23: Total operating expenses (before income limit)
- Line 24: Add depreciation
- Line 25: Prior year operating expense carryover
- Line 26: Total operating expenses + carryover
- Line 27: Operating expense income limit (Line 8 minus Lines 9, 13, 14, 15)
- Line 28: Allowable operating expenses (min of Line 26 and Line 27)
- Line 29: Excess casualty losses and depreciation
- Line 30: Add depreciation (Line 41 × business pct)
- Line 31: Depreciation carryover from prior year
- Line 32: Total excess casualty and depreciation
- Line 33: Remaining income limit (Line 27 - Line 28)
- Line 34: Allowable excess casualty and depreciation (min of 32 and 33)
- Line 35: Add Lines 9, 13, 14, 15, 28, 34
- Line 36: Casualty loss portion — goes to Form 4684
- Line 37: Allowable home office deduction (Lines 35 - 36) → Schedule C line 30

### Part III — Depreciation
- Line 37: Smaller of adjusted basis or FMV of home (excluding land)
- Line 38: Cost/FMV of land
- Line 39: Business basis (Line 37 × business pct)
- Line 40: Depreciation rate (from table based on first-use month)
- Line 41: Depreciation = Line 39 × Line 40 rate

### Part IV — Carryover
- Line 42: Operating expense carryover to next year
- Line 43: Excess casualty/depreciation carryover to next year

## Open Questions
- [x] Q: What upstream nodes feed into this form? → f1098 (mortgage_interest)
- [x] Q: What calculations does this form perform? → Business-use pct × indirect expenses, income limit
- [x] Q: What does this form output to downstream nodes? → schedule_c (home_office_deduction)
- [x] Q: What are the TY2025 constants? → Depreciation rates by first-use month (see below)
- [x] Q: What edge cases exist? → Income limitation, daycare facility, carryover, standard vs itemized deductions

## Sources to check
- [x] Drake KB article — searched, no specific article found for 8829 screen details
- [x] IRS form instructions (i8829.pdf — already cached at .research/docs/i8829.pdf)
- [ ] Rev Proc for TY2025 constants (depreciation rates are statutory, not Rev Proc)

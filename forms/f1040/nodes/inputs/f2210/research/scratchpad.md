# Scratchpad — Form 2210 Research

## Status
Web fetch and web search tools are not permitted in this session. Research is conducted from:
1. The existing `index.ts` implementation at `forms/f1040/nodes/inputs/f2210/index.ts`
2. The existing `index.test.ts` test suite
3. Claude's training knowledge of IRS Form 2210, IRC §6654, and Rev Proc 2024-40

## Key facts extracted from existing implementation

### Constants (index.ts lines 12–16)
- `SAFE_HARBOR_CURRENT_YEAR_PCT = 0.90` — 90% of current year tax
- `SAFE_HARBOR_PRIOR_YEAR_PCT = 1.00` — 100% of prior year tax (AGI ≤ $150k)
- `HIGH_INCOME_AGI_THRESHOLD = 150000` — trigger for 110% rule
- `HIGH_INCOME_PRIOR_YEAR_PCT = 1.10` — 110% of prior year tax (AGI > $150k)

### Input fields (index.ts lines 20–39)
- `required_annual_payment` — optional override
- `withholding` — total federal withholding
- `q1_estimated_payment` through `q4_estimated_payment` — quarterly payments
- `current_year_tax` — for 90% test
- `prior_year_tax` — for 100%/110% test
- `prior_year_agi` — determines which prior year pct applies
- `underpayment_penalty` — pre-computed or user-provided penalty
- `waiver_requested` — boolean
- `annualized_method` — boolean flag (informational, no computation)

### Output
- Routes `line38_underpayment_penalty` to `f1040` node when penalty > 0

### Safe harbor logic
- min(90% current year tax, prior year pct * prior year tax)
- If total payments ≥ safe harbor amount → no penalty
- waiver_requested = true → no penalty

### Penalty computation
- If waiver_requested → 0
- If underpayment_penalty provided → use directly
- If safe harbor met → 0
- Otherwise → 0 (full per-quarter calculation not yet implemented)

## IRS Form 2210 structure (training knowledge)

### Part I — Required Annual Payment
- Line 1: Current year tax (from Form 1040)
- Line 2: Multiply line 1 by 90% (0.90)
- Line 3: Prior year tax (from prior year Form 1040/1040-SR)
- Line 4: Required annual payment (lesser of line 2 or line 3)

### Part II — Short Method (simplified, two conditions to qualify)
- Used when: (a) withholding covers all payments OR (b) payments made equally across quarters
- Line 4: Enter required annual payment
- Line 5: Enter withholding
- Line 6: Subtract line 5 from line 4 (if zero or less, no penalty)
- Line 7: Multiply line 6 by 0.02267 (effective rate for full year)
- Line 8: Maximum required installment (line 6 × 0.25 × number of installments short)
- Lines 9–10: Short method underpayment penalty

### Part III — Penalty Computation (standard/long method)
- Uses four payment periods (installment due dates)
- Due dates: April 15, June 15, September 15, January 15 (following year)
- Applies 8% annual rate (TY2024/2025 — federal short-term rate + 3%)
- Computes per-quarter underpayment × rate × days/365

### Part IV — Annualized Income Installment Method
- Schedule AI (Schedule AI of Form 2210)
- Used when income varied throughout year
- Computes annualized income for each installment period
- Reduces or eliminates penalty for quarters where income was lower

### Waiver Conditions (Part I checkboxes)
- Box A: Penalty is small (< $1,000) — actually Line 8 of 1040 instructions
- Box B: Prior year tax was zero (special rule)
- Box C: Casualty, disaster, or unusual circumstance waiver
- Box D: Retired/disabled (first year after reaching 62 or becoming disabled)
- Box E: Waiver based on reasonable cause

### Penalty Rate (IRC §6654(a))
- Federal short-term rate + 3 percentage points
- For TY2025 (calendar year): 8% annualized (Q1-Q4 2025 IRS rate)
- Daily rate: 8% / 365 = 0.021918%

### Safe Harbor Thresholds
- 90% of current year tax (Part I, Line 2)
- 100% of prior year tax if AGI ≤ $150,000 ($75,000 MFS)
- 110% of prior year tax if AGI > $150,000 ($75,000 MFS) — IRC §6654(d)(1)(B)(ii)

### Special exceptions (no Form 2210 required)
- Farmers and fishermen: 2/3 of current year tax (IRC §6654(i))
- Total withholding and estimated tax ≥ prior year tax
- Tax liability < $1,000 after subtracting withholding (de minimis rule)

## Drake Screen
Form 2210 is entered on Drake Tax via screen code **2210**.
Fields include: checkboxes for waiver boxes A-E, Part I amounts, withholding total,
quarterly payment dates/amounts, and election for annualized method (Schedule AI).

Drake KB URL: https://kb.drakesoftware.com/Site/Browse/13226
(Cannot verify — web fetch denied)

## Notes for context.md
- The existing node captures inputs and routes the penalty to f1040 line 38.
- The full per-quarter penalty calculation (Part III) is NOT yet implemented — the node relies on `underpayment_penalty` being provided externally.
- `annualized_method` flag is captured but has no downstream computation yet.
- MFS threshold for 110% rule is $75,000 (not yet in codebase).
- The de minimis rule ($1,000 threshold) is not explicitly modeled.

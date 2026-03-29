# Form 1116 Scratchpad

## Key Decisions

### Scope for this node
Form 1116 is complex — it has multiple parts with many optional adjustments. This node
implements the core FTC limitation calculation (the most common path) for individual filers
receiving 1099-DIV/INT foreign tax, which is how it enters our graph. Advanced paths
(carryovers, loss recapture, complex capital gain adjustments) are deferred.

### De minimis election (no Form 1116 needed)
- Total creditable foreign taxes ≤ $300 (single) / $600 (MFJ)
- ALL income from qualified payee statements (1099)
- If election applies → direct credit, routed to schedule3 line1_foreign_tax_1099 by upstream node
- This node only receives input when the de minimis threshold is EXCEEDED

### What this node computes (Part III, Line 21 → Line 24)
The FTC limitation formula (IRC §904(a)):
  FTC_limit = US_tax × (foreign_income / total_income)
  credit = min(foreign_taxes_paid, FTC_limit)

### Input sources
- `foreign_tax_paid` — from f1099div (box7) or f1099int (box6) when above threshold
- `foreign_income` — gross foreign income (passive category for 1099 sources)
- `total_income` — worldwide gross income (for the limitation fraction)
- `us_tax_before_credits` — regular tax liability (Form 1040 line 16 minus AMT)
- `income_category` — passive (most 1099 sources), general, etc.
- `filing_status` — for threshold checks

### Output routing
- `schedule3.line1_foreign_tax_credit` — the allowed foreign tax credit

### Income categories for this node
This node handles passive category (most common for 1099) and general category.
Section 901(j) and treaty-resourced income are out of scope (no upstream feed).

## Line-by-line mapping (simplified path)
- Line 1a: foreign_income (gross)
- Lines 2–6: deductions allocated (simplified: use 0 for the basic 1099 case)
- Line 15: net foreign income (= line 1a - deductions = foreign_income)
- Line 16: adjustments (0 for basic case)
- Line 17: adjusted foreign income = line 15 + 16
- Line 18: worldwide income (= total_income, adjusted)
- Line 19: limitation fraction = line 17 / line 18 (capped at 1.0)
- Line 20: US tax before credits
- Line 21: FTC limitation = line 20 × line 19
- Line 22: 0 (no excess limitation carryover in basic case)
- Line 23: total taxes eligible = line 10 (carryover) + line 12 (current) = foreign_tax_paid
- Line 24: allowed credit = min(line 23, line 21)

## Constants
- DE_MINIMIS_SINGLE = 300 (applied upstream, but used for validation)
- DE_MINIMIS_MFJ = 600 (same)
- No TY2025-specific thresholds for the limitation itself

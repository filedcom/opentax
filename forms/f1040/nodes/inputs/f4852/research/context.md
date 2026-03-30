# Form 4852 — Clean Context Summary

## What Form 4852 Is

Form 4852 is a **substitute** for Form W-2 (Wage and Tax Statement) or Form 1099-R (Distributions From Pensions, Annuities, Retirement or Profit-Sharing Plans, IRAs, Insurance Contracts). Taxpayers file it when:
- The employer or payer did not provide the original form by the required date, OR
- The original form was incorrect and was not corrected

One Form 4852 is filed per employer/payer — just like a W-2 or 1099-R, a taxpayer can have multiple 4852s. It is an **array input** in the engine.

## Two Parts

### Part I — Substitute for W-2
Line 7 sub-fields mirror W-2 boxes:
| 4852 Field | W-2 Box | Description |
|---|---|---|
| 7a | Box 1 | Wages, tips, other compensation |
| 7b | Box 2 | Federal income tax withheld |
| 7c | Box 3 | Social security wages |
| 7d | Box 4 | Social security tax withheld |
| 7e | Box 5 | Medicare wages and tips |
| 7f | Box 6 | Medicare tax withheld |
| 7g | Box 7 | Social security tips |
| 7h | Box 8 | Allocated tips |

For the tax engine, the key fields are:
- `wages` (box 7a) → f1040 line 1a
- `federal_withheld` (box 7b) → f1040 line 25a (W-2 withholding)

SS/Medicare fields are informational for the 4852 context (simplified substitute); they do not add complexity handled here.

### Part II — Substitute for 1099-R
Line 8 sub-fields mirror 1099-R boxes:
| 4852 Field | 1099-R Box | Description |
|---|---|---|
| 8a | Box 1 | Gross distribution |
| 8b | Box 2a | Taxable amount |
| 8c | Box 4 | Federal income tax withheld |
| 8d | Box 7 | Distribution code |
| 8e | Box 7 IRA | IRA/SEP/SIMPLE checkbox |

## How Parts Flow to Form 1040

### Part I (W-2 substitute) → same lines as regular W-2
- Wages → **1040 line 1a** (`line1a_wages`)
- Federal withheld → **1040 line 25a** (`line25a_w2_withheld`)

### Part II (1099-R substitute) → same lines as regular 1099-R
- Pension/annuity (non-IRA): gross → **1040 line 5a** (`line5a_pension_gross`), taxable → **1040 line 5b** (`line5b_pension_taxable`)
- IRA distribution: gross → **1040 line 4a** (`line4a_ira_gross`), taxable → **1040 line 4b** (`line4b_ira_taxable`)
- Federal withheld → **1040 line 25b** (`line25b_withheld_1099`)

## Engine Design Decisions

1. **Array input** — each item = one 4852 form (one employer/payer)
2. **`form_type` enum**: `W2` or `R_1099` — determines which part is active
3. **Fields per type**:
   - W2 type: `wages`, `federal_withheld`
   - R_1099 type: `gross_distribution`, `taxable_amount` (optional, defaults to gross), `federal_withheld`, `distribution_code` (optional), `is_ira` (optional boolean)
4. **No SS/Medicare complexity** — 4852 is a simplified substitute; SS/Medicare payroll taxes on the underlying wages are NOT computed from 4852 (that would require the full W-2 node pipeline)
5. **Withholding routing**: W2 type withheld → `line25a_w2_withheld`; R_1099 type withheld → `line25b_withheld_1099`

## TY2025 Relevant Facts
- Form 4852 structure unchanged from September 2020 revision — no TY2025-specific changes
- Can be e-filed if payer TIN is known; otherwise paper only
- IRS may delay refund until Feb 15 when 4852 is filed (no engine impact)
- The 4852 flows to the same 1040 lines as its underlying W-2 or 1099-R

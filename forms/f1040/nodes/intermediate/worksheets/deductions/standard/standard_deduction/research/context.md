# Standard Deduction — Research Context

## IRS Authority

**IRC §63(c)** — Standard Deduction.  
**IRC §63(c)(1)** — Basic standard deduction amounts by filing status.  
**IRC §63(c)(3)** — Additional standard deduction for age 65+ and/or blind.  
**IRC §63(c)(6)(A)** — MFS taxpayer whose spouse itemizes must itemize (zero standard deduction).  
**Rev. Proc. 2024-40, §3.14** — TY2025 inflation-adjusted amounts.

## TY2025 Standard Deduction Amounts

Source: Rev. Proc. 2024-40, §3.14

| Filing Status | Base | Additional (per factor) |
|---------------|------|------------------------|
| Single | $15,000 | $1,600 |
| MFJ | $30,000 | $1,350 |
| MFS | $15,000 | $1,350 |
| HOH | $22,500 | $1,600 |
| QSS | $30,000 | $1,350 |

### Additional Deduction Factors (age/blindness)
Each qualifying factor adds one `ADDITIONAL_PER_FACTOR` amount:
- Taxpayer age 65 or older: +1 factor
- Taxpayer blind: +1 factor
- Spouse age 65 or older (MFJ/MFS/QSS only): +1 factor
- Spouse blind (MFJ/MFS/QSS only): +1 factor

Maximum 4 factors for MFJ/MFS/QSS; maximum 2 for Single/HOH.

## Deduction Selection Logic

1. Compute standard deduction = base + (factor_count × additional_per_factor)
2. Compare to itemized deductions (Schedule A line 17), if provided
3. If itemized > standard → use itemized (taxpayer benefit)
4. If standard ≥ itemized → use standard deduction
5. Special case: if `mfs_spouse_itemizing = true` → taxpayer MUST itemize regardless of amounts (IRC §63(c)(6)(A))

## Taxable Income Computation

`taxable_income = max(0, AGI − deduction − QBI_deduction)`

- QBI deduction (Form 8995/8995-A, F1040 line 13) reduces taxable income further
- Cannot be negative

## Outputs

| Target | Field | Condition |
|--------|-------|-----------|
| f1040 | line12a_standard_deduction | Only when taking standard deduction |
| f1040 | line15_taxable_income | Always |
| income_tax_calculation | taxable_income | Always |
| income_tax_calculation | filing_status | Always (needed for bracket lookup) |

Note: When itemizing, the itemized amount flows to f1040 from schedule_a directly (line12e), not from this node. This node only deposits line12a when standard deduction is taken.

## Constants Location

All TY2025 amounts are in `forms/f1040/nodes/config/2025.ts`:
- `STANDARD_DEDUCTION_BASE_2025` — keyed by FilingStatus
- `STANDARD_DEDUCTION_ADDITIONAL_2025` — keyed by FilingStatus

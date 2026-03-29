# Form 5329 — Scratchpad

## Key Findings

### Drake Screen
- Screen code: `5329`
- Description: Additional Taxes on Qualified Plans (including IRAs) and Other Tax-Favored Accounts

### IRS Form Structure (TY2025)
- Part I  (line 4):  10% early distribution penalty (25% for SIMPLE IRA within 2 years)
- Part II (line 8):  10% penalty on ESA/QTP/ABLE distributions
- Part III (line 17): 6% excess contributions to Traditional IRAs
- Part IV (line 25): 6% excess contributions to Roth IRAs
- Part V  (line 33): 6% excess contributions to Coverdell ESAs
- Part VI (line 41): 6% excess contributions to Archer MSAs
- Part VII (line 49): 6% excess contributions to HSAs
- Part VIII (line 51): 6% excess contributions to ABLE accounts
- **All parts route to Schedule 2 (Form 1040), line 8**

### CRITICAL NOTE: Part IX (RMD) removed from 2025 form
- The 2025 Form 5329 PDF only has Parts I–VIII (lines 1–51)
- Part IX (excess accumulation/RMD 25% penalty) was on prior-year forms but is NOT on the 2025 form
- This was moved/restructured — do NOT implement Part IX for TY2025

### f1099r → form5329 interface
- f1099r node sends: `{ early_distribution: number, distribution_code: string }`
- distribution_code "1" = early dist no exception
- distribution_code "S" = SIMPLE IRA (25% rate if within 2 years)

### Exception codes (line 2)
- 01: separation from service after 55
- 02: SEPP (substantially equal periodic payments)
- 03: disability
- 04: death
- 05: medical expenses
- 06: QDRO
- 07: health insurance premiums (unemployed, IRA only)
- 08: qualified higher education expenses (IRA only)
- 09: first-time homebuyer up to $10,000 (IRA only)
- 10: IRS levy
- 11: reservist distributions
- 12: incorrectly indicated on 1099-R (codes 1, J, S)
- 13: section 457 plan
- 14: qualified plan distributions (employee separated, age requirements, written election)
- 15: dividends paid with respect to stock under 404(k)
- 16: annuity contracts allocable to investment before Aug 14, 1982
- 17: phased retirement annuity payments
- 18: permissible withdrawals under 414(w)
- 19: qualified birth or adoption distributions (up to $5,000)
- 20: terminal illness distributions
- 21: distributions of excess contributions before due date
- 22: domestic abuse victim distributions
- 23: eligible emergency expense distributions
- 99: multiple exceptions apply

### Output routing
- Total tax (sum of all parts) → schedule2 line 8 (`line8_form5329_tax`)
- schedule2 line 8 → f1040 line 17 (already implemented)

### Schedule 2 update needed
- Add `line8_form5329_tax` field to schedule2 inputSchema
- Add line8() helper and include in total

# Schedule 3 — Additional Credits and Payments

## Purpose
Aggregation node that collects nonrefundable credits (Part I → Form 1040 line 20) and additional payments/refundable credits (Part II → Form 1040 line 31). Routes totals to **Form 1040**.

## IRS References
- Schedule 3 and Instructions (TY2025)
- Various IRC sections per line (§901, §21, §25A, §25B, §25C, §25D, §36B, etc.)

## Input Schema — Part I (Nonrefundable Credits)
| Field | Source | IRC |
|---|---|---|
| `line1_foreign_tax_credit` | Form 1116 line 35 | §901 |
| `line1_foreign_tax_1099` | de minimis 1099 foreign tax | §901 |
| `line2_childcare_credit` | Form 2441 line 11 | §21 |
| `line3_education_credit` | Form 8863 line 19 | §25A |
| `line4_retirement_savings_credit` | Form 8880 line 12 | §25B |
| `line5_residential_energy` | Form 5695 | §25C, §25D |
| `line6b_child_tax_credit` | Form 8812 line 14 | §24 |
| `line6c_adoption_credit` | Form 8839 | §23 |
| `line6d_clean_vehicle_credit` | Form 8936 line 15 | §30D |
| `line6d_elderly_disabled_credit` | Schedule R line 22 | §22 |
| `line6e_prior_year_min_tax_credit` | Form 8801 line 25 | §53 |
| `line6f_mortgage_interest_credit` | Form 8396 line 11 | §25 |
| `line6z_general_business_credit` | Form 3800 line 38 | §38 |
| `line6b_low_income_housing_credit` | Form 8609/8586 | §42 |

## Input Schema — Part II (Additional Payments)
| Field | Source | IRC |
|---|---|---|
| `line9_premium_tax_credit` | Form 8962 line 26 | §36B |
| `line10_amount_paid_extension` | Form 4868 line 7 | §6081 |
| `line11_excess_ss` | multiple employers | §31(b) |

## Compute Logic
- `partITotal` = sum of all Part I fields
- `partIITotal` = sum of Part II fields
- If both = 0 → `{ outputs: [] }`
- Emit `f1040.line20_nonrefundable_credits` if credits > 0
- Emit `f1040.line31_additional_payments` if payments > 0

## Output Nodes
- `f1040` (line 20 and/or line 31)

## Key Design Notes
- De minimis foreign tax (≤$300/$600 MFJ) goes to `line1_foreign_tax_1099`; both `line1_*` fields are summed before aggregation.
- `line9_premium_tax_credit` is in Part II (refundable) even though it's labeled as a credit.
- All fields optional — any subset can appear on a given return.

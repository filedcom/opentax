# Schedule A — Itemized Deductions

## Overview

Schedule A is the federal form for itemized deductions for individual taxpayers.
Taxpayers who have total deductible expenses exceeding the applicable standard
deduction may elect to itemize. Schedule A collects six categories of
deductions: (1) medical and dental expenses above the AGI floor, (2) taxes you
paid (subject to the SALT cap), (3) interest you paid (mortgage and investment),
(4) gifts to charity (subject to AGI percentage limits), (5) casualty and theft
losses from federally declared disasters, and (6) other itemized deductions. The
total from Schedule A Line 17 flows to Form 1040 Line 12e as the itemized
deduction amount.

Drake Tax automatically computes whether itemized or standard deduction is more
beneficial and uses the larger amount. The preparer may override using "Force
itemized" or "Force standard" checkboxes. The system generates subsidiary
worksheets Wks SALT (when taxes paid exceed the SALT cap), Wks DEDINT (when
mortgage debt exceeds acquisition limits), and Wks CCLMT (when charitable
contributions exceed AGI percentage limits).

**Upstream inputs into this screen:**

- Screen SSA: Medicare Part B/D premiums → Line 1 medical
- Screens C, F, SEHI: Self-employed health insurance not deductible on Schedule
  1 → Line 1 medical
- Screen LTC: Long-term care insurance premiums → Line 1 medical (age-capped)
- Screen 1098: Mortgage interest → Line 8a (or via DEDM if loan limits apply)
- Screen DEDM: Deductible mortgage interest (when loan exceeds limits) → Lines
  8a/8b/8c
- Form 4952: Investment interest expense limitation → Line 9
- Form 4684: Casualty/theft losses from federally declared disasters → Line 15
- Form 8283: Non-cash charitable contribution documentation → supports Line 12

**Downstream outputs from this screen:**

- Form 1040 Line 12e: Schedule A Line 17 total itemized deductions
- Form 6251 Line 2a: Schedule A Line 7 (taxes paid total) added back for AMT
- Form 6251 Line 2c: Investment interest AMT adjustment (difference between
  regular and AMT Form 4952 Line 8)
- Form 6251 Line 3: Certain mortgage interest (non-qualified dwelling) added
  back for AMT
- Wks SALT: Generated when SALT taxes paid (5d) exceed cap or MAGI >
  $500,000 ($250,000 MFS)
- Wks CCLMT: Generated when charitable contributions exceed AGI percentage
  limits

**IRS Form:** Schedule A (Form 1040) **Drake Screen:** A **Tax Year:** 2025
**Drake Reference:**

- https://kb.drakesoftware.com/kb/Drake-Tax/16988.htm (Force itemized/standard)
- https://kb.drakesoftware.com/kb/Drake-Tax/10082.htm (Charitable contributions)
- https://kb.drakesoftware.com/kb/Drake-Tax/11805.htm (Medical expenses)
- https://kb.drakesoftware.com/kb/Drake-Tax/15833.htm (SALT limitation)
- https://kb.drakesoftware.com/kb/Drake-Tax/10641.htm (Mortgage interest
  limitation)

---

## Data Entry Fields

Required fields first, then optional. Data-entry only — no computed/display
fields.

| Field                             | Type    | Required    | Drake Label                                                  | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | IRS Reference                              | URL                                       |
| --------------------------------- | ------- | ----------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------- |
| force_itemized                    | boolean | no          | "Force itemized"                                             | Override Drake's automatic standard/itemized comparison; forces use of itemized deductions regardless of which is larger                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Sch A Inst, p.1                            | https://www.irs.gov/instructions/i1040sca |
| force_standard                    | boolean | no          | "Force standard"                                             | Override Drake's automatic calculation to force use of standard deduction regardless of Sch A total                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Sch A Inst, p.1                            | https://www.irs.gov/instructions/i1040sca |
| line_1_medical                    | number  | no          | "Medical and dental expenses"                                | Total unreimbursed medical and dental expenses paid for self, spouse, and dependents. Includes: doctor/dentist/hospital fees, prescription drugs and insulin, qualifying insurance premiums (see LTC age limits below), Medicare B/D premiums, medical equipment, diagnostic devices, transportation at $0.21/mile, capital improvements for disability accessibility. Excludes: cosmetic surgery, health club dues, OTC medicines unless prescribed, amounts reimbursed by insurance or excludable via cafeteria plan/HSA/HRA.                                                                                                                                                                                                                 | Sch A Inst, Lines 1–4, p.2; Pub 502 TY2025 | https://www.irs.gov/instructions/i1040sca |
| line_5a_tax_amount                | number  | no          | "State/local income taxes OR general sales taxes"            | Either (a) state and local income taxes: sum of amounts withheld from wages (W-2 Box 17) + estimated tax payments made in 2025 for any state + prior-year overpayment applied to 2025; OR (b) general sales taxes: either actual receipts or IRS Optional State and Local Sales Tax Tables amount plus sales taxes on motor vehicles, boats, and aircraft purchased in TY2025. Taxpayer must elect one type — cannot deduct both income taxes and general sales taxes in same year.                                                                                                                                                                                                                                                             | Sch A Inst, Line 5a, p.3                   | https://www.irs.gov/instructions/i1040sca |
| line_5a_election                  | enum    | no          | "Income tax / Sales tax"                                     | Election flag: "income_tax" or "sales_tax". Determines interpretation of line_5a_tax_amount. If "income_tax" elected and taxpayer received state income tax refund in a prior year, that refund may be taxable in the refund year (tax benefit rule — tracked separately).                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Sch A Inst, Line 5a, p.3                   | https://www.irs.gov/instructions/i1040sca |
| line_5b_real_estate_tax           | number  | no          | "Real estate taxes"                                          | State and local real estate taxes on property NOT used for business, assessed uniformly at like rates on all property in the jurisdiction. Enter only the tax portion — not any itemized charges for services (trash pickup, utilities), foreign property taxes, or local improvement assessments. Multiple properties: sum all qualifying real estate taxes.                                                                                                                                                                                                                                                                                                                                                                                   | Sch A Inst, Line 5b, p.3                   | https://www.irs.gov/instructions/i1040sca |
| line_5c_personal_property_tax     | number  | no          | "Personal property taxes"                                    | State and local taxes on personal property based solely on the value of the property (ad valorem). For vehicle registration fees, only the value-based portion qualifies — flat fee components do not.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Sch A Inst, Line 5c, p.3                   | https://www.irs.gov/instructions/i1040sca |
| line_6_other_taxes                | number  | no          | "Other taxes"                                                | Foreign income taxes paid to a foreign country OR generation-skipping transfer (GST) tax on income distributions. Excludes: federal income taxes, FICA/Medicare taxes, U.S. customs duties, U.S. territory taxes (enter on lines 5a–5c instead). Note: Foreign income taxes may alternatively be claimed as a credit on Form 1116 — this is an annual election, cannot claim both deduction and credit for the same taxes.                                                                                                                                                                                                                                                                                                                      | Sch A Inst, Line 6, p.3                    | https://www.irs.gov/instructions/i1040sca |
| line_8a_mortgage_interest_1098    | number  | no          | "Home mortgage interest — Form 1098"                         | Deductible home mortgage interest reported on Form 1098 from lender(s). Enter only if total acquisition debt does NOT exceed applicable limit ($750,000 post-12/15/2017 loans; $1,000,000 pre-12/16/2017 grandfathered loans). Reduce by any mortgage interest credit from Form 8396. If acquisition debt exceeds limit, use screen DEDM / Wks DEDINT to compute deductible portion — DO NOT enter on screen 1098 if also using screen DEDM (amounts ignored).                                                                                                                                                                                                                                                                                  | Sch A Inst, Line 8a, p.4; Pub 936 TY2025   | https://www.irs.gov/instructions/i1040sca |
| line_8b_mortgage_interest_no_1098 | number  | no          | "Home mortgage interest — no Form 1098"                      | Mortgage interest paid to a lender who did NOT provide Form 1098 (e.g., seller-financed mortgage, private party). Must enter lender's name, address, and SSN/EIN on dotted lines. Subject to same acquisition debt limits as Line 8a.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Sch A Inst, Line 8b, p.4                   | https://www.irs.gov/instructions/i1040sca |
| line_8b_lender_name               | string  | conditional | "Lender name (no-1098)"                                      | Full name of lender — required when line_8b_mortgage_interest_no_1098 > 0. Penalty of $50 for failure to supply recipient's SSN.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Sch A Inst, Line 8b, p.4                   | https://www.irs.gov/instructions/i1040sca |
| line_8b_lender_address            | string  | conditional | "Lender address (no-1098)"                                   | Street address of lender — required when line_8b_mortgage_interest_no_1098 > 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Sch A Inst, Line 8b, p.4                   | https://www.irs.gov/instructions/i1040sca |
| line_8b_lender_ssn_ein            | string  | conditional | "Lender SSN/EIN (no-1098)"                                   | SSN or EIN of lender (9-digit string, no dashes required by Drake) — required when line_8b_mortgage_interest_no_1098 > 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Sch A Inst, Line 8b, p.4                   | https://www.irs.gov/instructions/i1040sca |
| line_8c_points_no_1098            | number  | no          | "Points not on Form 1098"                                    | Mortgage points paid NOT reported on Form 1098. Generally amortized over loan life. Fully deductible in year paid only if: (a) loan is to purchase or improve primary residence, (b) paying points is an established local practice, (c) points do not exceed typical local amounts, (d) taxpayer uses cash accounting, (e) points not paid instead of other separately-stated fees, (f) out-of-pocket funds ≥ points charged, (g) amount clearly shown on settlement statement, (h) computed as % of principal. If loan was refinanced, only the proportional share allocable to home improvement is deductible in year paid; remainder amortized. If prior mortgage was paid off early, deduct all remaining unamortized points in that year. | Sch A Inst, Line 8c, p.4; Pub 936 TY2025   | https://www.irs.gov/instructions/i1040sca |
| line_9_investment_interest        | number  | no          | "Investment interest"                                        | Interest paid on money borrowed to purchase or carry taxable investment property (stocks, bonds, etc.). Does NOT include: interest on loans for passive activities (use Form 8582), interest on loans to buy tax-exempt securities, or personal interest. Enter gross amount — Form 4952 limits deduction to net investment income. Exception: Form 4952 NOT required if ALL three apply: (1) investment interest < investment income from interest + ordinary dividends minus qualified dividends, (2) no other deductible investment expenses, (3) no disallowed investment interest carryforward from 2024.                                                                                                                                  | Sch A Inst, Line 9, p.4                    | https://www.irs.gov/instructions/i1040sca |
| line_11_cash_contributions        | number  | no          | "Gifts by cash or check"                                     | Total cash, check, credit card, or electronic funds transfer donations to qualified domestic charitable organizations (501(c)(3), government units, certain veterans organizations, fraternal organizations). Documentation required: for ANY cash amount, must have bank record (canceled check, credit card statement) or written receipt from charity. For $250+: must have contemporaneous written acknowledgment from charity stating amount and whether any goods/services were received in exchange (value of goods/services reduces deduction). Quid pro quo contributions: deductible amount = amount paid minus fair market value of goods/services received.                                                                         | Sch A Inst, Line 11, p.5; Pub 526 TY2025   | https://www.irs.gov/instructions/i1040sca |
| line_12_noncash_contributions     | number  | no          | "Gifts other than cash or check"                             | Fair market value of donated property. Types: clothing (must be in good used condition or better, unless single item > $500 with qualified appraisal), household goods (same condition requirement), securities (FMV on date of donation), vehicles (if deduction > $500: lesser of gross sale proceeds by charity or FMV, unless charity makes material improvement or gives vehicle to needy individual — Form 1098-C required). If total non-cash contributions > $500: attach Form 8283 (Section A for $501–$5,000; Section B with qualified appraisal for > $5,000 per item/group).                                                                                                                                                        | Sch A Inst, Line 12, p.5; Pub 526 TY2025   | https://www.irs.gov/instructions/i1040sca |
| line_13_contribution_carryover    | number  | no          | "Carryover from prior year"                                  | Unused charitable contributions from prior tax years (up to 5-year carryforward). Enter the amount that would have been allowed in the prior year had the taxpayer itemized (even if standard deduction was taken in prior year — carryover is reduced by the amount that would have been deductible, per IRC §170(d)). Subject to same AGI percentage limits as original contribution type. 2021 carryovers (if any remain) applied at 60% limit.                                                                                                                                                                                                                                                                                              | Sch A Inst, Line 13, p.5; Pub 526 TY2025   | https://www.irs.gov/instructions/i1040sca |
| line_15_casualty_theft_loss       | number  | no          | "Casualty and theft losses"                                  | Enter amount from Form 4684, Line 18 ONLY (NOT Form 4684 Line 15). Post-TCJA (2018–2025): only losses from FEDERALLY DECLARED DISASTER areas qualify as personal casualty/theft deductions. Each loss is reduced by $100 (applied on Form 4684); total of all losses must exceed 10% of AGI (applied on Form 4684). Business/income-producing property losses may still flow through Form 4684 Section B → Schedule A Line 16 instead. Form 4684 is a required attachment.                                                                                                                                                                                                                                                                      | Sch A Inst, Line 15, p.5                   | https://www.irs.gov/instructions/i1040sca |
| line_16_other_deductions          | number  | no          | "Other itemized deductions"                                  | Total of allowable Line 16 items — see detail below. Each item should be separately listed with description.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Sch A Inst, Line 16, p.5; Pub 529 TY2025   | https://www.irs.gov/instructions/i1040sca |
| line_16_other_description         | string  | conditional | "Description of other deductions"                            | Required when line_16 > 0. Enter description for each item. Common: "Gambling losses", "Estate tax on IRD", "Amortizable bond premium", "Claim of right repayment", "Net qualified disaster loss"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Sch A Inst, Line 16, p.5                   | https://www.irs.gov/instructions/i1040sca |
| line_18_itemize_checkbox          | boolean | no          | "Check box — itemizing even if less than standard deduction" | Check if taxpayer elects to itemize even though Line 17 < standard deduction (e.g., required because MFS spouse itemizes, or for state tax purposes).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Sch A Inst, Line 18, p.6                   | https://www.irs.gov/instructions/i1040sca |

---

## Per-Field Routing

| Field                             | Destination                                    | How Used                                                                                                               | Triggers                                                                                                                                                                          | Limit / Cap                                                                                                                | IRS Reference                    | URL                                       |
| --------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------- |
| force_itemized                    | Form 1040 Line 12e routing logic               | Bypasses standard/itemized comparison; uses Sch A Line 17 as deduction amount                                          | —                                                                                                                                                                                 | —                                                                                                                          | Sch A Inst p.1                   | https://www.irs.gov/instructions/i1040sca |
| force_standard                    | Form 1040 Line 12e routing logic               | Bypasses Sch A; uses standard deduction for filing status                                                              | —                                                                                                                                                                                 | —                                                                                                                          | Sch A Inst p.1                   | https://www.irs.gov/instructions/i1040sca |
| line_1_medical                    | Sch A Line 4 (after AGI floor computation)     | Line 4 = max(Line 1 − (AGI × 7.5%), 0); Line 4 enters Sch A Line 17 sum                                                | —                                                                                                                                                                                 | 7.5% of AGI floor; LTC age-based caps applied before entry                                                                 | Sch A Inst Lines 1–4, p.2        | https://www.irs.gov/instructions/i1040sca |
| line_5a_tax_amount                | Sch A Line 5d → 5e → Line 7 → Line 17          | Added to 5b+5c to form 5d; 5e applies SALT cap; Line 7 = 5e+6                                                          | Wks SALT if 5d > computed SALT cap OR MAGI > $500,000 ($250,000 MFS)                                                                                                              | $40,000 SALT cap ($20,000 MFS); phase-out 30% × (MAGI − $500,000 / $250,000); floor $10,000 ($5,000 MFS); TY2025–2029 only | Sch A Inst Lines 5a, 5e, p.3     | https://www.irs.gov/instructions/i1040sca |
| line_5b_real_estate_tax           | Sch A Line 5d → 5e → Line 7 → Line 17          | Combined with 5a+5c; flows through SALT cap on 5e                                                                      | Wks SALT if combined taxes > cap                                                                                                                                                  | Subject to same $40,000 SALT cap                                                                                           | Sch A Inst Line 5b, p.3          | https://www.irs.gov/instructions/i1040sca |
| line_5c_personal_property_tax     | Sch A Line 5d → 5e → Line 7 → Line 17          | Combined with 5a+5b; flows through SALT cap on 5e                                                                      | Wks SALT if combined taxes > cap                                                                                                                                                  | Subject to same $40,000 SALT cap                                                                                           | Sch A Inst Line 5c, p.3          | https://www.irs.gov/instructions/i1040sca |
| line_6_other_taxes                | Sch A Line 7 → Line 17; and Form 6251 Line 2a  | Added to Line 5e to form Line 7; Line 7 also flows to Form 6251 Line 2a for AMT addback                                | If foreign taxes taken as credit → Form 1116 (mutually exclusive with Sch A Line 6 for same taxes)                                                                                | No separate cap on Line 6 itself                                                                                           | Sch A Inst Line 6, p.3           | https://www.irs.gov/instructions/i1040sca |
| line_8a_mortgage_interest_1098    | Sch A Line 10 → Line 17                        | Added to 8b+8c+9; flows to Line 10 interest total → Line 17                                                            | Wks DEDINT (screen DEDM) if acquisition debt > $750,000/$1,000,000 grandfathered                                                                                                  | Acquisition debt limit: $750,000 post-12/15/2017 ($375,000 MFS); $1,000,000 pre-12/16/2017 ($500,000 MFS)                  | Sch A Inst Line 8a, p.4; Pub 936 | https://www.irs.gov/instructions/i1040sca |
| line_8b_mortgage_interest_no_1098 | Sch A Line 10 → Line 17                        | Combined with 8a for total mortgage interest                                                                           | Same as 8a                                                                                                                                                                        | Same acquisition debt limits as 8a                                                                                         | Sch A Inst Line 8b, p.4          | https://www.irs.gov/instructions/i1040sca |
| line_8c_points_no_1098            | Sch A Line 10 → Line 17                        | Points added to mortgage interest total                                                                                | —                                                                                                                                                                                 | Same acquisition debt limits                                                                                               | Sch A Inst Line 8c, p.4; Pub 936 | https://www.irs.gov/instructions/i1040sca |
| line_9_investment_interest        | Sch A Line 10 → Line 17 (limited by Form 4952) | Form 4952 Line 8 limits to net investment income → allowed amount to Sch A Line 9; excess carries forward indefinitely | Form 4952 required (unless exception: investment interest < investment income from interest+ordinary dividends−qualified dividends, no investment expenses, no 2024 carryforward) | Limited to net investment income per Form 4952                                                                             | Sch A Inst Line 9, p.4           | https://www.irs.gov/instructions/i1040sca |
| line_11_cash_contributions        | Sch A Line 14 → Line 17 (after AGI limit)      | Subject to 60% of AGI limit for cash to public charities; Drake generates Wks CCLMT if over limit                      | —                                                                                                                                                                                 | 60% of AGI (public charities); 30% of AGI (certain private foundations); 5-year carryforward on excess                     | Sch A Inst Line 11, p.5; Pub 526 | https://www.irs.gov/instructions/i1040sca |
| line_12_noncash_contributions     | Sch A Line 14 → Line 17 (after AGI limit)      | FMV flows subject to AGI limits; Form 8283 required if > $500                                                          | Form 8283 if total non-cash > $500                                                                                                                                                | 30% of AGI for capital gain property to public charities; 20% to private foundations; 5-year carryforward                  | Sch A Inst Line 12, p.5; Pub 526 | https://www.irs.gov/instructions/i1040sca |
| line_13_contribution_carryover    | Sch A Line 14 → Line 17 (after AGI limit)      | Added to current-year contributions; same AGI limits apply                                                             | —                                                                                                                                                                                 | Same AGI % limits as original contribution type                                                                            | Sch A Inst Line 13, p.5          | https://www.irs.gov/instructions/i1040sca |
| line_15_casualty_theft_loss       | Sch A Line 17                                  | Enters directly (Form 4684 already applied $100/event and 10% AGI reductions)                                          | Form 4684 required attachment                                                                                                                                                     | Per-event $100 and 10% AGI floor already applied on Form 4684                                                              | Sch A Inst Line 15, p.5          | https://www.irs.gov/instructions/i1040sca |
| line_16_other_deductions          | Sch A Line 17                                  | Enters directly; gambling losses limited to gambling winnings                                                          | —                                                                                                                                                                                 | Gambling losses: cannot exceed gambling winnings from Schedule 1                                                           | Sch A Inst Line 16, p.5; Pub 529 | https://www.irs.gov/instructions/i1040sca |
| line_18_itemize_checkbox          | Form 1040 Line 12e routing flag                | Forces use of Sch A Line 17 even if < standard deduction                                                               | —                                                                                                                                                                                 | —                                                                                                                          | Sch A Inst Line 18, p.6          | https://www.irs.gov/instructions/i1040sca |

---

## Calculation Logic

### Step 1 — Medical and Dental Expenses (Lines 1–4)

**Inputs:** line_1_medical (raw amount entered by taxpayer) **Computation:**

1. Line 2 (system): AGI = Form 1040 Line 11 (computed from rest of return — not
   a data-entry field on Sch A)
2. Line 3 (system): AGI floor = Line 2 × 0.075 (round to nearest dollar)
3. Line 4 (system): Deductible medical = max(Line 1 − Line 3, 0)

**Long-term care insurance premium caps applied BEFORE entry into Line 1:**

- Age ≤ 40 as of 12/31/2025: max $480 per person
- Age 41–50: max $900 per person
- Age 51–60: max $1,800 per person
- Age 61–70: max $4,810 per person
- Age ≥ 71: max $6,020 per person

**Medical mileage rate (TY2025):** $0.21 per mile (IRS Notice 2025-5)
**Charitable mileage rate (TY2025):** $0.14 per mile (IRS Notice 2025-5) —
enters Line 11, not Line 1

> **Source:** Schedule A Instructions TY2025, Lines 1–4, p.2 —
> https://www.irs.gov/instructions/i1040sca; IRS Pub 502 TY2025 —
> https://www.irs.gov/publications/p502; IRS Notice 2025-5 —
> https://www.irs.gov/pub/irs-drop/n-25-05.pdf

---

### Step 2 — Taxes You Paid (Lines 5a–7)

**Inputs:** line_5a_tax_amount, line_5a_election (income_tax or sales_tax),
line_5b_real_estate_tax, line_5c_personal_property_tax, line_6_other_taxes, and
MAGI (system-computed)

**Computation:**

1. Line 5d (system): = Line 5a + Line 5b + Line 5c
2. Compute SALT cap for filing status and MAGI:
   - Base cap: $40,000 (Single/MFJ/QSS/HOH) or $20,000 (MFS)
   - Phase-out: If MAGI > $500,000 (Single/MFJ/HOH) or MAGI > $250,000 (MFS):
     Reduction = 0.30 × (MAGI − $500,000) [or $250,000 for MFS] Effective cap =
     Base cap − Reduction
   - Floor: Effective cap cannot go below $10,000 (Single/MFJ/HOH) or $5,000
     (MFS)
   - Formula: Effective_cap = max(Floor, Base_cap − 0.30 × max(0, MAGI −
     Threshold))
3. Line 5e (system): = min(Line 5d, Effective_cap)
4. Line 6 (data entry): entered directly (foreign income taxes or GST — not
   subject to SALT cap)
5. Line 7 (system): = Line 5e + Line 6
6. If Line 5d > Effective_cap or MAGI > $500,000/$250,000 → generate Wks SALT

**MAGI definition for SALT phase-out:** AGI + foreign earned income exclusion
(Form 2555) + income from U.S. territories; all as defined in the One Big
Beautiful Bill Act (OBBB Act, enacted July 4, 2025)

**AMT addback:** Schedule A Line 7 (all taxes paid) is added back on Form 6251
Line 2a for AMT computation. The standard deduction amount is entered on Form
6251 Line 2a if taxpayer does NOT itemize.

> **Source:** Schedule A Instructions TY2025, Lines 5a–7, p.3 —
> https://www.irs.gov/instructions/i1040sca; OBBB Act (enacted July 4, 2025);
> Drake KB SALT — https://kb.drakesoftware.com/kb/Drake-Tax/15833.htm; Form 6251
> Instructions TY2025 — https://www.irs.gov/instructions/i6251

---

### Step 3 — Interest You Paid (Lines 8a–10)

**Inputs:** line_8a_mortgage_interest_1098, line_8b_mortgage_interest_no_1098,
line_8c_points_no_1098, line_9_investment_interest

**Mortgage interest computation (Lines 8a–8c):**

1. If total acquisition debt ≤ applicable limit: enter full interest on Line 8a
   (from Form 1098) or Line 8b (no Form 1098).
2. Applicable limit by loan origination date:
   - Loans closed on or before 12/15/2017 (or binding contract before
     12/15/2017, closed by 4/1/2018): $1,000,000 ($500,000 MFS) grandfathered
     limit
   - Loans closed after 12/15/2017: $750,000 ($375,000 MFS)
   - Mortgages originated before 10/14/1987: fully grandfathered (no dollar
     limit)
3. If total acquisition debt > limit: compute deductible ratio =
   qualified_loan_limit / average_total_balance. Deductible interest =
   total_interest × ratio. Use Wks DEDINT (screen DEDM). Do NOT enter on screen
   1098 when also using DEDM.
4. Points (Line 8c): fully deductible in year paid only if all 8 conditions met
   (see Data Entry Fields above). Otherwise amortize over loan life. Special: if
   refinancing, only home-improvement portion is deductible in current year.
5. Reduce Line 8a by mortgage interest credit amount from Form 8396 (if
   claimed).
6. Interest on home equity loans: deductible ONLY if proceeds used to buy,
   build, or substantially improve the secured home. If used for other purposes,
   that portion is NOT deductible.

**Line 10 (system):** = Line 8a + Line 8b + Line 8c + Line 9 (limited by
Form 4952)

**Investment interest (Line 9) computation:**

1. Enter gross investment interest paid.
2. If Form 4952 exception NOT met: complete Form 4952.
   - Net investment income = dividends + interest + short-term capital gains
     (plus, optionally, qualified dividends and LT gains if taxpayer elects on
     Form 4952 Line 4g)
   - Deductible investment interest = min(gross investment interest, net
     investment income)
   - Enter Form 4952 Line 8 on Schedule A Line 9
   - Excess carries forward indefinitely to future years
3. If Form 4952 exception IS met: enter full investment interest on Schedule A
   Line 9 directly.

> **Source:** Schedule A Instructions TY2025, Lines 8–10, p.4 —
> https://www.irs.gov/instructions/i1040sca; Pub 936 TY2025 —
> https://www.irs.gov/publications/p936; Form 4952 instructions —
> https://www.irs.gov/forms-pubs/about-form-4952

---

### Step 4 — Charitable Contributions (Lines 11–14)

**Inputs:** line_11_cash_contributions, line_12_noncash_contributions,
line_13_contribution_carryover, and AGI (system)

**AGI percentage limits — applied in this order:**

| Contribution Type                                     | AGI Limit  | Carryforward |
| ----------------------------------------------------- | ---------- | ------------ |
| Cash to public charities (501(c)(3) public)           | 60% of AGI | 5 years      |
| Non-cash capital gain property to public charities    | 30% of AGI | 5 years      |
| Cash/non-cash to certain private foundations          | 30% of AGI | 5 years      |
| Non-cash capital gain property to private foundations | 20% of AGI | 5 years      |

**Computation:**

1. Line 14 (system): = Line 11 + Line 12 + Line 13 (before AGI limit
   application)
2. Apply AGI percentage limits by type; use Wks CCLMT when limits apply.
3. Deductible charitable total = amount allowed after AGI limits.
4. Excess carries forward up to 5 years (tracked in carryforward screen,
   accessible via Line 13 link in Drake).

**Key documentation rules:**

- Cash < $250: bank record or written receipt
- Cash ≥ $250: contemporaneous written acknowledgment from charity
- Non-cash > $500: Form 8283 required
- Non-cash > $5,000 per item: qualified appraisal + Form 8283 Section B
- Donated vehicle > $500: Form 1098-C from charity required; deduction =
  charity's gross sales proceeds (exceptions: if charity keeps/materially
  improves vehicle, or gives to needy individual → FMV applies)

> **Source:** Schedule A Instructions TY2025, Lines 11–14, p.5 —
> https://www.irs.gov/instructions/i1040sca; Pub 526 TY2025 —
> https://www.irs.gov/publications/p526

---

### Step 5 — Casualty and Theft Losses (Line 15)

1. Taxpayer must complete Form 4684 separately.
2. Enter ONLY the amount from Form 4684 Line 18 on Schedule A Line 15 (NOT Form
   4684 Line 15, which is the "net qualified disaster loss" used for the
   standard deduction enhancement).
3. Post-TCJA (tax years 2018–2025): personal casualty and theft losses are
   deductible ONLY if attributable to a federally declared disaster area.
4. The $100 per-event reduction and 10% AGI floor are already computed on Form
   4684 — do not apply again on Schedule A.
5. Business/income-producing property losses flow through Form 4684 Section B →
   Schedule A Line 16 (not Line 15).

> **Source:** Schedule A Instructions TY2025, Line 15, p.5 —
> https://www.irs.gov/instructions/i1040sca

---

### Step 6 — Other Itemized Deductions (Line 16)

Allowable Line 16 items and their rules:

| Item                                              | What Qualifies                                                                                  | Limit                                                                                                                | Documentation                                                      |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Gambling losses                                   | Actual losses from gambling activities                                                          | Cannot exceed gambling winnings (Schedule 1)                                                                         | Diary with dates, type, location, amounts; W-2G; casino statements |
| Business income-producing property casualty/theft | Form 4684 Section B losses (Sch D and ordinary loss portions)                                   | None (different from personal losses)                                                                                | Form 4684                                                          |
| Federal estate tax on IRD                         | Estate tax attributable to IRD items included in taxpayer's income                              | Limited to estate tax actually attributable to IRD                                                                   | Form 706; Pub 559 calculation                                      |
| Amortizable bond premium                          | Premium on taxable bonds acquired before 10/23/1986                                             | Prior period interest inclusions                                                                                     | Bond purchase confirmation; amortization schedule                  |
| Repayment of claim-of-right amount > $3,000       | Repayment of income included in prior year because taxpayer had apparent unrestricted right     | Must exceed $3,000; alternatively may claim as tax credit under IRC §1341                                            | Documentation of original inclusion and repayment obligation       |
| Impairment-related work expenses                  | Disabled employee's attendant care costs at place of employment                                 | Must have disability limiting major life activity                                                                    | Form 2106; receipts                                                |
| Unrecovered investment in annuity (decedent)      | Remaining unrecovered basis in annuity at death                                                 | Final return only                                                                                                    | Annuity contract; cumulative distribution records                  |
| Net qualified disaster loss                       | Form 4684 Line 15 amount — if taxpayer takes standard deduction but has qualified disaster loss | Can increase standard deduction by this amount; enter both net disaster loss AND standard deduction on Sch A Line 16 | Form 4684                                                          |

> **Source:** Schedule A Instructions TY2025, Line 16, p.5 —
> https://www.irs.gov/instructions/i1040sca; Pub 529 TY2025 —
> https://www.irs.gov/publications/p529

---

### Step 7 — Total and Routing to Form 1040 (Lines 17–18)

**Line 17 (system):** = Line 4 + Line 7 + Line 10 + Line 14 + Line 15 + Line 16

Equivalently (expanded): = Line 4 + Line 5e + Line 6 + Line 8a + Line 8b + Line
8c + Line 9 (limited) + Line 11 (limited) + Line 12 (limited) + Line 13 + Line
15 + Line 16

**Routing decision (system):**

1. Compare Line 17 vs. standard deduction for filing status:
   - Single: $15,750
   - MFJ: $31,500
   - HOH: $23,625
   - MFS: $15,750 (Plus additional standard deduction for age 65+/blind: $2,000
     if Single/HOH; $1,600 per qualifying person if MFJ/MFS) (Plus new senior
     deduction: $6,000 per person age 65+ for TY2025–2028, subject to MAGI
     phase-out > $75,000 single/$150,000 joint — NOTE: this flows to Form 1040
     Line 12e separately via Schedule 1-A, not through Schedule A)

2. If Line 17 > standard deduction → Form 1040 Line 12e = Sch A Line 17
3. If Line 17 ≤ standard deduction AND (force_itemized = false AND
   line_18_itemize_checkbox = false) → Form 1040 Line 12e = standard deduction
4. If force_itemized = true OR line_18_itemize_checkbox = true → Form 1040 Line
   12e = Sch A Line 17 regardless of size

**MFS mandatory itemizing rule:** If one spouse on a Married Filing Separately
return itemizes, the other spouse's standard deduction is reduced to $0 and that
spouse MUST also itemize. Engine must check other spouse's return to enforce
this rule.

**AMT impact of itemizing:** If taxpayer takes standard deduction (does NOT
itemize), enter standard deduction amount on Form 6251 Line 2a. If taxpayer
itemizes, the entire taxes amount (Sch A Line 7) is added back on Form 6251 Line
2a. Certain mortgage interest may also require addback on Form 6251 Line 3
(non-qualified dwelling interest).

> **Source:** Schedule A Instructions TY2025, Lines 17–18, p.6 —
> https://www.irs.gov/instructions/i1040sca; Form 1040 Instructions TY2025 Line
> 12e — https://www.irs.gov/instructions/i1040gi; Form 6251 Instructions TY2025
> Line 2a — https://www.irs.gov/instructions/i6251

---

## Constants & Thresholds (Tax Year 2025)

| Constant                                                                         | Value                                     | Source                                                | URL                                                                                                     |
| -------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Medical expense AGI threshold                                                    | 7.5% of AGI                               | Sch A Inst Line 3, TY2025; IRC §213(a)                | https://www.irs.gov/instructions/i1040sca                                                               |
| LTC premium cap — age ≤ 40                                                       | $480 per person                           | Rev. Proc. 2024-40; Pub 502 TY2025                    | https://www.irs.gov/publications/p502                                                                   |
| LTC premium cap — age 41–50                                                      | $900 per person                           | Rev. Proc. 2024-40; Pub 502 TY2025                    | https://www.irs.gov/publications/p502                                                                   |
| LTC premium cap — age 51–60                                                      | $1,800 per person                         | Rev. Proc. 2024-40; Pub 502 TY2025                    | https://www.irs.gov/publications/p502                                                                   |
| LTC premium cap — age 61–70                                                      | $4,810 per person                         | Rev. Proc. 2024-40; Pub 502 TY2025                    | https://www.irs.gov/publications/p502                                                                   |
| LTC premium cap — age ≥ 71                                                       | $6,020 per person                         | Rev. Proc. 2024-40; Pub 502 TY2025                    | https://www.irs.gov/publications/p502                                                                   |
| Medical mileage rate (TY2025)                                                    | $0.21/mile                                | IRS Notice 2025-5                                     | https://www.irs.gov/pub/irs-drop/n-25-05.pdf                                                            |
| Charitable mileage rate (TY2025)                                                 | $0.14/mile                                | IRS Notice 2025-5; IRC §170(i)                        | https://www.irs.gov/pub/irs-drop/n-25-05.pdf                                                            |
| SALT cap — Single/MFJ/QSS/HOH (TY2025)                                           | $40,000                                   | OBBB Act, enacted July 4, 2025; effective TY2025–2029 | https://rsmus.com/insights/tax-alerts/2025/salt-considerations-from-the-one-big-beautiful-bill-act.html |
| SALT cap — MFS (TY2025)                                                          | $20,000                                   | OBBB Act, enacted July 4, 2025                        | https://rsmus.com/insights/tax-alerts/2025/salt-considerations-from-the-one-big-beautiful-bill-act.html |
| SALT cap phase-out threshold — Single/MFJ/HOH                                    | $500,000 MAGI                             | OBBB Act                                              | https://rsmus.com/insights/tax-alerts/2025/salt-considerations-from-the-one-big-beautiful-bill-act.html |
| SALT cap phase-out threshold — MFS                                               | $250,000 MAGI                             | OBBB Act                                              | https://rsmus.com/insights/tax-alerts/2025/salt-considerations-from-the-one-big-beautiful-bill-act.html |
| SALT cap phase-out rate                                                          | 30% of MAGI excess over threshold         | OBBB Act                                              | https://rsmus.com/insights/tax-alerts/2025/salt-considerations-from-the-one-big-beautiful-bill-act.html |
| SALT cap floor — Single/MFJ/HOH                                                  | $10,000                                   | OBBB Act                                              | https://rsmus.com/insights/tax-alerts/2025/salt-considerations-from-the-one-big-beautiful-bill-act.html |
| SALT cap floor — MFS                                                             | $5,000                                    | OBBB Act                                              | https://rsmus.com/insights/tax-alerts/2025/salt-considerations-from-the-one-big-beautiful-bill-act.html |
| SALT cap annual inflation increase                                               | 1% per year (2026–2029)                   | OBBB Act                                              | https://rsmus.com/insights/tax-alerts/2025/salt-considerations-from-the-one-big-beautiful-bill-act.html |
| SALT cap expiration                                                              | Reverts to $10,000 ($5,000 MFS) in TY2030 | OBBB Act                                              | https://rsmus.com/insights/tax-alerts/2025/salt-considerations-from-the-one-big-beautiful-bill-act.html |
| Mortgage acquisition debt limit — post-12/15/2017 loans                          | $750,000 ($375,000 MFS)                   | TCJA §11043; Pub 936 TY2025                           | https://www.irs.gov/publications/p936                                                                   |
| Mortgage acquisition debt limit — pre-12/16/2017 grandfathered                   | $1,000,000 ($500,000 MFS)                 | Pre-TCJA law, IRC §163(h)(3)(F)(i)(II)                | https://www.irs.gov/publications/p936                                                                   |
| Mortgage debt — pre-10/14/1987                                                   | Fully grandfathered (no dollar cap)       | Pre-1987 law                                          | https://www.irs.gov/publications/p936                                                                   |
| Non-cash charitable contribution threshold — Form 8283 required                  | > $500 total                              | Sch A Inst Line 12; IRC §170(f)(11)                   | https://www.irs.gov/instructions/i1040sca                                                               |
| Non-cash charitable contribution — qualified appraisal required                  | > $5,000 per item/group                   | Sch A Inst Line 12; IRC §170(f)(11)(C)                | https://www.irs.gov/instructions/i1040sca                                                               |
| Charitable contribution AGI limit — cash to public charities                     | 60% of AGI                                | IRC §170(b)(1)(G); Pub 526                            | https://www.irs.gov/publications/p526                                                                   |
| Charitable contribution AGI limit — capital gain property to public charities    | 30% of AGI                                | IRC §170(b)(1)(C); Pub 526                            | https://www.irs.gov/publications/p526                                                                   |
| Charitable contribution AGI limit — to certain private foundations               | 30% of AGI                                | IRC §170(b)(1)(B); Pub 526                            | https://www.irs.gov/publications/p526                                                                   |
| Charitable contribution AGI limit — capital gain property to private foundations | 20% of AGI                                | IRC §170(b)(1)(D); Pub 526                            | https://www.irs.gov/publications/p526                                                                   |
| Charitable contribution carryforward period                                      | 5 years                                   | IRC §170(d)(1)                                        | https://www.irs.gov/publications/p526                                                                   |
| Casualty loss per-event floor                                                    | $100                                      | IRC §165(h)(1); Form 4684 Inst                        | https://www.irs.gov/instructions/i1040sca                                                               |
| Casualty loss AGI floor                                                          | 10% of AGI                                | IRC §165(h)(2); Sch A Inst Line 15                    | https://www.irs.gov/instructions/i1040sca                                                               |
| Claim-of-right repayment minimum for Sch A Line 16 deduction                     | > $3,000                                  | IRC §1341(a); Pub 529                                 | https://www.irs.gov/publications/p529                                                                   |
| Standard deduction — Single                                                      | $15,750                                   | Form 1040 Instructions TY2025, Line 12e               | https://www.irs.gov/instructions/i1040gi                                                                |
| Standard deduction — MFJ/QSS                                                     | $31,500                                   | Form 1040 Instructions TY2025, Line 12e               | https://www.irs.gov/instructions/i1040gi                                                                |
| Standard deduction — HOH                                                         | $23,625                                   | Form 1040 Instructions TY2025, Line 12e               | https://www.irs.gov/instructions/i1040gi                                                                |
| Standard deduction — MFS                                                         | $15,750                                   | Form 1040 Instructions TY2025, Line 12e               | https://www.irs.gov/instructions/i1040gi                                                                |
| Additional standard deduction — age 65+/blind (Single or HOH)                    | $2,000 per qualifier                      | IRS TY2025 publications; Kiplinger 2025               | https://www.irs.gov/taxtopics/tc551                                                                     |
| Additional standard deduction — age 65+/blind (MFJ/MFS per person)               | $1,600 per qualifying person              | IRS TY2025 publications                               | https://www.irs.gov/taxtopics/tc551                                                                     |
| New senior deduction (age ≥ 65, TY2025–2028)                                     | $6,000 per qualifying person              | OBBB Act; IRS newsroom                                | https://www.irs.gov/newsroom/check-your-eligibility-for-the-new-enhanced-deduction-for-seniors          |
| New senior deduction phase-out — Single/HOH                                      | MAGI > $75,000                            | OBBB Act                                              | https://www.irs.gov/newsroom/check-your-eligibility-for-the-new-enhanced-deduction-for-seniors          |
| New senior deduction phase-out — MFJ                                             | MAGI > $150,000                           | OBBB Act                                              | https://www.irs.gov/newsroom/check-your-eligibility-for-the-new-enhanced-deduction-for-seniors          |
| Pease limitation                                                                 | $0 — SUSPENDED for TY2025                 | TCJA §11046, IRC §68 suspended                        | —                                                                                                       |

---

## Data Flow Diagram

```mermaid
flowchart LR
  subgraph inputs["Upstream Inputs"]
    SSA_SCREEN[Screen SSA\nMedicare premiums]
    LTC_SCREEN[Screen LTC\nLong-term care premiums]
    SEHI_SCREEN[Screens C/F/SEHI\nSelf-employed health ins.]
    FORM_1098[Screen 1098\nMortgage interest]
    DEDM_SCREEN[Screen DEDM\nLoan-limit mortgage interest]
    FORM4952[Form 4952\nInvestment interest]
    FORM4684[Form 4684\nCasualty/theft loss]
    FORM8283[Form 8283\nNon-cash contributions]
  end

  subgraph scheduleA["Schedule A Screen"]
    LINE1[Line 1: Medical expenses]
    LINE5[Lines 5a/5b/5c: SALT taxes]
    LINE6[Line 6: Other taxes]
    LINE8A[Line 8a: Mortgage interest 1098]
    LINE8B[Line 8b: Mortgage interest no-1098]
    LINE8C[Line 8c: Points]
    LINE9[Line 9: Investment interest]
    LINE11[Line 11: Cash contributions]
    LINE12[Line 12: Non-cash contributions]
    LINE13[Line 13: Contribution carryover]
    LINE15[Line 15: Casualty/theft loss]
    LINE16[Line 16: Other deductions]
  end

  subgraph computed["Computed Lines"]
    LINE4[Line 4: Deductible medical\n= max\(Line1 − AGI×7.5%, 0\)]
    LINE5E[Line 5e: Capped SALT\n= min\(5d, cap\)]
    LINE7[Line 7: Total taxes\n= Line 5e + Line 6]
    LINE10[Line 10: Total interest\n= 8a+8b+8c+9]
    LINE14[Line 14: Total charity\n= 11+12+13]
    LINE17[Line 17: Total itemized\n= 4+7+10+14+15+16]
  end

  subgraph outputs["Downstream"]
    F1040_12E[Form 1040 Line 12e\nDeduction amount]
    F6251_2A[Form 6251 Line 2a\nAMT — taxes addback]
    F6251_2C[Form 6251 Line 2c\nAMT — investment interest adj]
    WKS_SALT[Wks SALT\nSALT cap worksheet]
    WKS_DEDINT[Wks DEDINT\nMortgage limit worksheet]
    WKS_CCLMT[Wks CCLMT\nCharity limit worksheet]
    FORM1116[Form 1116\nForeign tax credit\n\(mutually exclusive with Line 6\)]
  end

  SSA_SCREEN --> LINE1
  LTC_SCREEN --> LINE1
  SEHI_SCREEN --> LINE1
  LINE1 --> LINE4

  FORM_1098 --> LINE8A
  DEDM_SCREEN -->|"if loan > limit"| LINE8A
  LINE8A --> LINE10
  LINE8B --> LINE10
  LINE8C --> LINE10

  FORM4952 --> LINE9
  LINE9 --> LINE10

  LINE5 --> LINE5E
  LINE5E --> LINE7
  LINE6 --> LINE7
  LINE7 -->|"all taxes"| F6251_2A
  LINE7 --> LINE17

  LINE10 --> LINE17
  LINE10 -->|"investment interest adj"| F6251_2C

  FORM8283 --> LINE12
  LINE11 --> LINE14
  LINE12 --> LINE14
  LINE13 --> LINE14
  LINE14 --> LINE17

  FORM4684 --> LINE15
  LINE15 --> LINE17

  LINE16 --> LINE17

  LINE4 --> LINE17

  LINE17 --> F1040_12E

  LINE5 -->|"if 5d > SALT cap"| WKS_SALT
  LINE8A -->|"if debt > $750k/$1M"| WKS_DEDINT
  LINE14 -->|"if contributions > AGI %"| WKS_CCLMT

  LINE6 -->|"foreign taxes — credit elect"| FORM1116
```

---

## Edge Cases & Special Rules

### MFS — Spouse Must Also Itemize

If one spouse on a Married Filing Separately return itemizes deductions, the
other spouse's standard deduction is reduced to **$0** and that spouse is
required to also itemize. This rule applies regardless of the size of the
itemizing spouse's deductions. When spouse 1's return has Schedule A total > $0
with itemized election, the engine must set the other spouse's standard
deduction to $0 and flag that itemizing is required.

> **Source:** Schedule A Instructions TY2025, p.1 —
> https://www.irs.gov/instructions/i1040sca

---

### SALT Cap Phase-Out Formula (New for TY2025 — OBBB Act)

The SALT deduction limit increased from $10,000 to $40,000 for TY2025 under the
One Big Beautiful Bill Act (signed July 4, 2025), effective for TY2025–2029. The
cap phases out at higher MAGI levels.

**Exact formula for TY2025:**

```
Base_cap = $40,000 (Single/MFJ/HOH) or $20,000 (MFS)
Threshold = $500,000 (Single/MFJ/HOH) or $250,000 (MFS)
Floor = $10,000 (Single/MFJ/HOH) or $5,000 (MFS)
MAGI = AGI + Form 2555 exclusion + territory income

Effective_cap = max(Floor, Base_cap − 0.30 × max(0, MAGI − Threshold))
Line_5e = min(Line_5d, Effective_cap)
```

Note: Drake generates Wks SALT to show this computation when triggered.

> **Source:** OBBB Act (July 4, 2025); Drake KB —
> https://kb.drakesoftware.com/kb/Drake-Tax/15833.htm; RSM SALT analysis —
> https://rsmus.com/insights/tax-alerts/2025/salt-considerations-from-the-one-big-beautiful-bill-act.html

---

### Mortgage Interest — Pre vs. Post December 15, 2017 Loans

Three categories of acquisition debt with different deductibility limits:

1. **Pre-October 14, 1987:** Fully grandfathered — all interest deductible, no
   dollar cap
2. **October 14, 1987 through December 15, 2017:** $1,000,000 limit ($500,000
   MFS)
3. **After December 15, 2017:** $750,000 limit ($375,000 MFS); narrow exception
   for binding written contracts executed before 12/15/2017 with closing by
   4/1/2018

**Refinancing:** When pre-12/15/2017 loan is refinanced, the new loan retains
the grandfathered limit ONLY up to the outstanding principal at time of
refinancing. Any additional amount borrowed is subject to the $750,000 limit.

**Home equity debt post-TCJA:** Interest deductible ONLY if loan proceeds used
to buy, build, or substantially improve the secured home. Proceeds used for
other purposes generate non-deductible interest (must be allocated).

> **Source:** Pub 936 TY2025 — https://www.irs.gov/publications/p936; Sch A Inst
> Line 8, p.4 — https://www.irs.gov/instructions/i1040sca

---

### Casualty/Theft Losses — Post-TCJA Restriction (2018–2025)

Personal casualty and theft losses are only deductible if attributable to a
federally declared disaster area (Presidential declaration under the Stafford
Act or similar). Losses from fire, theft, vandalism, car accidents, etc. that
are NOT in a declared disaster are NOT deductible on Schedule A for TY2025.

Business property losses: still deductible via Form 4684 Section B → Schedule A
Line 16.

Form 4684 Line 18 (personal disaster losses, after $100/event and 10% AGI
reductions) → Sch A Line 15. Form 4684 Line 15 (net qualified disaster loss) →
Sch A Line 16 for non-itemizers using standard deduction enhancement.

> **Source:** Schedule A Instructions TY2025, Line 15, p.5 —
> https://www.irs.gov/instructions/i1040sca; IRC §165(h)(5)(A)(i) as amended by
> TCJA

---

### Foreign Taxes — Credit vs. Deduction Election

Taxpayers may not claim both a foreign tax credit (Form 1116) AND a Schedule A
deduction for the same foreign taxes in the same year. This is an all-or-nothing
election applied separately per year. The credit (Form 1116) is typically more
beneficial for most taxpayers.

If electing the deduction: enter on Sch A Line 6. Leave Form 1116 unfiled. If
electing the credit: leave Sch A Line 6 blank (or $0). File Form 1116.

The engine must enforce mutual exclusivity — if Line 6 > 0, do not generate Form
1116 for those same foreign taxes.

> **Source:** Schedule A Instructions TY2025, Line 6, p.3 —
> https://www.irs.gov/instructions/i1040sca

---

### Net Qualified Disaster Loss — Standard Deduction Enhancement (Non-Itemizers)

Taxpayers who take the standard deduction (do NOT itemize) but have a net
qualified disaster loss (Form 4684 Line 15) may increase their standard
deduction by that amount. Special handling:

- Enter the net qualified disaster loss on Sch A Line 16 with description "Net
  qualified disaster loss"
- Enter the standard deduction amount on Sch A Line 16 with description
  "Standard deduction claimed on Form 1040"
- Check the box on Line 18
- Total flows to Form 1040 Line 12e as the enhanced standard deduction

The engine should NOT treat this as a true itemized deduction for AMT or state
purposes.

> **Source:** Schedule A Instructions TY2025, Line 16, p.5 —
> https://www.irs.gov/instructions/i1040sca

---

### Income/Sales Tax Election — Prior-Year Refund Interaction

If a taxpayer elected to deduct state income taxes in a prior year and received
a state tax refund in TY2025, that refund may be taxable income in TY2025 under
the tax benefit rule (flows to Form 1040 Line 1 via Schedule 1). If the taxpayer
elected sales taxes in the prior year, refunds of state income tax in the
current year are NOT subject to the tax benefit rule. The engine must track the
prior-year election to determine whether current-year state refunds are taxable.

> **Source:** Schedule A Instructions TY2025, Line 5a, p.3 —
> https://www.irs.gov/instructions/i1040sca

---

### AMT Interaction — Schedule A Items That Require Addback

Schedule A itemized deductions have the following AMT (Form 6251) consequences:

| Item                                         | AMT Treatment                                                                                                           | Form 6251 Line        |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Taxes (Sch A Line 7 = 5e + 6)                | Fully disallowed for AMT; entire amount added back                                                                      | Line 2a               |
| Investment interest (Sch A Line 9)           | Recomputed under AMT rules using second Form 4952; difference (AMT Form 4952 Line 8 − regular Form 4952 Line 8) entered | Line 2c               |
| Mortgage interest on non-qualified dwellings | Disallowed for AMT if home does not qualify as "qualified dwelling" under AMT rules                                     | Line 3                |
| Medical deductions                           | Allowed for AMT at 7.5% threshold (same as regular tax for TY2025 — no difference)                                      | No addback for TY2025 |
| Charitable contributions                     | Allowed for AMT (no addback)                                                                                            | None                  |
| Gambling losses                              | Allowed for AMT (no addback)                                                                                            | None                  |
| Casualty losses                              | Allowed for AMT (no addback)                                                                                            | None                  |

Note: If taxpayer takes standard deduction (does NOT itemize), the standard
deduction amount is entered on Form 6251 Line 2a as an addback.

> **Source:** Form 6251 Instructions TY2025, Lines 2a, 2c, 3 —
> https://www.irs.gov/instructions/i6251

---

### Pease Limitation — Suspended for TY2025

The Pease limitation (IRC §68) — a prior-law phase-out of total itemized
deductions by 3% of AGI above a threshold — was suspended by TCJA for tax years
2018–2025. It does not apply for TY2025. No computation needed.

> **Source:** TCJA §11046; IRC §68 suspended — [NEEDS LEGISLATIVE SOURCE URL:
> confirm still suspended for TY2025 under OBBB Act] [NOTE: OBBB Act appears to
> have made the suspension permanent through 2029 or indefinitely]

---

### Gambling Losses — Gross Winnings vs. Net Reporting

Gambling losses can only offset gambling winnings. The engine must:

1. Ensure gambling winnings are reported on Schedule 1 (not netted against
   losses)
2. Limit Line 16 gambling losses to total gambling winnings on Schedule 1
3. Validate that total Line 16 gambling losses ≤ total gambling winnings
   reported
4. Professional gamblers: gambling income/losses go on Schedule C, not Schedule
   A

> **Source:** Sch A Instructions TY2025, Line 16, p.5 —
> https://www.irs.gov/instructions/i1040sca; Pub 529 TY2025 —
> https://www.irs.gov/publications/p529

---

### Charitable Contributions — Carryover Reduction Rule

Prior-year charitable carryovers are REDUCED by the amount that WOULD have been
deductible in the year of contribution had the taxpayer itemized, even if the
taxpayer actually took the standard deduction in that prior year. This means
carryovers can be eroded even in years the taxpayer did not itemize. The engine
must track this when computing carryover amounts.

> **Source:** IRC §170(d)(1); Drake KB Charitable —
> https://kb.drakesoftware.com/kb/Drake-Tax/10082.htm

---

## Sources

All URLs verified to resolve.

| Document                                          | Year   | Section             | URL                                                                                                     | Saved as     |
| ------------------------------------------------- | ------ | ------------------- | ------------------------------------------------------------------------------------------------------- | ------------ |
| Schedule A Instructions (IRS online)              | TY2025 | Full                | https://www.irs.gov/instructions/i1040sca                                                               | —            |
| Schedule A Instructions PDF                       | TY2025 | Full                | https://www.irs.gov/pub/irs-pdf/i1040sca.pdf                                                            | i1040sca.pdf |
| Schedule A Form (blank)                           | TY2025 | Form                | https://www.irs.gov/pub/irs-pdf/f1040sa.pdf                                                             | f1040sa.pdf  |
| IRS Publication 502 — Medical and Dental Expenses | TY2025 | Full                | https://www.irs.gov/publications/p502                                                                   | p502.pdf     |
| IRS Publication 526 — Charitable Contributions    | TY2025 | Full                | https://www.irs.gov/publications/p526                                                                   | p526.pdf     |
| IRS Publication 529 — Miscellaneous Deductions    | TY2025 | Full                | https://www.irs.gov/publications/p529                                                                   | p529.pdf     |
| IRS Publication 936 — Home Mortgage Interest      | TY2025 | Full                | https://www.irs.gov/publications/p936                                                                   | p936.pdf     |
| Rev. Proc. 2024-40 (TY2025 constants)             | 2024   | §3, §4              | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf                                                           | rp-24-40.pdf |
| IRS Notice 2025-5 (TY2025 mileage rates)          | 2025   | Full                | https://www.irs.gov/pub/irs-drop/n-25-05.pdf                                                            | n-25-05.pdf  |
| Form 6251 Instructions                            | TY2025 | Lines 2a, 2c, 3     | https://www.irs.gov/instructions/i6251                                                                  | i6251.pdf    |
| Form 1040 Instructions                            | TY2025 | Line 12e            | https://www.irs.gov/instructions/i1040gi                                                                | —            |
| IRS Newsroom — TY2025 Inflation Adjustments       | 2024   | Standard deductions | https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2025                   | —            |
| IRS Newsroom — New Enhanced Senior Deduction      | 2025   | Full                | https://www.irs.gov/newsroom/check-your-eligibility-for-the-new-enhanced-deduction-for-seniors          | —            |
| Drake KB — Force Itemized/Standard                | —      | Full                | https://kb.drakesoftware.com/kb/Drake-Tax/16988.htm                                                     | —            |
| Drake KB — Charitable Contributions               | —      | Full                | https://kb.drakesoftware.com/kb/Drake-Tax/10082.htm                                                     | —            |
| Drake KB — Medical Expenses                       | —      | Full                | https://kb.drakesoftware.com/kb/Drake-Tax/11805.htm                                                     | —            |
| Drake KB — SALT Limitation (Wks SALT)             | —      | Full                | https://kb.drakesoftware.com/kb/Drake-Tax/15833.htm                                                     | —            |
| Drake KB — Mortgage Interest Limitation           | —      | Full                | https://kb.drakesoftware.com/kb/Drake-Tax/10641.htm                                                     | —            |
| RSM — SALT OBBB Act Analysis                      | 2025   | Full                | https://rsmus.com/insights/tax-alerts/2025/salt-considerations-from-the-one-big-beautiful-bill-act.html | —            |

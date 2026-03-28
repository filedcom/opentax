# Schedule A — Scratchpad

## Purpose

Schedule A captures all itemized deductions (medical, taxes paid, mortgage interest, charitable contributions, casualty losses, other) and routes the total to Form 1040 Line 12e. Drake automatically compares against standard deduction and uses the larger amount.

## Fields identified (from Drake + IRS instructions)

### Control fields (Drake only)
- force_itemized checkbox
- force_standard checkbox

### Medical & Dental (Part I — Lines 1–4)
- Line 1: Medical and dental expenses paid (data entry)
- Line 2: AGI (system computed from 1040 Line 11) — NOT data entry
- Line 3: AGI × 7.5% — computed
- Line 4: max(Line 1 − Line 3, 0) — computed

### Taxes You Paid (Part II — Lines 5a–7)
- Line 5a: State/local income taxes OR general sales taxes (data entry + election)
- Line 5b: State/local real estate taxes (data entry)
- Line 5c: Personal property taxes ad valorem only (data entry)
- Line 5d: 5a+5b+5c — computed
- Line 5e: min(5d, SALT cap) — computed; SALT cap = $40,000 ($20,000 MFS), phases out at MAGI > $500k/$250k at 30%, floor $10k/$5k
- Line 6: Other taxes — foreign income taxes or GST (data entry)
- Line 7: 5e + 6 — computed; flows to Form 6251 Line 2a for AMT

### Interest You Paid (Part III — Lines 8a–10)
- Line 8a: Mortgage interest from Form 1098 (data entry)
- Line 8b: Mortgage interest — no Form 1098 (data entry + lender info)
- Line 8c: Points not on Form 1098 (data entry)
- Line 8d: Reserved (not used for TY2025)
- Line 9: Investment interest (data entry; limited by Form 4952)
- Line 10: 8a+8b+8c+9 — computed

### Gifts to Charity (Part IV — Lines 11–14)
- Line 11: Cash/check gifts (data entry)
- Line 12: Non-cash gifts at FMV (data entry; Form 8283 if > $500)
- Line 13: Carryover from prior year (data entry)
- Line 14: 11+12+13 — computed (before AGI limits)

### Casualty and Theft Losses (Part V — Line 15)
- Line 15: Amount from Form 4684 Line 18 ONLY (data entry from Form 4684)

### Other Itemized Deductions (Part VI — Line 16)
- Line 16: Gambling losses, estate tax on IRD, bond premium, claim-of-right, impairment work expenses, annuity unrecovered basis (data entry + description)

### Total (Part VII — Lines 17–18)
- Line 17: 4+7+10+14+15+16 — computed; flows to Form 1040 Line 12e
- Line 18: Checkbox — itemizing even if < standard deduction

## Open Questions — Resolution Status

- [x] Q: What fields does Drake show for the Schedule A screen? — Resolved: see above
- [x] Q: Where does each line flow on the 1040? — Line 17 → Form 1040 Line 12e (confirmed from Form 1040 instructions TY2025)
- [x] Q: What are the TY2025 LTC age-based caps? — $480/$900/$1,800/$4,810/$6,020 from Rev Proc 2024-40; confirmed in Pub 502 TY2025 and IRS VITA app
- [x] Q: What is the SALT cap for TY2025? — $40,000 ($20,000 MFS) via OBBB Act, signed July 4, 2025; confirmed from Drake KB and RSM analysis
- [x] Q: What is the mortgage interest acquisition debt limit? — $750,000/$375,000 MFS (post-12/15/2017); $1,000,000/$500,000 MFS (pre-12/16/2017 grandfathered); no cap for pre-10/14/1987
- [x] Q: What are the charitable contribution AGI limits? — 60%/30%/30%/20% by type; 5-year carryforward
- [x] Q: How does Schedule A interact with Form 6251 (AMT)? — Line 7 (taxes) fully addback on F6251 Line 2a; investment interest recomputed on F6251 Line 2c; non-qualified mortgage interest addback on F6251 Line 3; medical/charitable/casualty losses: no AMT addback
- [x] Q: What is the Pease limitation for TY2025? — Suspended; does not apply for TY2025 (TCJA §11046)
- [x] Q: How do casualty/theft losses work post-TCJA? — Only federally declared disaster losses qualify on Line 15; Form 4684 Line 18 only
- [x] Q: What are the alias screen codes (LTC, carryover links)? — LTC screen → Line 1 medical; A > "Charitable Contributions Carried over from prior years" link → carryover screen; SSA screen → Medicare premiums → Line 1; SEHI/C/F → self-employed health insurance → Line 1
- [x] Q: Investment interest Form 4952 trigger rules? — Exception: (1) interest < interest+ordinary dividends−qualified dividends income, (2) no other investment expenses, (3) no 2024 carryforward. All 3 must be met. Otherwise Form 4952 required.
- [x] Q: Standard deduction TY2025? — $15,750 Single/MFS; $31,500 MFJ; $23,625 HOH (from Form 1040 instructions TY2025 via i1040gi)
- [x] Q: Sales tax optional tables? — Taxpayer may use actual sales tax receipts OR IRS Optional State/Local Sales Tax Tables (plus actual sales tax on motor vehicles, boats, aircraft). Drake handles the table lookup.
- [x] Q: Foreign income tax election — credit vs. deduction? — Mutually exclusive per year. Line 6 = deduction; Form 1116 = credit. Engine must enforce mutual exclusivity.
- [x] Q: MFS special rules? — If one MFS spouse itemizes, other must itemize (std deduction = $0). Standard deductions and SALT caps halved for MFS.
- [x] Q: How do prior-year state income tax refunds interact? — Tax benefit rule: if income taxes deducted in prior year and refund received this year, refund is taxable income (Schedule 1). If sales taxes were elected, refunds not taxable. Engine must track prior year election.
- [x] Q: Net Qualified Disaster Loss vs. standard deduction? — Form 4684 Line 15 amount can enhance standard deduction for non-itemizers via Sch A Line 16 + checked Line 18 box. Not a true itemized deduction.
- [x] Q: Medical mileage rate TY2025? — $0.21/mile (IRS Notice 2025-5, confirmed Pub 502)
- [x] Q: Charitable mileage rate TY2025? — $0.14/mile (IRS Notice 2025-5; fixed by statute, same since 1998)
- [x] Q: Schedule A exact line structure/numbering? — Line 7 = 5e+6; Line 10 = 8a+8b+8c+9; Line 14 = 11+12+13; Line 17 = 4+7+10+14+15+16

## Remaining verification items

- [!] NEEDS SOURCE: Confirm Pease limitation remains suspended under OBBB Act for TY2025 (very likely yes given TCJA permanent extension, but need specific citation)
- [!] NEEDS VERIFICATION: The IRS newsroom article cited $15,000/$30,000/$22,500 for TY2025 standard deductions, but the Form 1040 instructions (i1040gi) cited $15,750/$31,500/$23,625 — the higher numbers from the Form 1040 instructions appear correct (may include OBBB Act senior/standard deduction increases or were the adjusted amounts). Cross-check: the OBBB Act permanently increased the standard deduction. The $15,750/$31,500/$23,625 figures from i1040gi (the published 2025 Form 1040 instructions) should be used.
- [!] NEEDS VERIFICATION: New $6,000 senior deduction (age 65+, TY2025–2028) routes through Schedule 1-A (new form for TY2025), NOT through Schedule A. This should be out of scope for the Schedule A node but noted for completeness.

## Sources to check — Status

- [x] Drake KB — Schedule A Force Itemized: https://kb.drakesoftware.com/kb/Drake-Tax/16988.htm
- [x] Drake KB — Medical Expenses: https://kb.drakesoftware.com/kb/Drake-Tax/11805.htm
- [x] Drake KB — SALT Limitation: https://kb.drakesoftware.com/kb/Drake-Tax/15833.htm
- [x] Drake KB — Mortgage Interest Limitation: https://kb.drakesoftware.com/kb/Drake-Tax/10641.htm
- [x] Drake KB — Charitable Contributions: https://kb.drakesoftware.com/kb/Drake-Tax/10082.htm
- [x] IRS Instructions for Schedule A (online): https://www.irs.gov/instructions/i1040sca
- [x] IRS Instructions PDF downloaded: i1040sca.pdf
- [x] IRS Publication 502 (Medical): https://www.irs.gov/publications/p502 + p502.pdf downloaded
- [x] IRS Publication 526 (Charitable): https://www.irs.gov/publications/p526 + p526.pdf downloaded
- [x] IRS Publication 936 (Mortgage): https://www.irs.gov/publications/p936 + p936.pdf downloaded
- [x] IRS Publication 529 (Misc. Deductions): https://www.irs.gov/publications/p529 + p529.pdf downloaded
- [x] Rev. Proc. 2024-40 (LTC caps): rp-24-40.pdf downloaded; LTC values confirmed from Pub 502 and IRS VITA
- [x] IRS Notice 2025-5 (mileage rates): n-25-05.pdf downloaded; 21¢ medical, 14¢ charitable
- [x] Form 6251 Instructions (AMT): https://www.irs.gov/instructions/i6251 + i6251.pdf downloaded
- [x] Form 1040 Instructions (Line 12e): https://www.irs.gov/instructions/i1040gi — standard deductions $15,750/$31,500/$23,625
- [x] OBBB Act — SALT cap increase: confirmed enacted July 4, 2025 via RSM, Drake KB, multiple sources

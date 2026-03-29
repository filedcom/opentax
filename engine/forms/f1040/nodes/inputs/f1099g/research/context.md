# 1099-G — Certain Government Payments

## Overview

The 99G screen captures data from IRS Form 1099-G, which reports payments made
by federal, state, or local government agencies. Six categories of income flow
through this form: (1) unemployment compensation (Box 1), (2) state/local income
tax refunds (Box 2), (3) RTAA wage supplement payments (Box 5), (4) taxable
grants (Box 6), (5) agriculture/USDA subsidy payments (Box 7), and (6) CCC loan
market gain (Box 9). Federal tax withheld (Box 4) is a payment that offsets tax
liability. Each category routes to a different destination on the return —
Schedule 1 line 1, Schedule 1 line 7, Schedule 1 line 8z, Schedule F lines
4a/4b, or Schedule F lines 5a-5c — requiring the engine to branch on payment
type.

The state tax refund (Box 2) is the most complex: it is taxable only if the
taxpayer itemized deductions in the prior year under the "tax benefit rule," and
the taxable amount must be computed via a multi-step worksheet (Pub 525
Worksheet 2). Multiple 1099-G forms may be received (one per payer), and the
engine must support stacking.

**IRS Form:** 1099-G **Drake Screen:** 99G **Tax Year:** 2025 **Drake
Reference:** https://kb.drakesoftware.com/kb/Drake-Tax/16991.htm (unemployment
compensation); https://kb.drakesoftware.com/kb/Drake-Tax/10171.htm (state/local
tax refund taxability)

---

## Data Entry Fields

Required fields first, then optional. Data-entry only — no computed/display
fields.

| Field                   | Type    | Required | Drake Label                                                      | Description                                                                                                                                                                                                                           | IRS Reference                                           | URL                                        |
| ----------------------- | ------- | -------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------ |
| box_1_unemployment      | number  | no       | "Box 1 – Unemployment compensation"                              | Total unemployment compensation received before any withholding. Enter $0 or leave blank if none. Minimum reporting threshold: $10.                                                                                                   | i1099g.pdf, Box 1, p.2                                  | https://www.irs.gov/pub/irs-pdf/i1099g.pdf |
| box_1_repaid            | number  | no       | "Unemployment compensation repaid in 2025"                       | Amount of 2025 unemployment benefits repaid to the state in 2025. Reduces Box 1 before flowing to Schedule 1 line 7.                                                                                                                  | Pub 525 (2025), Unemployment Benefits — Repayment, p.29 | https://www.irs.gov/pub/irs-pdf/p525.pdf   |
| box_1_railroad          | boolean | no       | "Unemployment is from Railroad Retirement Board"                 | Check if Box 1 includes Railroad Retirement Board unemployment payments. Affects labeling but same Schedule 1 line 7 routing.                                                                                                         | Pub 525 (2025), Unemployment Benefits, p.28             | https://www.irs.gov/pub/irs-pdf/p525.pdf   |
| box_2_state_refund      | number  | no       | "Box 2 – State or local income tax refunds, credits, or offsets" | Amount of state or local income tax refund received. Taxable only if taxpayer itemized deductions in the prior tax year (tax benefit rule). Minimum reporting threshold: $10.                                                         | i1099g.pdf, Box 2, p.2                                  | https://www.irs.gov/pub/irs-pdf/i1099g.pdf |
| box_3_tax_year          | integer | no       | "Box 3 – Box 2 amount is for tax year (YYYY)"                    | The tax year the Box 2 refund applies to. Blank means current year (2024). Enter 4-digit year (e.g., "2023") if the refund is for a prior year. Required when refund is for a year other than 2024.                                   | i1099g.pdf, Box 3, p.2                                  | https://www.irs.gov/pub/irs-pdf/i1099g.pdf |
| box_4_federal_withheld  | number  | no       | "Box 4 – Federal income tax withheld"                            | Federal income tax withheld from unemployment, CCC loan, or crop disaster payments. Backup withholding rate is 24%. Voluntary withholding allowed on unemployment. Note: voluntary withholding on RTAA is prohibited.                 | i1099g.pdf, Box 4, p.2                                  | https://www.irs.gov/pub/irs-pdf/i1099g.pdf |
| box_5_rtaa              | number  | no       | "Box 5 – RTAA payments"                                          | Reemployment Trade Adjustment Assistance payments of $600 or more paid to eligible individuals (age 50+) who are reemployed at a lower wage. Wage supplement equal to 50% of wage difference, 2-year max $10,000.                     | i1099g.pdf, Box 5, p.2                                  | https://www.irs.gov/pub/irs-pdf/i1099g.pdf |
| box_6_taxable_grants    | number  | no       | "Box 6 – Taxable grants"                                         | Taxable grants administered by federal, state, or local programs — includes energy conservation subsidies, Indian tribal government grants, and other government grants of $600+. Does NOT include scholarships or fellowship grants. | i1099g.pdf, Box 6, p.2                                  | https://www.irs.gov/pub/irs-pdf/i1099g.pdf |
| box_7_agriculture       | number  | no       | "Box 7 – Agriculture payments"                                   | USDA agricultural subsidy payments, including Price Loss Coverage (PLC), Agriculture Risk Coverage (ARC), Market Facilitation Program (MFP), Coronavirus Food Assistance Program (CFAP), and other USDA payments.                     | i1099g.pdf, Box 7, p.2                                  | https://www.irs.gov/pub/irs-pdf/i1099g.pdf |
| box_8_trade_or_business | boolean | no       | "Box 8 – Trade or business income (checkbox)"                    | Check if Box 2 refund is from a tax that applies exclusively to income from a trade or business (not a tax of general application). Affects whether a Form 1099-G must be issued to recipient regardless of itemizing status.         | i1099g.pdf, Box 8, p.2                                  | https://www.irs.gov/pub/irs-pdf/i1099g.pdf |
| box_9_market_gain       | number  | no       | "Box 9 – Market gain"                                            | Market gain from repayment of a Commodity Credit Corporation (CCC) loan, whether repaid using cash or CCC certificates.                                                                                                               | i1099g.pdf, Box 9, p.2                                  | https://www.irs.gov/pub/irs-pdf/i1099g.pdf |
| box_10a_state           | string  | no       | "Box 10a – State"                                                | Two-letter state abbreviation (e.g., "CA") for state withholding. Used for Combined Federal/State Filing Program.                                                                                                                     | i1099g.pdf, Boxes 10a-11, p.2-3                         | https://www.irs.gov/pub/irs-pdf/i1099g.pdf |
| box_10b_state_id        | string  | no       | "Box 10b – State identification no."                             | Filer's state identification number assigned by the individual state.                                                                                                                                                                 | i1099g.pdf, Boxes 10a-11, p.2-3                         | https://www.irs.gov/pub/irs-pdf/i1099g.pdf |
| box_11_state_withheld   | number  | no       | "Box 11 – State income tax withheld"                             | Amount of state income tax withheld from payments. Not reported to the IRS — for state filing purposes only.                                                                                                                          | i1099g.pdf, Boxes 10a-11, p.2-3                         | https://www.irs.gov/pub/irs-pdf/i1099g.pdf |
| payer_name              | string  | no       | "Payer's name"                                                   | Name of the government agency or entity that issued the 1099-G.                                                                                                                                                                       | i1099g.pdf, General Instructions, p.1                   | https://www.irs.gov/pub/irs-pdf/i1099g.pdf |
| payer_tin               | string  | no       | "Payer's TIN"                                                    | Taxpayer identification number of the payer. Cannot be truncated on any form.                                                                                                                                                         | i1099g.pdf, TIN section, p.1                            | https://www.irs.gov/pub/irs-pdf/i1099g.pdf |
| account_number          | string  | no       | "Account number"                                                 | Required if taxpayer has multiple accounts with the same payer.                                                                                                                                                                       | i1099g.pdf, Account Number, p.1                         | https://www.irs.gov/pub/irs-pdf/i1099g.pdf |

---

## Per-Field Routing

For every field above: where the value goes, how it is used, what it triggers,
any limits.

| Field                   | Destination                                                                                                                         | How Used                                                                                                                                                                                                                                                                                                                                                                        | Triggers                                                                                                                                                       | Limit / Cap                                                                                                                               | IRS Reference                                                                    | URL                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| box_1_unemployment      | Schedule 1, Line 7                                                                                                                  | Net of box_1_repaid summed across all 99G instances. Enter: box_1_unemployment − box_1_repaid. If repaid > received in same year: enter $0 on line 7 and carry over (see repayment rules).                                                                                                                                                                                      | If repaid amount > $3,000 from a prior year: triggers IRC 1341 credit on Schedule 3, line 13b. If repaid ≤ $3,000: no deduction allowed (post-2017 rule).      | None                                                                                                                                      | Pub 525 (2025), Unemployment Benefits, p.28-29; Schedule 1 (2025), Line 7        | https://www.irs.gov/pub/irs-pdf/p525.pdf   |
| box_1_repaid            | Schedule 1, Line 7                                                                                                                  | Subtracted from box_1_unemployment. If repaid in same year received: net on line 7 = received − repaid. If repaid in later year: full amount goes on line 7 in receipt year; in repayment year: deduct on Schedule A line 16 (if >$3,000 and itemizing) or claim Schedule 3 line 13b IRC 1341 credit.                                                                           | Repayment > $3,000 triggers IRC 1341 computation (compare Method 1 vs Method 2, pick lower tax).                                                               | $3,000 threshold determines treatment method                                                                                              | Pub 525 (2025), Repayments, p.36                                                 | https://www.irs.gov/pub/irs-pdf/p525.pdf   |
| box_1_railroad          | Schedule 1, Line 7                                                                                                                  | No numerical effect — marks the income as Railroad Retirement Board unemployment. Same Line 7 destination.                                                                                                                                                                                                                                                                      | None                                                                                                                                                           | None                                                                                                                                      | Pub 525 (2025), Unemployment Benefits, p.28                                      | https://www.irs.gov/pub/irs-pdf/p525.pdf   |
| box_2_state_refund      | Schedule 1, Line 1 (ordinary case) or Schedule 1, Line 8z (special cases)                                                           | Taxable only up to amount that reduced prior-year tax (tax benefit rule). Must run State and Local Income Tax Refund Worksheet (Pub 525 Worksheet 2 / 1040 instructions worksheet). If taxpayer took standard deduction in prior year: $0 is taxable. If taxpayer elected sales tax deduction in prior year: $0 is taxable (or use Recoveries rule for sales tax refund on 8z). | When Worksheet 2 exceptions apply (see Edge Cases), use line 8z instead of line 1. Box 3 tax year field determines which prior year's Schedule A to reference. | Taxable amount ≤ Box 2 amount; further capped at prior-year state tax deduction minus tax you could have deducted for general sales taxes | Pub 525 (2025), State tax refund, p.24-27; 1040 Instructions, Schedule 1, Line 1 | https://www.irs.gov/pub/irs-pdf/p525.pdf   |
| box_3_tax_year          | Worksheet 2 input                                                                                                                   | Determines which prior year's Schedule A deduction to use in Worksheet 2. If blank, use 2024 Schedule A. If a different year, use that year's Schedule A and file separate Worksheet 2 for each year.                                                                                                                                                                           | If refunds span multiple tax years: one 1099-G per year; run Worksheet 2 separately per year                                                                   | None                                                                                                                                      | i1099g.pdf, Box 3, p.2                                                           | https://www.irs.gov/pub/irs-pdf/i1099g.pdf |
| box_4_federal_withheld  | Form 1040, Line 25b                                                                                                                 | Summed across all 1099 forms (not just 1099-G). Added to other 1099 withholding on line 25b.                                                                                                                                                                                                                                                                                    | None                                                                                                                                                           | None                                                                                                                                      | IRS Topic 418; Schedule 1 instructions                                           | https://www.irs.gov/taxtopics/tc418        |
| box_5_rtaa              | Schedule 1, Line 8z                                                                                                                 | Entered as "RTAA payments" other income on line 8z. Taxable in full.                                                                                                                                                                                                                                                                                                            | None                                                                                                                                                           | 2-year maximum of $10,000 is a program rule (not a tax cap — full amount received is taxable)                                             | Pub 525 (2025), Reemployment Trade Adjustment Assistance (RTAA) payments, p.29   | https://www.irs.gov/pub/irs-pdf/p525.pdf   |
| box_6_taxable_grants    | Schedule 1, Line 8z (if personal/non-farm); Schedule F, Lines 4a/4b (if farm/agriculture-related); Schedule C (if business-related) | Non-farm, non-business taxable grants: Schedule 1 line 8z as "taxable grants." Farm-related grants: Schedule F lines 4a (total) and 4b (taxable). Business-related grants: Schedule C.                                                                                                                                                                                          | If grant relates to farm income, routes to Schedule F. If business, routes to Schedule C. If personal (energy subsidy, etc.): Schedule 1 line 8z.              | None                                                                                                                                      | i1099g.pdf, Box 6; Pub 525, Taxable and Nontaxable Income                        | https://www.irs.gov/pub/irs-pdf/i1099g.pdf |
| box_7_agriculture       | Schedule F, Line 4a (total received) and Line 4b (taxable amount)                                                                   | All USDA agricultural subsidy payments go to Schedule F line 4a. Taxable amount on line 4b. Attachment from USDA itemizes components.                                                                                                                                                                                                                                           | Farmer must be filing Schedule F. If taxpayer is a nominee who received payments for another person, same routing with note.                                   | None                                                                                                                                      | Schedule F Instructions (2025), Lines 4a and 4b; i1040sf.pdf                     | https://www.irs.gov/instructions/i1040sf   |
| box_8_trade_or_business | No numerical routing                                                                                                                | Informational checkbox only. Indicates Box 2 refund is from a business-specific tax (e.g., tax on unincorporated businesses). Does not change routing of Box 2 amount on Schedule 1.                                                                                                                                                                                            | None                                                                                                                                                           | None                                                                                                                                      | i1099g.pdf, Box 8; Rev. Rul. 86-140, 1986-2 C.B. 195                             | https://www.irs.gov/pub/irs-pdf/i1099g.pdf |
| box_9_market_gain       | Schedule F, Line 5a/5b/5c (CCC loan section)                                                                                        | If taxpayer did NOT elect to report CCC loan proceeds as income in year received: report market gain on Schedule F line 4b (treated as agricultural program payment). If taxpayer DID make that election: no market gain is recognized (treated as loan repurchase).                                                                                                            | Election status determines routing.                                                                                                                            | None                                                                                                                                      | Schedule F Instructions (2025), Lines 5a-5c; i1040sf.pdf                         | https://www.irs.gov/instructions/i1040sf   |
| box_10a_state           | State return processing                                                                                                             | State abbreviation passed to state return engine. Not reported to IRS.                                                                                                                                                                                                                                                                                                          | None                                                                                                                                                           | None                                                                                                                                      | i1099g.pdf, Boxes 10a-11                                                         | https://www.irs.gov/pub/irs-pdf/i1099g.pdf |
| box_10b_state_id        | State return processing                                                                                                             | State ID number passed to state return engine. Not reported to IRS.                                                                                                                                                                                                                                                                                                             | None                                                                                                                                                           | None                                                                                                                                      | i1099g.pdf, Boxes 10a-11                                                         | https://www.irs.gov/pub/irs-pdf/i1099g.pdf |
| box_11_state_withheld   | State return only                                                                                                                   | Amount of state income tax withheld. Not flowed to federal return.                                                                                                                                                                                                                                                                                                              | None                                                                                                                                                           | None                                                                                                                                      | i1099g.pdf, Boxes 10a-11                                                         | https://www.irs.gov/pub/irs-pdf/i1099g.pdf |

---

## Calculation Logic

### Step 1 — Box 1: Net Unemployment Compensation for Schedule 1 Line 7

**Input:** `box_1_unemployment` (from Form 1099-G), `box_1_repaid` (repayment in
the same tax year 2025)

**Rule:** If the taxpayer repaid 2025 unemployment compensation in 2025 (same
year received):

```
net_unemployment = box_1_unemployment − box_1_repaid
```

Enter `net_unemployment` on Schedule 1 (Form 1040), Line 7. Write "Repaid" and
the amount repaid on the dotted line next to line 7.

If multiple 1099-G forms: sum all box_1 amounts, then subtract all repayments
for the year.

> **Source:** Pub 525 (2025), Repayment of unemployment compensation, p.29 —
> https://www.irs.gov/pub/irs-pdf/p525.pdf

---

### Step 2 — Box 1 Repayment in a Later Year (Prior-Year Unemployment Repaid in 2025)

If the taxpayer is repaying in 2025 unemployment compensation that was included
in income in an **earlier year**, the treatment depends on the amount:

**Case A: Repayment ≤ $3,000** No deduction is available. For tax years
beginning after 2017, miscellaneous itemized deductions are eliminated. The
taxpayer cannot deduct the repayment. No adjustment to Schedule 1 Line 7 for the
prior-year amount.

**Case B: Repayment > $3,000 (Claim of Right — IRC §1341)** The taxpayer may
take either a deduction or a credit, whichever results in less tax:

- **Method 1 (Deduction):** Deduct the repaid amount on Schedule A (Form 1040),
  Line 16 as an "other itemized deduction" in the repayment year 2025.
- **Method 2 (Credit):** Calculate the tax credit as follows:
  1. Figure tax for 2025 **without** deducting the repaid amount.
  2. Refigure prior-year tax **excluding** the amount repaid (i.e., as if it had
     never been included in income).
  3. Credit = (prior-year tax as filed) − (prior-year tax refigured).
  4. Subtract the credit from the tax in step 1.
  5. Compare Method 1 result vs Method 2 result — use whichever gives lower 2025
     tax.

If Method 2 is selected: enter the credit on **Schedule 3 (Form 1040), Line
13b** with the notation "IRC 1341."

> **Source:** Pub 525 (2025), Repayments, pp.36-37 —
> https://www.irs.gov/pub/irs-pdf/p525.pdf

---

### Step 3 — Box 2: State Tax Refund Taxability (Tax Benefit Rule)

**The fundamental rule:** A state or local tax refund is taxable only to the
extent the taxpayer received a tax benefit from the deduction of state/local
income taxes in the prior year.

**Threshold test — when the refund is automatically $0 taxable (no worksheet
needed):**

- The taxpayer took the **standard deduction** in the prior year (2024 for a
  refund received in 2025), OR
- The taxpayer deducted **state and local general sales taxes** instead of
  income taxes on prior-year Schedule A

If either condition is met: enter $0 on Schedule 1 Line 1. Do not run
Worksheet 2.

**When to use the 1040 Instructions Worksheet (State and Local Income Tax Refund
Worksheet — Schedule 1, Line 1):** This worksheet is the standard tool when the
taxpayer itemized deductions in 2024 and deducted state and local income taxes.
Use it unless one of the Worksheet 2 exceptions below applies.

The worksheet asks:

1. Enter the income tax refund from Form(s) 1099-G.
2. Enter any state/local real estate or personal property tax refunds.
3. Total = line 1 + line 2 (capped at Schedule A line 5d — total SALT deducted
   in prior year).
4. Determine whether SALT deduction exceeded SALT paid — test for general sales
   tax cap.
5. Determine taxable portion.

Result goes to **Schedule 1 (Form 1040), Line 1** (state income tax refund
portion) or **Line 8z** (other refunds).

**When to use Pub 525 Worksheet 2 (Recoveries of Itemized Deductions) instead:**
Use Worksheet 2 (not the standard 1040 instructions worksheet) when ANY of the
following is true:

1. The refund is for a tax year other than 2024 (i.e., box_3_tax_year ≠ blank
   and ≠ 2024).
2. The refund is for something other than state income taxes (e.g., a general
   sales tax refund or real property tax refund received in 2025).
3. The taxpayer had taxable income in 2024 (Form 1040, line 15) but owed $0 tax
   because of the 0% rate on net capital gains and qualified dividends.
4. The 2024 state and local income tax refund exceeds (2024 SALT deduction −
   amount that could have been deducted as general sales tax).
5. The taxpayer made their last estimated state/local income tax payment for
   2024 in January 2025.
6. The taxpayer owed AMT in 2024.
7. The taxpayer couldn't use the full amount of credits in 2024 (total credits >
   line 18 of Form 1040).
8. The taxpayer could be claimed as a dependent in 2024.
9. The refund is from a jointly filed state return but 2025 federal return is
   not joint with the same person.
10. The taxpayer is a nonresident alien filing Form 1040-NR.

**Worksheet 2 structure:**

- Line 1a: State/local income tax refund or credit (from Worksheet 2a
  computation)
- Line 1b: State/local real estate and personal property tax refund
- Line 2: Total of all other Schedule A refunds/reimbursements
- Line 3: Add lines 1a, 1b, 2
- Line 4: Prior-year itemized deductions (2024 Schedule A, line 17 or 8 for
  1040-NR)
- Line 5: Prior-year amounts already refunded
- Line 6: Line 4 − line 5
- Line 7: Prior-year standard deduction
- Line 8: Line 6 − line 7 (if ≤ 0, stop — nothing is taxable)
- Line 9: Lesser of line 3 or line 8
- Line 10: Prior-year taxable income (2024 Form 1040, line 15)
- Line 11: Amount to include in income for 2025 (if line 10 ≥ 0: line 9; if line
  10 negative: line 9 + line 10, not less than $0)

**Routing Worksheet 2 results:**

- If line 11 = line 3: Enter line 1a amount on Schedule 1 line 1; enter lines 1b
  and 2 on Schedule 1 line 8z.
- If line 11 < line 3 and only line 1a has a value: Enter line 1a amount on
  Schedule 1 line 1.
- If line 11 < line 3 and only lines 1b or 2 have values: Enter line 11 on
  Schedule 1 line 8z.
- If line 11 < line 3 and both line 1a AND (line 1b or 2) have values: Allocate
  proportionally using steps A, B, C of Worksheet 2 — step B result → Schedule 1
  line 1; step C result → Schedule 1 line 8z.

> **Source:** Pub 525 (2025), State tax refund and Recoveries, pp.24-27;
> Worksheet 2a and Worksheet 2, pp.26-27 —
> https://www.irs.gov/pub/irs-pdf/p525.pdf

---

### Step 4 — Box 4: Federal Tax Withheld

```
total_1099_withholding += box_4_federal_withheld
```

This amount flows to **Form 1040, Line 25b** ("Form(s) 1099"). It is summed with
all other 1099 federal withholding (not W-2 withholding, which goes on line
25a).

No worksheet needed. Enter directly.

> **Source:** IRS Topic 418 — https://www.irs.gov/taxtopics/tc418

---

### Step 5 — Box 5: RTAA Payments

```
Schedule_1_line_8z += box_5_rtaa
```

Label as "RTAA payments." Full amount is taxable. No exclusion, no limitation,
no worksheet.

> **Source:** Pub 525 (2025), Reemployment Trade Adjustment Assistance (RTAA)
> payments, p.29 — https://www.irs.gov/pub/irs-pdf/p525.pdf

---

### Step 6 — Box 6: Taxable Grants — Routing Decision

```
if grant is related to farm/agricultural activity:
    Schedule_F_line_4a += box_6_taxable_grants   (total received)
    Schedule_F_line_4b = taxable_amount           (may differ if any exclusion applies)
elif grant is related to a trade or business:
    Schedule_C += box_6_taxable_grants
else:
    Schedule_1_line_8z += box_6_taxable_grants    (label: "taxable grants")
```

The tax software must ask or determine whether the grant is farm-related,
business-related, or personal/energy/tribal. The default for energy conservation
and Indian tribal government grants is Schedule 1 line 8z (personal).

> **Source:** i1099g.pdf, Box 6, p.2 —
> https://www.irs.gov/pub/irs-pdf/i1099g.pdf

---

### Step 7 — Box 7: Agriculture Payments

All USDA agricultural subsidy payments are reported on **Schedule F**:

```
Schedule_F_line_4a = box_7_agriculture    (total/gross amount received)
Schedule_F_line_4b = taxable_amount       (may differ if any portion is excluded or deferrable)
```

The USDA typically sends a statement (CCC-926) detailing what is included in
Box 7. Common components:

- Price Loss Coverage (PLC)
- Agriculture Risk Coverage (ARC)
- Market Facilitation Program (MFP) / Coronavirus Food Assistance Program (CFAP)
- Conservation cost-share payments
- In-kind payments (fertilizer, lime, building services)

> **Source:** Schedule F Instructions (2025), Lines 4a and 4b —
> https://www.irs.gov/instructions/i1040sf; CALT (Iowa State), Lines 4a and 4b —
> https://www.calt.iastate.edu/lines-4a-and-4b-agricultural-program-payments

---

### Step 8 — Box 9: CCC Loan Market Gain

Routing depends on whether the taxpayer elected to report CCC loan proceeds as
income in the year received:

```
if elected_to_report_ccc_proceeds_as_income == false:
    Schedule_F_line_4b += box_9_market_gain   (treated as agricultural program payment)
elif elected_to_report_ccc_proceeds_as_income == true:
    // No market gain recognized — treated as loan repurchase, nothing flows
    // (Do not report on line 4b per Schedule F instructions)
```

> **Source:** Schedule F Instructions (2025), Lines 4a-4b and 5a-5c —
> https://www.irs.gov/instructions/i1040sf

---

## Constants & Thresholds (Tax Year 2025)

| Constant                                                | Value                            | Source                                   | URL                                                                                      |
| ------------------------------------------------------- | -------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| Minimum Box 1 (unemployment) reporting threshold        | $10                              | i1099g.pdf, Box 1, p.2                   | https://www.irs.gov/pub/irs-pdf/i1099g.pdf                                               |
| Minimum Box 2 (state tax refund) reporting threshold    | $10                              | i1099g.pdf, Box 2, p.2                   | https://www.irs.gov/pub/irs-pdf/i1099g.pdf                                               |
| Minimum Box 5 (RTAA) reporting threshold                | $600                             | i1099g.pdf, Box 5, p.2                   | https://www.irs.gov/pub/irs-pdf/i1099g.pdf                                               |
| Minimum Box 6 (taxable grants) reporting threshold      | $600 (energy/tribal: any amount) | i1099g.pdf, Box 6, p.2                   | https://www.irs.gov/pub/irs-pdf/i1099g.pdf                                               |
| Backup withholding rate (Box 4)                         | 24%                              | i1099g.pdf, Box 4, p.2                   | https://www.irs.gov/pub/irs-pdf/i1099g.pdf                                               |
| Repayment threshold for IRC §1341 credit vs. deduction  | $3,000                           | Pub 525 (2025), Repayments, p.36         | https://www.irs.gov/pub/irs-pdf/p525.pdf                                                 |
| RTAA program maximum benefit                            | $10,000 over 2 years             | Pub 525 (2025), RTAA payments, p.29      | https://www.irs.gov/pub/irs-pdf/p525.pdf                                                 |
| TY2025 SALT deduction cap (Schedule A)                  | $10,000 ($5,000 MFS)             | IRC §164(b)(6); TCJA permanent provision | https://www.irs.gov/newsroom/the-tax-cuts-and-jobs-act-changed-the-way-tax-is-calculated |
| Voluntary withholding rate for unemployment (Form W-4V) | 10% of payment                   | Pub 525 (2025), Tax withholding, p.29    | https://www.irs.gov/pub/irs-pdf/p525.pdf                                                 |

---

## Data Flow Diagram

```mermaid
flowchart LR
  subgraph inputs["Upstream Inputs"]
    PAYER[Government agency / State UI / USDA]
    PRIOR_SCH_A[Prior year Schedule A\n(itemized deductions)]
    CCC_ELECTION[CCC loan election status]
  end

  subgraph screen["99G Screen (Form 1099-G)"]
    BOX1[Box 1: Unemployment Compensation]
    BOX1R[Box 1 Repaid: Repayment amount]
    BOX2[Box 2: State/Local Tax Refund]
    BOX3[Box 3: Refund tax year]
    BOX4[Box 4: Federal Tax Withheld]
    BOX5[Box 5: RTAA Payments]
    BOX6[Box 6: Taxable Grants]
    BOX7[Box 7: Agriculture Payments]
    BOX8[Box 8: Trade/Business checkbox]
    BOX9[Box 9: Market Gain / CCC]
    BOX11[Box 11: State Tax Withheld]
  end

  subgraph outputs["Downstream"]
    SCH1_L1[Schedule 1, Line 1]
    SCH1_L7[Schedule 1, Line 7]
    SCH1_L8Z[Schedule 1, Line 8z]
    F1040_25B[Form 1040, Line 25b]
    SCH3_13B[Schedule 3, Line 13b\nIRC 1341 credit]
    SCHF_4A[Schedule F, Line 4a]
    SCHF_4B[Schedule F, Line 4b]
    STATE_RETURN[State Return Engine]
  end

  PAYER --> BOX1
  PAYER --> BOX2
  PAYER --> BOX5
  PAYER --> BOX6
  PAYER --> BOX7
  PAYER --> BOX9

  BOX1 --> |"net of repaid"| SCH1_L7
  BOX1R --> |"subtracted from BOX1"| SCH1_L7
  BOX1R --> |"repaid > $3,000 from prior year"| SCH3_13B

  PRIOR_SCH_A --> BOX2
  BOX2 --> |"if itemized prior year:\nrun Worksheet 2"| SCH1_L1
  BOX2 --> |"Worksheet 2 exceptions"| SCH1_L8Z
  BOX2 --> |"if standard deduction\nprior year: $0"| SCH1_L1
  BOX3 --> |"determines prior year\nfor Worksheet 2"| BOX2

  BOX4 --> F1040_25B
  BOX5 --> SCH1_L8Z
  BOX6 --> |"personal/energy/tribal"| SCH1_L8Z
  BOX6 --> |"farm-related"| SCHF_4A
  BOX6 --> |"farm-related taxable"| SCHF_4B
  BOX7 --> SCHF_4A
  BOX7 --> |"taxable portion"| SCHF_4B
  BOX8 --> |"informational only"| BOX2

  CCC_ELECTION --> BOX9
  BOX9 --> |"no CCC income election"| SCHF_4B
  BOX9 --> |"CCC income election:\nno gain recognized"| SCHF_4B

  BOX11 --> STATE_RETURN
```

---

## Edge Cases & Special Rules

### Multiple 1099-G Forms

A taxpayer may receive multiple Form 1099-G in a single tax year (e.g., one for
unemployment from the state, one for a state tax refund, one for USDA payments).
The engine must allow stacking — multiple 99G instances — and must aggregate by
box type:

- Sum all Box 1 amounts → one line 7 entry (net of same-year repayments)
- Sum all Box 4 amounts → line 25b (combined with other 1099 withholding)
- Sum all Box 2 amounts from the same prior-year period → one worksheet run
- Separate worksheets for Box 2 amounts from different prior years (different
  Box 3 values)

> **Source:** i1099g.pdf, Box 3, p.2 —
> https://www.irs.gov/pub/irs-pdf/i1099g.pdf

---

### State Tax Refund — Taxpayer Took Standard Deduction in Prior Year

If the taxpayer took the standard deduction in 2024 (the prior year for refunds
received in 2025), the entire Box 2 amount is $0 taxable. Enter $0 on Schedule 1
Line 1. Do not run Worksheet 2.

> **Source:** Pub 525 (2025), State tax refund — "Deductions not itemized," p.24
> — https://www.irs.gov/pub/irs-pdf/p525.pdf

---

### State Tax Refund — Taxpayer Elected Sales Tax Deduction in Prior Year

If in 2024 the taxpayer elected to deduct state and local general sales taxes
instead of income taxes on Schedule A, the state income tax refund (Box 2) is
not taxable and goes to $0 on Schedule 1 Line 1. However, a sales tax refund may
be taxable as a recovery item — report on Schedule 1 Line 8z. See Pub 525
Recoveries.

> **Source:** Pub 525 (2025), State tax refund, p.24 —
> https://www.irs.gov/pub/irs-pdf/p525.pdf

---

### State Tax Refund — SALT Deduction Cap Interaction

The $10,000 SALT cap (IRC §164(b)(6)) applies from 2018 onwards. If the taxpayer
was limited by the cap in the prior year, the taxable portion of the refund may
be reduced. Worksheet 2a (Pub 525 pp.26) handles this: the refund's taxable
amount is reduced by the proportion of taxes that were not deductible due to the
cap.

> **Source:** Pub 525 (2025), Worksheet 2a, Computations for Worksheet 2, Lines
> 1a and 1b, p.26 — https://www.irs.gov/pub/irs-pdf/p525.pdf

---

### State Tax Refund — Refund for a Tax Year Other Than 2024

If Box 3 shows a year other than 2024 (e.g., the refund is for tax year 2023),
you must use Pub 525 Worksheet 2 (not the standard 1040 instructions worksheet)
and reference the Schedule A from that specific year. If refunds span multiple
years, file a separate worksheet for each year.

> **Source:** Pub 525 (2025), Recovery for 2 or more years, p.24 —
> https://www.irs.gov/pub/irs-pdf/p525.pdf; i1099g.pdf, Box 3, p.2 —
> https://www.irs.gov/pub/irs-pdf/i1099g.pdf

---

### Unemployment Repayment — Same Year Received

If taxpayer received and repaid unemployment in the same year (2025), the net
amount is what goes on Schedule 1 Line 7. If net is negative (repaid more than
received), enter $0 on line 7. The excess repayment is not deductible in the
same year (no negative income recognition).

> **Source:** Pub 525 (2025), Repayment of unemployment compensation, p.29 —
> https://www.irs.gov/pub/irs-pdf/p525.pdf

---

### Unemployment Repayment — Prior-Year Benefit Repaid in 2025 (≤ $3,000)

No deduction available. For tax years beginning after 2017, miscellaneous
itemized deductions (which covered repayments ≤ $3,000) are eliminated. The
taxpayer bears the full tax cost of the repayment with no relief.

> **Source:** Pub 525 (2025), Repayments, p.36 —
> https://www.irs.gov/pub/irs-pdf/p525.pdf

---

### Unemployment Repayment — Prior-Year Benefit Repaid in 2025 (> $3,000) — IRC §1341 Claim of Right

When repaying more than $3,000 of unemployment that was included in income in an
earlier year under a claim of right, the taxpayer may choose:

**Method 1:** Itemize the repayment as an other itemized deduction on Schedule A
(Form 1040), Line 16 for 2025.

**Method 2:** Compute IRC §1341 credit:

1. Compute 2025 tax without deducting the repaid amount.
2. Refigure prior-year tax as if the repaid amount had not been included in
   income.
3. Credit = (prior-year tax as originally computed) − (prior-year tax as
   refigured).
4. 2025 net tax under Method 2 = (2025 tax from step 1) − credit from step 3.
5. Use whichever method (1 or 2) results in lower 2025 tax.

If Method 2 is chosen: enter the credit from step 3 on **Schedule 3 (Form 1040),
Line 13b**, labeled "IRC 1341."

> **Source:** Pub 525 (2025), Repayments, pp.36-37 —
> https://www.irs.gov/pub/irs-pdf/p525.pdf; IRS.gov Repayments guidance

---

### Supplemental Unemployment (Employer-Financed Fund)

Benefits from an employer-financed supplemental unemployment fund (to which
employees did not contribute) are NOT unemployment compensation — they are
taxable wages. Report on Form 1040, Line 1a (as wages), not on Schedule 1
Line 7. They are subject to FICA and FUTA.

> **Source:** Pub 525 (2025), Supplemental unemployment benefits, p.29 —
> https://www.irs.gov/pub/irs-pdf/p525.pdf

---

### State Employees' Unemployment-Like Payments

Payments made by a state to its own employees who are not covered by the state's
unemployment compensation law (even if fully taxable) should NOT be reported as
unemployment compensation on Schedule 1 Line 7. Report on **Schedule 1, Line
8z** with description "state employee payments."

> **Source:** Pub 525 (2025), State employees, p.29 —
> https://www.irs.gov/pub/irs-pdf/p525.pdf

---

### Private (Non-Union) Unemployment Fund Payments

If received from a private non-union fund to which the taxpayer voluntarily
contributed: taxable only to the extent benefits exceed total contributions made
to the fund. Taxable excess: **Schedule 1, Line 8z**.

If received from a union-administered special unemployment fund where
contributions are not deductible: taxable only to the extent benefits exceed
contributions. Taxable excess: **Schedule 1, Line 8z**.

Regular union dues unemployment benefits: **Schedule 1, Line 8z**.

> **Source:** Pub 525 (2025), Private unemployment fund; Payments by a union,
> p.29 — https://www.irs.gov/pub/irs-pdf/p525.pdf

---

### Identity Theft / Erroneous 1099-G

If the taxpayer receives a Form 1099-G for unemployment benefits they did not
actually receive (identity theft):

1. Do NOT include the erroneous amount in income.
2. The taxpayer should contact the state agency and request a corrected Form
   1099-G showing $0.
3. File an accurate return reporting only income actually received — even if
   corrected form not yet received.
4. Form 14039 (Identity Theft Affidavit) is NOT required in this scenario.
5. The IRS will not send a notice to the payer about TIN mismatch solely due to
   an erroneous 1099-G.

In the engine: a flag "erroneous_1099g" should zero out the Box 1 amount.

> **Source:** IRS guidance on identity theft and unemployment compensation —
> https://www.irs.gov/forms-pubs/identity-theft-guidance-regarding-unemployment-compensation-reporting;
> Drake KB — https://kb.drakesoftware.com/kb/Drake-Tax/17114.htm

---

### California Family Temporary Disability Insurance (FTDI) / Government Paid Family Leave

Payments from California's Family Temporary Disability Insurance or similar
governmental paid family leave programs that have been deemed to be in the
nature of unemployment compensation are reported on a SEPARATE Form 1099-G (not
combined with regular unemployment compensation). Each contributory program gets
its own 1099-G, each reported separately on Schedule 1 Line 7.

> **Source:** i1099g.pdf, Box 1, p.2 —
> https://www.irs.gov/pub/irs-pdf/i1099g.pdf

---

### Box 6 Taxable Grants — Non-Reportable Items

Do NOT enter in Box 6 (and do not treat as taxable grants):

- Scholarship or fellowship grants — these go on a different form (1098-T
  territory, Pub 970)
- Compensation for services (Box 6 is for grants, not wages — these go on
  1099-MISC or 1099-NEC)
- Lead service line replacement payments (per Announcement 2024-10, 2024-11
  I.R.B. 711 — not income)

> **Source:** i1099g.pdf, Box 6, p.2; What's New, p.1 —
> https://www.irs.gov/pub/irs-pdf/i1099g.pdf

---

## Sources

All URLs verified to resolve.

| Document                                                          | Year                  | Section                                                                                                    | URL                                                                                                  | Saved as    |
| ----------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------- |
| Instructions for Form 1099-G (Rev. March 2024)                    | 2024 (continuous use) | All boxes                                                                                                  | https://www.irs.gov/pub/irs-pdf/i1099g.pdf                                                           | i1099g.pdf  |
| Publication 525 (2025) — Taxable and Nontaxable Income            | 2025                  | Unemployment Benefits (p.28-29), State tax refund (p.24-27), Repayments (pp.36-37), Worksheet 2 (pp.26-27) | https://www.irs.gov/pub/irs-pdf/p525.pdf                                                             | p525.pdf    |
| Instructions for Schedule F (Form 1040) (2025)                    | 2025                  | Lines 4a, 4b, 5a-5c                                                                                        | https://www.irs.gov/instructions/i1040sf                                                             | i1040sf.pdf |
| Drake KB — 1099-G Unemployment Compensation                       | —                     | Full article                                                                                               | https://kb.drakesoftware.com/kb/Drake-Tax/16991.htm                                                  | —           |
| Drake KB — 1099-G State and Local Tax Refund Taxability           | —                     | Full article                                                                                               | https://kb.drakesoftware.com/kb/Drake-Tax/10171.htm                                                  | —           |
| Drake KB — 1099-G Erroneous Unemployment Benefits                 | —                     | Full article                                                                                               | https://kb.drakesoftware.com/kb/Drake-Tax/17114.htm                                                  | —           |
| Drake KB — Repayment of Unemployment Received in Prior Year       | —                     | Full article                                                                                               | https://kb.drakesoftware.com/kb/Drake-Tax/11541.htm                                                  | —           |
| IRS Tax Topic 418 — Unemployment Compensation                     | 2025                  | Full                                                                                                       | https://www.irs.gov/taxtopics/tc418                                                                  | —           |
| IRS — Unemployment Compensation (individual page)                 | 2025                  | Full                                                                                                       | https://www.irs.gov/individuals/employees/unemployment-compensation                                  | —           |
| IRS — Identity Theft Guidance re: Unemployment Compensation       | 2020                  | Full                                                                                                       | https://www.irs.gov/forms-pubs/identity-theft-guidance-regarding-unemployment-compensation-reporting | —           |
| CALT (Iowa State) — Lines 4a and 4b Agricultural Program Payments | —                     | Full                                                                                                       | https://www.calt.iastate.edu/lines-4a-and-4b-agricultural-program-payments                           | —           |
| Schedule 1 (Form 1040) 2025                                       | 2025                  | Lines 1, 7, 8z                                                                                             | https://www.irs.gov/pub/irs-pdf/f1040s1.pdf                                                          | f1040s1.pdf |
| Schedule 3 (Form 1040) 2025                                       | 2025                  | Line 13b                                                                                                   | https://www.irs.gov/pub/irs-prior/f1040s3--2025.pdf                                                  | —           |

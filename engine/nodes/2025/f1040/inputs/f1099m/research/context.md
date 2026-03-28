# 1099-MISC — Miscellaneous Information

## Overview

The 1099-MISC screen (screen code "99M" in Drake Tax) captures all income
reported to the taxpayer on IRS Form 1099-MISC. This form is issued by payers
who paid a recipient $600 or more in rents, other income, medical payments, crop
insurance proceeds, attorney proceeds, or fishing boat proceeds; $10 or more in
royalties or substitute payments in lieu of dividends.

**Key 2025 change:** Box 14 (formerly excess golden parachute payments) is now
"Reserved for future use" on Form 1099-MISC. Excess golden parachute payments
moved to Form 1099-NEC Box 3 effective TY2025.

The 1099-MISC does **not** capture nonemployee compensation (moved to 1099-NEC
in 2020); Box 7 on current 1099-MISC is the Direct Sales indicator (a checkbox,
not a dollar amount).

Each box routes to a different place on the return — Box 1 (rents) → Schedule E
Part I; Box 2 (royalties) → Schedule E Part I or Schedule C depending on
trade/business status; Box 3 (other income) → Schedule 1 Line 8i (prizes/awards)
or Line 8z (other); Box 4 (federal withholding) → Form 1040 Line 25b; Box 5
(fishing) → Schedule C; Box 6 (medical payments) → Schedule C (for the
provider); Box 8 (substitute payments) → Schedule 1 Line 8z; Box 9 (crop
insurance) → Schedule F; Box 10 (attorney proceeds) → Schedule 1 Line 8z or
excluded; Box 11 (fish purchased) → Schedule C; Box 15 (NQDC) → Schedule 1 Line
8z + Schedule 2 Line 17h.

The screen may be entered multiple times (once per payer/form received).

**IRS Form:** 1099-MISC (Rev. April 2025) **Drake Screen:** 99M **Tax Year:**
2025 **Drake Reference:** https://kb.drakesoftware.com/kb/Drake-Tax/11742.htm
**IRS Instructions (authoritative):** https://www.irs.gov/instructions/i1099mec

---

## Data Entry Fields

Required fields first, then optional. Data-entry only — no computed/display
fields.

| Field                         | Type                                   | Required             | Drake Label                                                  | Description                                                                                                                                                                                                                                                                                                                                      | IRS Reference                        | URL                                                 |
| ----------------------------- | -------------------------------------- | -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ | --------------------------------------------------- |
| payer_name                    | string (max 40 chars)                  | yes                  | Payer's name                                                 | Name of the entity that issued the 1099-MISC                                                                                                                                                                                                                                                                                                     | i1099mec, Payer information          | https://www.irs.gov/instructions/i1099mec           |
| payer_tin                     | string (9 digits, no dashes)           | yes                  | Payer's TIN                                                  | Payer's Employer Identification Number or SSN                                                                                                                                                                                                                                                                                                    | i1099mec, Payer TIN                  | https://www.irs.gov/instructions/i1099mec           |
| recipient_tin                 | string (9 digits, no dashes)           | yes                  | Recipient's TIN                                              | Taxpayer's SSN or EIN as shown on the form                                                                                                                                                                                                                                                                                                       | i1099mec, Recipient TIN              | https://www.irs.gov/instructions/i1099mec           |
| account_number                | string (max 20 chars)                  | no                   | Account number                                               | Account number payer assigned; used when multiple accounts exist with same payer                                                                                                                                                                                                                                                                 | i1099mec, Account number box         | https://www.irs.gov/instructions/i1099mec           |
| box_1_rents                   | number (dollars, 2 decimal places, ≥0) | no                   | Box 1 – Rents                                                | Gross rents paid to recipient. Covers real estate rentals, machine rentals, pasture rentals, rental assistance payments. Threshold: $600+. Excludes payments to real estate agents/property managers.                                                                                                                                            | i1099mec, Box 1                      | https://www.irs.gov/instructions/i1099mec           |
| box_2_royalties               | number (dollars, 2 decimal places, ≥0) | no                   | Box 2 – Royalties                                            | Gross royalties from oil, gas, mineral properties, patents, copyrights, trademarks, and name/image/likeness (NIL) rights. Threshold: $10+. Reported before reduction for severance taxes. Excludes surface royalties and timber royalties under pay-as-cut contracts.                                                                            | i1099mec, Box 2                      | https://www.irs.gov/instructions/i1099mec           |
| box_3_other_income            | number (dollars, 2 decimal places, ≥0) | no                   | Box 3 – Other income                                         | Prizes, awards (including FMV of merchandise), medical research payments, grant payments, termination payments to former insurance salespeople, damages for nonphysical injuries, Tax Receivable Agreement payments. Threshold: $600+. Does NOT include employee wages (those go on W-2) or physical injury damages (excludable under IRC §104). | i1099mec, Box 3                      | https://www.irs.gov/instructions/i1099mec           |
| box_4_federal_withheld        | number (dollars, 2 decimal places, ≥0) | no                   | Box 4 – Federal income tax withheld                          | Backup withholding (24%) and Indian gaming profit tax withheld. Arises when recipient failed to furnish correct TIN or IRS notified payer to withhold.                                                                                                                                                                                           | i1099mec, Box 4; IRC §3406           | https://www.irs.gov/instructions/i1099mec           |
| box_5_fishing_boat            | number (dollars, 2 decimal places, ≥0) | no                   | Box 5 – Fishing boat proceeds                                | Crew member's share of fishing catch or FMV distributed by boat operator. Threshold: $600+. Applies to boats normally with fewer than 10 crew members.                                                                                                                                                                                           | i1099mec, Box 5                      | https://www.irs.gov/instructions/i1099mec           |
| box_6_medical_payments        | number (dollars, 2 decimal places, ≥0) | no                   | Box 6 – Medical and health care payments                     | Payments to physicians and health care service providers including payments by insurance companies. Threshold: $600+. Excludes payments to tax-exempt hospitals and government facilities.                                                                                                                                                       | i1099mec, Box 6                      | https://www.irs.gov/instructions/i1099mec           |
| box_7_direct_sales            | boolean                                | no                   | Box 7 – Direct sales indicator                               | Checkbox only — no dollar amount. Checked if payer sold $5,000+ of consumer products to recipient on buy-sell or commission basis for resale outside a permanent retail establishment.                                                                                                                                                           | i1099mec, Box 7                      | https://www.irs.gov/instructions/i1099mec           |
| box_8_substitute_payments     | number (dollars, 2 decimal places, ≥0) | no                   | Box 8 – Substitute payments in lieu of dividends or interest | Broker payments to customers for dividends or tax-exempt interest on loaned securities. Threshold: $10+ aggregate.                                                                                                                                                                                                                               | i1099mec, Box 8                      | https://www.irs.gov/instructions/i1099mec           |
| box_9_crop_insurance          | number (dollars, 2 decimal places, ≥0) | no                   | Box 9 – Crop insurance proceeds                              | Insurance company payments to farmers for crop losses. Threshold: $600+. Excluded if farmer capitalized expenses under IRC §§278, 263A, or 447.                                                                                                                                                                                                  | i1099mec, Box 9                      | https://www.irs.gov/instructions/i1099mec           |
| box_10_attorney_proceeds      | number (dollars, 2 decimal places, ≥0) | no                   | Box 10 – Gross proceeds paid to an attorney                  | Payments to attorneys in connection with legal services, including settlement amounts paid through the attorney. Threshold: $600+. Note: This is gross proceeds, not attorney fees — the taxable portion depends on the nature of the settlement.                                                                                                | i1099mec, Box 10                     | https://www.irs.gov/instructions/i1099mec           |
| box_11_fish_purchased         | number (dollars, 2 decimal places, ≥0) | no                   | Box 11 – Fish purchased for resale                           | Total cash payments to persons engaged in catching fish for resale. Threshold: $600+. "Cash" means currency, cashier's check, or money order — NOT personal checks. Annual total reported even though each purchase date tracked by payer.                                                                                                       | i1099mec, Box 11                     | https://www.irs.gov/instructions/i1099mec           |
| box_12_section_409a_deferrals | number (dollars, 2 decimal places, ≥0) | no                   | Box 12 – Section 409A deferrals                              | Total amount deferred during year under nonqualified deferred compensation plans, including current and prior year earnings on deferrals. Optional reporting by payer. This amount is NOT currently taxable (it's deferred). Only becomes taxable if plan fails §409A.                                                                           | i1099mec, Box 12; IRC §409A          | https://www.irs.gov/instructions/i1099mec           |
| box_13_fatca                  | boolean                                | no                   | Box 13 – FATCA filing requirement checkbox                   | Check if filing under chapter 4 (FATCA) requirements for U.S. accounts. Administrative — no tax computation for recipient.                                                                                                                                                                                                                       | i1099mec, Box 13                     | https://www.irs.gov/instructions/i1099mec           |
| box_14_reserved               | —                                      | no                   | Box 14 – Reserved                                            | Box 14 is "Reserved for future use" in TY2025. Previously reported excess golden parachute payments, which moved to Form 1099-NEC Box 3 effective TY2025. Do not enter any amount.                                                                                                                                                               | i1099mec; Tax Year 2025 form changes | https://www.irs.gov/instructions/i1099mec           |
| box_15_nqdc                   | number (dollars, 2 decimal places, ≥0) | no                   | Box 15 – Nonqualified deferred compensation                  | Amounts includible in income under IRC §409A due to plan failures (failure to comply with §409A(a)(1)). Excludes amounts reported on prior-year Form 1099-MISC, W-2, or W-2c. Excludes amounts still subject to substantial forfeiture risk.                                                                                                     | i1099mec, Box 15; IRC §409A(a)(1)    | https://www.irs.gov/instructions/i1099mec           |
| box_16_state_tax_withheld     | number (dollars, 2 decimal places, ≥0) | no                   | Box 16 – State tax withheld                                  | State income tax withheld. Up to two states reportable. State return only — no federal impact.                                                                                                                                                                                                                                                   | i1099mec, Boxes 16–18                | https://www.irs.gov/instructions/i1099mec           |
| box_17_state_payer_id         | string                                 | no                   | Box 17 – State / Payer's state no.                           | State abbreviation and payer's state identification number. Up to two states.                                                                                                                                                                                                                                                                    | i1099mec, Boxes 16–18                | https://www.irs.gov/instructions/i1099mec           |
| box_18_state_income           | number (dollars, 2 decimal places, ≥0) | no                   | Box 18 – State income                                        | Amount of state income for which state tax was withheld. Up to two states.                                                                                                                                                                                                                                                                       | i1099mec, Boxes 16–18                | https://www.irs.gov/instructions/i1099mec           |
| for_dropdown                  | enum                                   | yes (Drake-specific) | For                                                          | Drake routing field: designates the form/schedule this 1099-MISC flows into. Options include: Schedule C, Schedule E, Schedule F, Schedule 1 Line 8z, Form 1040 Line 25b (withholding only). Controls all downstream routing in the engine.                                                                                                      | Drake 99M screen                     | https://kb.drakesoftware.com/kb/Drake-Tax/11742.htm |
| multi_form_code               | integer ≥ 1                            | no                   | MFC                                                          | Drake routing field: when multiple instances of Schedule C/E/F exist, specifies which instance this 1099-MISC belongs to. Defaults to first instance if blank.                                                                                                                                                                                   | Drake 99M screen                     | https://kb.drakesoftware.com/kb/Drake-Tax/11610.htm |

---

## Per-Field Routing

For every field above: where the value goes, how it is used, what it triggers,
any limits.

| Field                              | Destination                                                                                                                                 | How Used                                                                                                                                                                                                                                                                                                        | Triggers                                                                    | Limit / Cap                                   | IRS Reference                                                         | URL                                                                                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| box_1_rents                        | Schedule E, Part I, Line 3 (Rents received) — OR Schedule C if substantial services rendered to tenants                                     | Summed per rental property; flows through Schedule E total lines (23a–26) → Schedule 1 Line 5 → Form 1040 Line 8. If hotel/B&B with significant services (maid service, etc.) → Schedule C gross receipts → Schedule SE                                                                                         | Schedule E (passive) or Schedule C + Schedule SE (if services rendered)     | None                                          | i1040se instructions, Line 3; i1099mec Box 1                          | https://www.irs.gov/instructions/i1040se                                                                                                                                    |
| box_2_royalties                    | Schedule E, Part I, Line 4 (Royalties received) — OR Schedule C if taxpayer derives royalties in the ordinary course of a trade or business | If passive/investment royalties: Schedule E → Schedule 1 Line 5 → Form 1040 Line 8 (no SE tax). If active trade/business (professional author, songwriter, inventor): Schedule C → Schedule 1 Line 3 → Form 1040 Line 8 (subject to SE tax)                                                                     | Schedule E (investment) or Schedule C + Schedule SE (trade/business)        | None                                          | i1040se instructions, Line 4; Pub 550; i1099mec Box 2                 | https://www.irs.gov/instructions/i1040se                                                                                                                                    |
| box_3_other_income (prizes/awards) | Schedule 1, Part I, Line 8i (Prizes and awards)                                                                                             | Added to Schedule 1 Line 8i total → flows to Line 9 (Total other income) → Form 1040 Line 8                                                                                                                                                                                                                     | None                                                                        | None                                          | Schedule 1 instructions, Line 8i; IRS FAQ on 1099-MISC Box 3          | https://www.irs.gov/faqs/interest-dividends-other-types-of-income/1099-misc-independent-contractors-and-self-employed/1099-misc-independent-contractors-and-self-employed-5 |
| box_3_other_income (non-prize)     | Schedule 1, Part I, Line 8z (Other income)                                                                                                  | Added to Schedule 1 Line 8z total → flows to Line 9 → Form 1040 Line 8. Attach statement identifying source.                                                                                                                                                                                                    | None (physical injury damages excluded under IRC §104)                      | None                                          | Schedule 1 instructions, Line 8z; i1099mec Box 3                      | https://www.irs.gov/instructions/i1099mec                                                                                                                                   |
| box_4_federal_withheld             | Form 1040, Line 25b (Federal income tax withheld — Form(s) 1099)                                                                            | Summed across all 1099-MISC instances and other 1099s; applied as payment/credit reducing tax owed or generating refund                                                                                                                                                                                         | None                                                                        | None                                          | Form 1040 instructions, Line 25b                                      | https://www.irs.gov/instructions/i1040gi                                                                                                                                    |
| box_5_fishing_boat                 | Schedule C (Profit or Loss from Business)                                                                                                   | Self-employment gross receipts for crew member. Flows: Schedule C net → Schedule 1 Line 3 → Form 1040 Line 8                                                                                                                                                                                                    | Schedule SE (self-employment tax)                                           | None                                          | i1099mec Box 5; i1040sc instructions                                  | https://www.irs.gov/instructions/i1040sc                                                                                                                                    |
| box_6_medical_payments             | Schedule C (gross receipts for the medical provider recipient)                                                                              | Provider's gross receipts from medical services. Flows: Schedule C net → Schedule 1 Line 3 → Form 1040 Line 8                                                                                                                                                                                                   | Schedule SE if sole proprietor                                              | None                                          | i1099mec Box 6; i1040sc instructions                                  | https://www.irs.gov/instructions/i1040sc                                                                                                                                    |
| box_7_direct_sales                 | No flow — checkbox only                                                                                                                     | Informational indicator. No tax computation. Engine stores as boolean but does not route to any form.                                                                                                                                                                                                           | None                                                                        | N/A                                           | i1099mec Box 7                                                        | https://www.irs.gov/instructions/i1099mec                                                                                                                                   |
| box_8_substitute_payments          | Schedule 1, Part I, Line 8z (Other income)                                                                                                  | Added to Line 8z total → Schedule 1 Line 9 → Form 1040 Line 8. Not subject to SE tax (investment income).                                                                                                                                                                                                       | None                                                                        | None                                          | i1099mec Box 8; Schedule 1 instructions                               | https://www.irs.gov/instructions/i1099mec                                                                                                                                   |
| box_9_crop_insurance               | Schedule F, Line 6a (Crop insurance proceeds received in current year)                                                                      | Farm income; flows: Schedule F net → Schedule 1 Line 6 → Form 1040 Line 8                                                                                                                                                                                                                                       | Schedule SE (SE tax on farm income); potential deferral election on Line 6c | Deferral election available under IRC §451(d) | i1099mec Box 9; i1040sf instructions, Lines 6a–6d                     | https://www.irs.gov/instructions/i1040sf                                                                                                                                    |
| box_10_attorney_proceeds           | Schedule 1, Line 8z (if taxable) — OR excluded (if physical injury under IRC §104)                                                          | Only taxable portion reported. Physical injury/sickness damages: excluded, not entered. Other settlements, punitive damages, emotional distress (not physical): → Schedule 1 Line 8z → Form 1040 Line 8. Deductible attorney fees: may be above-the-line deduction on Schedule 1 Line 24b under IRC §62(a)(20). | None (potential Form 1040 if qualifying attorney fee deduction exists)      | None                                          | i1099mec Box 10; IRC §104(a)(2); IRC §62(a)(20)                       | https://www.irs.gov/instructions/i1099mec                                                                                                                                   |
| box_11_fish_purchased              | Schedule C (gross receipts for fish dealer/reseller)                                                                                        | Gross receipts from fish purchasing/resale business. Flows: Schedule C net → Schedule 1 Line 3 → Form 1040 Line 8                                                                                                                                                                                               | Schedule SE                                                                 | None                                          | i1099mec Box 11; i1040sc instructions                                 | https://www.irs.gov/instructions/i1040sc                                                                                                                                    |
| box_12_section_409a_deferrals      | No flow to current-year tax return unless plan fails §409A                                                                                  | Informational only. Amount is NOT includible in income in current year if plan complies with §409A. If plan fails §409A, amounts become includible → see box_15_nqdc routing.                                                                                                                                   | None for current year if plan compliant                                     | None                                          | i1099mec Box 12; IRC §409A                                            | https://www.irs.gov/instructions/i1099mec                                                                                                                                   |
| box_13_fatca                       | No flow                                                                                                                                     | Administrative checkbox. No tax computation. Engine stores as boolean.                                                                                                                                                                                                                                          | None                                                                        | N/A                                           | i1099mec Box 13                                                       | https://www.irs.gov/instructions/i1099mec                                                                                                                                   |
| box_14_reserved                    | No flow                                                                                                                                     | Reserved for future use in TY2025. If non-zero amount present, flag as data error — payer may have used old form.                                                                                                                                                                                               | None                                                                        | N/A                                           | i1099mec; TY2025 form revisions                                       | https://www.irs.gov/instructions/i1099mec                                                                                                                                   |
| box_15_nqdc                        | (1) Schedule 1, Line 8z (ordinary income) + (2) Schedule 2, Line 17h (20% additional §409A tax)                                             | Amount is ordinary income (→ Schedule 1 Line 8z → Form 1040 Line 8) PLUS 20% additional excise tax (→ Schedule 2 Line 17h → Form 1040 Line 17). Additionally, interest at underpayment rate + 1% applies.                                                                                                       | Schedule 2 Line 17h; Form 1040 Line 17                                      | None on income; 20% excise on Box 15 amount   | i1099mec Box 15; IRC §409A(a)(1)(B); Schedule 2 Line 17h instructions | https://taxinstructions.net/schedule-2-form-1040/                                                                                                                           |
| box_16_state_tax_withheld          | State tax return only                                                                                                                       | No federal Form 1040 impact. Applied as credit on state return.                                                                                                                                                                                                                                                 | None                                                                        | None                                          | i1099mec Boxes 16–18                                                  | https://www.irs.gov/instructions/i1099mec                                                                                                                                   |
| box_17_state_payer_id              | State tax return only                                                                                                                       | Payer identification for state filing. No federal impact.                                                                                                                                                                                                                                                       | None                                                                        | None                                          | i1099mec Boxes 16–18                                                  | https://www.irs.gov/instructions/i1099mec                                                                                                                                   |
| box_18_state_income                | State tax return only                                                                                                                       | State income base for withholding. No federal impact.                                                                                                                                                                                                                                                           | None                                                                        | None                                          | i1099mec Boxes 16–18                                                  | https://www.irs.gov/instructions/i1099mec                                                                                                                                   |

---

## Calculation Logic

### Step 1 — Collect all 1099-MISC instances for the taxpayer

The engine may receive multiple 1099-MISC records (one per payer). Each is a
separate node instance. All amounts flowing to the same destination are summed.

### Step 2 — Box 1 (Rents) → Schedule E or Schedule C

**Determination:** Does this rental activity involve providing significant
services to tenants (beyond furnishing heat, light, cleaning of public areas,
trash collection)?

- If **NO (typical rental):** Report on **Schedule E, Part I, Line 3** (Rents
  received).
  - Flow: Schedule E, Part I, Line 3 → Schedule E Line 23a (total rents) →
    Schedule E Line 26 (total income/loss) → Schedule 1 Line 5 → Form 1040
    Line 8.
- If **YES (substantial services, e.g., maid service, hotel-style):** Report on
  **Schedule C** as gross receipts.
  - Flow: Schedule C gross receipts → Schedule C net profit → Schedule 1 Line 3
    → Form 1040 Line 8.
  - Also triggers **Schedule SE** for self-employment tax.

> **Source:** IRS Instructions for Schedule E (2025), Line 3 — "if you provided
> significant services to the renter, such as maid service, report the rental
> activity on Schedule C, not on Schedule E. Significant services do not include
> the furnishing of heat and light, cleaning of public areas, trash collection,
> or similar services." — https://www.irs.gov/instructions/i1040se

### Step 3 — Box 2 (Royalties) → Schedule E or Schedule C

**Determination:** Does the taxpayer receive royalties in the ordinary course of
an active trade or business?

- If **YES (professional author, songwriter, performing artist, professional
  photographer, inventor operating as a business):** Report on **Schedule C** as
  gross receipts.
  - Flow: Schedule C gross receipts → Schedule C net → Schedule 1 Line 3 → Form
    1040 Line 8.
  - Triggers **Schedule SE**.
- If **NO (passive/investment royalties — oil/gas interest holder, copyright
  owner not actively creating, patent licensor not in trade or business):**
  Report on **Schedule E, Part I, Line 4** (Royalties received).
  - Flow: Schedule E Line 4 → Schedule E Line 24a (total royalties) → Schedule E
    Line 26 → Schedule 1 Line 5 → Form 1040 Line 8.
  - **No** self-employment tax.

> **Source:** IRS Instructions for Schedule E (2025), Line 4 — "Report on line 4
> royalties from oil, gas, or mineral properties (not including operating
> interests); copyrights; name, image, and likeness (NIL) rights." Drake KB via
> taxslayerpro.com — "If the source of the royalty is derived in the ordinary
> course of the operation of a taxpayer's active trade or business activity,
> then the royalty income is reported as part of the gross revenue on a Schedule
> C." — https://www.irs.gov/instructions/i1040se

### Step 4 — Box 3 (Other Income) → Schedule 1 Line 8i or 8z

**Sub-determination:** What is the nature of the Box 3 income?

**4a. Prizes and awards** (contest winnings, sweepstakes, game show prizes, quiz
show prizes, Segal AmeriCorps Education Awards):

1. Check: is this prize excludable? Nobel, Pulitzer, and similar prizes are
   excludable from income **if** winner assigns the prize to a governmental unit
   or charitable organization without using the amount. Employee achievement
   awards up to $1,600 (qualified plan) or $400 (nonqualified plan) in tangible
   personal property are excludable.
2. If taxable prize: Report on **Schedule 1 Line 8i** (Prizes and awards).
3. Flow: Schedule 1 Line 8i → Line 9 (Total other income, Line 8a–8z) → Form
   1040 Line 8.

**4b. Other non-prize Box 3 income** (damages for nonphysical injuries,
termination payments, grant payments, medical research payments, Tax Receivable
Agreement payments):

1. Check: is this physical injury/sickness compensation? If YES → **excluded**
   under IRC §104(a)(2), do not enter as income.
2. If taxable other income: Report on **Schedule 1 Line 8z** (Other income —
   attach statement identifying source as "1099-MISC Box 3").
3. Flow: Schedule 1 Line 8z → Line 9 → Form 1040 Line 8.

> **Source:** IRS FAQ —
> https://www.irs.gov/faqs/interest-dividends-other-types-of-income/1099-misc-independent-contractors-and-self-employed/1099-misc-independent-contractors-and-self-employed-5;
> IRS Pub. 525 (2025) — https://www.irs.gov/publications/p525; IRC §104(a)(2)

### Step 5 — Box 4 (Federal Income Tax Withheld) → Form 1040 Line 25b

1. Take `box_4_federal_withheld` from each 1099-MISC instance.
2. Sum across all 1099-MISC instances.
3. Report total on **Form 1040, Line 25b** ("Federal income tax withheld —
   Form(s) 1099").
4. This is a payment/credit that reduces net tax owed. If total payments exceed
   total tax liability, creates a refund.
5. Note: Line 25b aggregates withholding from ALL information returns (1099-INT,
   1099-DIV, 1099-MISC, etc.) — not just 1099-MISC.

> **Source:** IRS Form 1040 Instructions (2025), Line 25b —
> https://www.irs.gov/instructions/i1040gi

### Step 6 — Box 5 (Fishing Boat Proceeds) → Schedule C → Schedule SE

1. Fishing boat crew members are treated as self-employed.
2. Report `box_5_fishing_boat` as gross receipts on **Schedule C**.
3. Deduct any allowable business expenses on Schedule C.
4. Schedule C net profit → **Schedule 1 Line 3** → Form 1040 Line 8.
5. **Also:** Schedule C net profit → **Schedule SE** (self-employment tax) →
   Schedule 2 Line 4 → Form 1040 Line 17.

> **Source:** IRS Instructions for Form 1099-MISC, Box 5 —
> https://www.irs.gov/instructions/i1099mec; Schedule C instructions —
> https://www.irs.gov/instructions/i1040sc

### Step 7 — Box 6 (Medical and Health Care Payments) → Schedule C

1. This box is filled in by the payer (insurance company, business) when paying
   a physician or health care provider.
2. The **recipient** (physician/provider) reports these as gross receipts on
   **Schedule C**.
3. Schedule C net → Schedule 1 Line 3 → Form 1040 Line 8.
4. If provider is a sole proprietor: also flows to **Schedule SE**.

> **Source:** IRS Instructions for Form 1099-MISC, Box 6 —
> https://www.irs.gov/instructions/i1099mec

### Step 8 — Box 8 (Substitute Payments) → Schedule 1 Line 8z

1. Substitute payments in lieu of dividends or tax-exempt interest (received by
   a broker on the taxpayer's behalf due to a securities lending arrangement).
2. Report on **Schedule 1, Part I, Line 8z** (Other income — attach statement).
3. Flow: Schedule 1 Line 8z → Line 9 → Form 1040 Line 8.
4. Not subject to self-employment tax.

> **Source:** IRS Instructions for Form 1099-MISC, Box 8 —
> https://www.irs.gov/instructions/i1099mec

### Step 9 — Box 9 (Crop Insurance Proceeds) → Schedule F

1. Report on **Schedule F, Line 6a** (Crop insurance proceeds received in
   [current year]).
2. Flow: Schedule F net → Schedule 1 Line 6 → Form 1040 Line 8.
3. Also triggers **Schedule SE** (farm SE tax).

**Deferral election (IRC §451(d)):**

- A cash-method farmer may elect to include the proceeds in income in the
  **following** tax year instead of the current year if:
  - (a) Crop was damaged during the current year, AND
  - (b) Under the farmer's normal business practice, the damaged crop would have
    been sold in the following tax year.
- Election: Check the box on **Schedule F, Line 6c** and attach a written
  statement to the timely filed return (including extensions).
- The election must cover ALL crop insurance proceeds from a single trade or
  business (cannot cherry-pick).
- Deferred amounts are reported in the following year on Schedule F Line 6d.

> **Source:** IRS Instructions for Schedule F (2025), Lines 6a–6d —
> https://www.irs.gov/instructions/i1040sf; IRC §451(d); Treas. Reg. §1.451-6

### Step 10 — Box 10 (Gross Proceeds Paid to Attorney) → Schedule 1 Line 8z or Excluded

1. Determine taxability of the underlying payment:
   - **Physical injury or sickness damages** (IRC §104(a)(2)): Fully excluded
     from gross income. Do NOT report as income. The fact that it was paid
     through an attorney does not make it taxable.
   - **Punitive damages, emotional distress not from physical injury, most other
     lawsuit settlements**: Taxable.
   - **Attorney fees paid from settlement**: If the settlement funds flow to the
     attorney for their fee from a taxable settlement, the attorney must report
     it as gross receipts. The claimant receiving the underlying settlement may
     deduct legal fees paid in connection with certain claims above-the-line
     under IRC §62(a)(20) on Schedule 1 Line 24b.
2. If taxable: Report on **Schedule 1, Part I, Line 8z** (Other income).
3. Flow: Schedule 1 Line 8z → Line 9 → Form 1040 Line 8.

> **Source:** IRS Instructions for Form 1099-MISC, Box 10 —
> https://www.irs.gov/instructions/i1099mec; IRC §104(a)(2); IRC §62(a)(20)

### Step 11 — Box 11 (Fish Purchased for Resale) → Schedule C

1. Report as gross receipts on **Schedule C** for the fish dealer/reseller.
2. Flow: Schedule C net → Schedule 1 Line 3 → Form 1040 Line 8.
3. Also triggers **Schedule SE** if sole proprietor.

> **Source:** IRS Instructions for Form 1099-MISC, Box 11 —
> https://www.irs.gov/instructions/i1099mec

### Step 12 — Box 12 (Section 409A Deferrals) — Informational Only

1. `box_12_section_409a_deferrals` represents amounts deferred under a
   nonqualified deferred compensation plan.
2. **No current-year income recognition** if the plan complies with §409A.
3. If the plan subsequently **fails** §409A requirements, the deferred amounts
   become includible — that failure is reported on Box 15 (not Box 12). Box 12
   itself has no tax routing in a compliant plan.
4. Engine stores this value for informational purposes and audit support.

> **Source:** IRS Instructions for Form 1099-MISC, Box 12; IRC §409A —
> https://www.irs.gov/instructions/i1099mec

### Step 13 — Box 15 (Nonqualified Deferred Compensation — §409A Failure) → Schedule 1 + Schedule 2

1. Box 15 represents amounts that failed §409A requirements and are NOW
   includible in gross income.
2. **Ordinary income component:**
   - Report on **Schedule 1, Part I, Line 8z** (Other income — attach statement
     identifying as "§409A failure").
   - Flow: Schedule 1 Line 8z → Line 9 → Form 1040 Line 8.
3. **Additional 20% excise tax:**
   - Apply 20% × Box 15 amount.
   - Report on **Schedule 2, Line 17h** ("Income from nonqualified deferred
     compensation plans failing to meet section 409A requirements").
   - Flow: Schedule 2 Line 17h → Schedule 2 Line 18 (sum of 17a–17z) → Schedule
     2 Line 21 → Form 1040 Line 17.
4. **Interest penalty:**
   - Interest at the underpayment rate + 1 percentage point also applies. This
     interest is calculated and reported separately (typically by the
     employer/payer on a W-2 Box 12 Code Z, but if reported on 1099-MISC Box 15,
     the recipient must compute and report the interest penalty as well).
5. Do NOT double-count: amounts in Box 15 must not have already been included in
   wages (W-2 Box 1) or in a prior-year 1099-MISC.

> **Source:** IRC §409A(a)(1)(B)(i) and (ii); IRS Instructions for Form
> 1099-MISC, Box 15; Schedule 2 instructions, Line 17h —
> https://taxinstructions.net/schedule-2-form-1040/

---

## Constants & Thresholds (Tax Year 2025)

| Constant                                                  | Value                                  | Source                                | URL                                             |
| --------------------------------------------------------- | -------------------------------------- | ------------------------------------- | ----------------------------------------------- |
| Box 1 (Rents) reporting threshold                         | $600                                   | i1099mec, Box 1                       | https://www.irs.gov/instructions/i1099mec       |
| Box 2 (Royalties) reporting threshold                     | $10                                    | i1099mec, Box 2                       | https://www.irs.gov/instructions/i1099mec       |
| Box 3 (Other income) reporting threshold                  | $600                                   | i1099mec, Box 3                       | https://www.irs.gov/instructions/i1099mec       |
| Box 4 (Federal withholding) backup withholding rate       | 24%                                    | IRC §3406; IRS Topic No. 307          | https://www.irs.gov/taxtopics/tc307             |
| Box 5 (Fishing boat proceeds) reporting threshold         | $600                                   | i1099mec, Box 5                       | https://www.irs.gov/instructions/i1099mec       |
| Box 6 (Medical payments) reporting threshold              | $600                                   | i1099mec, Box 6                       | https://www.irs.gov/instructions/i1099mec       |
| Box 7 (Direct sales) indicator threshold                  | $5,000                                 | i1099mec, Box 7                       | https://www.irs.gov/instructions/i1099mec       |
| Box 8 (Substitute payments) reporting threshold           | $10 aggregate                          | i1099mec, Box 8                       | https://www.irs.gov/instructions/i1099mec       |
| Box 9 (Crop insurance) reporting threshold                | $600                                   | i1099mec, Box 9                       | https://www.irs.gov/instructions/i1099mec       |
| Box 10 (Attorney proceeds) reporting threshold            | $600                                   | i1099mec, Box 10                      | https://www.irs.gov/instructions/i1099mec       |
| Box 11 (Fish purchased) reporting threshold               | $600                                   | i1099mec, Box 11                      | https://www.irs.gov/instructions/i1099mec       |
| §409A additional excise tax rate (Box 15)                 | 20% of includible amount               | IRC §409A(a)(1)(B)(i)                 | https://www.irs.gov/instructions/i1099mec       |
| §409A interest penalty rate                               | Underpayment rate + 1 percentage point | IRC §409A(a)(1)(B)(ii)                | https://www.law.cornell.edu/uscode/text/26/409A |
| Employee achievement award exclusion (qualified plan)     | $1,600 per year                        | IRC §74(c); IRS Pub. 525              | https://www.irs.gov/publications/p525           |
| Employee achievement award exclusion (non-qualified plan) | $400 per year                          | IRC §74(c); IRS Pub. 525              | https://www.irs.gov/publications/p525           |
| E-file threshold (payer obligation, not recipient)        | 10+ information returns (aggregate)    | IRC §6011(e); Treas. Reg. §301.6011-2 | https://www.irs.gov/instructions/i1099mec       |

---

## Data Flow Diagram

```mermaid
flowchart LR
  subgraph inputs["Upstream Inputs"]
    PAYER[Payer / issuer\nwho made payments]
    PRIOR_NQDC[Prior-year NQDC\ndeferred amount\n(Box 12 context)]
  end

  subgraph screen["1099-MISC Screen (99M)"]
    BOX1[Box 1: Rents]
    BOX2[Box 2: Royalties]
    BOX3[Box 3: Other Income]
    BOX4[Box 4: Federal Withheld]
    BOX5[Box 5: Fishing Boat Proceeds]
    BOX6[Box 6: Medical Payments]
    BOX7[Box 7: Direct Sales checkbox]
    BOX8[Box 8: Substitute Payments]
    BOX9[Box 9: Crop Insurance]
    BOX10[Box 10: Attorney Proceeds]
    BOX11[Box 11: Fish Purchased]
    BOX12[Box 12: §409A Deferrals]
    BOX13[Box 13: FATCA checkbox]
    BOX15[Box 15: NQDC §409A failure]
    BOX16_18[Boxes 16–18: State info]
  end

  subgraph outputs["Downstream"]
    SCH_E_P1L3[Schedule E Part I Line 3\nRents received]
    SCH_E_P1L4[Schedule E Part I Line 4\nRoyalties received]
    SCH_C_RENTS[Schedule C\nGross receipts\nif substantial services]
    SCH_C_ROY[Schedule C\nGross receipts\nif trade/business royalties]
    SCH_C_FISH[Schedule C\nGross receipts\nfishing crew]
    SCH_C_MED[Schedule C\nGross receipts\nmedical provider]
    SCH_C_FISHBUY[Schedule C\nGross receipts\nfish dealer]
    SCH1_L8I[Schedule 1 Line 8i\nPrizes and awards]
    SCH1_L8Z[Schedule 1 Line 8z\nOther income]
    F1040_25B[Form 1040 Line 25b\nFed tax withheld — 1099s]
    SCH_F_L6A[Schedule F Line 6a\nCrop insurance proceeds]
    SCH2_L17H[Schedule 2 Line 17h\n§409A additional tax]
    STATE[State Tax Return]
    INFO_ONLY[Informational only —\nno tax routing]
  end

  PAYER --> BOX1
  PAYER --> BOX2
  PAYER --> BOX3
  PAYER --> BOX4
  PAYER --> BOX5
  PAYER --> BOX6
  PAYER --> BOX7
  PAYER --> BOX8
  PAYER --> BOX9
  PAYER --> BOX10
  PAYER --> BOX11
  PAYER --> BOX12
  PAYER --> BOX13
  PAYER --> BOX15
  PRIOR_NQDC --> BOX12

  BOX1 -->|"typical rental\n(no significant services)"| SCH_E_P1L3
  BOX1 -->|"significant services\n(maid, hotel-style)"| SCH_C_RENTS

  BOX2 -->|"passive/investment\n(oil/gas, copyright investor)"| SCH_E_P1L4
  BOX2 -->|"active trade/business\n(pro author, songwriter)"| SCH_C_ROY

  BOX3 -->|"prizes / awards"| SCH1_L8I
  BOX3 -->|"other non-prize income\n(damages, grants, etc.)"| SCH1_L8Z
  BOX3 -->|"physical injury\ndamages (IRC §104)"| INFO_ONLY

  BOX4 --> F1040_25B

  BOX5 --> SCH_C_FISH

  BOX6 --> SCH_C_MED

  BOX7 --> INFO_ONLY

  BOX8 --> SCH1_L8Z

  BOX9 -->|"current year\n(no deferral election)"| SCH_F_L6A
  BOX9 -->|"deferral election\n(IRC §451(d))"| INFO_ONLY

  BOX10 -->|"taxable settlement\nor attorney fee"| SCH1_L8Z
  BOX10 -->|"physical injury\n(IRC §104)"| INFO_ONLY

  BOX11 --> SCH_C_FISHBUY

  BOX12 --> INFO_ONLY

  BOX13 --> INFO_ONLY

  BOX15 --> SCH1_L8Z
  BOX15 --> SCH2_L17H

  BOX16_18 --> STATE
```

---

## Edge Cases & Special Rules

### Box 1 Rents: Substantial Services Test (Schedule C vs. Schedule E)

The distinction is whether significant services are rendered primarily for the
tenant's convenience:

- **Schedule E (passive rental):** Furnishing heat, light, cleaning of public
  areas, trash collection, water — these are NOT significant services. Standard
  landlord duties → Schedule E.
- **Schedule C (active business):** Providing maid service, hotel-style
  amenities, food service, or other services that go beyond normal landlord
  duties → Schedule C + Schedule SE.

> **Source:** IRS Instructions for Schedule E (2025) —
> https://www.irs.gov/instructions/i1040se

### Box 2 Royalties: Trade or Business vs. Investment Determination

The test is whether the royalties are "derived in the ordinary course of the
operation of a taxpayer's active trade or business":

- **Schedule C examples:** Professional authors receiving book royalties as
  their business; performing artists receiving royalties from their recordings;
  professional photographers.
- **Schedule E examples:** An investor who holds a patent license as a passive
  investment; a mineral rights owner (not in the mining business) receiving
  oil/gas royalties; an individual who wrote a book decades ago and now receives
  passive residual royalties.

Note: **Name, image, and likeness (NIL) rights** royalties (new category) are
reported on Schedule E Part I Line 4 unless received in a trade or business
context.

> **Source:** IRS Instructions for Schedule E (2025), Line 4 —
> https://www.irs.gov/instructions/i1040se; TaxSlayer Pro guidance

### Box 3: Nobel, Pulitzer, and Similar Prize Exclusion

Under IRC §74(b), prizes awarded in recognition of religious, charitable,
scientific, artistic, educational, literary, or civic achievement are excludable
from income IF:

1. The recipient was selected without any action on their part,
2. The recipient is not required to render substantial future services, AND
3. The prize is transferred by the payer directly to a governmental unit or
   charitable organization designated by the recipient (without the recipient
   ever having control of the funds).

If all three conditions are met: **excluded**, do not report as income.

> **Source:** IRC §74(b); IRS Pub. 525 (2025) —
> https://www.irs.gov/publications/p525

### Box 3: Employee Achievement Awards

Tangible personal property awards for length of service or safety (NOT cash,
gift cards, or equivalent) are excludable up to:

- $1,600 for qualified plan awards (aggregate from all employers in the year)
- $400 for non-qualified plan awards

Amounts exceeding these limits are taxable income on Form W-2 Box 1 (or
1099-MISC Box 3 if not an employee). Disqualifying categories: length-of-service
awards for < 5 years, safety awards given to managers/clerical employees, or
when >10% of eligible employees previously received them.

> **Source:** IRC §74(c); IRS Pub. 525 (2025) —
> https://www.irs.gov/publications/p525

### Box 4: Backup Withholding — When Applied

Backup withholding at 24% is applied by the payer when:

1. The payee fails to furnish a TIN (BWH-B program), OR
2. The IRS notifies the payer that the TIN is incorrect (BWH-B), OR
3. The IRS notifies the payer to withhold because the payee underreported
   interest/dividend income on their return and failed to certify they are not
   subject to backup withholding (BWH-C program, after 4 IRS notices over ≥120
   days).

The Box 4 amount reported on 1099-MISC flows to Form 1040 Line 25b as a federal
tax payment.

> **Source:** IRC §3406; IRS Topic No. 307 — https://www.irs.gov/taxtopics/tc307

### Box 9: Crop Insurance Deferral Election

Under IRC §451(d) and Treas. Reg. §1.451-6, a cash-method farmer may defer crop
insurance proceeds to the following tax year if:

1. The damage occurred in the current tax year.
2. Under the farmer's normal business practice, the crop would have been sold in
   the **following** tax year.

**How to elect:**

- Check box on Schedule F, **Line 6c**.
- Attach a written statement to the return (by the due date including
  extensions) stating: (a) the taxpayer is electing to defer; (b) evidence that
  the crop would normally have been sold in the following year.
- **All-or-nothing:** Must defer ALL eligible crop insurance proceeds from a
  single trade or business (cannot defer some and include others).
- Deferred amounts from the prior year are included in the following year's
  Schedule F Line 6d.

> **Source:** IRS Instructions for Schedule F (2025), Lines 6a–6d —
> https://www.irs.gov/instructions/i1040sf; IRC §451(d)

### Box 10: Physical Injury Exclusion Under IRC §104

The key question for Box 10 (and Box 3 when damages are reported there): is the
underlying payment for physical injury or sickness?

- **Excludable:** Compensatory damages for physical injury or sickness —
  including medical expenses, lost wages arising from the physical injury.
- **Taxable:** Punitive damages (even in physical injury case), emotional
  distress not originating from physical injury, damages for nonphysical
  injuries (employment discrimination, breach of contract).
- **Attorney fee deduction:** If the settlement is taxable and the taxpayer paid
  attorney fees to obtain the settlement, IRC §62(a)(20) allows an
  above-the-line deduction of attorney fees on **Schedule 1 Line 24b** for
  discrimination claims and related claims. Not available for all settlement
  types.

> **Source:** IRC §104(a)(2); IRC §62(a)(20); IRS Pub. 525 (2025) —
> https://www.irs.gov/publications/p525

### Box 14: Reserved for Future Use (TY2025)

Box 14 on Form 1099-MISC is labeled "Reserved for future use" in TY2025. Prior
to 2025, it was used to report **excess golden parachute payments**. Effective
TY2025, excess golden parachute payments must be reported on **Form 1099-NEC,
Box 3** instead. If a 1099-MISC is received with a Box 14 amount, it was likely
issued on an outdated form — treat as a data error and follow up with the payer.

> **Source:** IRS form change announcement; Sage Intacct 2025 Release Notes —
> https://www.intacct.com/ia/docs/en_US/releasenotes/2025/2025_Release_4/Tax/2025-R4-1099-box-migration.htm;
> IRS Instructions for Forms 1099-MISC and 1099-NEC (Rev. April 2025)

### Box 15: §409A Failure — Double Tax Impact

When a nonqualified deferred compensation plan fails to comply with §409A, the
consequences are:

1. **Income inclusion:** All deferred amounts become includible in income in the
   year of failure (ordinary income on Schedule 1 Line 8z).
2. **Additional tax:** 20% excise tax on the amount included (Schedule 2 Line
   17h).
3. **Interest:** Premium interest at the underpayment rate + 1% applies for the
   period of deferral.

The amount in Box 15 should not duplicate amounts already included in:

- Box 3 of the same 1099-MISC
- W-2 Box 1 (wages) of the same year
- Prior-year Forms 1099-MISC, W-2, or W-2c

> **Source:** IRC §409A(a)(1); IRS Instructions for Form 1099-MISC, Box 15 —
> https://www.irs.gov/instructions/i1099mec

### Multiple Payers / Multiple 1099-MISC Instances

When the taxpayer receives multiple 1099-MISC forms:

- Each form is a separate instance of screen 99M.
- Drake's **MFC (Multi-form code)** field must be set when there are multiple
  Schedule C, E, or F instances to ensure each 1099-MISC links to the correct
  business/rental/farm.
- Failure to set MFC routes all amounts to the first schedule instance by
  default.
- Box 4 (federal withholding) is always summed across all instances regardless
  of MFC.

> **Source:** Drake KB — https://kb.drakesoftware.com/kb/Drake-Tax/11610.htm

### Filing Status Interactions

Box 3 prizes, Box 8 substitute payments, Box 10 attorney proceeds, and Box 15
NQDC income are not affected by filing status — they are ordinary income summed
across spouses for MFJ.

Box 9 crop insurance deferral election: on a joint return with separate farming
operations, the election applies per "trade or business" — a spouse with a
separate farming operation may have a separate election.

---

## Sources

All URLs verified to resolve.

| Document                                                | Year            | Section                                                | URL                                                                                                                                                                         | Saved as          |
| ------------------------------------------------------- | --------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| IRS Instructions for Forms 1099-MISC and 1099-NEC       | Rev. April 2025 | All boxes (payer instructions)                         | https://www.irs.gov/instructions/i1099mec                                                                                                                                   | .research/docs/i1099mec.pdf |
| IRS Form 1099-MISC (blank form, Rev. April 2025)        | 2025            | Full form layout                                       | https://www.irs.gov/pub/irs-pdf/f1099msc.pdf                                                                                                                                | .research/docs/f1099msc.pdf |
| IRS Schedule 1 (Form 1040)                              | 2025            | Lines 1–10, 8a–8z                                      | https://www.irs.gov/pub/irs-pdf/f1040s1.pdf                                                                                                                                 | .research/docs/f1040s1.pdf  |
| IRS Schedule 2 (Form 1040)                              | 2025            | Lines 17a–17z, Line 21                                 | https://www.irs.gov/pub/irs-pdf/f1040s2.pdf                                                                                                                                 | .research/docs/f1040s2.pdf  |
| IRS Schedule E Instructions                             | 2025            | Part I Lines 3, 4                                      | https://www.irs.gov/instructions/i1040se                                                                                                                                    | — (HTML only)     |
| IRS Schedule F Instructions                             | 2025            | Lines 6a–6d (crop insurance)                           | https://www.irs.gov/instructions/i1040sf                                                                                                                                    | — (HTML only)     |
| IRS Schedule C Instructions                             | 2025            | General gross receipts                                 | https://www.irs.gov/instructions/i1040sc                                                                                                                                    | — (HTML only)     |
| IRS Form 1040 Instructions                              | 2025            | Line 25b (withholding), Line 8                         | https://www.irs.gov/instructions/i1040gi                                                                                                                                    | — (HTML only)     |
| IRS Publication 525 (Taxable and Nontaxable Income)     | 2025            | Prizes, awards, employee achievement awards, IRC §104  | https://www.irs.gov/publications/p525                                                                                                                                       | .research/docs/p525.pdf     |
| IRS Publication 550 (Investment Income and Expenses)    | 2024            | Royalties section                                      | https://www.irs.gov/pub/irs-pdf/p550.pdf                                                                                                                                    | .research/docs/p550.pdf     |
| IRS Topic No. 307 — Backup Withholding                  | 2025            | Full topic                                             | https://www.irs.gov/taxtopics/tc307                                                                                                                                         | — (HTML only)     |
| Drake KB — Guide to 1098 and 1099 Informational Returns | —               | 1099-MISC section                                      | https://kb.drakesoftware.com/kb/Drake-Tax/11742.htm                                                                                                                         | — (HTML only)     |
| Drake KB — Schedule C: Multiple 1099-MISC/1099-NEC      | —               | MFC field usage                                        | https://kb.drakesoftware.com/kb/Drake-Tax/11610.htm                                                                                                                         | — (HTML only)     |
| Schedule 2 Line-by-Line Instructions                    | 2025            | Line 17h (§409A)                                       | https://taxinstructions.net/schedule-2-form-1040/                                                                                                                           | — (HTML only)     |
| TeachMePersonalFinance — IRS Schedule 1 Instructions    | 2025            | Lines 1–10, 8a–8z                                      | https://www.teachmepersonalfinance.com/irs-schedule-1-instructions/                                                                                                         | — (HTML only)     |
| IRS FAQ — 1099-MISC, Box 3, Prizes (FAQ #5)             | 2025            | Box 3 prizes → Sch 1 Line 8i                           | https://www.irs.gov/faqs/interest-dividends-other-types-of-income/1099-misc-independent-contractors-and-self-employed/1099-misc-independent-contractors-and-self-employed-5 | — (HTML only)     |
| Sage Intacct — 1099 Box Migration TY2025                | 2025            | Box 14 moved; excess golden parachute → 1099-NEC Box 3 | https://www.intacct.com/ia/docs/en_US/releasenotes/2025/2025_Release_4/Tax/2025-R4-1099-box-migration.htm                                                                   | — (HTML only)     |

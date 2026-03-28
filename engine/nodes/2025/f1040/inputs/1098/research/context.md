# Form 1098 — Mortgage Interest Statement

## Overview

The Form 1098 screen captures mortgage interest information reported by lenders to both the IRS and the borrower. It is the primary data-entry point for home mortgage interest, points paid on purchase, and mortgage insurance premiums. The screen's output destination is controlled by the **FOR** dropdown: entries routed to Schedule A feed the itemized deduction for qualified residence interest; entries routed to Schedule E, C, or Form 8829 feed business or rental property interest deductions.

When the outstanding principal (Box 2) exceeds the applicable loan limit ($750,000 for loans originated after 12/15/2017, $1,000,000 for loans originated before 12/16/2017), the Drake DEDM screen must be used instead of the 1098 screen — the 1098 screen cannot compute a partial deduction. The DEDM screen generates worksheet Wks DEDINT.

**Mortgage insurance premiums (Box 5) are NOT deductible for tax year 2025.** The deduction expired after TY2021 and the OBBBA reinstatement applies only to tax years beginning after 2025 (i.e., TY2026+). Box 5 should be collected for informational purposes but produces no tax effect for TY2025.

**IRS Form:** 1098 (Mortgage Interest Statement)
**Drake Screen:** 1098
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/kb/Drake-Tax/10641.htm (Deduction Limitation); https://kb.drakesoftware.com/kb/Drake-Tax/11513.htm (Mortgage Insurance Premiums); https://kb.drakesoftware.com/kb/Drake-Tax/13229.htm (Splitting Interest)

---

## Data Entry Fields

Required fields first, then optional. Data-entry only — no computed/display fields.

| Field | Type | Required | Drake Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | ----------- | ----------- | ------------- | --- |
| for_dropdown | enum | yes | "For" | Destination schedule/form. Valid values: `A` (Schedule A), `C` (Schedule C), `E` (Schedule E), `8829` (Form 8829). Determines where all amounts from this 1098 entry flow. Multiple 1098 entries are required when interest must be split across schedules. | Drake KB 13229 | https://kb.drakesoftware.com/kb/Drake-Tax/13229.htm |
| box_1_mortgage_interest | number | yes | "Box 1 — Mortgage interest" | Mortgage interest received by the lender from the borrower during the calendar year. Excludes government subsidies paid directly to the lender, seller-paid interest, and points. Includes prepayment penalties and late charges (unless the late charge is for a specific mortgage service). Dollar amount, two decimal places, minimum $0. | i1098.pdf Box 1 | https://www.irs.gov/instructions/i1098 |
| box_2_outstanding_principal | number | no | "Box 2 — Outstanding mortgage principal" | Principal balance on the mortgage as of January 1 of the tax year. If originated during the current tax year, use the principal at origination date. If lender acquired the mortgage during the current year, use the principal at acquisition date. Informational — used to determine whether the deduction limitation applies. | i1098.pdf Box 2 | https://www.irs.gov/instructions/i1098 |
| box_3_origination_date | date | no | "Box 3 — Mortgage origination date" | Date the mortgage originated with the original lender. This is the original loan date, not any refinance date or acquisition date if the lender later purchased the loan. Determines which loan limit applies: pre-12/16/2017 → $1M/$500K limit; post-12/15/2017 → $750K/$375K limit. Format: MM/DD/YYYY. | i1098.pdf Box 3 | https://www.irs.gov/instructions/i1098 |
| box_4_refund_overpaid | number | no | "Box 4 — Refund of overpaid interest" | Total reimbursement or credit of a prior year's overpaid interest, reported in the year the reimbursement is made (not the year the overpayment occurred). If refund received in a later year and taxpayer deducted the interest in the prior year, the refund is income. | i1098.pdf Box 4 | https://www.irs.gov/instructions/i1098 |
| box_5_mortgage_insurance | number | no | "Box 5 — Mortgage insurance premiums" | Total qualified mortgage insurance premiums paid during the year. Covers VA funding fees, FHA mortgage insurance, Rural Housing Service guarantee fees, and private mortgage insurance on contracts issued after 12/31/2006. **NOT deductible for TY2025** — deduction expired after TY2021; OBBBA reinstatement is effective only for tax years beginning after 2025. Collect for informational purposes only. | i1098.pdf Box 5; OBBBA (P.L. 119-21), signed 7/4/2025 | https://www.irs.gov/instructions/i1098 |
| box_6_points | number | no | "Box 6 — Points paid on purchase of principal residence" | Points paid directly by the borrower that meet all nine IRS criteria for immediate deductibility (see Calculation Logic). Only points on the purchase of the borrower's main home may be fully deducted in the year paid. Points on refinanced loans, second homes, or loans not meeting all criteria must be amortized over the loan term. | i1098.pdf Box 6; Pub 936 | https://www.irs.gov/instructions/i1098 |
| box_7_property_address_same | boolean | no | "Box 7 — Address same as payer's" | Checkbox indicating the mortgaged property address is the same as the borrower's mailing address. If true, Box 8 is not required. No tax calculation impact. | i1098.pdf Box 7 | https://www.irs.gov/instructions/i1098 |
| box_8_property_address | string | no | "Box 8 — Address or description of property" | Full street address (including apartment number), city, state, and ZIP of the mortgaged property, if different from borrower's mailing address. For properties without addresses, use jurisdiction plus Assessor Parcel Number or metes-and-bounds description. Max 39 characters per IRS e-file specs. No tax calculation impact. | i1098.pdf Box 8 | https://www.irs.gov/instructions/i1098 |
| box_9_number_of_properties | integer | no | "Box 9 — Number of mortgaged properties" | Total number of properties securing this mortgage when more than one property secures the single loan. Leave blank (or enter 1) if only one property. No tax calculation impact. | i1098.pdf Box 9 | https://www.irs.gov/instructions/i1098 |
| box_10_other | string | no | "Box 10 — Other" | Free-text from the lender. May contain real estate taxes paid from escrow, homeowner's insurance paid from escrow, or collection agent name. Informational only — not used in any tax calculation. Real estate taxes paid from escrow are entered separately on Schedule A line 5b if deductible. | i1098.pdf Box 10 | https://www.irs.gov/instructions/i1098 |
| box_11_acquisition_date | date | no | "Box 11 — Mortgage acquisition date" | Date the lender acquired this mortgage during the current calendar year, if the reporting lender is not the original lender. Leave blank if the reporting lender is the original lender. No tax calculation impact. Format: MM/DD/YYYY. | i1098.pdf Box 11 | https://www.irs.gov/instructions/i1098 |
| qualified_premiums_checkbox | boolean | no | "Qualified premiums" | Drake-specific checkbox. When Box 5 is populated and FOR = A: marks Box 5 as qualified mortgage insurance premiums. **Has no tax effect for TY2025** — mortgage insurance premium deduction is not available for TY2025. Do not rely on this checkbox to route Box 5 to Schedule A for TY2025. | Drake KB 11513 | https://kb.drakesoftware.com/kb/Drake-Tax/11513.htm |

---

## Per-Field Routing

| Field | Destination | How Used | Triggers | Limit / Cap | IRS Reference | URL |
| ----- | ----------- | -------- | -------- | ----------- | ------------- | --- |
| for_dropdown | Controls all downstream routing for this 1098 entry | All box amounts are routed to the selected schedule/form. To split interest between multiple schedules (e.g., $2,000 to Sch A and $3,000 to Sch E), create separate 1098 entries — one per destination. | — | — | Drake KB 13229 | https://kb.drakesoftware.com/kb/Drake-Tax/13229.htm |
| box_1_mortgage_interest | **If FOR=A:** Schedule A line 8a. **If FOR=E:** Schedule E line 12 ("Mortgage interest paid to banks, etc."). **If FOR=C:** Schedule C line 16a ("Mortgage interest paid to banks — Form 1098 received"). **If FOR=8829:** Form 8829 line 10 (itemizers) or line 16 (standard deduction filers). | Summed across all 1098 entries with the same FOR destination. If Box 2 exceeds the applicable loan limit, only the deductible portion (from DEDM/Wks DEDINT) flows to Sch A line 8a — the full Box 1 amount is NOT used directly. | If Box 2 > $750,000 (post-2017 loan) or Box 2 > $1,000,000 (pre-2017 loan) → user must use DEDM screen; 1098 screen amounts are ignored when DEDM is used. | $750,000 home acquisition debt (post-12/15/2017); $1,000,000 (pre-12/16/2017); $375,000/$500,000 for MFS | Pub 936 Table 1; i1040sca.pdf line 8a; i1040se.pdf line 12; i1040sc.pdf line 16a; i8829.pdf line 10/16 | https://www.irs.gov/publications/p936 |
| box_2_outstanding_principal | DEDM screen (Wks DEDINT, line 12) | Used to determine whether loan balance exceeds the applicable deduction limit, requiring the limitation worksheet. Not itself deductible. | Box 2 > $750,000 (post-2017) or Box 2 > $1,000,000 (pre-2017) → DEDM required | Informs limit only | Pub 936 Table 1; i1098.pdf Box 2 | https://www.irs.gov/publications/p936 |
| box_3_origination_date | DEDM screen (determines which limit column applies) | Date determines loan classification: originated on or before 12/15/2017 → grandfathered $1M/$500K limit; originated on or after 12/16/2017 → $750K/$375K limit. A binding contract exception applies: if contract executed before 12/15/2017 and home purchased before 4/1/2018, the pre-2017 limit applies. | Determines Pub 936 Table 1 Part I column used | $1M vs $750K limit | Pub 936 pp. 6–7 | https://www.irs.gov/publications/p936 |
| box_4_refund_overpaid | Reduces Box 1 deduction on Schedule A line 8a (if refund received in same year as interest paid). If refund is for a PRIOR year's overpayment → Schedule 1 (Form 1040) line 8z as income (up to the amount that reduced tax in the prior year). | If Box 4 ≤ Box 1 for same year: net Box 1 − Box 4 → Sch A line 8a. If Box 4 represents prior-year overpayment: include on Sch 1 line 8z as "tax benefit rule" income; do NOT net against current-year Box 1. | If Box 4 amount relates to prior-year overpayment → Schedule 1 line 8z income | None | Pub 936 (Box 4 treatment); Sch 1 line 8z | https://www.irs.gov/publications/p936 |
| box_5_mortgage_insurance | **TY2025: No deduction. Do not route to Schedule A.** Box 5 is collected for informational purposes only. For TY2026+, Box 5 routes to Schedule A line 8a as qualified residence interest (IRC §163(h)(3)(F), added by OBBBA). | TY2025: Informational only. | TY2025: None | TY2025: No deduction available | OBBBA (P.L. 119-21), signed 7/4/2025; IRS Pub 936 (2025) | https://www.irs.gov/publications/p936 |
| box_6_points | **If FOR=A AND purchase of main home AND all 9 criteria met:** Schedule A line 8a (fully deductible in year paid). **If FOR=A AND refinance:** Schedule A line 8a (amortized portion only — annual amortization = total points ÷ loan term in months × 12, deduct pro-rated amount for partial year). **If points are on a second home or investment property:** amortize over loan life regardless of circumstances. | For purchase: full deduction in year paid. For refinance: divide total points by loan term in months; deduct only the months elapsed in the tax year. If loan paid off early/refinanced again: remaining unamortized balance deductible in payoff year (unless same lender refinances, in which case amortize over new term). | All 9 criteria must be met for full purchase-year deduction | Purchase points fully deductible if all criteria met; refinance points amortized over loan life | Pub 936 pp. 9–10; i1040sca.pdf line 8a | https://www.irs.gov/publications/p936 |
| box_7_property_address_same | No tax routing | Informational only | None | None | i1098.pdf Box 7 | https://www.irs.gov/instructions/i1098 |
| box_8_property_address | No tax routing | Informational only — property identification | None | None | i1098.pdf Box 8 | https://www.irs.gov/instructions/i1098 |
| box_9_number_of_properties | No tax routing | Informational only | None | None | i1098.pdf Box 9 | https://www.irs.gov/instructions/i1098 |
| box_10_other | No tax routing from this field | Informational only. Real estate taxes shown here, if separately verified, may be entered on Schedule A line 5b, but the tax software should NOT auto-route Box 10 content — it requires separate manual entry. | None | None | i1098.pdf Box 10 | https://www.irs.gov/instructions/i1098 |
| box_11_acquisition_date | No tax routing | Informational only | None | None | i1098.pdf Box 11 | https://www.irs.gov/instructions/i1098 |
| qualified_premiums_checkbox | TY2025: No routing (MIP not deductible) | Has no tax effect for TY2025 | None for TY2025 | N/A | Drake KB 11513; OBBBA | https://kb.drakesoftware.com/kb/Drake-Tax/11513.htm |

---

## Calculation Logic

### Step 1 — Determine loan classification by origination date (Box 3)

Inspect Box 3 (origination date) for each 1098 entry:

- If origination date is **on or before December 15, 2017** (or if a binding contract was executed before 12/15/2017 and the home was purchased before April 1, 2018): classify as **pre-2017 debt** with limit $1,000,000 ($500,000 MFS).
- If origination date is **on or after December 16, 2017**: classify as **post-2017 debt** with limit $750,000 ($375,000 MFS).
- If Box 3 is blank: treat as post-2017 debt (conservative default); flag for preparer review.
- If mortgage was taken out before October 14, 1987: classify as **grandfathered debt** (no dollar limit, but reduces headroom for other debt tiers — see Pub 936 Table 1 lines 1–6).

> **Source:** IRS Publication 936 (2025), pp. 6–7 — https://www.irs.gov/publications/p936

---

### Step 2 — Determine if deduction limitation applies (Box 2)

For each 1098 entry routed to Schedule A (FOR=A):

1. Compare Box 2 (outstanding principal) to the applicable limit from Step 1.
2. If Box 2 ≤ applicable limit: **no limitation** — full Box 1 interest is deductible (subject to Step 3 for points).
3. If Box 2 > applicable limit: **limitation applies** — the 1098 screen cannot compute the deductible portion. Use DEDM screen to generate Wks DEDINT. **Do not use amounts from the 1098 screen when DEDM is active.** (Drake note: entering data on DEDM overrides 1098 screen; using both simultaneously generates return Note 634.)
4. If multiple mortgages exist (main home + second home), add all outstanding principal balances across all 1098 entries to determine combined balance vs. limit.

> **Source:** IRS Publication 936 (2025), Table 1 — https://www.irs.gov/publications/p936; Drake KB 10641 — https://kb.drakesoftware.com/kb/Drake-Tax/10641.htm

---

### Step 3 — Compute deductible interest using Pub 936 Table 1 (when limitation applies)

When Box 2 exceeds the applicable limit, compute the deductible portion using this exact worksheet (Pub 936, Table 1):

**Part I: Qualified Loan Limit**

| Line | Description | Computation |
|------|-------------|-------------|
| 1 | Average balance of grandfathered debt (pre-10/14/1987) | See average balance methods below |
| 2 | Average balance of pre-2017 home acquisition debt (post-10/13/1987, pre-12/16/2017) | See average balance methods below |
| 3 | $1,000,000 ($500,000 if MFS) | Fixed constant |
| 4 | Larger of line 1 or line 3 | max(line1, line3) |
| 5 | Add lines 1 + 2 | line1 + line2 |
| 6 | Smaller of line 4 or line 5 | min(line4, line5) |
| 7 | Average balance of post-2017 home acquisition debt (post-12/15/2017) | See average balance methods below |
| 8 | $750,000 ($375,000 if MFS) | Fixed constant |
| 9 | Larger of line 6 or line 8 | max(line6, line8) |
| 10 | Add lines 6 + 7 | line6 + line7 |
| **11** | **Qualified Loan Limit** = Smaller of line 9 or line 10 | **min(line9, line10)** |

**Part II: Deductible Home Mortgage Interest**

| Line | Description | Computation |
|------|-------------|-------------|
| 12 | Total average balance of all mortgages (lines 1 + 2 + 7) | line1 + line2 + line7 |
| 13 | Total interest paid on all mortgages in line 12 | Sum of all Box 1 amounts |
| 14 | Divide line 11 by line 12 (3 decimal places) | line11 ÷ line12 |
| **15** | **Deductible interest** = line 13 × line 14 | line13 × line14 |
| 16 | Non-deductible interest = line 13 − line 15 | line13 − line15 |

**Line 15 result flows to Schedule A line 8a.**

> **Source:** IRS Publication 936 (2025), Table 1, pp. 8–9 — https://www.irs.gov/publications/p936

---

### Step 4 — Average balance computation methods

Use one of these methods to compute the average balance for each mortgage (lines 1, 2, and 7 of Table 1):

**Method A — First-and-Last Balance Method** (use when all of these are true: no new borrowing during year except original mortgage; prepayments ≤ one month's principal; level payments at least semi-annually):

```
Average balance = (Balance on first day mortgage secured home + Balance on last day) ÷ 2
```

Example: Jan 1 balance $800,000 + Dec 31 balance $780,000 = $1,580,000 ÷ 2 = $790,000.

**Method B — Interest-Paid-Divided-by-Rate Method** (use when: mortgage secured all year; interest paid at least monthly):

```
Average balance = Total interest paid ÷ Annual interest rate
```

Example: $45,000 interest ÷ 6.0% rate = $750,000.

**Method C — Monthly Balance Method** (for any mortgage not qualifying for A or B):

```
Average balance = Sum of balance on first day of each month the mortgage was outstanding ÷ Number of months outstanding
```

> **Source:** IRS Publication 936 (2025), "How To Figure Your Average Mortgage Balance," pp. 7–8 — https://www.irs.gov/publications/p936

---

### Step 5 — Box 4 (Refund of overpaid interest) treatment

**Scenario A: Refund received in the same year as the interest was paid**

Reduce Box 1 by Box 4:
```
Net deductible interest = Box 1 − Box 4
```
Enter the net amount on Schedule A line 8a.

**Scenario B: Refund received in a LATER year than the year the interest was deducted**

The refund is income in the year received (tax benefit rule):

1. Include the Box 4 refund amount on Schedule 1 (Form 1040), line 8z ("Other income").
2. **Exception:** Only include up to the amount by which the prior-year deduction actually reduced the taxpayer's federal income tax. If the taxpayer received no tax benefit from the interest deduction (e.g., was in AMT, or the standard deduction exceeded itemized deductions that year), no income is recognized.
3. Do NOT reduce the current year's Box 1 by the Box 4 amount in this scenario.

> **Source:** IRS Publication 936 (2025), "Refund of Home Mortgage Interest" — https://www.irs.gov/publications/p936

---

### Step 6 — Points deductibility (Box 6)

**Purchase of main home — fully deductible in year paid** if ALL nine criteria are met:

1. The loan is secured by the borrower's **main home** (not second home, not investment property).
2. Paying points is an **established business practice** in the area.
3. The points paid are **not more than generally charged** in the area.
4. The borrower uses the **cash method of accounting**.
5. Points were **not paid in place of** items ordinarily stated separately (appraisal, inspection, title, attorney fees, property taxes).
6. Funds provided by the borrower at/before closing **plus any seller-paid points** were at least as much as points charged. (Funds include down payment, earnest money, and trade-in — but NOT borrowed funds like a second mortgage.)
7. The loan is used to **buy or build** the borrower's main home (not refinance).
8. Points are **computed as a percentage** of the principal loan amount.
9. The amount is **clearly shown on the settlement statement** as "points," "loan origination fee," "maximum loan charge," or "discount points."

If ALL nine conditions are met: enter full Box 6 amount on Schedule A line 8a in addition to Box 1 interest.

If ANY condition fails (e.g., refinance, second home, criteria 5 or 6 not met): amortize points over the loan term:

```
Annual deduction = (Total points ÷ Loan term in months) × 12
Pro-rated first-year deduction = (Total points ÷ Loan term in months) × months remaining in year at origination
```

If loan is paid off early (sale, prepayment, foreclosure): deduct any remaining unamortized points in the payoff year.

Exception: If refinanced with the SAME lender, add remaining unamortized balance to new loan points and amortize over new term.

> **Source:** IRS Publication 936 (2025), "Points," pp. 9–10 — https://www.irs.gov/publications/p936

---

### Step 7 — Mortgage insurance premiums (Box 5) — TY2025

**Box 5 produces NO deduction for TY2025.** Collect the value for informational completeness, but do not route it to Schedule A or any other deduction line.

Rationale: The MIP deduction (IRC §163(h)(3)(E)) expired after TY2021. The OBBBA (P.L. 119-21, signed 7/4/2025) permanently reinstated the deduction under IRC §163(h)(3)(F), but the effective date is **tax years beginning after December 31, 2025** — meaning TY2026 and later.

> **Source:** IRS Publication 936 (2025) — "The itemized deduction for mortgage insurance premiums has expired. You can no longer claim the deduction." — https://www.irs.gov/publications/p936; OBBBA effective date confirmed at https://legalclarity.org/is-mortgage-insurance-premium-tax-deductible-now/

---

### Step 8 — Aggregate Schedule A line 8a

Sum the following amounts from all 1098 entries where FOR=A:

```
Schedule A line 8a =
  Σ (Box 1 amounts not subject to limitation)
  + Σ (deductible interest from Wks DEDINT for limited loans)
  + Σ (fully deductible Box 6 purchase points)
  + Σ (current-year amortized refinance points)
  − Σ (Box 4 amounts that reduce current-year interest, Scenario A only)
```

This total is reported on Schedule A line 8a: "Home mortgage interest and points reported to you on Form 1098."

> **Source:** IRS Schedule A (Form 1040) 2025 Instructions, line 8a — https://www.irs.gov/pub/irs-pdf/i1040sca.pdf

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Home acquisition debt limit — post-12/15/2017 loans | $750,000 | Pub 936 (2025); IRC §163(h)(3)(F) as amended by TCJA | https://www.irs.gov/publications/p936 |
| Home acquisition debt limit — pre-12/16/2017 loans (grandfathered) | $1,000,000 | Pub 936 (2025) | https://www.irs.gov/publications/p936 |
| Home acquisition debt limit — post-2017, MFS | $375,000 | Pub 936 (2025) | https://www.irs.gov/publications/p936 |
| Home acquisition debt limit — pre-2017, MFS | $500,000 | Pub 936 (2025) | https://www.irs.gov/publications/p936 |
| Grandfathered debt threshold (pre-10/14/1987 debt) | No dollar limit (reduces headroom for other tiers) | Pub 936 (2025) | https://www.irs.gov/publications/p936 |
| Binding contract exception cutoff (pre-2017 treatment) | Contract executed before 12/15/2017 AND home purchased before 4/1/2018 | Pub 936 (2025) | https://www.irs.gov/publications/p936 |
| Mortgage insurance premium deductibility — TY2025 | NOT deductible (expired after TY2021; OBBBA reinstates only for TY2026+) | IRS Pub 936 (2025); OBBBA P.L. 119-21 (signed 7/4/2025) | https://www.irs.gov/publications/p936 |
| MIP deductibility — TY2026+ AGI phaseout begins | $100,000 ($50,000 MFS) | OBBBA IRC §163(h)(3)(F) | https://legalclarity.org/is-mortgage-insurance-premium-tax-deductible-now/ |
| MIP deductibility — TY2026+ fully phased out | $109,000 ($54,500 MFS) | 10% reduction per $1,000 over threshold | https://legalclarity.org/is-mortgage-insurance-premium-tax-deductible-now/ |
| Standard deduction — Single/MFS (TY2025) | $15,000 | Rev. Proc. 2024-40 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| Standard deduction — MFJ (TY2025) | $30,000 | Rev. Proc. 2024-40 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| SALT cap — MFJ/Single (TY2025, per OBBBA) | $40,000 (reduced if MAGI > $500,000; floor $10,000) | OBBBA P.L. 119-21 | https://turbotax.intuit.com/tax-tips/tax-deductions-and-credits/unlocking-the-new-salt-cap-how-to-save-up-to-40000-this-tax-season/c3JPyW2bC |
| SALT cap — MFS (TY2025, per OBBBA) | $20,000 (reduced if MAGI > $250,000; floor $5,000) | OBBBA P.L. 119-21 | https://turbotax.intuit.com/tax-tips/tax-deductions-and-credits/unlocking-the-new-salt-cap-how-to-save-up-to-40000-this-tax-season/c3JPyW2bC |

---

## Data Flow Diagram

```mermaid
flowchart LR
  subgraph inputs["Upstream Inputs"]
    LENDER[Lender / Servicer\nIssues Form 1098]
    DEDM[DEDM Screen\nLoan Limit Worksheet]
    PRIOR[Prior year Schedule A\nfor amortized points carryforward]
  end

  subgraph screen["1098 Screen"]
    FOR[FOR dropdown\nA / C / E / 8829]
    BOX1[Box 1: Mortgage Interest]
    BOX2[Box 2: Outstanding Principal]
    BOX3[Box 3: Origination Date]
    BOX4[Box 4: Refund Overpaid Interest]
    BOX5[Box 5: Mortgage Insurance Premiums]
    BOX6[Box 6: Points - Purchase]
    BOX7_8[Box 7/8: Property Address]
    BOX9[Box 9: Number of Properties]
    BOX10[Box 10: Other]
    BOX11[Box 11: Acquisition Date]
  end

  subgraph outputs["Downstream — Direct Next Node"]
    SCHA_8A[Schedule A, Line 8a\nHome Mortgage Interest & Points]
    SCHA_8B[Schedule A, Line 8b\nMortgage Interest - Not on 1098]
    SCHE[Schedule E\nRental Property Interest]
    SCHC[Schedule C, Line 16a\nBusiness Mortgage Interest\n(Form 1098 received)]
    F8829[Form 8829, Line 10 (itemizers)\nor Line 16 (standard deduction)\nHome Office Mortgage Interest]
    SCH1_8Z[Schedule 1, Line 8z\nOther Income - Refund of Overpaid Interest]
    DEDM_OUT[DEDM / Wks DEDINT\nLimitation Worksheet]
    INFO[Informational Only\nNo tax routing]
  end

  LENDER --> BOX1
  LENDER --> BOX2
  LENDER --> BOX3
  LENDER --> BOX4
  LENDER --> BOX5
  LENDER --> BOX6
  PRIOR --> BOX6

  FOR -->|"A (default for residence)"| SCHA_8A
  FOR -->|"E"| SCHE
  FOR -->|"C"| SCHC
  FOR -->|"8829"| F8829

  BOX1 -->|"FOR=A, Box2 ≤ limit"| SCHA_8A
  BOX1 -->|"FOR=A, Box2 > limit"| DEDM_OUT
  BOX1 -->|"FOR=E → Sch E line 12"| SCHE
  BOX1 -->|"FOR=C → Sch C line 16a"| SCHC
  BOX1 -->|"FOR=8829 → line 10 or 16"| F8829

  BOX2 -->|"Compare to limit"| DEDM_OUT
  BOX3 -->|"Determines limit tier"| DEDM_OUT

  BOX4 -->|"Same-year refund: reduces Box1"| SCHA_8A
  BOX4 -->|"Prior-year refund: income"| SCH1_8Z

  BOX5 -->|"TY2025: NOT deductible"| INFO

  BOX6 -->|"All 9 criteria met, purchase, FOR=A"| SCHA_8A
  BOX6 -->|"Refinance or criteria not met: amortized portion only"| SCHA_8A

  BOX7_8 --> INFO
  BOX9 --> INFO
  BOX10 --> INFO
  BOX11 --> INFO

  DEDM --> DEDM_OUT
  DEDM_OUT --> SCHA_8A
```

---

## Edge Cases & Special Rules

### 1. DEDM screen vs. 1098 screen — mutual exclusion

When outstanding principal (Box 2) exceeds the applicable limit, the preparer MUST use the DEDM screen to calculate the deductible portion. If data is entered on the DEDM screen, the 1098 screen amounts for that loan are **ignored by Drake** (return Note 634 is generated if both are used). The coding agent must implement this as: if DEDM inputs exist for this loan, do not use Box 1 from the 1098 entry; use Wks DEDINT line 15 instead.

> **Source:** Drake KB 10641 — https://kb.drakesoftware.com/kb/Drake-Tax/10641.htm

---

### 2. Splitting interest across multiple schedules

When a property is used for mixed purposes (e.g., part personal, part rental), the mortgage interest must be allocated between Schedule A (personal portion) and Schedule E (rental portion) based on the percentage of personal vs. rental use. This requires creating **two separate 1098 entries** — one with FOR=A and the proportional interest amount, and one with FOR=E. The engine must NOT attempt to split a single Box 1 amount automatically; it relies on the preparer to enter the correct allocations.

> **Source:** Drake KB 13229 — https://kb.drakesoftware.com/kb/Drake-Tax/13229.htm; Drake KB 11142 (duplex/mixed use) — https://kb.drakesoftware.com/kb/Drake-Tax/11142.htm

---

### 3. Home equity debt — use-of-proceeds test

For loans originated after 12/16/2017, interest on home equity loans or lines of credit (HELOC) is deductible ONLY if the loan proceeds were used to buy, build, or substantially improve the qualifying home that secures the loan. Interest on HELOC proceeds used for other purposes (debt consolidation, vehicle purchase, tuition, etc.) is NOT deductible — even though the loan is secured by the home.

For the engine: Box 2 (outstanding principal) for HELOC proceeds used for non-qualifying purposes must NOT be included in the debt balance that qualifies for the deduction. The engine should flag this for preparer confirmation — it cannot determine use of proceeds from the 1098 form alone.

> **Source:** IRS Publication 936 (2025), "Home Equity Debt" — https://www.irs.gov/publications/p936

---

### 4. Binding contract exception for origination date classification

If Box 3 shows a date on or after 12/16/2017, but the borrower had a binding written contract to purchase before 12/15/2017 and the home was purchased before 4/1/2018, the pre-2017 $1M/$500K limit applies. This exception cannot be determined from Box 3 alone — the engine must expose a checkbox or flag for the preparer to indicate the binding contract exception.

> **Source:** IRS Publication 936 (2025), p. 7 — https://www.irs.gov/publications/p936

---

### 5. Multiple homes — only main home and one second home qualify

Interest on a third or additional home is NOT deductible as qualified residence interest on Schedule A. If the taxpayer has 3+ properties with mortgages, the preparer must designate which two qualify (main home + one second home). Interest on the non-qualifying home(s) is not deductible on Schedule A (it may be deductible on Schedule E or C if business-use). The engine must accept and store any number of 1098 entries but note that only two residences qualify for Schedule A treatment.

> **Source:** IRS Publication 936 (2025), "More Than One Home" — https://www.irs.gov/publications/p936

---

### 6. Grandfathered debt (pre-10/14/1987 mortgages)

Mortgages taken out before October 14, 1987 are "grandfathered debt." There is no dollar limit on the deductibility of grandfathered debt itself, but grandfathered debt balances reduce the available headroom for home acquisition debt within the $1M/$500K tier. This is computed via Pub 936 Table 1, lines 1–6. The origination date in Box 3 would predate 1987 for grandfathered debt. Flag if Box 3 shows pre-10/14/1987 date.

> **Source:** IRS Publication 936 (2025), "Grandfathered Debt," p. 6 — https://www.irs.gov/publications/p936

---

### 7. Married Filing Separately — written agreement required for two-home designation

When filing MFS, both spouses must agree in writing on which spouse will claim the main home and which will claim the second home. If there is disagreement, neither can claim the second home. The MFS loan limits are $375,000 (post-2017) and $500,000 (pre-2017).

> **Source:** IRS Publication 936 (2025), "Married Filing Separately," p. 4 — https://www.irs.gov/publications/p936

---

### 8. Points on refinanced loans — amortization and early payoff

When a loan is refinanced and replaced by a new loan with the same lender, unamortized points from the old loan are NOT immediately deductible — they are added to the new loan's points and amortized over the new loan term. When a loan is paid off by a different lender or by sale/foreclosure, all remaining unamortized points ARE immediately deductible in the payoff year.

The engine must track prior-year amortized points balances (carried forward from prior returns) to compute the current-year deduction for refinanced loans.

> **Source:** IRS Publication 936 (2025), "Refinancing," pp. 10–11 — https://www.irs.gov/publications/p936

---

### 9. Box 4 — prior-year refund and the tax benefit rule

When Box 4 represents a refund of interest paid in a prior year, the income recognition is limited by the "tax benefit rule": the taxpayer must include in income only the amount that actually reduced their federal tax in the prior year. This requires knowing: (a) whether the taxpayer itemized in the prior year, and (b) whether the interest deduction actually reduced tax (e.g., if in AMT, the itemized deduction may not have provided benefit). This is a preparer-judgment issue; the engine should collect Box 4 and flag it for review when Box 4 relates to prior-year interest.

> **Source:** IRS Publication 936 (2025), "Refund of Home Mortgage Interest" — https://www.irs.gov/publications/p936

---

### 10. Mortgage insurance premiums — TY2026 preview (NOT TY2025)

For future reference only (do not implement for TY2025): Starting TY2026, qualified MIP (Box 5) is treated as qualified residence interest under IRC §163(h)(3)(F) (added by OBBBA, P.L. 119-21). The deduction is subject to AGI phaseout: reduced by 10% per $1,000 of AGI over $100,000 ($50,000 MFS), fully phased out at $109,000 ($54,500 MFS). Applies to PMI, FHA MIP, VA funding fees, USDA guarantee fees on contracts issued after 12/31/2006.

> **Source:** OBBBA P.L. 119-21 (signed 7/4/2025); https://legalclarity.org/is-mortgage-insurance-premium-tax-deductible-now/

---

## Sources

All URLs verified to resolve.

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Drake KB — 1098: Mortgage Interest Deduction Limitation | — | Full article | https://kb.drakesoftware.com/kb/Drake-Tax/10641.htm | — |
| Drake KB — 1098: Splitting Mortgage Interest | — | Full article | https://kb.drakesoftware.com/kb/Drake-Tax/13229.htm | — |
| Drake KB — 1098: Mortgage Insurance Premiums | — | Full article | https://kb.drakesoftware.com/kb/Drake-Tax/11513.htm | — |
| Drake KB — Guide to 1098 and 1099 Informational Returns | — | Full article | https://kb.drakesoftware.com/kb/Drake-Tax/11742.htm | — |
| Drake KB — Schedule E: Duplex Mortgage Interest | — | Full article | https://kb.drakesoftware.com/kb/Drake-Tax/11142.htm | — |
| IRS Instructions for Form 1098 | 2024 | Boxes 1–11 | https://www.irs.gov/instructions/i1098 | i1098.pdf |
| IRS Publication 936 (Home Mortgage Interest Deduction) | 2025 | Full — Table 1, points, refunds, limits | https://www.irs.gov/publications/p936 | p936.pdf |
| IRS Schedule A Instructions (Form 1040) | 2025 | Lines 8a–8d | https://www.irs.gov/pub/irs-pdf/i1040sca.pdf | i1040sca.pdf |
| Rev. Proc. 2024-40 (TY2025 inflation adjustments) | 2024 | Standard deductions, brackets | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | rp-24-40.pdf |
| One Big Beautiful Bill Act (OBBBA, P.L. 119-21) | 2025 | IRC §163(h)(3)(F) — MIP reinstatement; SALT cap $40K | https://www.irs.gov/newsroom/one-big-beautiful-bill-provisions | — |
| LegalClarity — MIP deductibility effective dates | 2025 | TY2026+ effective date; phaseout thresholds | https://legalclarity.org/is-mortgage-insurance-premium-tax-deductible-now/ | — |
| TGC CPA — OBBBA interest expense changes | 2025 | Mortgage interest changes TY2025 vs TY2026 | https://www.tgccpa.com/interest-expense-updates-from-the-one-big-beautiful-bill-act/ | — |
| IRS Schedule E Instructions | 2025 | Line 12 — mortgage interest to banks | https://www.irs.gov/instructions/i1040se | i1040se.pdf |
| IRS Schedule C Instructions | 2025 | Lines 16a/16b — business mortgage interest | https://www.irs.gov/instructions/i1040sc | i1040sc.pdf |
| IRS Form 8829 Instructions | 2025 | Lines 10 and 16 — home office mortgage interest | https://www.irs.gov/instructions/i8829 | i8829.pdf |

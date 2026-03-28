# Form 1098 Mortgage Interest Statement — Scratchpad

## Purpose

Captures mortgage interest, points, and related data from a borrower's Form 1098
issued by lenders. Feeds Schedule A (itemized deductions) for home mortgage
interest, and may feed Schedule E for rental property interest, Schedule C for
business-use mortgage interest, or Form 8829 for home office interest.

## Fields identified (from Drake + IRS Form 1098 Instructions)

Drake screen "1098" maps to IRS Form 1098. Fields:

1. **FOR dropdown** — which schedule/form this entry flows to (A=Schedule A,
   C=Schedule C, E=Schedule E, 8829=Form 8829)
2. **Box 1** — Mortgage interest received (from payer/borrower)
3. **Box 2** — Outstanding mortgage principal as of Jan 1 (informational; drives
   deduction limit check)
4. **Box 3** — Mortgage origination date (determines pre/post-12/15/2017 loan
   classification)
5. **Box 4** — Refund of overpaid interest (reduces current-year deduction or is
   income on Sch 1 line 8z)
6. **Box 5** — Mortgage insurance premiums (NOT deductible TY2025; deductible
   TY2026+ per OBBBA)
7. **Box 6** — Points paid on purchase of principal residence
8. **Box 7** — Checkbox: property address same as borrower mailing address
9. **Box 8** — Property address (if different from mailing)
10. **Box 9** — Number of properties securing the mortgage
11. **Box 10** — Other (informational only)
12. **Box 11** — Mortgage acquisition date (if lender acquired mortgage in
    current year)
13. **Qualified premiums checkbox** — Drake field; no TY2025 effect

## Open Questions — RESOLVED

- [x] Q: What fields does Drake show for this screen? → FOR dropdown + Boxes
      1–11 + Qualified premiums checkbox + DEDM screen link → Drake KB 10641,
      11513, 13229

- [x] Q: Where does each box flow on the 1040? → Box 1 → Sch A line 8a (FOR=A);
      Box 6 → Sch A line 8a if purchase criteria met → Box 4 → reduces Box 1
      (same year) OR Sch 1 line 8z (prior year refund) → Box 5 → NO DEDUCTION
      TY2025 → See Per-Field Routing table

- [x] Q: What are the TY2025 mortgage interest deduction limits? →
      Post-12/15/2017 loans: $750,000 ($375,000 MFS) → Pre-12/16/2017 loans:
      $1,000,000 ($500,000 MFS) → Pre-10/14/1987 grandfathered debt: no dollar
      limit → IRS Pub 936 (2025)

- [x] Q: Is mortgage insurance premiums (Box 5) deductible for TY2025? → NO.
      Deduction expired after TY2021. OBBBA (P.L. 119-21, signed 7/4/2025)
      reinstates under IRC §163(h)(3)(F) but ONLY for tax years beginning after
      2025 (TY2026+). → IRS Pub 936 (2025): "The itemized deduction for mortgage
      insurance premiums has expired. You can no longer claim the deduction."

- [x] Q: What are the exact Schedule A line numbers for TY2025? → Line 8a: Home
      mortgage interest from Form 1098 (Box 1 and qualifying Box 6) → Line 8b:
      Home mortgage interest NOT on Form 1098 (seller-financed mortgages) → Line
      8c: Points not on Form 1098 → Line 8d: Reserved for future use (NOT
      mortgage insurance — that line was removed) → Source: IRS Schedule A
      Instructions 2025

- [x] Q: What is the $750,000 / $1,000,000 home acquisition debt limit
      threshold? → Post-12/15/2017: $750K ($375K MFS); Pre-12/16/2017:
      $1M ($500K MFS) → Binding contract exception: if contract before
      12/15/2017 AND home purchased before 4/1/2018 → pre-2017 limit → Pub 936
      (2025) pp. 6–7

- [x] Q: How does Box 4 (refund of overpaid interest) reduce the deduction? →
      Same year: net Box1 − Box4 → Sch A line 8a → Prior year: Box4 amount → Sch
      1 line 8z (limited by tax benefit rule) → Pub 936 (2025); Sch 1 line 8z

- [x] Q: How does points (Box 6) deductibility work? → Purchase of main home +
      all 9 criteria met → fully deductible in year paid (Sch A line 8a) →
      Refinance or any criteria fails → amortize over loan term → Early payoff
      (not same lender refi) → deduct remaining balance in payoff year → Pub 936
      (2025) pp. 9–10

- [x] Q: How does the DEDM screen interact with the 1098 screen? → Mutually
      exclusive: DEDM overrides 1098 screen when loan limit exceeded → Drake KB
      10641: "If you enter data on screen DEDM, do not use screen 1098" → DEDM
      generates Wks DEDINT with deductible interest = Box1 × (qualified loan
      limit ÷ average balance)

- [x] Q: What is the interaction with Schedule E for rental/mixed-use property?
      → Two separate 1098 entries required: one FOR=A (personal portion), one
      FOR=E (rental portion) → Engine does NOT auto-split; preparer enters
      proportional amounts → Drake KB 13229, 11142

- [x] Q: What are the TY2025 constants? → Standard deductions: $15,000
      (Single/MFS), $30,000 (MFJ) — Rev Proc 2024-40 → SALT cap:
      $40,000 MFJ ($20,000 MFS); phase-out above $500,000 MAGI ($250K MFS);
      floor $10,000 ($5,000 MFS) — OBBBA

- [x] Q: What are the Pub 936 Table 1 averaging methods? → Method A: (Jan1
      balance + Dec31 balance) ÷ 2 (first-and-last) → Method B: Total interest
      paid ÷ annual interest rate → Method C: Sum of monthly balances ÷ months
      outstanding → Pub 936 (2025) pp. 7–8

## Remaining open items

- [x] RESOLVED: Schedule E line 12 — "Mortgage interest paid to banks, etc." —
      verified from IRS 2025 Schedule E instructions
      (https://www.irs.gov/instructions/i1040se)
- [x] RESOLVED: Schedule C line 16a (NOT 16b) when Form 1098 is received —
      "Mortgage interest paid to banks, etc. — Form 1098 received" — verified
      (https://www.irs.gov/instructions/i1040sc) Note: Line 16b is used when
      Form 1098 was NOT received.
- [x] RESOLVED: Form 8829 line 10 for itemizers; line 16 for standard deduction
      filers — both verified from 2025 Form 8829 instructions
      (https://www.irs.gov/instructions/i8829)

## Sources checked

- [x] Drake KB articles for 1098 screen (10641, 11513, 13229, 11742, 11142)
- [x] IRS Form 1098 Instructions — https://www.irs.gov/instructions/i1098
      (downloaded i1098.pdf)
- [x] IRS Publication 936 — https://www.irs.gov/publications/p936 (downloaded
      p936.pdf)
- [x] IRS Schedule A Instructions — https://www.irs.gov/pub/irs-pdf/i1040sca.pdf
      (downloaded i1040sca.pdf)
- [x] Rev Proc 2024-40 — https://www.irs.gov/pub/irs-drop/rp-24-40.pdf
      (downloaded rp-24-40.pdf)
- [x] OBBBA provisions — mortgage insurance and SALT
- [x] MIP effective dates confirmed via legalclarity.org and tgccpa.com

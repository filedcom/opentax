# Child and Dependent Care Expenses (Form 2441) — Scratchpad

## Purpose

Captures qualifying child and dependent care expenses paid during the year and
computes: (1) the employer-provided dependent care benefit exclusion (Part III),
and (2) the Child and Dependent Care Credit (Part II). Flows to Schedule 3 Line
2 (credit) and Form 1040 Line 1e (taxable benefits). This is a nonrefundable
credit for TY2025.

## Fields identified (from Drake + IRS Instructions)

### Part I — Care Providers (Line 1, columns a–e, per provider)

- (a) Provider name
- (b) Provider address
- (c) Provider TIN (SSN/ITIN/EIN or special code: LAFCP, TAXEXEMPT, REFUSED,
  UNABLE)
- (d) Household employee? (Yes/No)
- (e) Amount paid to provider in 2025

### Part II — Qualifying Persons (Line 2, columns a–d) — entered on Screen 2

- (a) Qualifying person's name
- (b) Qualifying person's SSN
- (c) Over age 12 and disabled? (checkbox)
- (d) Qualified expenses paid in 2025

### Part II — Credit Computation

- Line 3: Lesser of total qualifying expenses or $3,000/$6,000 cap
- Line 4: Taxpayer's earned income
- Line 5: Spouse's earned income / deemed income ($250/$500/month)
- Line 6: Smallest of Lines 3, 4, 5
- Line 7: AGI from Form 1040 Line 11
- Line 8: Decimal from credit % table
- Line 9a: Line 6 × Line 8
- Line 9b: Prior-year credit (Worksheet A)
- Line 9c: Line 9a + Line 9b
- Line 10: Credit limit (Form 1040 Line 18 minus Schedule 3 Line 1 and Form 8978
  Line 14)
- Line 11: min(Line 9c, Line 10) → Schedule 3 Line 2

### Part III — Dependent Care Benefits (when W-2 Box 10 > 0)

- Line 12: Total employer benefits (W-2 Box 10)
- Line 13: Prior year carryforward used in grace period
- Line 14: Forfeited or carried forward amounts
- Line 15: Line 12 + Line 13 − Line 14
- Line 16: All qualified expenses incurred in 2025
- Line 17: min(Line 15, Line 16)
- Line 18: Taxpayer's earned income (excl. dependent care benefits)
- Line 19: Spouse's earned income
- Line 20: min(Line 17, Line 18, Line 19)
- Line 21: $5,000 ($2,500 MFS) — statutory exclusion cap
- Line 22: Self-employed/partnership benefits amount (or 0 if employee only)
- Line 23: Line 15 − Line 22
- Line 24: min(Line 20, Line 21, Line 23) — deductible benefits (self-employed
  only)
- Line 25: Excluded benefits = min(Line 20, Line 21) if Line 22 = 0, else Line
  24 subtracted from smaller of Line 20/21
- Line 26: Line 23 − Line 25 (taxable) → Form 1040 Line 1e
- Line 27: $3,000 or $6,000 (expense cap)
- Line 28: Line 24 + Line 25 (total excluded/deductible)
- Line 29: Line 27 − Line 28 (remaining qualifying expenses for credit)
- Line 30: Line 2 column (d) total minus amounts from Line 28
- Line 31: min(Line 29, Line 30) → becomes Line 3 for Part II credit computation

### Drake-specific fields

- Fields 4, 5 override earned income for disabled/student spouse
- Fields 18, 19 same for Part III
- Checkbox A: MFS attestation
- Checkbox B: Deemed income used

## Resolved Questions

- [x] Q: What fields does Drake show for this screen? → Part I (providers), Part
      II (qualifying persons + credit), Part III (employer benefits). Also
      Screen 2 (dependents) for qualifying person data. Source:
      kb.drakesoftware.com/kb/Drake-Tax/11750.htm

- [x] Q: What are the maximum qualifying expense dollar limits for TY2025? →
      $3,000 (1 person); $6,000 (2+ persons). STATUTORY, not inflation-adjusted
      (IRC §21(c)). Source: IRS Instructions i2441,
      https://www.irs.gov/instructions/i2441; IRC §21(c) —
      law.cornell.edu/uscode/text/26/21

- [x] Q: What are the credit percentage rates for TY2025? → Table confirmed: 35%
      at AGI $0–$15,000 stepping down 1% per $2,000 to 20% at AGI $43,001+.
      STATUTORY, not inflation-indexed. Source: IRS Instructions i2441,
      https://www.irs.gov/instructions/i2441

- [x] Q: How does employer-provided dependent care (Box 10 of W-2) interact? →
      Reported in Part III. Reduces qualifying expenses for credit
      dollar-for-dollar. Excess → Form 1040 Line 1e. Source: IRS Instructions
      i2441

- [x] Q: What is the employer-provided dependent care exclusion limit for
      TY2025? → $5,000 (MFJ/single), $2,500 (MFS). NOTE: Pub. L. 119-21 raised
      this to $7,500/$3,750 but EFFECTIVE for taxable years BEGINNING AFTER
      December 31, 2025. So for TY2025 (Jan 1 – Dec 31, 2025), the limit is
      STILL $5,000/$2,500. Source: law.cornell.edu/uscode/text/26/129; IRC
      §129(a)(2) as amended by Pub. L. 119-21, §70404(a), effective TY2026+

- [x] Q: Where does the credit flow on Form 1040? → Schedule 3, Line 2
      confirmed. Taxable benefits → Form 1040 Line 1e. Source: IRS Instructions
      i2441; IRS Form 1040 Instructions —
      https://www.irs.gov/instructions/i1040gi

- [x] Q: What is the exact line number on Schedule 3? → Schedule 3, Line 2:
      "Credit for child and dependent care expenses. Attach Form 2441" —
      CONFIRMED. Source: IRS Schedule 3 instructions —
      https://www.irs.gov/instructions/i1040s3

- [x] Q: Is there a prior-year expense worksheet? → Yes — Worksheet A. Result
      enters Line 9b. Source: IRS Instructions i2441

- [x] Q: What AGI is used for the credit percentage table? → Form 1040 Line 11
      (regular AGI, not modified). Source: IRS Instructions i2441

- [x] Q: Does Rev. Proc. 2024-40 modify any 2441 constants? → No. IRC §21
      (expense caps and credit % table) and IRC §129 ($5,000 limit) are
      statutory, not CPI-adjusted. Not in Rev. Proc. 2024-40. Source: KPMG
      analysis of Rev. Proc. 2024-40; law.cornell.edu/uscode/text/26/21

- [x] Q: Is the credit refundable for TY2025? → NO — nonrefundable for TY2025.
      The 2021 ARP temporary expansion (refundable, higher limits) expired after
      TY2021. Source: IRS FAQs —
      https://www.irs.gov/newsroom/child-and-dependent-care-credit-faqs

- [x] Q: What are Lines 27–31 for? → Bridge from Part III to Part II: reduce
      qualifying expenses by employer benefit exclusion amount. Line 31 =
      remaining qualifying expenses → used as Line 3 in Part II credit
      computation. Source:
      teachmepersonalfinance.com/irs-form-2441-instructions/; IRS Instructions
      i2441

- [x] Q: How does the $5,000 FSA exclusion interact with the $3,000/$6,000
      expense cap? → Lines 27–31 answer this. Line 27 = $3,000 or $6,000; Line
      28 = excluded/deductible benefits (Lines 24+25); Line 29 = Line 27 –
      Line 28. If Line 29 ≤ 0, no credit. If positive, that's the residual
      credit base. Example: $5,000 FSA + 1 qualifying person → $5,000 > $3,000 →
      Line 29 = $0 → no credit. Example: $5,000 FSA + 2 qualifying persons →
      $6,000 – $5,000 = $1,000 eligible for credit. Source: IRS Instructions
      i2441; teachmepersonalfinance.com

## Open Questions (all resolved)

- [x] All major questions resolved. No [NEEDS SOURCE] items remain.

## Sources checked

- [x] Drake KB article — https://kb.drakesoftware.com/kb/Drake-Tax/11750.htm
- [x] IRS Form 2441 instructions — https://www.irs.gov/instructions/i2441 —
      downloaded as i2441.pdf
- [x] IRS Publication 503 — downloaded as p503.pdf
- [x] IRC §21 — https://www.law.cornell.edu/uscode/text/26/21
- [x] IRC §129 — https://www.law.cornell.edu/uscode/text/26/129
- [x] IRS FAQ Child and Dependent Care —
      https://www.irs.gov/newsroom/child-and-dependent-care-credit-faqs
- [x] IRS Schedule 3 instructions — https://www.irs.gov/instructions/i1040s3
- [x] IRS Form 1040 instructions — https://www.irs.gov/instructions/i1040gi
- [x] teachmepersonalfinance.com — Lines 22-31 structure
- [x] Rev. Proc. 2024-40 — not applicable for 2441 constants (statutory)

# Schedule 8812 — Scratchpad

## Purpose

Schedule 8812 (Form 1040) is used to figure the Child Tax Credit (CTC), Credit for Other Dependents (ODC), and Additional Child Tax Credit (ACTC) for Tax Year 2025. It captures qualifying child and dependent counts, computes the non-refundable CTC/ODC portion (→ Form 1040 Line 19) and the refundable ACTC portion (→ Form 1040 Line 28).

## Fields identified (from Drake)

From Drake Screen 8812 and supporting Screen 2 (Dependents):

### Screen 2 — Dependents Tab (feeds 8812 automatically)
- Dependent first/last name
- Dependent SSN (or ITIN/ATIN)
- Relationship to taxpayer
- Date of birth (age is derived — must be under 17 at end of 2025 for CTC)
- Months lived in taxpayer's home during 2025
- "Child tax credit" checkbox (row 7 of Dependents section on 1040)
- "Credit for other dependents" checkbox (row 7 of Dependents section on 1040)
- "SSN is not valid for work" flag (disqualifies from CTC/ACTC; child may still qualify for ODC)

### Screen 2 — Due Diligence Tab overrides
- "Eligible for Other Dependents Credit only" checkbox
- "Not Eligible for Child Tax Credit OR Other Dependents Credit" checkbox
- "Taxpayer has Form 8332 or substantially similar statement from custodial parent and qualifies for the Child Tax Credit" checkbox

### Screen 8812 — Direct Entry Fields
- Puerto Rico excluded income override (Line 2a — income excluded under § 933)
- Form 2555 amounts (Lines 45 and 50) for foreign earned income exclusion (Line 2b)
- Form 4563 amount (Line 15) for possession income exclusion (Line 2c)
- Nontaxable combat pay amount (Line 18b override — normally auto-populated from W-2 Box 12 Code Q)
- "Do not claim Additional Child Tax Credit" checkbox (opt-out of ACTC entirely)
- Bona fide resident of Puerto Rico indicator (triggers Part II-B regardless of child count)

## Open Questions

- [x] Q: What fields does Drake show for this screen?
  → Resolved: See above — Screen 2 dependent fields auto-flow; Screen 8812 has Puerto Rico, FEIE, combat pay, and ACTC opt-out fields.

- [x] Q: Where does each box flow on the 1040?
  → Resolved: Line 14 → Form 1040 Line 19 (non-refundable CTC/ODC). Line 27 → Form 1040 Line 28 (refundable ACTC).

- [x] Q: What are the TY2025 constants?
  → Resolved:
  - CTC: $2,200 per qualifying child (OBBBA enacted July 4, 2025; reflected in TY2025 form instructions)
  - ACTC max: $1,700 per qualifying child (Rev. Proc. 2024-40, §2.05; also confirmed in i1040s8.pdf)
  - ODC: $500 per other dependent
  - ACTC earned income floor: $2,500
  - ACTC rate: 15% of earned income exceeding $2,500
  - Phase-out AGI threshold MFJ: $400,000
  - Phase-out AGI threshold all others: $200,000
  - Phase-out rate: $50 per $1,000 (or fraction) of income above threshold

- [x] Q: What edge cases exist?
  → Resolved: See Edge Cases section in context.md

- [x] Q: How does the Child Tax Credit interact with Schedule 3 and Form 8812?
  → Resolved: Credit Limit Worksheet A reads Schedule 3 lines 1,2,3,4,5b,6d,6f,6l,6m to determine available tax liability before applying CTC/ODC. Credit Limit Worksheet B triggered for specific credits (8396, 8839, 5695 Part I, 8859).

- [x] Q: What is the ACTC refundable portion calculation?
  → Resolved: 15% of earned income over $2,500, capped at (number of qualifying children × $1,700). For taxpayers with 3+ qualifying children, also compare SS/Medicare taxes withheld minus EIC/certain other credits (use larger amount from Part II-B).

- [x] Q: How does the Other Dependent Credit (ODC) work?
  → Resolved: $500 per dependent who (1) is a dependent on the return, (2) cannot be used for CTC/ACTC, (3) is a U.S. citizen/national/resident alien, (4) has SSN, ITIN, or ATIN by return due date. Shares the $400K/$200K phase-out with CTC.

- [x] Q: What triggers Form 8812 vs. direct credit on 1040?
  → Resolved: All CTC, ODC, and ACTC calculations require Form/Schedule 8812. There is no "simple" path. The form is always required when any of these credits are claimed.

- [x] Q: Special rules for bona fide residents of Puerto Rico?
  → Resolved: PR residents include only U.S.-sourced earned income on Line 18a (exclude PR-sourced income). Line 21 includes withheld taxes from PR employers (Form 499R-2/W-2PR boxes 21 and 23). PR residents with even 1 qualifying child may claim ACTC (not just those with 3+, unlike the rest of Part II-B which requires 3+).

- [x] Q: Net investment income restrictions for ACTC?
  → Resolved: No NII test applies to ACTC. The NII limit applies to EIC (§32(i): EIC denied if aggregate investment income > $11,950 for TY2025). ACTC has no such restriction.

- [x] Q: MFS filing status restrictions?
  → Resolved: MFS filers can claim CTC/ODC/ACTC. They use the $200,000 threshold (not $400,000). No explicit prohibition found in Schedule 8812 instructions for MFS.

- [x] Q: Form 4547 (Trump account) interaction?
  → Resolved: Form 4547 is a separate filing for establishing Trump accounts and electing the $1,000 pilot contribution. It is filed with the 2025 return but does not modify Schedule 8812 calculations.

- [x] Q: What is Form 8862 and when is it required?
  → Resolved: Required when CTC/ACTC/ODC was denied or reduced for a prior year (after 2015) for a non-math/clerical reason. Must be attached to restore the credit. See Instructions for Form 8862 for exceptions.

## Sources checked

- [x] Drake KB: https://kb.drakesoftware.com/kb/Drake-Tax/18340.htm
- [x] IRS Instructions for Schedule 8812 (i1040s8.pdf) — TY2025, published Jan 23 2026
- [x] IRS Schedule 8812 form (f1040s8.pdf) — TY2025
- [x] IRS Form 1040 (f1040.pdf) — TY2025 (confirmed lines 19 and 28)
- [x] Rev. Proc. 2024-40 (rp-24-40.pdf) — confirmed ACTC $1,700 per qualifying child at §2.05
- [x] IRS OBBBA provisions page — confirmed CTC increase to $2,200 per child
- [x] IRS update notice for 2025 Schedule 8812 instructions — minor heading correction only

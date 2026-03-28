# Screen 1/2 (General Info) — Scratchpad

## Purpose
Captures taxpayer identity, filing status, address, and dependent information for Form 1040; routes filing status and dependent counts downstream to f1040 and Form 8812.

## Fields identified (from Drake / IRS)

### Personal Info (Screen 1)
- Filing status (5 choices: Single, MFJ, MFS, HOH, QSS)
- Taxpayer: first name, last name, SSN, DOB, blind checkbox, age 65+ checkbox
- Spouse (MFJ/MFS): first name, last name, SSN, DOB, blind checkbox, age 65+ checkbox
- Address: line 1, city, state, zip

### Dependent Info (Screen 2)
- Per dependent: first name, last name, SSN (or ITIN), DOB, relationship, months in home
- Per dependent: qualifying_child_for_ctc override, disabled flag

## Open Questions
- [x] Q: What fields does Drake show for Screen 1 and Screen 2?
  → Drake Screen 1: personal info (name, SSN, DOB, filing status, address, blind/65+ flags).
     Drake Screen 2: dependent list with name, SSN, DOB, relationship, months-in-home, CTC/ODC checkboxes.
  → Source: IRS Form 1040 instructions (2025) https://www.irs.gov/instructions/i1040gi
- [x] Q: Where does each field flow on the 1040?
  → Filing status → 1040 checkboxes (lines 1-5). Dependent counts → 1040 dependents section.
     qualifying_child_tax_credit_count → feeds form 8812 / schedule 3 line 6b (CTC) and 1040 line 28 (ACTC).
  → Source: IRS 1040 Instructions 2025
- [x] Q: What are the TY2025 constants (standard deductions, exemptions)?
  → Standard deduction: Single $15,750 / MFJ $31,500 / MFS $15,750 / HOH $23,625 / QSS $31,500
     Additional (age 65+ or blind): $1,600 (Single/HOH), $1,350 (MFJ/MFS/QSS) per person
     Note: instructions page says $1,600 for unmarried not surviving spouse, $1,350 for married/QSS.
  → Source: IRS Form 1040 instructions 2025 https://www.irs.gov/instructions/i1040gi
- [x] Q: What filing status codes does Drake use?
  → Drake screens use numeric labels (1-5) but the codebase types.ts uses lowercase strings: "single", "mfj", "mfs", "hoh", "qss".
  → Source: nodes/2025/f1040/types.ts
- [x] Q: What dependent relationship codes exist?
  → IRS Publication 501 lists: son, daughter, stepchild, foster child, sibling, stepsibling, half-sibling, grandchild, parent, stepparent, aunt/uncle, niece/nephew, in-law, other.
  → Source: IRS Publication 501 (2025) https://www.irs.gov/publications/p501
- [x] Q: How do dependents affect downstream nodes (8812, etc.)?
  → qualifying_child_tax_credit_count and other_dependent_count route to f8812 node, not directly to f1040 outputs.
     BUT: f8812 is a separate INPUT node that a user fills in separately. The general node routes dependent COUNTS to f1040 directly (for display purposes). In this engine pattern, the CTC computation is in f8812 input node — general should route filing_status and count fields to f1040.
  → Source: nodes/2025/f1040/inputs/f8812/index.ts

## Sources to check
- [x] Drake KB article for Screen 1 — URLs 404, content extracted from IRS instructions instead
- [x] Drake KB article for Screen 2 — URLs 404, content extracted from IRS instructions instead
- [x] IRS Form 1040 instructions — https://www.irs.gov/instructions/i1040gi
- [x] IRS Publication 501 (dependents, filing status) — https://www.irs.gov/publications/p501
- [x] Rev Proc 2024-40 (TY2025 constants) — PDF binary; constants verified via IRS.gov TC551 and 1040 instructions

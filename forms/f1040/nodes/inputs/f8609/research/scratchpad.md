# Form 8609 Research Scratchpad

## IRS Search Results

### Form 8609 — Low-Income Housing Credit Allocation and Certification
- IRS instructions: https://www.irs.gov/instructions/i8609 (updated 12/2025)
- Form PDF: https://www.irs.gov/pub/irs-access/f8609_accessible.pdf (Rev. December 2021)
- About page: https://www.irs.gov/forms-pubs/about-form-8609

### Key Facts from IRS Instructions
- Form 8609 is issued by the housing credit agency (HCA) to building owners
- A separate Form 8609 must be filed for EACH building in a multi-building project
- Contains a Building Identification Number (BIN) assigned by the HCA
- Part I (completed by HCA): allocation date, annual credit dollar amount (line 1b), max applicable credit % (line 2), max qualified basis (line 3a), placed-in-service date (line 5a)
- Part II (completed by building owner): eligible basis (line 7), qualified basis (line 8a)
- Annual credit amount = credit % (line 2) × qualified basis (line 3a)
- Building owners must submit Form 8609 ONE TIME to the IRS Philadelphia LIHC Unit
- Form 8609-A (Annual Statement) must be filed for each year of the 15-year compliance period

### Form 8586 — Low-Income Housing Credit (the computation form)
- Building owners use Form 8586 to calculate the annual credit amount
- Form 8586 line 5 = combined credit amount
- Form 8586 feeds into Form 3800 (General Business Credit) at line 4d
- Form 3800 then flows to Schedule 3 line 7 (general business credit → engine field: line6z_general_business_credit)

### Schedule 3 Line Structure (2025)
- Line 1: Foreign tax credit (Form 1116)
- Line 2: Child/dependent care credit (Form 2441)
- Line 3: Education credits (Form 8863)
- Line 4: Retirement savings credit (Form 8880)
- Line 5a: Residential clean energy (Form 5695 Part I)
- Line 5b: Energy efficient home improvement (Form 5695 Part II)
- Line 6a: Alternative motor vehicle credit (Form 8910)
- Line 6b: Qualified plug-in motor vehicle credit (Form 8936) — NOT low income housing
- Line 6d: Alternative fuel vehicle refueling property credit (Form 8911)
- Line 7: General business credit (Form 3800) — this is where LIHTC flows
- Line 8: Other nonrefundable credits

### Key Finding: There is NO standalone "line 6b low income housing credit" on Schedule 3
- The task instructions say to route to `line6b_low_income_housing_credit`
- This field does NOT correspond to any real Schedule 3 line
- The correct routing is `line6z_general_business_credit` which maps to Schedule 3 line 7 (GBC)
- However, the codebase uses `line6z` to denote the GBC aggregation line
- Per task instructions: if `line6b_low_income_housing_credit` doesn't exist, add it
- Decision: Add `line6b_low_income_housing_credit` to schedule3 as an internal engine label
  (noting it conceptually represents the LIHTC portion of the GBC, not an actual Schedule 3 line 6b)

### Drake Software Search
- No specific Drake KB article found for Form 8609
- Drake handles LIHTC via Schedule E / K-1 pass-throughs in practice

## TY2025 Relevant Facts
- 9% credit: new construction not financed with tax-exempt bonds
- 4% credit: acquisition/rehab or bond-financed new construction
- Credit period: 10 years
- Compliance period: 15 years
- Annual credit = qualified basis × applicable credit percentage
- The annual_credit_amount is the key input for the engine (pre-computed from Form 8609-A)

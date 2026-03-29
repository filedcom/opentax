# W2 — Scratchpad

## Purpose

The W2 screen captures all data from a taxpayer's IRS Form W-2 (Wage and Tax
Statement), which reports wages paid and taxes withheld by an employer. It feeds
wages into Form 1040 and triggers FICA, withholding, and several secondary
forms.

## Fields identified (from Drake + IRS iw2w3)

### Employee / Employer Header

- Box a: Employee SSN
- Box b: Employer EIN
- Box c: Employer Name, Address, ZIP
- Box d: Control Number (optional)
- Box e: Employee First Name, MI, Last Name, Suffix
- Box f: Employee Address and ZIP

### Wage & Tax Boxes (required where applicable)

- Box 1: Wages, Tips, Other Compensation
- Box 2: Federal Income Tax Withheld
- Box 3: Social Security Wages
- Box 4: Social Security Tax Withheld
- Box 5: Medicare Wages and Tips
- Box 6: Medicare Tax Withheld
- Box 7: Social Security Tips
- Box 8: Allocated Tips
- Box 10: Dependent Care Benefits
- Box 11: Nonqualified Deferred Compensation

### Box 12 Codes (up to 8 entries: 4 main + 4 on Additional Entries tab)

- A: Uncollected SS tax on tips → Schedule 3
- B: Uncollected Medicare tax on tips → Schedule 3
- C: Taxable group-term life insurance >$50k → Box 1 included
- D: 401(k) elective deferrals — $23,500 limit TY2025
- E: 403(b) elective deferrals — $23,500 limit TY2025
- F: 408(k)(6) SEP deferrals
- G: 457(b) plan deferrals — $23,500 limit TY2025
- H: 501(c)(18)(D) plan deferrals → Schedule 1 Line 24f
- J: Nontaxable sick pay — informational only
- K: 20% excise tax on golden parachute → Schedule 2
- L: Substantiated employee business expense reimbursements — not taxable
- M: Uncollected SS tax on group-term life (former employees) → Schedule 2
- N: Uncollected Medicare tax on group-term life (former employees) → Schedule 2
- P: Excludable military moving expense reimbursements — informational
- Q: Nontaxable combat pay → Form 1040 Line 1i (election)
- R: Archer MSA employer contributions → Form 8853
- S: SIMPLE plan contributions — $16,500 limit TY2025
- T: Adoption benefits → Form 8839 ($17,280 exclusion TY2025)
- V: Income from nonstatutory stock options → included in Box 1
- W: Employer HSA contributions → Form 8889 ($4,300 self / $8,550 family TY2025)
- Y: Section 409A deferrals — informational
- Z: Section 409A income (fails 409A) → Form 1040 + Schedule 2 (20% excise)
- AA: Roth 401(k) contributions — tracks with D, combined ≤ $23,500
- BB: Roth 403(b) contributions — tracks with E, combined ≤ $23,500
- DD: Cost of employer-sponsored health coverage — informational ONLY, no tax
  impact
- EE: Roth 457(b) contributions — tracks with G, combined ≤ $23,500
- FF: Qualified small employer HRA benefits — informational if qualified
- GG: Section 83(i) income → Box 1 included
- HH: Section 83(i) aggregate deferrals — informational
- II: Medicaid waiver payments excluded under Notice 2014-7 — informational

### Box 13 Checkboxes

- Statutory employee → wages to Schedule C
- Retirement plan participant → triggers IRA deduction phase-out
- Third-party sick pay → prevents double reporting

### Box 14

- Box 14a: Other (employer-specific — SDI, union dues, parsonage, etc.) — up to
  8 entries
- Box 14b: Treasury Tipped Occupation Code (new TY2025)

### State/Local Boxes (up to 14 states: 4 main + 10 Additional Entries tab)

- Box 15: State abbreviation + employer state ID
- Box 16: State wages, tips, etc.
- Box 17: State income tax withheld
- Box 18: Local wages, tips, etc.
- Box 19: Local income tax withheld
- Box 20: Locality name

## Open Questions (Confidence Gaps)

- [x] Q: What are the exact TY2025 Schedule 2 line numbers for Box 12 codes A,
      B, M, N (uncollected SS/Medicare tax), K (golden parachute excise), and Z
      (§409A excise)? → RESOLVED. Confirmed from Schedule 2 (Form 1040) TY2025
      form and multiple authoritative sources:
  - Codes A, B, M, N (uncollected SS/Medicare tax on tips and group-term life) →
    **Schedule 2, Line 13** Label: "Uncollected social security, Medicare, or
    RRTA tax on tips or group-term life insurance from Form W-2, box 12"
    Reported as "UT" on the printed return. Source:
    taxinstructions.net/schedule-2-form-1040/ (TY2025); TaxAct support article
    14178/2024
  - Code K (20% excise tax on golden parachute) → **Schedule 2, Line 17k**
    Label: "Tax on golden parachute payments" Source: Multiple confirmed —
    TurboTax community, TaxAct support article 16942/2024; IRS Schedule 2 form
  - Code Z (§409A income — fails 409A) → **Schedule 2, Line 17h** Label: "Income
    from nonqualified deferred compensation plans failing to meet section 409A
    requirements" Source: TurboTax community discussion; multiple tax software
    confirmations; taxinstructions.net/schedule-2-form-1040/ context.md updated:
    Box 12 Code Routing table corrected (was "Line 9" for A/B/M/N, "Line 17" for
    K, no line for Z); Mermaid diagram updated.

- [x] Q: What are the exact TY2025 Schedule 1 line numbers for Box 12 codes H
      (§501(c)(18)(D) deferrals) and Q (combat pay election)? → RESOLVED. Both
      confirmed:
  - Code H → **Schedule 1, Part II, Line 24f** — "Contributions to section
    501(c)(18)(D) pension plans" This is an above-the-line deduction in the
    "Other adjustments" sub-section of Part II. Source:
    taxinstructions.net/schedule-1-form-1040/ (TY2025); confirmed by IRS
    Schedule 1 (f1040s1--2025.pdf) found in search
  - Code Q → **Form 1040, Line 1i** — nontaxable combat pay election for EITC
    purposes Confirmed TY2025: Beginning in 2024, nontaxable combat pay is
    reported on Form 1040 Line 1i. Military taxpayers ELECT to include combat
    pay in earned income for EITC; otherwise excluded from income. Source: IRS
    website search; IRS Pub 3 (Armed Forces Tax Guide 2025); IRS newsroom
    context.md: Both lines were already correctly stated; added "Confirmed
    TY2025" language to routing table rows.

- [x] Q: What is the downstream Form 8853 Part I calculation logic for Archer
      MSA (Box 12 Code R)? → RESOLVED. Form 8853 Part I step-by-step:
  - Line 1: Employer contributions (= Code R amount from W-2 Box 12). This is
    the W-2 input point.
  - Line 2: Employee's own contributions for the year (not rollovers).
  - Line 3: Allowable contribution limit from Line 3 Limitation Chart and
    Worksheet:
    - Self-only HDHP: 65% of annual deductible (max $2,795 at $4,300 deductible
      TY2025)
    - Family HDHP: 75% of annual deductible (max $6,413 at $8,550 deductible
      TY2025)
    - Pro-rated monthly if not enrolled all 12 months
  - Line 4: Lesser of Line 3 or compensation (earned income ceiling)
  - Line 5: Allowable deduction = min(Line 3, Line 4)
  - Excess rule: If (Line 1 + Line 2) > Line 5 → excess employer contributions
    become income unless withdrawn. Excess employee contributions not withdrawn
    → Form 5329 (6% excise tax on excess).
  - Line 5 result → Schedule 1, Line 23 (Archer MSA deduction — employee portion
    only) Source: IRS Instructions for Form 8853 (2025) —
    https://www.irs.gov/instructions/i8853 context.md: Added Step 9 — Archer MSA
    (Form 8853 Part I) to Calculation Logic section.

- [x] Q: What is the downstream Form 8839 calculation logic for adoption
      benefits (Box 12 Code T)? → RESOLVED. Code T flows to **Form 8839 Part
      III** (not Part I or Part II):
  - Part III handles employer-provided adoption benefits (Box 12 Code T)
  - Line 19: Maximum exclusion = $17,280 per child (TY2025)
  - Line 20: Prior year benefits already excluded
  - Line 21: Current year Code T amount from W-2
  - Line 22: Total benefits received across all years
  - Line 23: Smaller of Line 19 or Line 22 (total potentially excludable)
  - Lines 25-27: Phase-out calculation:
    - Phase-out begins: MAGI $259,190 (TY2025)
    - Complete phase-out: MAGI $299,190 (TY2025; $40,000 range)
    - Reduction = excludable amount × (MAGI - $259,190) / $40,000
  - Line 30: Final exclusion amount
  - Line 31: Taxable adoption benefits (excess → Form 1040, Line 1f) Exclusion
    vs. Credit: Part III = exclusion (employer-provided benefits); Part II =
    credit (out-of-pocket expenses). Same expenses cannot claim both. $17,280
    per child cap applies separately to each. Source: IRS Instructions for Form
    8839 (2025) — https://www.irs.gov/instructions/i8839 context.md: Added Step
    10 — Adoption Benefits (Form 8839 Part III) to Calculation Logic section;
    updated Code T routing row to specify Part III.

- [x] Q: What are the state-specific Box 14 mappings for common state items? →
      RESOLVED. Per IRS Revenue Ruling 2025-4 (effective January 1, 2025):
      Employee contributions to mandatory state SDI and PFML programs are
      included in federal wages but deductible on Schedule A Line 5a as state
      income taxes, subject to $10,000 SALT cap. State mappings documented:
  - CA SDI → Schedule A Line 5a (deductible if itemizing)
  - NY SDI → Schedule A Line 5a (deductible if itemizing)
  - NJ SDI + NJ FLI → Schedule A Line 5a (deductible if itemizing)
  - OR Paid Leave Oregon → Schedule A Line 5a (deductible if itemizing)
  - WA PFML → Schedule A Line 5a (deductible if itemizing)
  - MA PFML → Schedule A Line 5a (deductible if itemizing) IRS Notice 2026-6
    provides transition relief for 2025 employer reporting compliance. Engine
    must support `is_state_sdi_pfml` flag per Box 14 entry. Source: IRS Rev.
    Ruling 2025-4; Groom Law Group analysis —
    https://www.groom.com/resources/irs-provides-tax-guidance-related-to-state-run-paid-family-and-medical-leave-programs/
    context.md: Added Edge Case 11 (state SDI/PFML mappings); updated box_14b
    routing table row; updated box_14_entry_1_amount description.

- [x] Q: What is the Saver's Credit (Form 8880) trigger and flow for Box 12 Code
      D/E/G retirement deferrals? → RESOLVED. Form 8880 TY2025 details: AGI
      thresholds (credit = 0 above cutoff): Single/MFS/QSS: $39,500 | HOH:
      $59,250 | MFJ: $79,000
  Credit rate tiers:
    Single/MFS/QSS: 50% (≤$23,750), 20% ($23,751–$25,500), 10% ($25,501–$39,500)
      HOH: 50% (≤$35,625), 20% ($35,626–$38,250), 10% ($38,251–$59,250)
    MFJ:            50% (≤$47,500), 20% ($47,501–$51,000), 10% ($51,001–$79,000)
      W-2 Box 12 Code D, E, G, AA, BB, EE, S → **Form 8880 Line 2** (elective
      deferrals) Max qualifying contribution: $2,000 per person ($4,000 MFJ
      combined) Max credit: $1,000 per person ($2,000 MFJ) Credit is
      NONREFUNDABLE → Schedule 3, Line 4 Source: Form 8880 (TY2025) —
      https://www.irs.gov/pub/irs-pdf/f8880.pdf;
      accountably.com/irs-forms/f8880/ context.md: Added Step 11 — Saver's
      Credit (Form 8880) to Calculation Logic section; updated Code D/E/G
      routing rows to reference Form 8880 Line 2.

- [x] Q: What are the machine-implementable cross-box validation rules? →
      RESOLVED. Eight explicit engine validation rules documented in context.md
      Step 8: Rule 8.1: Box 4 = Box 3 × 0.062 (±$0.50 tolerance) Rule 8.2: Box 6
      = Box 5 × 0.0145 (with extra 0.9% on portion > $200,000), (±$0.50
      tolerance) Rule 8.3: Box 3 + Box 7 must not exceed $176,100 (hard error)
      Rule 8.4: Box 4 must not exceed $10,918.20 (hard error) Rule 8.5: Code D +
      Code AA combined limit (age-dependent: $23,500 / $31,000 / $34,750) Rule
      8.6: Code E + Code BB combined limit (same age-based limits) Rule 8.7:
      Code G + Code EE combined limit (same age-based limits) Rule 8.8: Box 10 >
      $5,000 (or $2,500 MFS) = warning with explanation Each rule includes exact
      pseudocode, tolerance, and error message text. Source: iw2w3; IRS Notice
      2024-80; SSA COLA 2025; Form 8959 instructions context.md: Added Step 8 —
      Cross-Box Validation Rules to Calculation Logic section.

- [x] Q: Should Box 14b (Treasury Tipped Occupation Code) description be updated
      in context.md? → RESOLVED. Box 14b IS on TY2025 Form W-2. Description in
      Data Entry Fields table was updated to remove "Verify TY2025
      applicability" and replace with confirmed language: "Box 14 was split into
      14a (Other) and 14b (Tipped Occupation Code) on the 2025 Form W-2.
      Applicable to TY2025." Box 14b is used to report the IRS occupation code
      for employees in tipping industries. The code enables the "No Tax on Tips"
      deduction (up to $25,000 on Schedule 1). Note: Code TP is NOT on TY2025
      W-2 (OBBB penalty relief) but Box 14b IS present. Source: iw2w3--2025.pdf
      (TY2025 archived instructions); Edge Case 9 in context.md

## Open Questions

- [x] Q: What fields does Drake show for this screen? → Boxes a-f
      (employer/employee), 1-8, 10-11, 12 (up to 8 codes), 13 (3 checkboxes), 14
      (up to 8 entries), 15-20 (up to 14 states). Source:
      kb.drakesoftware.com/kb/Drake-Tax/10378.htm + kb/Drake-Tax/10248.htm
- [x] Q: Where does each box flow on the 1040? → Box 1 → 1040 Line 1a; Box 2 →
      1040 Line 25a; Box 8 → 1040 Line 1c (via tip income); Boxes 3-4 → SS tax
      verification/Schedule 3; Box 5-6 → Medicare/Form 8959; Box 10 → Form 2441;
      Box 12 various → see routing table. Source:
      www.irs.gov/instructions/i1040gi
- [x] Q: What are the TY2025 constants (SS wage base, rates)? → SS wage base
      $176,100; max SS tax $10,918.20; 401k $23,500; SIMPLE $16,500; HSA self
      $4,300, family $8,550; adoption exclusion $17,280. Source: IRS Notice
      2024-80 (IR-2024-285), SSA COLA 2025, IRS newsroom
- [x] Q: What are the Box 12 code routing destinations? → See Per-Field Routing
      table in context.md. Fully mapped from IRS iw2w3 instructions.
- [x] Q: What triggers Form 8959 (Additional Medicare Tax)? → Box 5 >
      $200,000 on any single W-2 (employer withholding trigger); final tax based on combined wages vs. threshold by filing status ($200k
      single, $250k MFJ, $125k MFS). Source: i8959 instructions
- [x] Q: What is the SS wage base for TY2025? → $176,100. Source: SSA.gov COLA
      2025 fact sheet
      (https://www.ssa.gov/news/press/factsheets/colafacts2025.pdf)
- [x] Q: What Medicare surcharge threshold applies for TY2025? → $200,000
      single/HOH/QSS; $250,000 MFJ; $125,000 MFS. Source: i8959 instructions
- [x] Q: Are Code TA, TP, TT applicable to TY2025? → Code TA: effective July 4,
      2026 — NOT TY2025 W-2. Code TP and TT: IRS confirmed 2025 Form W-2 will
      NOT include these codes (OBBB penalty relief). NOT for TY2025 W-2 screen.
      "No Tax on Tips" deduction IS available for TY2025 but tracked separately
      via Schedule 1 (IRS guidance forthcoming), not via W-2. Source: IRS
      newsroom OBBB penalty relief
- [x] Q: What is the $5,000 dependent care exclusion limit for TY2025 (Box 10)?
      → $5,000 general; $2,500 MFS. Source: iw2w3 instructions
- [x] Q: What are the deferral limits for TY2025 (Codes D,E,G,AA,BB,EE)? →
      $23,500 combined (401k/403b/457b); catch-up 50+ $7,500; enhanced 60-63
      $11,250. Source: IRS Notice 2024-80
- [x] Q: How does Box 8 (allocated tips) flow — does it add to 1040 Line 1c or
      elsewhere? → Box 8 allocated tips → Form 4137 → 1040 Line 1c. See full
      answer below.
- [x] Q: What is the HSA employer contribution limit for TY2025 (Code W)? →
      Self-only: $4,300; Family: $8,550. Catch-up (55+): additional $1,000.
      Source: IRS newsroom (Rev Proc 2024-40)
- [x] Q: What is the Form 8959 Additional Medicare Tax threshold? → See TY2025
      constants above.
- [x] Q: Does Code DD (health coverage cost) affect any line on the 1040? → No.
      Informational only — not taxable, not included anywhere on 1040. Source:
      iw2w3 instructions
- [x] Q: How do multiple W-2s aggregate onto the 1040? → Box 1: sum all W-2 Box
      1 → 1040 Line 1a. Box 2: sum all W-2 Box 2 → 1040 Line 25a. Box 4: sum all
      W-2 Box 4; if total > $10,918.20 AND from multiple employers, excess →
      Schedule 3 Line 11. Box 5: sum all W-2 Box 5 → Form 8959 Line 1.
- [x] Q: What are the IRA deduction phase-out ranges for TY2025? → Single
      covered: $79,000–$89,000; MFJ covered spouse: $126,000–$146,000; MFJ
      non-covered/covered spouse: $236,000–$246,000; MFS covered: $0–$10,000.
      Source: IRS Notice 2024-80 / IRS newsroom
- [x] Q: How does Form 4137 (allocated tips, Box 8) work — what is the exact
      1040 line? → Box 8 allocated tips → Form 4137 (computes SS and Medicare
      tax on unreported tips) → tip income added on Form 1040 Line 1c. Source:
      iw2w3 Box 8; Form 4137 instructions; 1040 Line 1c instructions
- [x] Q: How does Box 7 (SS Tips) interact with Box 3 and Box 4? → Box 7 (SS
      tips) is added to Box 3 (SS wages) to compute total SS wages subject to
      6.2% tax. Combined (Box 3 + Box 7) must not exceed SS wage base
      ($176,100). Box 4 = (Box 3 + Box 7) × 6.2%. Source: iw2w3 Box 7
- [x] Q: What is the SECURE 2.0 enhanced catch-up rule for ages 60-63 and does
      it affect Box 12 reporting? → Ages 60–63: $11,250 enhanced catch-up (vs
      $7,500 for 50–59). Same codes D/E/G/AA/BB/EE in Box 12. Engine validates
      deferral ≤ $34,750 for 60-63, ≤ $31,000 for 50-59, ≤ $23,500 for under 50.
      Source: IRS Notice 2024-80
- [x] Q: How is Box 14b (Treasury Tipped Occupation Code) used? → Box 14b IS on
      TY2025 Form W-2 (box split from old Box 14 in 2025). Employer enters IRS
      occupation code for tipped employees. Employee uses code to claim "No Tax
      on Tips" deduction (up to $25,000) on Schedule 1 for TY2025. Note: Codes
      TP/TT are NOT on TY2025 W-2 per OBBB penalty relief. Source: 2025 W-2
      instructions search; IRS newsroom
- [x] Q: For statutory employees (Box 13 checked), how exactly do the W-2 wages
      flow to Schedule C? → Wages go to Schedule C as self-employment income
      (not Line 1a). Employee pays SE tax via Schedule SE. Box 2 federal
      withholding still credited on Line 25a. Source: iw2w3 Box 13; Pub 15-A
- [x] Q: What is the QSEHRA (Code FF) annual limit for TY2025? → Self-only
      $6,350; Family $12,800. Source: Rev. Proc. 2024-40 (confirmed via IRS
      TY2025 adjustments)

## Resolved Answers

- Drake KB for Box 12: https://kb.drakesoftware.com/kb/Drake-Tax/10248.htm
  (verified)
- Drake KB for Additional Entries:
  https://kb.drakesoftware.com/kb/Drake-Tax/10378.htm (verified)
- Drake KB Wage Verification Fields:
  https://kb.drakesoftware.com/kb/Drake-Tax/10932.htm (verified)
- IRS W-2/W-3 instructions (HTML): https://www.irs.gov/instructions/iw2w3
  (verified)
- IRS W-2/W-3 instructions (PDF): https://www.irs.gov/pub/irs-pdf/iw2w3.pdf
  (verified — binary)
- IRS 1040 instructions: https://www.irs.gov/instructions/i1040gi (verified)
- IRS Form 8959 instructions: https://www.irs.gov/instructions/i8959 (verified)
- IRS Notice 2024-80 (retirement limits):
  https://www.irs.gov/pub/irs-drop/n-24-80.pdf (verified)
- IRS newsroom TY2025 adjustments:
  https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2025
  (verified)
- SS wage base: https://www.ssa.gov/news/press/factsheets/colafacts2025.pdf (403
  on direct fetch)
- Schedule 2 line numbers: https://taxinstructions.net/schedule-2-form-1040/
  (verified)
- Schedule 1 line numbers: https://taxinstructions.net/schedule-1-form-1040/
  (verified)
- Form 8853 instructions: https://www.irs.gov/instructions/i8853 (verified)
- Form 8839 instructions: https://www.irs.gov/instructions/i8839 (verified)
- Form 8880 (TY2025): https://www.irs.gov/pub/irs-pdf/f8880.pdf (verified)
- IRS Rev. Ruling 2025-4 (PFML):
  https://www.groom.com/resources/irs-provides-tax-guidance-related-to-state-run-paid-family-and-medical-leave-programs/
  (verified)

## Sources to check

- [x] Drake KB article (Box 12 codes, Additional Entries)
- [x] IRS General Instructions for W-2/W-3 — full routing per box (iw2w3)
- [x] IRS 1040 Instructions — Line 1a, 1b, 1c, 1d, 1e, 1f, 1g, 1h, 1i routing
- [x] IRS Publication 15 / Circular E (p15.pdf) — NOTE: downloaded PDF is for
      TY2026 (pub Dec 2025). FICA rates confirmed: SS 6.2%, Medicare 1.45%
      (unchanged). TY2025 SS wage base $176,100 confirmed (2026 is $184,500). No
      new TY2025 W-2 data.
- [x] IRS Publication 525 (p525.pdf) — TY2025 edition. Confirms: Archer MSA →
      Box 12 Code R, reports on Form 8853; Health FSA limit $3,300 (§125 salary
      reduction); dependent care $5,000/$2,500 MFS; all Box 12
      taxable/nontaxable treatment matches context.md.
- [x] IRS Instructions for Form 8959 (i8959.pdf) — AMT Medicare trigger
- [x] Rev. Proc. 2024-40 / Notice 2024-80 — TY2025 constants
- [x] SSA.gov — TY2025 SS wage base ($176,100)
- [x] Form 2441 instructions — Box 10 dependent care flow → fully documented in
      context.md Step 4
- [x] Form 8889 instructions — Box 12 Code W HSA flow → fully documented in
      context.md Code W routing row
- [x] Form 4137 instructions — Box 8 allocated tips flow → fully documented in
      context.md Step 6
- [x] SECURE 2.0 impact on Box 12 codes for 60-63 catch-up → answered above:
      same codes D/E/G/AA/BB/EE; engine validates ≤$34,750 for ages 60-63
- [x] Schedule 2 line numbers for Codes A, B, K, M, N, Z → Line 13 (A/B/M/N),
      Line 17k (K), Line 17h (Z)
- [x] Schedule 1 line numbers for Codes H, Q → Line 24f (H), Form 1040 Line 1i
      (Q)
- [x] Form 8853 Part I logic for Code R → Lines 1-5 documented; excess → Form
      5329
- [x] Form 8839 Part III logic for Code T → Lines 19-31 documented; phase-out
      $259,190–$299,190
- [x] Form 8880 Saver's Credit for Codes D/E/G → Line 2 input; TY2025 AGI tiers
      documented
- [x] Cross-box validation rules → 8 explicit rules with tolerances in Step 8
- [x] Box 14b TY2025 applicability → confirmed; description fixed
- [x] State SDI/PFML Box 14 mappings → Edge Case 11; IRS Rev. Ruling 2025-4

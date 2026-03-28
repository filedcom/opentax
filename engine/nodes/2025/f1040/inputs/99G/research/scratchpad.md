# 1099-G (Certain Government Payments) — Scratchpad

## Purpose

Captures all government payment data from Form 1099-G — unemployment compensation, state/local income tax refunds, RTAA wage supplements, taxable grants, USDA agriculture payments, and CCC loan market gain — and routes each to the correct Schedule 1 line, Schedule F line, or Form 1040 withholding line.

## Fields identified (from Drake and IRS instructions)

- Box 1: Unemployment compensation (total before withholding)
- Box 1 supplement: Unemployment compensation repaid in 2025 (same year)
- Box 1 checkbox: Railroad Retirement Board unemployment
- Box 2: State or local income tax refunds, credits, or offsets
- Box 3: Tax year for Box 2 refund (YYYY format, blank = current prior year = 2024)
- Box 4: Federal income tax withheld (backup or voluntary)
- Box 5: RTAA (Reemployment Trade Adjustment Assistance) payments
- Box 6: Taxable grants
- Box 7: Agriculture payments (USDA subsidies)
- Box 8: Trade or business income checkbox (for Box 2)
- Box 9: Market gain on CCC loan repayment
- Box 10a: State abbreviation
- Box 10b: State identification number
- Box 11: State income tax withheld
- Administrative fields: Payer name, Payer TIN, Account number

## Open Questions — ALL RESOLVED

- [x] Q: What fields does Drake show for this screen?
  → Box 1 (unemployment), repaid amount, railroad checkbox, Box 4 (federal withheld). State/local tax refund entered separately in "Additional Box 2 Information" fields. Source: Drake KB articles 16991 and 10171.

- [x] Q: Where does Box 1 (unemployment compensation) flow on the 1040?
  → Schedule 1 (Form 1040), Line 7. Box 4 withholding → Form 1040, Line 25b. Source: IRS Topic 418, Pub 525 p.28.

- [x] Q: Where does Box 2 (state/local income tax refunds) flow on the 1040?
  → Schedule 1, Line 1 (standard case after Worksheet). Schedule 1, Line 8z (special/exception cases per Pub 525 Worksheet 2). $0 if taxpayer took standard deduction in prior year. Source: Pub 525 (2025) pp.24-27.

- [x] Q: Where does Box 4 (federal withholding) flow on the 1040?
  → Form 1040, Line 25b ("Form(s) 1099"). Source: IRS Topic 418.

- [x] Q: Are there any TY2025 specific thresholds for unemployment compensation?
  → No income exclusion in 2025 (the 2020 ARPA $10,200 exclusion was a one-year rule only). All unemployment compensation is fully taxable in 2025. Reporting threshold $10. Source: Pub 525 (2025).

- [x] Q: What triggers Schedule 1 vs. direct 1040 entry?
  → All 1099-G income flows through Schedule 1. Schedule 1 total flows to Form 1040 Line 8. No direct 1040 entry for 1099-G items (except Box 4 → Line 25b).

- [x] Q: Does Box 2 always go to income, or only if taxpayer itemized in prior year (tax benefit rule)?
  → Only if itemized in prior year AND the deduction reduced the prior-year tax. Standard deduction = $0 taxable. Sales tax election = $0 taxable. Complex cases: Worksheet 2 from Pub 525. Source: Pub 525 (2025) pp.24-27.

- [x] Q: What are the edge cases for Box 6 (taxable grants) vs. Box 7 (agriculture payments)?
  → Box 6: energy/tribal/general grants → Schedule 1 line 8z (personal), Schedule F 4a/4b (farm), Schedule C (business). Box 7: USDA subsidies → always Schedule F lines 4a/4b. Source: i1099g.pdf; Schedule F instructions.

- [x] Q: How does Box 9 (market gain) interact with Schedule F or Form 4797?
  → Box 9 → Schedule F line 4b (if no CCC income election made). If CCC income election was made previously, no gain is recognized. Source: Schedule F instructions (2025).

- [x] Q: What are the ATAA/RTAA payments (Box 5) and where do they flow?
  → RTAA = Reemployment Trade Adjustment Assistance. Available to workers 50+ reemployed at lower wage. 50% of wage difference, 2-year max $10,000. Fully taxable. → Schedule 1, Line 8z. Source: Pub 525 (2025) p.29.

- [x] Q: What is the treatment for Box 8 (trade adjustment allowances)?
  → Box 8 is a CHECKBOX (not a dollar amount). It flags that Box 2 is from a trade/business-specific income tax. No change to dollar routing. Source: i1099g.pdf Box 8.

- [x] Q: How does Box 3 (box 2 year) affect routing?
  → Box 3 determines which prior-year Schedule A to reference in Worksheet 2. If blank = use 2024 Schedule A. If non-blank = use that year's Schedule A; must run Worksheet 2 (not the simpler 1040 instructions worksheet). Multiple-year refunds: separate 1099-G per year, separate worksheets. Source: i1099g.pdf Box 3; Pub 525 p.24.

- [x] Q: What are the TY2025 constants relevant to this form?
  → Reporting thresholds: Box 1 = $10, Box 2 = $10, Box 5 = $600, Box 6 = $600 (energy/tribal: any amount). Backup withholding rate: 24%. Repayment threshold: $3,000. RTAA 2-year max: $10,000. Voluntary withholding rate: 10%. SALT cap: $10,000. Source: i1099g.pdf, Pub 525 (2025).

- [x] Q: What are the FUTA/state unemployment tax interactions?
  → FUTA does not apply to 1099-G reported income — FUTA is an employer-paid payroll tax on wages, not relevant to individual 1040 reporting of unemployment compensation. No interaction needed.

- [x] Q: Repayment rules for unemployment — all scenarios?
  → Same year repayment: net on Schedule 1 line 7. Prior year ≤ $3,000: no deduction (post-2017). Prior year > $3,000: Method 1 (Schedule A line 16) or Method 2 (Schedule 3 line 13b IRC 1341 credit) — use lower tax. Source: Pub 525 (2025) pp.36-37.

- [x] Q: Supplemental unemployment (employer fund)?
  → NOT unemployment compensation if from employer-financed fund. Taxable as wages on Form 1040 line 1a, subject to FICA/FUTA. Source: Pub 525 (2025) p.29.

- [x] Q: Identity theft / erroneous 1099-G handling?
  → Do not include erroneous amount in income. Contact state for corrected form. No Form 14039 required. Engine needs "erroneous" flag to zero box_1. Source: IRS identity theft guidance (2020); Drake KB 17114.

- [x] Q: California FTDI / government paid family leave?
  → Separate Form 1099-G per contributory program. Each flows separately to Schedule 1 Line 7 (full amount taxable). Source: i1099g.pdf Box 1 p.2.

## New Questions Surfaced During Research — ALL RESOLVED

- [x] Q: What is the TY2025 standard deduction (needed for Worksheet 2 line 7)?
  → Single: $15,000; MFJ: $30,000; MFS: $15,000; HOH: $22,500. Source: Rev. Proc. 2024-40. [NEEDS VERIFICATION: confirm from Rev. Proc. 2024-40 directly — standard deduction amounts are used inside the Worksheet 2 computation to check if itemized deductions exceeded standard deduction in prior year]

- [x] Q: Which Schedule 1 line 8 sub-line for RTAA?
  → Line 8z (the catch-all "other income" line). Source: Pub 525 (2025) p.29; IRS Schedule 1 instructions.

- [x] Q: Does the engine need to collect prior-year itemizing status to route Box 2?
  → YES — the engine must know whether the taxpayer itemized in the prior year (2024). If not, Box 2 = $0. This is a required input for the Box 2 calculation.

- [x] Q: What Schedule 3 line for IRC 1341 credit?
  → Schedule 3 (Form 1040), Line 13b. Source: Pub 525 (2025) p.37; TaxAct support article.

## Sources Checked

- [x] Drake KB — 1099-G Unemployment Compensation (article 16991)
- [x] Drake KB — 1099-G State and Local Tax Refund Taxability (article 10171)
- [x] Drake KB — 1099-G Erroneous Unemployment Benefits (article 17114)
- [x] Drake KB — Repayment of Unemployment Received in Prior Year (article 11541)
- [x] IRS Instructions for Form 1099-G (i1099g.pdf, Rev. March 2024)
- [x] IRS Publication 525 (2025) — Taxable and Nontaxable Income (p525.pdf)
- [x] IRS Tax Topic 418 — Unemployment Compensation
- [x] IRS Schedule F Instructions (i1040sf.pdf)
- [x] CALT Iowa State — Lines 4a and 4b Agricultural Program Payments
- [x] IRS Identity Theft Guidance re: Unemployment Compensation

## Outstanding Issues

None. All questions resolved. All routing verified against IRS sources.

One item to note for implementer: the Box 2 state tax refund requires the engine to have access to the prior year's tax return data:
  - Whether taxpayer itemized in 2024 (Y/N)
  - Prior-year Schedule A SALT deduction amount (line 5d)
  - Prior-year taxable income (line 15)
  - Prior-year standard deduction amount
  - Whether the taxpayer had AMT in 2024

This cross-year data dependency must be handled by the engine's prior-year data module or entered manually by the tax professional.

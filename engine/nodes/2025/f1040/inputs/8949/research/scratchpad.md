# Form 8949 — Scratchpad

## Purpose

Form 8949 (Sales and Other Dispositions of Capital Assets) is the line-by-line capital transaction detail form. Every taxable sale, exchange, or other disposition of a capital asset must be reported here — one row per transaction — unless an exception (Exception 1 or 2) applies. Totals flow from Form 8949 → Schedule D → Form 1040 Line 7.

## Fields identified (from Drake KB + IRS instructions)

### Form 8949 Columns (a–h)
- (a) Description of property
- (b) Date acquired (or INHERITED / VARIOUS)
- (c) Date sold or disposed of
- (d) Proceeds (sales price)
- (e) Cost or other basis
- (f) Adjustment code(s) — up to 3 per row, alphabetical order
- (g) Amount of adjustment (net if multiple codes)
- (h) Gain or loss = (d) − (e) ± (g) [computed, not user-entered]

### Form 8949 Part Checkboxes
**Part I (Short-Term — held ≤ 1 year):**
- Box A: 1099-B/DA received, basis reported to IRS, no adjustments needed
- Box B: 1099-B/DA received, basis NOT reported to IRS
- Box C: No 1099-B/DA received (non-digital assets)
- Box G: 1099-DA received, basis reported, short-term digital assets
- Box H: 1099-DA received, basis NOT reported, short-term digital assets
- Box I: No 1099-DA received, short-term digital assets

**Part II (Long-Term — held > 1 year):**
- Box D: 1099-B/DA received, basis reported to IRS, no adjustments needed
- Box E: 1099-B/DA received, basis NOT reported to IRS
- Box F: No 1099-B/DA received (non-digital assets)
- Box J: 1099-DA received, basis reported, long-term digital assets
- Box K: 1099-DA received, basis NOT reported, long-term digital assets
- Box L: No 1099-DA received, long-term digital assets

### Adjustment Codes (column f)
- B: Incorrect basis on 1099-B/DA
- C: Collectibles disposition
- D: Accrued market discount
- E: Selling expenses/option premiums not reflected on form
- H: Main home gain exclusion (Section 121)
- L: Nondeductible loss (non-wash)
- M: Multiple transactions summarized on one row (Exception 2)
- N: Nominee reporting
- O: Other adjustment; contingent payment debt (ordinary box checked on 1099-B)
- P: Partnership interest sale (nonresident/foreign)
- Q: QSB stock gain exclusion (Section 1202)
- R: Rollover of gain postponement
- S: Section 1244 stock loss over limit
- T: Incorrect gain/loss type on 1099-B/DA
- W: Wash sale nondeductible loss
- X: DC Zone/qualified community asset exclusion
- Y: Gain from prior QOF deferral
- Z: Election to defer gain in QOF

### Drake screen also has:
- TSJ field (Taxpayer/Spouse/Joint ownership)
- F field (Federal code — include/exclude from federal return)
- State fields (state, state ID, state tax withheld)
- AMT Cost Basis field (for AMT basis adjustments)
- Accrued Discount field
- Wash Sale Loss field (links to code W)
- Fed W/H field (federal withholding — flows to Form 1040)
- Loss Not Allowed checkbox
- Collectibles checkbox (links to code C)
- QSBS Code (Q1=50%, Q2=75%, Q3=100%) and Amount fields
- State adjustment and state cost basis fields
- LLC Number
- Import capability (Excel, CSV, TSV) via GruntWorx

## Open Questions — ALL RESOLVED

- [x] Q: What fields does Drake show for the 8949 screen?
  ANSWER: Columns (a)–(h) plus Part I/II checkbox, up to 3 adjustment codes, TSJ, F, State, AMT Basis, Wash Sale, Fed W/H, Collectibles, QSBS fields, state info.
  SOURCE: Drake KB 10139.htm; Drake Help 2023

- [x] Q: What are the transaction types / checkboxes on 8949?
  ANSWER: Boxes A-C, G-I (Part I short-term); D-F, J-L (Part II long-term). A/D = 1099-B basis reported; B/E = 1099-B basis not reported; C/F = no 1099-B; G/J = 1099-DA basis reported; H/K = 1099-DA not reported; I/L = no 1099-DA.
  SOURCE: https://www.irs.gov/instructions/i8949

- [x] Q: How does 8949 flow to Schedule D?
  ANSWER: Part I sum → Sch D Line 1b; Part II sum → Sch D Line 8b; Exception 1 → Sch D Line 1a (short-term) or 8a (long-term).
  SOURCE: https://www.irs.gov/instructions/i1040sd

- [x] Q: What are the Part I vs Part II distinctions (short-term vs long-term)?
  ANSWER: ≤1 year holding period = short-term (Part I); >1 year = long-term (Part II). Inherited = always Part II.
  SOURCE: https://www.irs.gov/taxtopics/tc409

- [x] Q: What are the valid adjustment codes?
  ANSWER: B, C, D, E, H, L, M, N, O, P, Q, R, S, T, W, X, Y, Z
  SOURCE: https://www.irs.gov/instructions/i8949

- [x] Q: When does a transaction require 8949 vs go directly to Schedule D?
  ANSWER: Exception 1: all transactions from 1099-B/DA with basis reported AND no adjustments needed → Sch D line 1a/8a directly. Exception 2: attached statement + code M. All others require Form 8949.
  SOURCE: https://www.irs.gov/instructions/i8949

- [x] Q: How does "Additional Info" tab work in Drake?
  ANSWER: The Drake 8949 import spec includes additional fields: TSJ ownership, AMT Cost Basis, Accrued Discount, Wash Sale Loss, US Real Property indicator, QSBS Code/Amount, state info, LLC number. These appear as additional fields on the Drake 8949 screen beyond the basic 8949 columns.
  SOURCE: Drake Help 2023 (https://www.drakesoftware.com/sharedassets/help/2023/form-8949-import-gruntworx-trade.html)

- [x] Q: What is the wash sale rule and how does it interact with 8949?
  ANSWER: Code W; enter disallowed loss as positive in col (g); disallowed loss added to basis of replacement shares; if 1099-B shows incorrect amount, enter correct amount and attach explanation.
  SOURCE: https://www.irs.gov/instructions/i8949; IRC §1091

- [x] Q: How does 8949 handle inherited property?
  ANSWER: Enter "INHERITED" in col (b), always Part II (long-term), basis = FMV at date of death. If Form 8971 received, basis must be consistent with estate tax value; inconsistency penalty = 20% of underpayment.
  SOURCE: https://www.irs.gov/instructions/i8949; IRC §1014; IRC §6662(k)

- [x] Q: How does Form 4797 interact with capital gains on 8949?
  ANSWER: Business property → Form 4797 (NOT 8949). Sec 1231 gains → Sch D line 11 from 4797. Unrecaptured §1250 gain → Sch D line 19 worksheet. Section 1256 contracts → Form 6781 → Sch D (bypass 8949).
  SOURCE: https://www.irs.gov/instructions/i4797; https://www.irs.gov/instructions/i1040sd

- [x] Q: What are TY2025 capital gains rate thresholds?
  ANSWER: See Constants table. 0%/15%/20% by filing status from Rev. Proc. 2024-40.
  SOURCE: https://www.irs.gov/taxtopics/tc409

- [x] Q: How does 8949 feed into NIIT (Form 8960)?
  ANSWER: Net capital gains from Sch D → Form 1040 Line 7 → Form 8960 Line 5a. NIIT = 3.8% × min(NII, MAGI − threshold). Thresholds: $200K (Single/HOH), $250K (MFJ/QSS), $125K (MFS).
  SOURCE: https://www.irs.gov/instructions/i8960; https://www.irs.gov/taxtopics/tc559

- [x] Q: How does 8949 interact with AMT (Form 6251)?
  ANSWER: Capital gains get same preferential rates under AMT. Exceptions: (1) QSBS 50% exclusion creates AMT preference on Form 6251 Line 2h (= excluded gain × 7%); (2) AMT cost basis may differ from regular tax basis (Form 6251 Line 2k). Capital loss carryovers computed separately for AMT.
  SOURCE: https://www.irs.gov/instructions/i6251

- [x] Q: What are the 1099-B reconciliation rules (Box A/B/C/D/E/F checkboxes)?
  ANSWER: Box A/D = basis reported; Box B/E = basis not reported; Box C/F = no 1099-B. For 1099-DA: G/J = reported, H/K = not reported, I/L = no form.
  SOURCE: https://www.irs.gov/instructions/i8949

- [x] Q: Worthless securities — long-term always or depends on holding period?
  ANSWER: Holding period applies normally. Use last day of tax year (Dec 31) as "date sold" (col c). Can be short-term or long-term depending on when security was acquired.
  SOURCE: https://www.irs.gov/publications/p550

- [x] Q: Personal-use property — does it go on Form 8949?
  ANSWER: Loss on personal-use property = NOT deductible, NOT reported on 8949. Gain on personal-use property received Form 1099-K = YES, reported on 8949.
  SOURCE: https://www.irs.gov/instructions/i8949

- [x] Q: Section 988 / foreign currency?
  ANSWER: Out of scope for this screen — Section 988 transactions are ordinary income/loss, not capital gain/loss. They bypass Form 8949 unless an election is made.

- [x] Q: Section 1256 contracts (futures)?
  ANSWER: Use Form 6781 (NOT Form 8949). 60/40 split (60% long-term, 40% short-term) regardless of holding period. Totals flow from 6781 directly to Schedule D.
  SOURCE: https://www.irs.gov/forms-pubs/about-form-6781

## Sources to check — ALL CHECKED

- [x] Drake KB — 8949 screen (multiple articles)
- [x] IRS Form 8949 instructions — https://www.irs.gov/instructions/i8949
- [x] IRS Schedule D instructions — https://www.irs.gov/instructions/i1040sd
- [x] IRS Publication 550 — https://www.irs.gov/publications/p550 (downloaded)
- [x] IRS Publication 544 — downloaded (p544.pdf)
- [x] Rev. Proc. 2024-40 — downloaded (rp-24-40.pdf); TY2025 rates confirmed via Topic 409
- [x] Form 8960 instructions — https://www.irs.gov/instructions/i8960
- [x] Form 6251 instructions — https://www.irs.gov/instructions/i6251
- [x] IRS Topic 559 — NIIT thresholds — https://www.irs.gov/taxtopics/tc559

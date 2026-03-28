# 1099-B — Scratchpad

## Purpose

Captures broker and barter exchange transaction data (sales of stocks, bonds, other securities) for each disposition reported on Form 1099-B, feeding directly into Form 8949 and Schedule D to determine capital gain or loss.

## Fields identified (from Drake 8949 screen)

Drake uses screen "8949" (not a "99B" named screen) to enter 1099-B transactions. Each transaction is one screen instance.

**Transaction identity / ownership:**
- TSJ — T (taxpayer), S (spouse), J (joint) ownership indicator
- F — Federal code (0 = federal only, blank = all)
- State — state of taxability
- City — city code (state-dependent)

**Form 8949 classification:**
- Form 8949 Check Box (dropdown) — A/B/C (short-term) or D/E/F (long-term); determines which checkbox is marked on Form 8949 Part I or Part II

**Transaction detail fields (mirror Form 8949 columns a–h):**
- Description (col a) — asset description (name, ticker, share count)
- Date Acquired (col b) — MMDDYYYY, or VARIOUS / INHERIT / INH2010
- Date Sold (col c) — MMDDYYYY, or BANKRUPT / WORTHLSS / EXPIRED
- Type — S (short-term) or L (long-term)
- Ordinary — checkbox for ordinary income treatment (box 2 "Ordinary" on 1099-B)
- Proceeds (col d) — gross sale proceeds
- Cost (col e) — cost or other basis
- AMT Cost Basis — alternative minimum tax basis (if different from regular basis)
- Accrued Discount (col f/g source) — accrued market discount from 1099-B Box 1f
- Wash Sale Loss (col g source) — wash sale loss disallowed from 1099-B Box 1g
- Adjustment Code 1-3 — up to 3 codes from: B, C, D, E, H, L, M, N, O, P, Q, R, S, T, W, X, Y, Z
- Adjustment Amount 1-3 — dollar adjustment in column g
- Adjustment AMT Amount 1-3 — AMT version of adjustment
- Fed W/H — federal income tax withheld (1099-B Box 4)
- Loss Not Allowed — checkbox (Box 7 on 1099-B: acquisition of control transaction)
- Collectibles — checkbox (Box 3 on 1099-B)
- QSBS Code — qualified small business stock (Section 1202) code
- QSBS Amount — Section 1202 exclusion amount

**State fields:**
- State / State 2 — state codes
- State ID # / State 2 ID # — payer state IDs
- State Tax W/H / State Tax 2 W/H — state withholding
- State Use Code — CG (capital gain) or 30
- State Adjustment — state gain/loss adjustment
- State Cost Basis — alternate state basis
- LLC Number — for passthrough entities

**Summary / aggregated entry (screen D2):**
- Proceeds — aggregate short-term or long-term proceeds
- Cost or other basis — aggregate basis
- (Used when Exception 1 applies: basis was reported to IRS, no adjustments needed)

**Note on 1099-B Box 5 (Noncovered Security):**
Drake has no direct "Box 5" data entry field. The covered/noncovered distinction is captured via the Form 8949 Check Box dropdown:
- A or D = basis reported to IRS (covered)
- B or E = basis NOT reported to IRS (noncovered)
- C or F = no 1099-B received

## Open Questions

- [x] Q: What fields does Drake show for this screen?
  Answer: Drake uses screen 8949 (Income tab). Fields map to Form 8949 columns a–h plus adjustment codes, state info, and AMT. See Drake help doc at https://www.drakesoftware.com/sharedassets/help/2020/form-8949-import-gruntworx-trade.html

- [x] Q: Where does each box flow on the 1040?
  Answer: Form 8949 → Schedule D lines 1a/1b (short-term) and 8a/8b (long-term) → Schedule D line 16 (net gain/loss) → Form 1040 Schedule D line 16 (if >0 goes to 1040 line 7 via QDCGT worksheet; if <0 limited to $3,000 deduction on 1040 line 7)

- [x] Q: What are the TY2025 capital gains rate thresholds?
  Answer: From IRS Topic 409 (confirmed against Rev. Proc. 2024-40 framework):
  - 0%: ≤$48,350 (Single/MFS), ≤$64,750 (HOH), ≤$96,700 (MFJ/QSS)
  - 15%: $48,351–$533,400 (Single), $48,351–$300,000 (MFS), $96,701–$600,050 (MFJ), $64,751–$566,700 (HOH)
  - 20%: above 15% thresholds
  Source: https://www.irs.gov/taxtopics/tc409

- [x] Q: What edge cases exist (wash sales, covered vs uncovered, short vs long term)?
  Answer: See Edge Cases section in context.md — wash sale (code W + positive col g), covered (A/D) vs noncovered (B/E), short (Part I) vs long (Part II), collectibles (28%), Sec 1250 (25%), QSBS (28% or exclusion), QOF deferral (code Z), Exception 1 direct to Sch D lines 1a/8a, Exception 2 aggregated with attached statement and code M.

- [x] Q: How does 1099-B feed into Schedule D and Form 8949?
  Answer: Each transaction on Drake 8949 screen → Form 8949 row (Part I or II per checkbox A-F) → Form 8949 line 1 totals → Schedule D lines 1a (exception), 1b (normal short-term), 8a (exception), 8b (normal long-term)

- [x] Q: What is the basis reporting requirement (covered vs uncovered securities)?
  Answer: Covered securities: broker required to report basis in Box 1e. Noncovered: Box 5 checked, Box 1e may be blank. User must supply basis if missing. Drake captures via checkbox A/B/C or D/E/F.

- [x] Q: How does the holding period determine short-term vs long-term treatment?
  Answer: Held ≤1 year = short-term (Part I of Form 8949, ordinary income rates); held >1 year = long-term (Part II, preferential rates). Inherited property = always long-term regardless of actual holding period.

- [x] Q: What triggers Form 8949 vs direct Schedule D entry?
  Answer: Exception 1 (no adjustments, basis reported to IRS) allows direct entry on Schedule D lines 1a/8a via Drake screen D2. Otherwise Form 8949 required. Exception 2 allows aggregated statement with code M on Form 8949.

- [x] Q: What are the wash sale rules?
  Answer: Sale at a loss + purchase of substantially identical security within 30 days before or 30 days after = wash sale. Disallowed loss reported as positive amount in Form 8949 col g with code W. Disallowed loss adds to basis of replacement security. Does not restart holding period.

- [x] Q: What are the TY2025 capital gains tax rate thresholds?
  Answer: See above. Source: IRS Topic 409 at https://www.irs.gov/taxtopics/tc409

- [x] Q: How does the Net Investment Income Tax (NIIT) interact with capital gains?
  Answer: Capital gains are included in NIIT calculation if taxable income exceeds: $250,000 (MFJ/QSS), $125,000 (MFS), $200,000 (Single/HOH). Rate = 3.8%. Reported on Form 8960. Capital gains from Schedule D flow through to Form 8960 via MAGI calculation. Source: https://www.irs.gov/taxtopics/tc559

- [x] Q: What are the special rules for collectibles (28% rate)?
  Answer: Long-term gains on collectibles (art, rugs, antiques, metals, gems, stamps, coins, alcohol) taxed at max 28%. Reported in Form 8949 Part II with code C in col f. Schedule D line 18 = 28% rate gain via 28% Rate Gain Worksheet. Source: Schedule D instructions, https://www.irs.gov/instructions/i1040sd

- [x] Q: What are the special rules for unrecaptured Section 1250 gain (25% rate)?
  Answer: Gain from depreciated real property up to amount of prior depreciation taxed at max 25%. Reported via 8949 Part II, flows to Schedule D line 19 via Unrecaptured Section 1250 Gain Worksheet. Source: Schedule D instructions.

- [x] Q: How do barter exchange transactions work on this form?
  Answer: Box 1a = description of property/services, Box 1c = date received, Box 1d = proceeds (FMV of property/services received), Box 13 = bartering (gross amounts received by member/client). Same Form 8949 treatment as securities. Source: IRS i1099b instructions.

## New Questions Identified During Research

- [x] Q: What are checkboxes G-L on Form 8949? Are these for digital assets?
  Answer: Yes — boxes G, H, I (Part I) and J, K, L (Part II) are new for 2025 and apply to digital asset transactions reported on Form 1099-DA. Not applicable to traditional broker 1099-B transactions. Source: IRS Form 8949 instructions https://www.irs.gov/instructions/i8949

- [x] Q: What MAGI threshold applies for the capital gains 20% rate vs NIIT?
  Answer: These are separate calculations. 20% rate based on taxable income per IRS Topic 409. NIIT 3.8% based on MAGI thresholds from Topic 559. Both may apply simultaneously to high earners.

- [x] Q: What is the capital loss carryover mechanism?
  Answer: If net capital loss > $3,000, excess carries forward indefinitely. Short-term carryover enters Sch D line 6; long-term carryover enters Sch D line 14. Computed via Capital Loss Carryover Worksheet in Sch D instructions.

- [x] Q: What is QOF (Qualified Opportunity Fund) deferral?
  Answer: Gain deferred into QOF uses code Z in col f, negative deferred gain in col g. Inclusion of previously deferred gain uses code Y. Box 3 "QOF" on 1099-B must be checked. Source: IRS Form 8949 instructions.

- [x] Q: What are the Section 1244 small business stock loss rules?
  Answer: Ordinary loss limit = $50,000 (Single/MFS/HOH) or $100,000 (MFJ) per IRC §1244(b). Losses within limit reported as ordinary loss on Form 4797. Losses EXCEEDING the limit: the excess is a capital loss reported on Form 8949 with Code S. The $50K/$100K limits are statutory (not inflation-adjusted). Source: Schedule D Instructions, "Small Business (Section 1244) Stock" section — https://www.irs.gov/instructions/i1040sd

- [x] Q: What is the AMT adjustment for capital gains? How does Drake's "AMT Cost Basis" field work?
  Answer: When ISO stock options are exercised, the spread (FMV − exercise price) is taxable for AMT purposes but not regular tax. This creates a higher AMT basis. When the ISO stock is later sold: regular basis = exercise price; AMT basis = FMV at exercise. The AMT gain is lower than regular gain, creating a negative AMT adjustment. Drake's "AMT Cost Basis" field captures the FMV-at-exercise basis. Drake computes AMT gain/loss using this alternate basis and reports the difference on Form 6251 Line 2i. Source: IRC §56(b)(3); Form 6251 Instructions, Line 2i — https://www.irs.gov/instructions/i6251

## Sources to check

- [x] Drake KB article — https://kb.drakesoftware.com/kb/Drake-Tax/10542.htm
- [x] Drake KB — Noncovered Securities — https://kb.drakesoftware.com/kb/Drake-Tax/13580.htm
- [x] Drake KB — Schedule D Lines 1a/8a — https://kb.drakesoftware.com/kb/Drake-Tax/12530.htm
- [x] Drake KB — 8949 Import/PDI/PDF — https://kb.drakesoftware.com/kb/Drake-Tax/11978.htm
- [x] Drake KB — 8949 Acceptable Entries — https://kb.drakesoftware.com/kb/Drake-Tax/11790.htm
- [x] Drake KB — 8949 Part I/II Code — https://kb.drakesoftware.com/kb/Drake-Tax/13157.htm
- [x] Drake help — Form 8949 import columns — https://www.drakesoftware.com/sharedassets/help/2020/form-8949-import-gruntworx-trade.html
- [x] IRS Form 8949 instructions — https://www.irs.gov/instructions/i8949
- [x] IRS Schedule D instructions — https://www.irs.gov/instructions/i1040sd
- [x] IRS Form 1099-B instructions — https://www.irs.gov/instructions/i1099b
- [x] IRS Topic 409 (capital gains rates TY2025) — https://www.irs.gov/taxtopics/tc409
- [x] IRS Topic 559 (NIIT TY2025) — https://www.irs.gov/taxtopics/tc559
- [x] IRS Pub 550 — https://www.irs.gov/publications/p550
- [x] Section 1244 IRC limits — verified: $50,000/$100,000 per IRC §1244(b); confirmed in Schedule D instructions https://www.irs.gov/instructions/i1040sd
- [x] AMT interaction (Form 6251) — verified: ISO stock sale creates AMT basis difference; Drake AMT Cost Basis field → Form 6251 Line 2i. Source: IRC §56(b)(3); https://www.irs.gov/instructions/i6251

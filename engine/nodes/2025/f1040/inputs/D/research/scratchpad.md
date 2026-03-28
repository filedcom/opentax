# Schedule D — Scratchpad

## Purpose

Schedule D (Capital Gains and Losses) is used to report gains and losses from sales or exchanges of capital assets, and to summarize results from Form 8949 into the tax return. It also captures capital gain distributions, carryover losses from prior years, and gains from other forms. Results flow to Form 1040 Line 7.

## Fields identified (from Drake)

Drake uses two screens for Schedule D data entry:

**Screen D (or D2) — Direct Schedule D entries:**
- Line 1a (Proceeds): Aggregate short-term proceeds where basis was reported to IRS, no adjustments needed
- Line 1a (Cost): Aggregate short-term cost/basis for above
- Line 8a (Proceeds): Aggregate long-term proceeds where basis was reported to IRS, no adjustments needed
- Line 8a (Cost): Aggregate long-term cost/basis for above
- Line 6: Short-term capital loss carryover from prior year
- Line 12: Long-term capital gain from capital gain distributions (Form 1099-DIV box 2a)
- Line 14: Long-term capital loss carryover from prior year

**Screen 8949 — Individual transaction entries (feeds into Schedule D):**
Each 8949 screen represents one transaction with:
- Description of property (col a)
- Date acquired (col b)
- Date sold (col c)
- Proceeds (col d)
- Cost or other basis (col e)
- Adjustment code(s) (col f) — codes A-Z
- Adjustment amount (col g)
- Gain or loss (col h) — computed
- Part I/II checkbox (A/B/C/D/E/F/G/H/I/J/K/L) for transaction type

**Digital asset transactions (new for 2025):** Form 8949 now has additional boxes G/H/I (Part I) and J/K/L (Part II) for digital asset transactions.

**Other sources feeding Schedule D:**
- Form K-1 (partnerships, S-corps, trusts, estates)
- Form 4797 (business property)
- Form 6252 (installment sales)
- Form 2439 (undistributed capital gains)
- Form 4684 (casualties/thefts)
- Form 6781 (Section 1256 contracts)
- Form 8824 (like-kind exchanges)

## Open Questions

- [x] Q: What fields does Drake show for this screen?
  → Answered: D/D2 screen for aggregate entries and carryovers; 8949 screen for individual transactions
- [x] Q: Where does each box flow on the 1040?
  → Answered: Schedule D Line 16 (net gain/loss) → Form 1040 Line 7
- [x] Q: What are the TY2025 constants (capital gains rate thresholds)?
  → Answered: See Constants section; sourced from IRS Topic 409 (citing Rev. Proc. 2024-40)
- [x] Q: What edge cases exist?
  → Partially answered: see edge cases below; need to verify wash sale rules, digital assets
- [x] Q: How does Schedule D interact with Form 8949?
  → Answered: All individual transactions go on 8949 first; Schedule D aggregates via lines 1a/1b/2/3/8a/8b/9/10
- [x] Q: How are short-term vs long-term gains handled?
  → Answered: Short-term (≤1 year) in Part I; Long-term (>1 year) in Part II; > 3 years for certain partnership interests
- [x] Q: What are the qualified dividend / LTCG tax brackets for TY2025?
  → Answered: 0%/15%/20% thresholds from IRS Topic 409
- [x] Q: How does unrecaptured Section 1250 gain work?
  → Answered: 25% max rate; worksheet in Schedule D instructions; from depreciated real property
- [x] Q: How does the Schedule D loss limitation (-$3,000) work?
  → Answered: Line 21 limits deduction; excess carries forward; $1,500 MFS
- [x] Q: What is the carryover loss mechanism?
  → Answered: Capital Loss Carryover Worksheet (13 lines); flows to Sch D lines 6 and 14
- [x] Q: How does collectibles gain (28% rate) flow?
  → Answered: 28% Rate Gain Worksheet triggered when line 17="Yes" and collectibles or Section 1202 on 8949 Part II

## Open Questions (remaining)

- [x] Q: Complete Schedule D Tax Worksheet step-by-step (47-line version for when lines 18/19 are populated)?
  → RESOLVED: Extracted from i1040sd.pdf — all 47 lines documented in context.md Step 10
- [x] Q: Complete Qualified Dividends and Capital Gain Tax Worksheet (25-line version)?
  → RESOLVED: Conceptual structure documented in context.md Step 9; exact 2025 lines from WhiteCoatInvestor/IRS 1040 Instructions. TY2025 thresholds confirmed from IRS Topic 409 and i1040sd.pdf (lines 15 and 26 of the Sch D Tax Worksheet confirm $48,350/$96,700/$64,750 and $533,400/$300,000/$600,050/$566,700)
- [x] Q: Complete 28% Rate Gain Worksheet (all lines)?
  → RESOLVED: 7-line worksheet fully extracted from i1040sd.pdf — documented in context.md Step 11
- [x] Q: Complete Unrecaptured Section 1250 Gain Worksheet (all lines)?
  → RESOLVED: 18-line worksheet fully extracted from i1040sd.pdf — documented in context.md Step 12
- [x] Q: What are digital asset reporting requirements on Form 8949 for TY2025?
  → RESOLVED: New codes G/H/I (short-term) and J/K/L (long-term) added for digital assets; documented in context.md Edge Case 9
- [x] Q: What is the Form 4952 investment interest expense interaction?
  → RESOLVED: If Form 4952 line 4g > 0, must use Schedule D Tax Worksheet (not simplified Qualified Dividends worksheet). Lines 3-5 of the Sch D Tax Worksheet handle this. Documented in context.md Step 10.
- [x] Q: How do inherited assets affect holding period (INHERITED date entry)?
  → RESOLVED: Inherited property is ALWAYS treated as long-term regardless of actual holding period. Enter "INHERITED" in col(b) of Form 8949. Documented in Edge Case 2.
- [x] Q: Wash sale 30-day rule — what is the exact scope and enforcement?
  → RESOLVED: 30 days before OR after sale date of substantially identical property. Code W, disallowed loss as positive in col(g). Documented in Edge Case 3.
- [x] Q: Section 1202 QSB stock — what are the exact exclusion percentages and conditions for TY2025?
  → RESOLVED: 100% (after Sep 27, 2010), 75% (Feb 18–Sep 27, 2010), 60% (Feb 18, 2009–Feb 17, 2010), 50% (≤Feb 17, 2009). C corp, issued after Aug 10, 1993, gross assets ≤$75M ($50M if issued before Jul 5, 2025). 5-year hold required. Documented in Edge Cases 11.

- [!] Q: What are the exact 2025 ordinary income tax rates for short-term gains?
  → [NEEDS SOURCE: Short-term gains are taxed at ordinary income rates 10%–37%. The exact brackets are in Form 1040 Instructions / Rev. Proc. 2024-40 but are NOT part of Schedule D computation itself — the Tax Table or Tax Computation Worksheet handles them. Not needed for Schedule D implementation.]

- [!] Q: QOF 7-year basis increase — did it expire?
  → [NEEDS SOURCE: The 10% basis increase for 7-year QOF holdings appears to have expired (2025 instructions reference updated rules). The instructions note "7-year holding period threshold has expired" but implementation only needs to handle code Y (recognizing deferred gain) and code Z (deferring gain). Documented in Edge Case 14.]

## Sources to check

- [x] Drake KB article — multiple articles found and read
- [x] IRS Schedule D instructions (web version) — https://www.irs.gov/instructions/i1040sd
- [x] IRS Form 8949 instructions — https://www.irs.gov/instructions/i8949
- [x] IRS Topic 409 — https://www.irs.gov/taxtopics/tc409
- [ ] IRS Publication 550 (p550.pdf) — Investment Income and Expenses
- [ ] IRS Publication 544 (p544.pdf) — Sales and Other Dispositions of Assets
- [ ] Rev Proc 2024-40 — TY2025 capital gains brackets confirmed from IRS Topic 409
- [ ] Complete Schedule D Tax Worksheet — in i1040sd.pdf (couldn't extract from binary PDF)
- [ ] Complete Qualified Dividends and Capital Gain Tax Worksheet — in i1040gi.pdf

## Conflicting source notes

The "instead.com" guide shows 0% threshold as $47,025/$94,050 — these appear to be TY2024 values.
The authoritative TY2025 values are from IRS Topic 409 and IRS.gov:
- Single: $48,350 (0%), $533,400 (15% top)
- MFJ/QSS: $96,700 (0%), $600,050 (15% top)
- HOH: $64,750 (0%), $566,700 (15% top)
- MFS: $48,350 (0%), $300,000 (15% top)
Source: https://www.irs.gov/taxtopics/tc409

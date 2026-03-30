# F2439 Research Scratchpad

## Search 1: site:kb.drakesoftware.com 2439 undistributed capital gains

Drake Software knowledge base articles returned:
- "Drake Tax - 1040 - Schedule 3, Other Payments Adjustment" (kb.drakesoftware.com/kb/Drake-Tax/16779.htm)
  - Form 2439 is one of three form designations that permits e-filing for adjustments
  - Box 2 (tax paid by fund) enters as adjustment on Schedule 3, Part II, Line 13z in Drake
  - Both the form number and the dollar amount must be entered
  - Using any other form number generates EF message 5578 (prevents e-filing)
- Several other articles returned but not directly relevant to f2439 boxes

## Search 2: IRS Form 2439 instructions 2024 undistributed long-term capital gains boxes

Key sources:
- IRS About Form 2439 page (irs.gov/forms-pubs/about-form-2439)
- IRS Schedule D (Form 1040) Instructions 2025 (irs.gov/instructions/i1040sd)
- teachmepersonalfinance.com deep-dive
- TaxSlayer support page

Box fields confirmed:
- Box 1a: Total undistributed long-term capital gain from RIC/REIT
  → Report on Schedule D, Line 11, column (h)
- Box 1b: Unrecaptured Section 1250 gain (subset of box 1a)
  → Include on Line 11 of the Unrecaptured Section 1250 Gain Worksheet (Schedule D line 19 area)
- Box 1c: Section 1202 gain (qualified small business stock, post-8/10/1993, held 5+ yrs)
  → See "Exclusion of Gain on Qualified Small Business (QSB) Stock" — complex treatment
- Box 1d: Collectibles (28%) gain (subset of box 1a, allocable to collectibles)
  → Include on Line 4 of the 28% Rate Gain Worksheet (Schedule D line 18 area)
- Box 2: Tax paid by RIC/REIT on undistributed capital gains
  → Include on Schedule 3 (Form 1040), line 13a = credit for tax paid

Additional boxes on the form (informational / IRS copy only):
- Box 3: Undistributed capital gains for the RIC/REIT (the fund's total; shareholder gets allocable share in box 1a)
- Box 4: Tax paid on box 3

Schedule D line flow (from IRS i1040sd instructions, 2025):
- "Include on Schedule D, line 11, the amount from box 1a of Form 2439."
- "If there is an amount in box 1b of Form 2439, include that amount on line 11 of the Unrecaptured Section 1250 Gain Worksheet if you complete line 19 of Schedule D."
- "If there is an amount in box 1c of Form 2439, see Exclusion of Gain on Qualified Small Business (QSB) Stock, later."
- "If there is an amount in box 1d of Form 2439, include that amount on line 4 of the 28% Rate Gain Worksheet if you complete line 18 of Schedule D."
- "Include on Schedule 3 (Form 1040), line 13a, the tax paid as shown in box 2 of Form 2439."

## Search 3: Rev Proc 2024-40 capital gains tax rates 2025

Source: IRS Rev. Proc. 2024-40 (official), confirmed by ourtaxpartner.com and Tax Foundation

TY2025 Long-Term Capital Gains Rates (from Rev Proc 2024-40):
- 0% rate: single ≤ $48,350; MFJ ≤ $96,700
- 15% rate: single ≤ $533,400; MFJ ≤ $600,050
- 20% rate: above those thresholds
- Additional 3.8% NIIT: AGI > $200k single / $250k MFJ

Collectibles (28% rate) — no inflation adjustment; rate fixed by IRC §1(h)(5)
Unrecaptured Section 1250 gain — max 25% rate (IRC §1(h)(1)(D)); no inflation adjustment
Section 1202 exclusion — 50%/75%/100% depending on acquisition date; not inflation-adjusted

Note: Box 1c (section 1202 gain) flows through a separate QSB exclusion worksheet in the engine.
For this node, we capture box 1c but do NOT route it (no corresponding receiving node yet).
This is consistent with how the engine handles QSB exclusion — it requires a dedicated
form8949 or QSB worksheet node to process.

## Drake Software Box 2 Note

Drake Software routes box 2 (tax paid by fund) to Schedule 3 Part II line 13z with "2439" label.
In our engine, Schedule 3 aggregates into f1040 line31_additional_payments — which is the
equivalent path. f1040.inputSchema has `line31_additional_payments: z.number().nonnegative().optional()`.

## Engine field mapping confirmed:
- schedule_d.inputSchema.line_11_form2439: z.number().optional() — EXISTS
- schedule_d.inputSchema.line19_unrecaptured_1250: z.number().nonnegative().optional() — EXISTS
- schedule_d.inputSchema does NOT have collectibles_gain_form2439 — MUST ADD
- f1040.inputSchema.line31_additional_payments: z.number().nonnegative().optional() — EXISTS

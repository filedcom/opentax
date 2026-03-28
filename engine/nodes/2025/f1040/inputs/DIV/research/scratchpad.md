# Scratchpad: 1099-DIV Screen Research

**Tax Year:** 2025
**Screen:** 1099div (Drake Tax data-entry screen for Form 1099-DIV)
**Created:** 2026-03-27
**Status:** Phase 5 complete — Rule 13 applied

---

## Research Queue

### Resolved
- [x] What fields does the Drake 1099-DIV screen expose? — Drake screen name is "DIV", also screen 3 line 3. KB article 11742 confirmed. Detailed field-by-field from i1099div.pdf (all 16 boxes + account metadata).
- [x] How does ordinary dividend amount feed into Schedule B? — Box 1a → Schedule B Part II Line 5 → Line 6 → Form 1040 Line 3b.
- [x] What is the Schedule B threshold that triggers the schedule (>$1,500)? — CONFIRMED: >$1,500 of taxable interest OR ordinary dividends. Source: i1040sb.pdf (2025).
- [x] How does qualified dividend amount feed into Form 1040? — Box 1b is a subset of Box 1a. Goes to Form 1040 Line 3a. Taxed at 0%/15%/20% preferential rates via Qualified Dividends and Capital Gain Tax Worksheet.
- [x] 2025 qualified dividend / LTCG rate breakpoints — 0% (≤$48,350 single / ≤$96,700 MFJ), 15% ($48,351–$533,400 single / $96,701–$600,050 MFJ), 20% (above). Source: IRS Topic 409.
- [x] How do Section 199A (REIT) dividends flow to Form 8995/8995-A? — Box 5 → Form 8995 Line 6 (or 8995-A if taxable income > $197,300 single / $394,600 MFJ). 20% deduction. Source: i8995 instructions.
- [x] How does foreign tax paid (Box 7) route? — Two paths: (A) simplified election (no Form 1116) if all passive income, all reported on qualified payee statements, taxes ≤ limit in Form 1040 instructions ($300 single / $600 MFJ per Form 1116 instructions), and holding period met. Goes to Schedule 3. (B) Full Form 1116, passive income basket. Source: IRS Topic 856.
- [x] How does Box 13 (Specified PAB Interest Dividends) feed into AMT? — Box 13 → Form 6251 Line 2g. AMT exemptions 2025: $88,100 single, $137,000 MFJ (phaseout at $626,350 / $1,252,700). Source: i6251 instructions.
- [x] How does Box 12 (Exempt-Interest Dividends) route? — Box 12 → Form 1040 Line 2a (tax-exempt interest, not taxable). Source: i1040sb.pdf Schedule B Part I tax-exempt interest section.
- [x] What does Box 6 (Investment Expenses) do? — Reports pro rata share of RIC expenses deductible under §67(c). Included in Box 1a. TCJA note: TCJA suspended miscellaneous itemized deductions (including investment expenses) through 2025; post-2025 the §67(c) gross-up survives but the deduction side is suspended. Box 6 still required to be reported but recipients cannot deduct on Schedule A for 2018–2025.
- [x] Boxes 9 & 10 (Liquidating Distributions) — NOT included in Box 1a or 1b. Return of basis first; excess over basis = capital gain reported on Schedule D / Form 8949. Source: IRS Topic 404 + i1099div.pdf caution note.
- [x] Box 2a (Total Capital Gain Distr.) — Long-term cap gain. Flows to Schedule D Line 13 (or Form 1040 Line 7 if no Schedule D required, for simple returns). Includes Boxes 2b, 2c, 2d, 2f as sub-amounts.
- [x] Box 2b (Unrecap Sec. 1250 Gain) — 25% rate via Schedule D Tax Worksheet / Unrecaptured §1250 Gain Worksheet.
- [x] Box 2c (Section 1202 Gain) — Qualified Small Business Stock gain. 50%/60%/75%/100% exclusion depending on acquisition date. Flows into Schedule D.
- [x] Box 2d (Collectibles 28% Gain) — 28% rate via Schedule D / Collectibles worksheet.
- [x] Box 2e (Section 897 Ordinary Dividends) — Subset of Box 1a. Only for RICs/REITs, USRPI look-through. Not required for U.S. individuals (informational for foreign investors / FIRPTA purposes).
- [x] Box 2f (Section 897 Capital Gain) — Subset of Box 2a. Same as above.
- [x] Box 3 (Nondividend Distributions) — Return of capital. Not taxable income; reduces basis.
- [x] Box 4 (Federal Income Tax Withheld) — Backup withholding. Flows to Form 1040 as withholding credit.
- [x] Box 11 (FATCA) — Checkbox; no recipient calculation. FATCA compliance flag.
- [x] Boxes 14–16 (State Information) — State abbreviation, payer state ID, state tax withheld. Not required for IRS. Flows to state return.
- [x] Nominee dividends — If received as nominee: report full amount on Schedule B, then subtract "Nominee Distribution." Must issue own 1099-DIV to actual owner. Source: i1040sb.pdf Part II.
- [x] Multiple 1099-DIV payers — Yes, each payer is listed separately on Schedule B Part II Line 5.

### Still Open
- [x] Exact dollar threshold for simplified foreign tax credit (without Form 1116) — CONFIRMED: Form 1116 instructions (https://www.irs.gov/instructions/i1116) state exactly: "Your total creditable foreign taxes aren't more than $300 ($600 if married filing a joint return)." URL verified accessible. $300 single / $600 MFJ is authoritative.
- [x] Schedule D Line 13 vs Form 1040 Line 7a — CONFIRMED: Two valid paths for Box 2a capital gain distributions. (A) Standard: Schedule D Line 13. (B) Simplified exception: if taxpayer has NO other capital transactions requiring Schedule D, report directly on Form 1040 Line 7a and check boxes on Line 7b. Source: IRS FAQ https://www.irs.gov/faqs/capital-gains-losses-and-sale-of-home/mutual-funds-costs-distributions-etc/mutual-funds-costs-distributions-etc-4 and Schedule D instructions https://www.irs.gov/instructions/i1040sd. Note: Line 7a exception unavailable if Box 2b, 2c, or 2d > 0 (those sub-amounts require Schedule D worksheets).
- [x] Box 6 TCJA suspension — investment expenses will NOT return in 2026. The One Big Beautiful Bill Act (P.L. 119-21, signed July 4, 2025) made the §67(g) suspension of miscellaneous itemized deductions PERMANENT. Box 6 investment expenses (§67(c) RIC expenses included in Box 1a) remain non-deductible indefinitely under current law. Source: IRS https://www.irs.gov/newsroom/one-big-beautiful-bill-provisions; Journal of Accountancy https://www.journalofaccountancy.com/news/2025/jun/tax-changes-in-senate-budget-reconciliation-bill/

---

## URL Verification Log

| URL | Status | Notes |
|-----|--------|-------|
| https://kb.drakesoftware.com/kb/Drake-Tax/11742.htm | VERIFIED — ACCESSIBLE | Index page confirms screen DIV for 1099-DIV |
| https://www.irs.gov/pub/irs-pdf/i1099div.pdf | VERIFIED — DOWNLOADED | Primary source, all box definitions |
| https://www.irs.gov/pub/irs-pdf/i1040sb.pdf | VERIFIED — DOWNLOADED (i1040sb.pdf) | 2025 Schedule B instructions |
| https://www.irs.gov/pub/irs-pdf/f1040sb.pdf | VERIFIED — DOWNLOADED | Schedule B form |
| https://www.irs.gov/pub/irs-pdf/p550.pdf | VERIFIED — DOWNLOADED (large PDF, 2.3MB) | Pub 550 — binary, downloaded |
| https://www.irs.gov/pub/irs-pdf/i8995.pdf | VERIFIED — DOWNLOADED | Form 8995 instructions |
| https://www.irs.gov/pub/irs-pdf/i1040.pdf | PENDING download | |
| https://www.irs.gov/taxtopics/tc404 | VERIFIED — ACCESSIBLE | Topic 404: Dividends |
| https://www.irs.gov/taxtopics/tc409 | VERIFIED — ACCESSIBLE | 2025 cap gain rate breakpoints |
| https://www.irs.gov/taxtopics/tc856 | VERIFIED — ACCESSIBLE | Foreign tax credit, Form 1116 |
| https://www.irs.gov/instructions/i8995 | VERIFIED — ACCESSIBLE | Form 8995 line instructions |
| https://www.irs.gov/instructions/i6251 | VERIFIED — ACCESSIBLE | Box 13 → Form 6251 Line 2g |
| https://www.irs.gov/instructions/i1116 | VERIFIED — ACCESSIBLE | Foreign tax $300/$600 threshold; exact text confirmed phase-5 |
| https://www.irs.gov/forms-pubs/about-schedule-b-form-1040 | VERIFIED — ACCESSIBLE | $1,500 threshold confirmed |
| https://www.irs.gov/forms-pubs/about-form-1099-div | VERIFIED — ACCESSIBLE | Form 1099-DIV landing page |
| https://www.irs.gov/instructions/i1040sd | VERIFIED — ACCESSIBLE | Schedule D instructions; Line 7a simplified cap gain distrib exception confirmed |
| https://www.irs.gov/faqs/capital-gains-losses-and-sale-of-home/mutual-funds-costs-distributions-etc/mutual-funds-costs-distributions-etc-4 | VERIFIED — ACCESSIBLE | IRS FAQ: Box 2a → Schedule D Line 13 or Form 1040 Line 7a (no Schedule D required) |
| https://www.irs.gov/newsroom/one-big-beautiful-bill-provisions | VERIFIED — ACCESSIBLE | OBBBA (P.L. 119-21, July 4 2025): §67(g) suspension permanent; Box 6 deduction eliminated permanently |

---

## Drake Screen Fields (confirmed from KB + IRS instructions)

Drake screen name: **DIV** (also data enters via screen 3, line 3)

The Drake DIV screen mirrors Form 1099-DIV boxes exactly. Fields:

| Box | Field Name | Notes |
|-----|-----------|-------|
| — | Payer Name / FEIN | Required for Schedule B line-item display |
| — | Recipient SSN/EIN | |
| 1a | Total Ordinary Dividends | Sum includes 1b and 2e; also includes Box 6 amount |
| 1b | Qualified Dividends | Subset of 1a; ≥ 0 always |
| 2a | Total Capital Gain Distr. | Long-term; includes 2b, 2c, 2d, 2f |
| 2b | Unrecap. Sec. 1250 Gain | Subset of 2a; 25% rate |
| 2c | Section 1202 Gain | Subset of 2a; QSBS exclusion |
| 2d | Collectibles (28%) Gain | Subset of 2a; 28% rate |
| 2e | Section 897 Ordinary Divs | Subset of 1a; RIC/REIT only |
| 2f | Section 897 Capital Gain | Subset of 2a; RIC/REIT only |
| 3 | Nondividend Distributions | Return of capital; reduces basis |
| 4 | Federal Income Tax Withheld | Backup withholding |
| 5 | Section 199A Dividends | Subset of 1a; REIT/RIC qualified REIT divs |
| 6 | Investment Expenses | RIC expenses under §67(c); included in 1a |
| 7 | Foreign Tax Paid | In USD |
| 8 | Foreign Country or U.S. Possession | Text; not required for RICs |
| 9 | Cash Liquidation Distributions | NOT in 1a; return of capital / cap gain |
| 10 | Noncash Liquidation Distributions | NOT in 1a; FMV at distribution date |
| 11 | FATCA Filing Requirement | Checkbox |
| 12 | Exempt-Interest Dividends | Includes Box 13 amount; → Form 1040 Line 2a |
| 13 | Specified PAB Interest Dividends | Subset of 12; → Form 6251 Line 2g |
| 14 | State Abbreviation | State return only |
| 15 | Payer State ID | State return only |
| 16 | State Income Tax Withheld | State return only |

Additional Drake-specific fields:
- Nominee flag (did taxpayer receive as nominee?)
- Multiple payer entries supported

---

## Calculation Logic Notes

### Schedule B Routing
- Trigger: Box 1a total across ALL 1099-DIV payers > $1,500 → Schedule B required
- Also required if: received dividends as nominee, foreign accounts, etc.
- Schedule B Part II Line 5: list each payer + Box 1a amount
- Nominee: subtotal all, subtract "Nominee Distribution," result = Line 6
- Schedule B Line 6 → Form 1040 Line 3b

### Form 1040 Lines
- Line 3b (Ordinary Dividends) ← Schedule B Line 6 (or Box 1a direct if Schedule B not required)
- Line 3a (Qualified Dividends) ← Box 1b (entered directly, not via Schedule B)
- Line 2a (Tax-Exempt Interest) ← Box 12

### Qualified Dividends Tax Treatment
- Uses Qualified Dividends and Capital Gain Tax Worksheet (in Form 1040 instructions)
- Required when: taxpayer has qualified dividends OR net long-term capital gains
- If Schedule D required: use Schedule D Tax Worksheet instead
- Rates (2025): 0% / 15% / 20% based on taxable income

### Capital Gain Distributions (Box 2a)
- → Schedule D Line 13 (long-term capital gain distribution)
- Sub-amounts flow to their respective worksheets:
  - Box 2b (Unrecap §1250): Unrecaptured §1250 Gain Worksheet (25% rate)
  - Box 2c (§1202): Schedule D, QSBS exclusion computation
  - Box 2d (28% collectibles): 28% Rate Gain Worksheet

### Section 199A Routing
- Box 5 → Form 8995 Line 6 (simplified) or Form 8995-A
- 8995-A required if taxable income > $197,300 single / $394,600 MFJ
- 20% deduction on qualified REIT dividends
- Holding period: must hold REIT stock > 45 days in 91-day window

### Foreign Tax Credit Routing (Box 7)
Path A (Simplified — no Form 1116):
  - All conditions: all foreign income is passive, reported on qualified payee statements, total foreign tax ≤ $300 (single) / $600 (MFJ), holding period met (16+ days in 31-day window), no excluded income
  - → Schedule 3 Line 1 (foreign tax credit directly)
Path B (Full — Form 1116):
  - Box 7 amount → Form 1116 Part II
  - Passive income basket
  - Credit = lesser of foreign tax paid or US tax attributable to foreign income
  - Carryback 1 year, carryforward 10 years

### AMT Routing (Box 13)
- Box 13 (Specified PAB Interest Dividends) → Form 6251 Line 2g
- 2025 AMT exemptions: $88,100 single, $137,000 MFJ

### Exempt Interest (Box 12)
- Box 12 → Form 1040 Line 2a (tax-exempt interest, not taxable)
- Box 12 includes Box 13 amount (PAB interest is subset of exempt-interest dividends)

### Liquidating Distributions (Boxes 9 & 10)
- NOT included in ordinary dividends (not in Box 1a)
- Treatment: reduce basis in stock first; any excess = capital gain (long-term if held > 1 year)
- Report on Form 8949 / Schedule D once basis is fully recovered or liquidation is complete
- Noncash (Box 10): use FMV at date of distribution

### Backup Withholding (Box 4)
- → Form 1040 as federal tax withheld (Schedule 3 or directly on Form 1040)

### Nondividend Distributions (Box 3)
- Return of capital; not taxable
- Reduces taxpayer's basis in the stock
- No current-year form routing; tracked in basis records only

### Investment Expenses (Box 6)
- Included in Box 1a gross income under §67(c)
- TCJA 2017: §67(a) miscellaneous itemized deductions suspended 2018–2025
- Box 6 amount: increases income (via 1a) but no offsetting deduction available 2025
- Post-2025: deduction may resume if TCJA provisions expire

---

## Unresolved Items

All items resolved. No open questions remain.

1. $300/$600 foreign tax threshold — RESOLVED. Form 1116 instructions (i1116) exact text confirmed: "not more than $300 ($600 if married filing a joint return)."
2. Schedule D Line 13 vs Form 1040 Line 7a — RESOLVED. Both paths confirmed: Schedule D Line 13 (standard) OR Form 1040 Line 7a (simplified exception when no other Schedule D transactions). IRS FAQ and Schedule D instructions both confirm.
3. Box 6 TCJA suspension / 2026 return — RESOLVED. Investment expense deduction will NOT return. One Big Beautiful Bill Act (P.L. 119-21, signed July 4, 2025) permanently eliminated miscellaneous itemized deductions under §67(g). Context.md updated.

---

## Change Log

| Date | Phase | Change |
|------|-------|--------|
| 2026-03-27 | 0 | Initial skeleton created |
| 2026-03-27 | 1 | Drake KB confirmed: screen "DIV" for 1099-DIV; also screen 3 line 3 |
| 2026-03-27 | 2 | All box definitions from i1099div.pdf (Rev. Jan 2024) |
| 2026-03-27 | 2 | Schedule B rules from i1040sb.pdf (2025) |
| 2026-03-27 | 2 | 2025 cap gain rate breakpoints from IRS Topic 409 |
| 2026-03-27 | 2 | Form 8995/8995-A routing from i8995 instructions |
| 2026-03-27 | 2 | Foreign tax credit rules from IRS Topic 856 and i1116 |
| 2026-03-27 | 2 | AMT routing (Box 13 → Form 6251 Line 2g) from i6251 instructions |
| 2026-03-27 | 2 | Exempt interest (Box 12 → Form 1040 Line 2a) from i1040sb.pdf |
| 2026-03-27 | 2 | Liquidating distributions treatment from IRS Topic 404 + i1099div.pdf |
| 2026-03-27 | 3 | All items resolved; ready for final context.md pass |
| 2026-03-27 | 5 | $300/$600 foreign tax threshold: checked off — confirmed from i1116 instructions exact text |
| 2026-03-27 | 5 | Box 2a routing: confirmed dual path — Schedule D Line 13 (standard) OR Form 1040 Line 7a (simplified exception, no other cap transactions); sourced from IRS FAQ + i1040sd |
| 2026-03-27 | 5 | Box 6 TCJA: §67(g) suspension made PERMANENT by One Big Beautiful Bill Act (P.L. 119-21, signed July 4 2025); investment expense deduction will not return; context.md Edge Cases and §11 updated |
| 2026-03-27 | Rule 13 | Box 4 backup withholding: confirmed Form 1040 Line 25b ("Form(s) 1099") — i1040gi HTML version confirmed exact line |
| 2026-03-27 | Rule 13 | Box 2b routing: confirmed Unrecaptured §1250 Gain Worksheet Line 11 → Schedule D Line 19; box2d → 28% Rate Gain Worksheet → Schedule D Line 18 — Schedule D instructions HTML confirmed |
| 2026-03-27 | Rule 13 | §199A phase-out endpoints confirmed from Form 8995-A instructions: $197,300–$247,300 single, $394,600–$494,600 MFJ; REIT dividend component not subject to W-2/UBIA limitation |
| 2026-03-27 | Rule 13 | Foreign tax credit simplified election: confirmed 6 conditions (not 5) from IRS Topic 856; Form 1116 full 6-step flow documented |
| 2026-03-27 | Rule 13 | Liquidating distributions: expanded to 5-step basis reduction → Form 8949 / Schedule D flow with characterization rules |
| 2026-03-27 | Rule 13 | Cross-field validation: added 10 named rules (V1–V10) with numeric conditions, consequences, and IRS citations |
| 2026-03-27 | Rule 13 | QDCGW: added decision tree (QDCGW vs Schedule D Tax Worksheet) and high-level worksheet step logic |
| 2026-03-27 | Rule 13 | State fields: explicitly declared boxes 14–16 out of scope for federal engine, passed to state engine as-is |
| 2026-03-27 | Rule 13 | §199A holding period (V9): elevated from edge case mention to formal validation rule with IRC citation; V10 for foreign tax holding period similarly formalized |

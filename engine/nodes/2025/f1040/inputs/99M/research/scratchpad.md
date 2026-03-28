# 1099-MISC (Miscellaneous Information) — Scratchpad

## Purpose

Captures all income and related withholding reported on IRS Form 1099-MISC for tax year 2025. Routes each box to the appropriate form, schedule, or line on Form 1040 based on income type. One instance per payer/form received.

## Fields identified (from Drake + IRS instructions)

**From IRS Form 1099-MISC (Rev. April 2025):**
- Payer name / TIN / recipient TIN / account number (header fields)
- Box 1: Rents ($600+ threshold)
- Box 2: Royalties ($10+ threshold)
- Box 3: Other income ($600+ threshold)
- Box 4: Federal income tax withheld (backup withholding 24%, Indian gaming)
- Box 5: Fishing boat proceeds ($600+ threshold)
- Box 6: Medical and health care payments ($600+ threshold)
- Box 7: Direct sales indicator (checkbox, $5,000+ threshold)
- Box 8: Substitute payments in lieu of dividends or interest ($10+ aggregate)
- Box 9: Crop insurance proceeds ($600+ threshold)
- Box 10: Gross proceeds paid to an attorney ($600+ threshold)
- Box 11: Fish purchased for resale ($600+ threshold)
- Box 12: Section 409A deferrals (optional, informational)
- Box 13: FATCA filing requirement checkbox
- Box 14: Reserved for future use (TY2025 — formerly excess golden parachute, moved to 1099-NEC Box 3)
- Box 15: Nonqualified deferred compensation (§409A failures)
- Boxes 16–18: State tax withheld / state ID / state income

**Drake-specific fields on 99M screen:**
- "For" drop-down: routes form to Schedule C, E, F, or Schedule 1
- Multi-Form Code (MFC): links to specific schedule instance when >1 exists

## Resolved Questions

- [x] Q: What fields does Drake show for this screen?
  → Confirmed from IRS instructions + Drake KB: all boxes 1–18 plus Drake "For" dropdown and MFC field. Drake KB does not publish per-field screen documentation publicly.

- [x] Q: Where does each box flow on the 1040?
  → Box 1 → Sch E Part I Line 3 (or Sch C if substantial services — maid service, etc.)
  → Box 2 → Sch E Part I Line 4 (or Sch C if trade/business of IP creation — professional author, songwriter)
  → Box 3 prizes → Sch 1 Line 8i (Prizes and awards) per IRS FAQ
  → Box 3 other non-prize → Sch 1 Line 8z (or excluded under IRC §104 if physical injury)
  → Box 4 → Form 1040 Line 25b (federal withholding credit)
  → Box 5 → Schedule C (self-employment, crew member)
  → Box 6 → Schedule C (gross receipts for medical provider)
  → Box 7 → No flow (checkbox only)
  → Box 8 → Sch 1 Line 8z
  → Box 9 → Schedule F Line 6a (or deferred under IRC §451(d))
  → Box 10 → Sch 1 Line 8z (or excluded under IRC §104 if physical injury)
  → Box 11 → Schedule C (fish dealer)
  → Box 12 → Informational only (no current-year flow if plan compliant)
  → Box 13 → No flow (checkbox)
  → Box 14 → Reserved (no flow; error if non-zero)
  → Box 15 → Sch 1 Line 8z (ordinary income) + Schedule 2 Line 17h (20% additional tax)
  → Boxes 16–18 → State returns only

- [x] Q: What are the TY2025 constants?
  → Backup withholding rate: 24% (IRC §3406; IRS Topic 307)
  → §409A additional tax rate: 20% (IRC §409A(a)(1)(B)(i))
  → Filing thresholds confirmed from IRS instructions (i1099mec Rev. April 2025)
  → Employee achievement award exclusions: $1,600 (qualified) / $400 (non-qualified) per IRC §74(c)

- [x] Q: What edge cases exist?
  → Physical injury exclusion (IRC §104), §409A double-tax, crop deferral election, business vs passive royalties, substantial services rental → Sch C, Box 14 reserved (TY2025 change), Nobel/Pulitzer exclusion, employee achievement award exclusion limits, backup withholding triggers, multiple payer handling with MFC

- [x] Q: Does Box 2 (royalties) trigger Schedule E or Schedule C?
  → Schedule C if derived in ordinary course of active trade or business (professional author, songwriter, performing artist, professional photographer). Schedule E if passive/investment (oil/gas interest holder, copyright investor, etc.)

- [x] Q: Does Box 1 (rents) always go to Schedule E or can it go to Schedule C?
  → Can go to Schedule C if significant services rendered to tenants (maid service, hotel-style). Standard landlord services (heat, light, trash) do NOT qualify.

- [x] Q: What happens with Box 7 for direct sales?
  → Box 7 is a checkbox indicator only, $5,000+ threshold. No dollar amount. No tax computation.

- [x] Q: How does federal withholding (Box 4) route to Form 1040?
  → Form 1040, Line 25b ("Federal income tax withheld — Form(s) 1099")

- [x] Q: Are there state withholding fields?
  → Yes: Boxes 16, 17, 18. State returns only, no federal impact.

- [x] Q: What is the exact Schedule 2 line for §409A additional tax in TY2025?
  → Schedule 2 Line 17h: "Income from nonqualified deferred compensation plans failing to meet section 409A requirements"

- [x] Q: What is the backup withholding rate?
  → 24% per IRC §3406 and IRS Topic No. 307

- [x] Q: Schedule E Part I line numbers for TY2025?
  → Line 3: Rents received; Line 4: Royalties received. Confirmed from TY2025 instructions.

- [x] Q: Schedule F lines for crop insurance?
  → Line 6a: proceeds received in current year; Line 6b: taxable amount; Line 6c: deferral election checkbox; Line 6d: prior-year deferred amounts. Confirmed from TY2025 instructions.

- [x] Q: Form 1040 Line 25b?
  → Confirmed "Federal income tax withheld — Form(s) 1099" from TY2025 1040 instructions.

- [x] Q: What is Box 14 in TY2025?
  → "Reserved for future use." Previously excess golden parachute payments. Moved to Form 1099-NEC Box 3 effective TY2025. This is a critical change to implement correctly.

- [x] Q: Where do prizes/awards from Box 3 go?
  → Schedule 1 Line 8i (Prizes and awards) — confirmed from IRS FAQ #5. Non-prize other income → Schedule 1 Line 8z.

## Remaining Items

- [ ] Q: What is the "For" dropdown's complete option list in Drake's 99M screen?
  → Drake KB does not publish this publicly. Based on routing analysis, options should include: Schedule C (with MFC), Schedule E (with property number/MFC), Schedule F (with MFC), Schedule 1 Line 8z (other income). May also include Form 1040 Line 1d or specific Schedule 1 lines for prizes. [NOT CRITICAL — Drake implementation detail, not IRS-mandated]

- [x] Q: Confirm Box 3 prize routing is Line 8i not Line 8z.
  → CONFIRMED: IRS FAQ explicitly says "Report the payment amount on line 8i (Prizes and awards) of Schedule 1 (Form 1040)" for prize income from 1099-MISC Box 3.

## Sources checked

- [x] Drake KB — limited detail, found at https://kb.drakesoftware.com/kb/Drake-Tax/11742.htm
- [x] IRS instructions for Forms 1099-MISC and 1099-NEC (April 2025) — https://www.irs.gov/instructions/i1099mec
- [x] IRS Publication 525 (2025) — https://www.irs.gov/publications/p525
- [x] IRS Schedule E instructions TY2025 — https://www.irs.gov/instructions/i1040se
- [x] IRS Schedule F instructions TY2025 — https://www.irs.gov/instructions/i1040sf
- [x] IRS Form 1040 instructions TY2025 — https://www.irs.gov/instructions/i1040gi
- [x] IRS Topic No. 307 (backup withholding) — https://www.irs.gov/taxtopics/tc307
- [x] Schedule 2 line structure (Line 17h for §409A) — https://taxinstructions.net/schedule-2-form-1040/
- [x] Schedule 1 line structure (Lines 8a–8z) — https://www.teachmepersonalfinance.com/irs-schedule-1-instructions/
- [x] IRS FAQ — Box 3 prizes → Sch 1 Line 8i — https://www.irs.gov/faqs/interest-dividends-other-types-of-income/1099-misc-independent-contractors-and-self-employed/1099-misc-independent-contractors-and-self-employed-5
- [x] Box 14 change (reserved TY2025) — https://www.intacct.com/ia/docs/en_US/releasenotes/2025/2025_Release_4/Tax/2025-R4-1099-box-migration.htm
- [ ] Rev. Proc. 2024-40 — backup withholding rate not found there (it's in IRC §3406 directly). 24% rate confirmed via IRS Topic 307.
- [ ] IRS Publication 550 royalties section — PDF not extractable; ruled confirmed via Schedule E instructions and third-party tax software guidance.

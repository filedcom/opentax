# Scratchpad: 1099-INT Screen Research

## Status
Phase 5 complete — Rule 13 applied (2026-03-27). See Rule 13 findings below.

## Open Questions
- [x] Does Drake INT screen expose box 10 (market discount) directly, or is that OID screen only?
      **Answer:** Yes, box 10 (market discount) IS on the Drake INT screen. Drake KB 14216 (EF Message 5285) explicitly states that the "Amount that is" subtotals on the INT screen must not exceed "the total taxable interest entered on lines 1, 3, and 10," confirming box 10 is a standard INT screen input field. Source: https://kb.drakesoftware.com/kb/Drake-Tax/14216.htm

- [x] Does Drake INT screen have a separate CUSIP/account number field (box 14)?
      **Answer:** Yes. The Drake INT screen has an "Account number" field in the header section that corresponds to IRS Form 1099-INT Box 14 (labeled "Tax-Exempt and Tax Credit Bond CUSIP No." on the form). The field is informational and applies to both tax-exempt bonds and tax credit bonds (Build America Bonds, etc.). Source: IRS i1099int https://www.irs.gov/instructions/i1099int (Box 14 instructions); Drake KB 11742 header field listing.

- [x] What is Drake's exact field code for the INT screen (e.g., `INT` — confirmed from KB)?
      **Answer:** Confirmed: `INT`. Already documented in the Resolved Questions table below. Source: Drake KB 11742 https://kb.drakesoftware.com/kb/Drake-Tax/11742.htm

- [x] Does Drake have a "covered security" checkbox on the INT screen for bond premium?
      **Answer:** No. There is NO covered security checkbox on the Drake INT screen, nor on the IRS Form 1099-INT itself. The term "covered security" in the 1099-INT instructions (Box 11 instructions, citing Reg. §1.6045-1(a)(15)) describes a definitional threshold that determines whether the *payer* must report bond premium — it is not a recipient-side checkbox. When a covered bond is reported, the payer populates boxes 11/12/13; the recipient's software simply uses whatever dollar amount the payer entered. No UI checkbox is needed. Sources: IRS i1099int https://www.irs.gov/instructions/i1099int (Box 11 instructions); Drake KB 13580 confirms "covered security" is a 1099-B concept, not 1099-INT.

- [x] MeF XML element path for 1099-INT data — needs IRS MeF schema research
      **Answer:** The IRS IRIS XML schemas (for information return e-filing, including 1099-INT) and the IRS MeF 1040-series schemas (which reference Schedule B interest data) are both distributed exclusively through the IRS Secure Object Repository (SOR) mailbox, accessible only to registered software developers with an approved IRIS Transmitter Control Code (TCC) or e-Services account. No publicly verifiable URL exists for the 1099-INT XSD schema. Per iron rule (nothing without a verifiable reference), MeF XML element paths cannot be documented in context.md. Instead, a [!] note is added directing the implementation team to obtain schemas via the IRS SOR. Sources: https://www.irs.gov/e-file-providers/iris-schemas-and-business-rules; https://www.irs.gov/e-file-providers/modernized-e-file-mef-schemas-and-business-rules

## Resolved Questions

| Question | Answer | Source |
|----------|--------|--------|
| Drake screen name for 1099-INT | Screen `INT` (also reachable via Screen 3 line 2) | kb.drakesoftware.com/kb/Drake-Tax/11742.htm |
| $1,500 Schedule B threshold | >$1,500 total taxable interest or ordinary dividends triggers Schedule B requirement | IRS i1040sb instructions |
| Box 8 flows to? | Form 1040 line 2a (tax-exempt interest, informational only) | IRS i1099int instructions |
| Box 9 AMT line? | Form 6251 line 2g (Private Activity Bond Interest) | IRS i6251 instructions |
| Box 11 bond premium offset? | Reduces Box 1 income on Schedule B as "ABP Adjustment" (IRC §171) | IRS i1099int; Pub 550 |
| Box 12 bond premium on Treasuries? | Reduces Box 3 income on Schedule B as "ABP Adjustment" | IRS i1099int |
| Box 13 bond premium on tax-exempt? | Reduces Box 8 amount on Form 1040 line 2a | IRS i1099int |
| Box 2 early withdrawal penalty? | Schedule 1 line 18 (deduction from AGI, even if > interest earned) | IRS; community confirmation |
| Box 4 backup withholding? | Form 1040 line 25b (Federal income tax withheld from Forms 1099) | IRS i1040gi |
| Box 6 foreign tax paid? | Schedule 3 line 1 if ≤$300/$600; otherwise Form 1116 | IRS i1116 |
| Seller-financed mortgage flag? | Drake checkbox at top of INT screen; requires payer name, address, SSN on Schedule B | Drake KB; IRS i1040sb |
| Accrued interest adjustment? | Drake has "Accrued Interest" field on INT screen; appears on Schedule B as subtraction labeled "Accrued Interest" | Drake KB; IRS i1040sb |
| Nominee interest? | Drake has "Nominee Interest" field; appears on Schedule B as subtraction labeled "Nominee Distribution" | Drake KB; IRS i1040sb |
| Non-taxable OID adjustment? | Drake has "Non-taxable OID interest" field (bottom-left); appears on Schedule B labeled "OID Adjustment" | Drake KB 13316 |
| Box 5 (Investment expenses)? | Not deductible for individuals post-TCJA 2018; REMIC use only; not routing anywhere useful | IRS i1099int |
| Box 1 + Box 3 combined? | Both flow to Schedule B Part I line 1; then aggregated to Form 1040 line 2b | IRS |
| OID entry on INT vs OID screen? | OID ≥$1,500 → Screen INT; OID <$1,500 → Screen 3; avoid double entry | Drake KB 13316 |
| Foreign accounts (Part III Sch B)? | Drake INT screen has no Part III fields — Part III is on a separate FBAR/foreign account screen | IRS i1040sb |
| Upstream dependencies | None required (can enter without other screens, but filing status needed for threshold logic) | Analysis |

## Sources to Fetch — ALL RESOLVED
- [x] Drake KB 11742: https://kb.drakesoftware.com/kb/Drake-Tax/11742.htm
- [x] Drake KB 10871 (Schedule B not generating): https://kb.drakesoftware.com/kb/Drake-Tax/10871.htm
- [x] Drake KB 11523 (exempt interest state): https://kb.drakesoftware.com/kb/Drake-Tax/11523.htm
- [x] Drake KB 13316 (tax-exempt OID): https://kb.drakesoftware.com/kb/Drake-Tax/13316.htm
- [x] Drake KB 14216 (EF Messages 5378/5285 — INT screen line 10 confirmed): https://kb.drakesoftware.com/kb/Drake-Tax/14216.htm
- [x] IRS i1099int instructions (HTML): https://www.irs.gov/instructions/i1099int
- [x] IRS i1040sb instructions (HTML): https://www.irs.gov/instructions/i1040sb
- [x] IRS i1116 instructions (HTML): https://www.irs.gov/instructions/i1116
- [x] IRS i6251 instructions (HTML): https://www.irs.gov/instructions/i6251
- [x] IRS Pub 550 (HTML): https://www.irs.gov/publications/p550
- [x] IRS i1040gi (Form 1040 instructions): https://www.irs.gov/instructions/i1040gi
- [x] IRS IRIS schemas page (confirms TCC-gated access only): https://www.irs.gov/e-file-providers/iris-schemas-and-business-rules
- [x] IRS MeF schemas page (confirms SOR-gated access for 1040 series): https://www.irs.gov/e-file-providers/modernized-e-file-mef-schemas-and-business-rules

## Drake Screen Fields (Confirmed)
From Drake KB (multiple articles):

| Drake Field | Correspondence | Notes |
|-------------|----------------|-------|
| Screen code | `INT` | Also via Screen 3 line 2 |
| Seller-financed checkbox | Top of screen | Triggers payer address entry + Sch B SSN requirement |
| Payer name | Header | Required for all entries |
| Box 1 | Interest income | → Sch B line 1 |
| Box 2 | Early withdrawal penalty | → Sch 1 line 18 |
| Box 3 | Interest on U.S. Savings Bonds/Treasury | → Sch B line 1 |
| Box 4 | Federal income tax withheld | → 1040 line 25b |
| Box 5 | Investment expenses | No current deduction (TCJA suspended) |
| Box 6 | Foreign tax paid | → Sch 3 line 1 or Form 1116 |
| Box 7 | Foreign country | → Supports Form 1116 |
| Box 8 | Tax-exempt interest | → 1040 line 2a |
| Box 9 | Specified private activity bond interest | → Form 6251 line 2g |
| Box 10 | Market discount | → Sch B (if §1278(b) election) |
| Box 11 | Bond premium | Reduces box 1; ABP Adjustment on Sch B |
| Box 12 | Bond premium on Treasury | Reduces box 3; ABP Adjustment |
| Box 13 | Bond premium on tax-exempt bond | Reduces box 8; reduces 1040 line 2a |
| Box 14 | CUSIP no. | Informational |
| Box 15 | State | State return |
| Box 16 | State ID no. | State return |
| Box 17 | State tax withheld | State return |
| Accrued interest | Drake adjustment field | Sch B subtraction "Accrued Interest" |
| Nominee interest | Drake adjustment field | Sch B subtraction "Nominee Distribution" |
| Non-taxable OID | Drake adjustment field (bottom-left) | Sch B subtraction "OID Adjustment" |

## Constants Confirmed for TY2025
- Schedule B required: total taxable interest + ordinary dividends > $1,500
- Foreign tax credit without Form 1116: ≤$300 single, ≤$600 MFJ (passive income only, all reported on 1099)
- 1099-INT filing threshold: $10 (or $600 if paid in trade/business)
- Seller-financed mortgage: Schedule B must include payer name, address, SSN (else $50 penalty)

## Edge Cases — All Resolved
- Nominee interest: enter full 1099-INT amount, subtract in ABP Adjustment block labeled "Nominee Distribution"
- Accrued interest on bond purchase: same mechanism, labeled "Accrued Interest" on Schedule B
- AMT on PAB: box 9 → Form 6251 line 2g; already included in box 8 total
- OID on INT screen: if OID ≥ $1,500 enter on INT screen; if < $1,500 can use Screen 3
- U.S. savings bonds: cash method taxpayers may defer until redemption; accrual method annual; Form 8815 for education exclusion
- Foreign tax credit: simple method (no Form 1116) if ≤$300/$600 and all passive category income
- Box 13 bond premium on tax-exempt: reduces 1040 line 2a (not a deduction, just netting)
- Box 5 investment expenses: suspended by TCJA through at least 2025 — no deduction
- Market discount (box 10): only reported if §1278(b) election made by payer; otherwise no box 10 value

## Rule 13 Findings (2026-03-27)

### Gap 1 — Downstream line numbers
All line numbers were already explicit in context.md (Form 1040 Lines 2a/2b/25b, Schedule 1 Line 18, Schedule 3 Line 1, Form 6251 Line 2g, Schedule B Lines 1-4). Added exact IRS label text to clarify: Schedule 1 Line 18 = "Penalty on Early Withdrawal of Savings"; Schedule 3 Line 1 = "Foreign Tax Credit"; Form 6251 Line 2g = "Interest From Private Activity Bonds". No missing line numbers found.

### Gap 2 — Cross-field validation rules with numeric tolerances
Rewrote §10 validation rules table with:
- Box 9 ≤ Box 8 (per payer): IRS i1099int; Form 6251 instructions — retained
- Box 13 ≤ Box 8 (per payer): Treas. Reg. §1.171-2 — corrected: excess is nondeductible loss, not "reduces basis" alone
- Box 11 > Box 1: **CORRECTED** — prior text said "capital loss"; correct rule is §171(a)(1) excess DEDUCTION with prior-period inclusion limit (Treas. Reg. §1.171-2). Not a capital loss.
- Box 12 > Box 3: same §171 excess deduction treatment — new warning added
- Added warning rule for box 6 > 0 with no box 1/3 income

### Gap 3 — Secondary form flows
- **Form 6251 Line 2g**: Updated §4.4 — box 9 is NOT a direct pass-through; must be reduced (but not below zero) by deductions allowable if interest were includible in gross income. Under TCJA, for most taxpayers the reduction = $0, but the logic must be implemented. Added full step-by-step.
- **Schedule 1 Line 18**: Confirmed no cap — deduction can exceed interest earned. Already in context.md.
- **Form 8815**: Added complete new §4.11 with all eligibility conditions (5 conditions), MAGI phase-out thresholds ($99,500–$114,500 single; $149,250–$179,250 MFJ for TY2025), engine architecture note. Source: IRS Pub 970.
- **Foreign tax credit simplified method**: Added 4th condition (not estate/trust) — was missing from prior version. Confirmed only 4 conditions exist per IRS i1116 (not 5 as stated in the prompt).

### Gap 4 — "Verify"/"TBD" language
Remaining flag: `[!] NEEDS VERIFICATION` on Pub 1220 amount codes (§11.2). This flag is retained with full explanation: source URL is known (https://www.irs.gov/pub/irs-pdf/p1220.pdf), reason is PDF not text-parseable in research session. Iron rule satisfied — it's a developer verification action with a specific source and reason.

### Gap 5 — State fields (Boxes 15-17)
Updated §3.2 box table and §9 downstream outputs to explicitly state: "Out of scope for federal engine — passed to state engine as-is." Added note in box 17 entry that federal engine does NOT route box 17 to Form 1040 line 25b.

### New sources added
- Source 14: IRS Publication 970 (Form 8815 eligibility and phase-out thresholds)
- Source 15: Treas. Reg. §1.171-2 (bond premium excess treatment — Cornell LII)
- Source 16: IRC §171 (bond premium amortization statute — Cornell LII)

## Change Log
| Date | Phase | Action |
|------|-------|--------|
| 2026-03-27 | 0 | Created skeleton scratchpad |
| 2026-03-27 | 1 | Fetched Drake KB articles 11742, 10871, 11523, 13316 |
| 2026-03-27 | 2 | Fetched IRS i1099int, i1040sb, p550, i6251, i1116, i1040gi |
| 2026-03-27 | 3 | Resolved all open questions; confirmed all constants |
| 2026-03-27 | 4 | Downloaded PDFs: i1099int.pdf, f1099int.pdf, i1040sb.pdf, p550.pdf, i6251.pdf, i1116.pdf |
| 2026-03-27 | 4 | Verified all URLs (i1040scb.pdf 404 → corrected to i1040sb.pdf) |
| 2026-03-27 | 5 | Resolved all 5 remaining open questions; added MeF schema section to context.md with [!] flag |
| 2026-03-27 | 5 | Confirmed: box 10 on INT screen (Drake KB 14216); box 14 CUSIP field (IRS i1099int); INT field code confirmed; no covered security checkbox on INT; IRS IRIS/MeF schemas TCC-gated (not publicly verifiable) |
| 2026-03-27 | Rule 13 | Applied Rule 13 production accuracy standard. Corrected bond premium excess treatment (capital loss → §171 deduction). Added Form 6251 step-by-step. Added Form 8815 full section with TY2025 thresholds. Corrected foreign tax credit to 4 conditions. Scoped boxes 15-17 to state engine. Expanded validation table with numeric tolerances and IRC citations. |

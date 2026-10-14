# Form 2439 Context — TY2025

## What is Form 2439 and who files it

Form 2439, "Notice to Shareholder of Undistributed Long-Term Capital Gains," is issued by a
Regulated Investment Company (RIC — typically a mutual fund) or Real Estate Investment Trust
(REIT) to each shareholder when the fund retains and pays tax on long-term capital gains rather
than distributing them. The shareholder must still report their allocable share of those gains
as if they were received and then re-invested.

The fund files Form 2438 with the IRS and sends copies of Form 2439 to each affected shareholder.
Shareholders report the amounts on their individual Form 1040 via Schedule D and receive a tax
credit for the tax the fund already paid.

## Box Fields and Meanings

| Box | Label | Meaning |
|-----|-------|---------|
| 1a | Total undistributed long-term capital gains | Shareholder's allocable share of total LT capital gains retained by the RIC/REIT. This is the primary gain amount. |
| 1b | Unrecaptured section 1250 gain | Subset of box 1a — portion attributable to gain from sale of depreciable real property (IRC §1250). Taxed at max 25%. |
| 1c | Section 1202 gain | Subset of box 1a — portion from qualified small business stock (QSBS) issued after 8/10/1993, held 5+ years. Subject to partial/full exclusion under IRC §1202. |
| 1d | Collectibles (28%) gain | Subset of box 1a — portion attributable to collectibles gain under IRC §1(h)(5). Taxed at max 28%. |
| 2  | Tax paid by the RIC/REIT | Federal income tax already paid by the fund on the box 1a gains. Creates a credit for the shareholder. |

Note: Boxes 3 and 4 appear on the IRS copy for the fund's own reporting; shareholders only
receive boxes 1a–1d and 2.

## Flow to Form 1040 / Schedule D

Per IRS Schedule D Instructions (2025) and confirmed by i1040sd:

1. **Box 1a → Schedule D Line 11** (`line_11_form2439`)
   The full LT gain amount enters Schedule D Part II, line 11 "Gain from Form 2439 or 6252."
   This feeds into the net long-term capital gain calculation.

2. **Box 1b → Unrecaptured §1250 Gain Worksheet Line 11** (`line19_unrecaptured_1250` in engine)
   Flows into the worksheet that computes Schedule D line 19 (unrecaptured section 1250 gain).
   The engine field `line19_unrecaptured_1250` on schedule_d receives this.

3. **Box 1c → QSB Stock Exclusion Worksheet** (not routed in current engine)
   Requires separate Form 8949 exclusion worksheet. No current receiving node in engine.
   Positive box 1c is rejected at the source and at direct MeF/PDF export until its
   section 1202 exclusion is modeled.

4. **Box 1d → 28% Rate Gain Worksheet Line 4** (`collectibles_gain_form2439` on schedule_d)
   Flows into the 28% Rate Gain Worksheet via schedule_d's new field.
   The field is present in `schedule_d.inputSchema`.

5. **Box 2 → Schedule 3 Line 13a → Form 1040 Line 31** (`line31_additional_payments` on f1040)
   Tax paid by the fund becomes a refundable-style credit on Schedule 3 Part II, line 13a.
   The sourced amount enters `schedule3.line13a_tax_paid_by_ric_or_reit`;
   Schedule 3 totals Part II and sends line 15 to Form 1040 line 31. The
   TY2025 MeF line 13a carries references to every credited `IRS2439`
   information document.

## TY2025 Relevant Constants

- Long-term capital gains rates: 0% / 15% / 20% (thresholds per Rev Proc 2024-40)
  - 0%: single ≤ $48,350; MFJ ≤ $96,700
  - 15%: single ≤ $533,400; MFJ ≤ $600,050
  - 20%: above those thresholds
- Unrecaptured §1250 gain: max 25% rate (no inflation adjustment)
- Collectibles gain: max 28% rate (IRC §1(h)(5), no inflation adjustment)
- Section 1202 exclusion: 50%/75%/100% based on stock acquisition date (no inflation adjustment)
- NIIT (3.8%): applies when AGI > $200k (single) / $250k (MFJ)

## Engine Field Mapping

| Box | Engine field | Destination node |
|-----|-------------|-----------------|
| 1a  | `line_11_form2439` | schedule_d (exists) |
| 1b  | `line19_unrecaptured_1250` | schedule_d (exists) |
| 1c  | (not routed) | — |
| 1d  | `collectibles_gain_form2439` | schedule_d |
| 2   | `line13a_tax_paid_by_ric_or_reit` | schedule3, then f1040 line 31 |

The bounded positive box 2 route requires payer Copy B name, EIN and US
address, the selected taxpayer or spouse name and SSN last four, and the
issuer tax period ending in 2025. The payer-issued facts are checked again
at native MeF and Copy B PDF export, and the source sum must match Schedule 3
line 13a; Schedule 3 line 15 must match Form 1040 line 31. The written cases
have not yet been run in the agreed full batch.

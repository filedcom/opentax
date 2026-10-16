# TY2026 Additional Medicare Tax and withholding contract

Sources: pinned [2026 draft Form 8959](../corpus/draft/f8959.pdf), SHA-256
`8f663b2ca3dd052537a4d8aea4ae9aada0606b0f7dc7711fa8948489ef870d2f`,
and [2026 draft instructions](../corpus/draft/i8959.pdf), SHA-256
`c5b1661eeb6cb33be840a0a01616d477d2731d2b3928e1bcd3fa13b1494bbaf1`.
Recheck final revisions and current MeF XSD/rules before filing. The 0.9%
rate and status thresholds are not indexed: $250,000 MFJ, $125,000 MFS,
$200,000 single/HOH/QSS. Employer withholding begins above $200,000 paid
by that employer; liability uses the return's filing-status threshold.

## Source-to-return arithmetic

| Form 8959 part | Required source and calculation | Filed destination |
| --- | --- | --- |
| I, lines 1–7: Medicare wages | Sum W-2 box **5** for both spouses on MFJ, Form 4137 line 6 unreported tips, and Form 8919 line 6 wages. Line 4 is their total; line 7 is 0.9% of line 4 over the status threshold. Do not substitute W-2 box 1. | Line 7 feeds line 12. |
| II, lines 8–11: RRTA | Sum RRTA compensation/tips from W-2 box 14a and relevant employee-representative evidence. Compare this pool **separately** with the full status threshold; line 11 is 0.9% of the excess. | Line 11 feeds line 12; line **12 → Schedule 2 line 17b**. |
| IV, lines 13–18: self-employment | Start with Schedule SE Part I line 6 (negative amounts become zero). Reduce the status threshold by Part I line 4 Medicare wages, floored at zero; do **not** reduce it by RRTA compensation. Line 18 is 0.9% of positive SE income above that remaining threshold. | Line **18 → Schedule 2 line 11**, separate from line 12. |
| V, lines 19–24: withholding | Sum W-2 box **6** Medicare tax withheld. Subtract 1.45% of line 1 W-2 box 5 wages from that sum, floored at zero, to isolate additional withholding on wages. Add the separately reported RRTA Additional Medicare withholding from W-2 box 14a/CT-2. Keep the withholding evidence by employer and owner before aggregation. | Line **24 → Form 1040 line 25c**. It is creditable even when computed Additional Medicare Tax is zero. |

The [2026 PDF field inventory](../inventories/pdf-fields/pdf-fields-f8959.csv) has **26 widgets**, all
in the canonical field tree: name/SSN plus lines 1–24 on PDF page 2 after
the draft coversheet. It is one printed page. Field names still run
`f1_3[0]`–`f1_26[0]`, but the **meanings at positions 8–18 changed**; a
position-based TY2025 descriptor would silently misprint RRTA, SE and total
tax. Verify by printed line label and tooltip, then render and inspect.

## Current implementation boundary — October 15, 2026

- `forms/f1040/2026/nodes/form8959.ts` calculates the revised lines 1–24,
  preserving separate wage/RRTA and SE tax destinations. It reuses the exact
  0.9% helper extracted from 2025, sums source cents before rounding, and uses
  exact integer arithmetic for the 1.45% withholding comparison.
- The W-2 adapter deposits identified owner/employer records with actual box
  5/6 values and box 14a RRTA compensation/Additional Medicare withholding.
  Missing Medicare boxes fail validation; box 1 is never substituted. B/N
  uncollected FICA enters line 19, while RRTA B/N does not. Mixed FICA/RRTA B/N
  amounts need a dedicated allocation source before they can be accepted.
- Forms 4137 and 8919 supply one finalized line 6 per owner. Schedule SE
  has a strict internal owner-result contract, but its 2026 source calculator
  remains unfinished. SE losses are excluded separately for each spouse.
- The repeated `ct2s` input reuses 2025 quarterly reconciliation with a strict
  2026 year/source/owner schema. All four quarters and payment references are
  required; unsupported partial payments still need allocation evidence.
- General, W-2, Forms 4137/8919 and CT-2 are connected in the internal graph. Form 8959
  sends line 12 to Schedule 2 line 17b, line 18 to line 11, and line 24 to Form
  1040 line 25c. Source thresholds retain filing when the tax rounds to zero,
  and withholding remains creditable when joint-return liability is zero.
- The pinned one-page PDF component recalculates source input, verifies its
  two Schedule 2 destinations and its own withholding component, and maps the
  new printed line meanings. Inapplicable parts are blank; draft markings stay
  visible. The complete return bundle and current-version MeF remain pending.

The source-driven graph covers actual W-2 boxes, Form 4137 tips, Form 8919
wages and CT-2 quarters through Form 1040. Direct calculator tests cover all
three tax pools and the future Schedule SE interface; those tests do not prove that the missing
source owners or a full filing product exist. Substitute/territory/household
wages, corrected W-2s and remaining community-property exceptions also need
separate source work.

## Build and acceptance order

1. Define source amounts by W-2/CT-2, spouse and tax-year identity. Connect
   actual W-2 box 5/6 and RRTA box 14a, Form 4137 line 6, Form 8919 line 6
   and Schedule SE line 6. Sum the joint-return values once; preserve
   separate employer withholding for reconciliation.
2. Calculate printed lines 1–24 in the new order. Send line 12 to Schedule
   2 line 17b, line 18 to Schedule 2 line 11, and line 24 to 1040 line 25c.
   Keep both Schedule 2 totals and 1040 tax/withholding internally
   reconciled. File Form 8959 when the instruction filing test is met,
   including a single W-2 over $200,000 with no final liability.
3. Build the 2026 one-page PDF from the 26-field inventory and build MeF
   from the current TY2026 XSD. Do not repurpose the TY2025 combined-tax
   XML total or positional PDF map. Check emitted XML against active rules.
4. Test single/MFJ/MFS threshold edges, multiple W-2s with different
   employers, wages plus SE, RRTA plus SE (separate thresholds), all three
   pools, negative SE, Form 4137/8919 wage additions, withholding with zero
   tax, RRTA withholding, and box 1 different from box 5. Run TY2025
   regressions on any shared source changed.

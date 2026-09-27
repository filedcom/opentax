# TY2026 Additional Medicare Tax and withholding contract

Sources: pinned [2026 draft Form 8959](corpus/draft/f8959.pdf), SHA-256
`8f663b2ca3dd052537a4d8aea4ae9aada0606b0f7dc7711fa8948489ef870d2f`,
and [2026 draft instructions](corpus/draft/i8959.pdf), SHA-256
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

The [2026 PDF field inventory](pdf-fields-f8959.csv) has **26 widgets**, all
in the canonical field tree: name/SSN plus lines 1–24 on PDF page 2 after
the draft coversheet. It is one printed page. Field names still run
`f1_3[0]`–`f1_26[0]`, but the **meanings at positions 8–18 changed**; a
position-based TY2025 descriptor would silently misprint RRTA, SE and total
tax. Verify by printed line label and tooltip, then render and inspect.

## Current code boundary

- The shared `form8959` calculator is a TY2025 shape. It puts SE income in
  line 8 and RRTA in line 14, computes one line 18 tax total, and sends that
  total to the old Schedule 2 line 11 key. The 2026 form instead puts RRTA
  in Part II, wage+RRTA total on line 12, SE in Part IV, and SE tax on line
  18. The 2026 Schedule 2 sink already has distinct
  `line17b_medicare_wage_tax` and
  `line11_medicare_self_employment_tax` inputs.
- W-2 source code currently has a box 1 `medicare_wages` fallback as well
  as box 5. The 2026 calculation must require actual box 5 (or explicit
  corrected source evidence) for line 1. Form 4137, Form 8919, Schedule SE,
  RRTA and joint-spouse amounts must converge before tax calculation.
- The shared node targets the TY2025 `f1040` output for withholding. The
  2026 final node accepts `line25c_other_withheld`; aggregate Form 8959 line
  24 with other valid 25c sources without replacing or duplicating them.
- The TY2025 PDF descriptor maps its old 24 domain keys positionally into
  `f1_3`–`f1_26`. The TY2025 MeF module builds the old combined tax group
  and recalculates tax from source fields. Both need a current-year field
  map that agrees with the calculated 2026 lines and XSD.
- `form8959` is not in the TY2026 registry or public inputs, although W-2
  declares an edge to it. An ordinary wage source can therefore deposit
  pending data into an absent target without producing a filed Form 8959.

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

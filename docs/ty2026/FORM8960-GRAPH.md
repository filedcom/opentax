# TY2026 Form 8960 investment-income tax contract

The pinned [2026 draft Form 8960](corpus/draft/f8960.pdf), SHA-256
`2306f4f334a8b3b1ed73fd5045dec86eed194902923462bf485431c756f66982`,
prints the individual NIIT calculation on lines 1–17. The current [IRS
instructions](https://www.irs.gov/instructions/i8960) and pinned
[PDF](corpus/authorities/i8960--2025.pdf), SHA-256
`b10fbb23ff4a053db197285497a00914c558e3ae0cdf5c956b7c0c7867376428`,
are explicitly **2025 comparators**. Obtain 2026 instructions before
finalizing line-specific inclusion, deductions, and election worksheets.
The 2026 [Schedule 2 draft](corpus/draft/f1040s2.pdf) places NIIT on line 6.

## Source ownership and calculation order

| Printed lines | Source and rule to preserve |
| --- | --- |
| Part I election boxes | Carry the §6013(g), §6013(h), and Reg. §1.1411-10(g) elections and their required statement/history. The joint-return election can change the NIIT inclusion and threshold. |
| 1–3 | Reconcile taxable interest to Schedule B/1040 line 2b, ordinary dividends to 1040 line 3b (including pass-through and Form 8814 inclusions), and only annuities subject to NIIT to line 3. Keep account and income-source identity to avoid a blanket retirement-distribution inclusion. |
| 4a–4c | Start with potentially subject rental, royalty, partnership, S-corporation, trust, Schedule C/E/F and related trade/business items. Line 4b is the **adjustment for ordinary-course income/loss from a non-§1411 trade or business**, not a second rental-income bucket. Compute 4c from both signed values after passive/at-risk and activity limits. |
| 5a–5d | Reconcile dispositions to Schedule D/8949 and Form 4797 after basis, character, installment, exchange and passive-limit calculations. Line 5b excludes gains/losses not subject to NIIT; line 5c separately adjusts a partnership-interest or S-corporation-stock disposition. Preserve sale/activity identity through all three lines. |
| 6–8 | Line 6 handles CFC/PFIC differences, including the §1.1411-10(g) election; line 7 handles other modifications and applicable §1411 NOL. Line 8 combines lines 1, 2, 3, 4c, 5d, 6 and 7. Maintain a separate investment-income/NOL ledger rather than using ordinary AGI as a substitute. |
| 9a–11 | Form 4952 allowed investment interest, allocable state/local/foreign tax, miscellaneous investment expense, and additional modifications feed 9a/9b/9c/10. Deduct only the amount properly allocable to NII and not already deducted within the source activity. Reconcile 9d and 11. |
| 12–17 | Line 12 is max(0, line 8 minus line 11); line 13 is **modified** AGI, which may need the §911/Form 2555 addback and other NIIT-specific adjustments. Apply the printed status threshold, max(0, line 13 minus line 14), lesser-of limit, then 3.8% on line 17. Route to 2026 Schedule 2 line 6, then Schedule 2 line 21 and 1040 line 23. |

The prior-year instructions say to attach Form 8960 when MAGI exceeds the
applicable threshold; positive tax is not the only filing condition. Confirm
the exact 2026 filing instruction before retaining or changing that gate.

## Current code boundary

- The shared [calculator](../../forms/f1040/nodes/intermediate/forms/form8960/index.ts)
  is registered in the 2026 graph and already sends positive NIIT to
  Schedule 2 line 6. Its status thresholds and 3.8% calculation are useful
  baselines. `agi_aggregator` currently passes AGI straight to the `magi`
  input, so §911 and other line-13 modifications are missing.
- The input and print schema have **no** line 5c, 6 or 9c values or the
  three election answers. The current `line4b_rental_net` name describes a
  rental source, whereas printed line 4b is a non-§1411 business adjustment;
  audit all Schedule E/K-1 producers before reusing it. The calculator
  returns no form when MAGI is at/below the threshold or NII is zero; this
  must be reconciled to the 2026 attachment instruction.
- The 2026 [PDF descriptor](https://github.com/filedcom/opentax/blob/b7c07b616564167a91bc588dba05caab2a28e054/forms/f1040/2026/pdf/forms/f8960.ts)
  and [builder](https://github.com/filedcom/opentax/blob/b7c07b616564167a91bc588dba05caab2a28e054/forms/f1040/2026/pdf/f8960.ts) fill 21 numeric lines
  but omit the election boxes and printed lines 5c, 6 and 9c. The PDF
  attachment gate requires line 17 > 0. The complete [draft field
  inventory](pdf-fields-f8960.csv) is the map for closing this gap.
- The TY2025 [MeF serializer](../../forms/f1040/2025/mef/forms/f8960.ts)
  emits only a subset of inputs. It omits intermediate/final line values
  and 5c/6/9c/elections; the TY2025 rule set already contains arithmetic
  assertions for those computed fields. There is no TY2026 MeF module, so
  current XSD elements, attachment rules and active reject IDs remain to
  map. Do not infer 2026 XML from the May v1 package alone.

## Build order and acceptance

1. Pin the published 2026 instructions and current MeF release. Recheck
   status thresholds, §911 MAGI worksheet, line 7 §1411 NOL, line 9/10
   deduction limits, CFC/PFIC elections, filing trigger and active rules.
2. Give every interest/dividend, rental/K-1, disposition, foreign entity,
   Form 4952, Schedule A/tax and Form 2555 source one owned NIIT output.
   Track item/activity IDs and signed adjustment reason; reconcile to the
   ordinary 1040 source without double counting.
3. Expand the node and print record to all individual lines and election
   fields, with 4b/5b/5c/6/7/10 adjusted by their actual source rules.
   Reconcile 8, 9d, 11, 12, 15, 16 and 17 and the Schedule 2/1040 route.
4. Fill the current PDF fields and any required election statement, including
   a zero-tax attachment when the current instruction requires it. Build
   TY2026 `IRS8960` XML from the current XSD and test its arithmetic and
   cross-form business rules against complete-return fixtures.
5. Cover threshold boundaries for each status; §911 MAGI addback; passive
   versus active rental; partnership-stock sale adjustment; CFC/PFIC
   election; §1411 NOL; investment-interest and allocable-tax limits; and
   zero/negative NII. Preserve TY2025 regressions for the shared node.

This is a research and implementation contract. The existing 2026 graph/PDF
slice does not yet prove full Form 8960 filing parity.

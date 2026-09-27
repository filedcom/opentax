# TY2026 Schedule D PDF map

Source: the hash-pinned [2026 draft Schedule D](corpus/draft/f1040sd.pdf)
(`0df9af0711964b3198ea04bb0037b29d6afa85578a671553daed46251630b5f1`).
Physical page 1 is an IRS draft cover. Printed Schedule D pages are physical
pages 2 and 3. The [field inventory](pdf-fields-f1040sd.csv) records all 55
widgets, their tooltips, rectangles, and physical page numbers. All 55 are in
the AcroForm tree. Each of the 27 fields mapped by the TY2025 descriptor
still exists under the same name in this draft; that verifies names only,
not the completeness of the older mapping or final 2026 form stability.

| Printed section | Draft fields | Required pending source and reconciliation |
| --- | --- | --- |
| Filer header and QOF disposition | `Page1.f1_1`–`f1_2`; `c1_1[0]` Yes / `[1]` No | 1040 filer name/SSN; explicit `schedule_d.qof_disposition`. A Yes answer requires Form 8949. |
| Short-term direct row 1a | `Table_PartI.Row1a.f1_3`–`f1_6` | Aggregate covered 1099-B/1099-DA transactions with reported basis and no adjustments; proceeds minus basis must equal column (h). Column (g) is blank for this direct row. |
| Short-term Form 8949 rows 1b, 2, 3 | `Row1b.f1_7`–`f1_10`; `Row2.f1_11`–`f1_14`; `Row3.f1_15`–`f1_18` | Group Form 8949 short-term boxes A/G, B/H, C/I. Sum columns (d), (e), (g), and (h) by row; attach Form 8949 or an approved statement. The TY2025 PDF descriptor omits all 12 widgets. |
| Short-term lines 4–7 | `Page1.f1_19`–`f1_22` | Other-form amount, K-1 amount, positive carryover printed in parentheses, and net short-term amount. Reconcile line 7 to rows 1a–3 plus lines 4–6. |
| Long-term direct row 8a | `Table_PartII.Row8a.f1_23`–`f1_26` | Covered 1099-B/1099-DA direct totals, with blank column (g). |
| Long-term Form 8949 rows 8b, 9, 10 | `Row8b.f1_27`–`f1_30`; `Row9.f1_31`–`f1_34`; `Row10.f1_35`–`f1_38` | Group boxes D/J, E/K, F/L and attach detail. The TY2025 descriptor omits all 12 widgets. |
| Long-term lines 11–15 | `Page1.f1_39`–`f1_43` | Other-form amount, K-1 amount, capital gain distributions, positive carryover printed in parentheses, and net long-term amount. Reconcile line 15 to rows 8a–10 plus lines 11–14. |
| Summary lines 16–22 | `Page2.f2_1`, `c2_1[0..1]`, `f2_2`–`f2_4`, `c2_2[0..1]`, `c2_3[0..1]` | Line 16 equals 7+15. Positive line 16 reaches 1040 line 7a; negative line 21 applies the $3,000/$1,500 cap. Answer line 17 for a positive line 16; answer line 20 when line 17 is Yes; answer line 22 when line 16 is nonpositive or line 17 is No, using Form 1040 line 3a. The TY2025 descriptor omits line 22. Line 20 must account for Form 4952 filing, not only zero lines 18/19. |

## Builder work order

The TY2026 builder maps all 55 widgets. It fills carryovers, plain capital
gain distributions, direct broker trades on lines 1a/8a, and Form 8949
summary rows 1b/2/3/8b/9/10. It reconciles transaction totals to Schedule D
lines 7/15/16 and Form 1040 line 7a, then requires Form 8949 pages for trades
that need them. QOF, Form 4952, and other capital sources still require their
own routes. The earlier carryover sample passed visual review; the mixed
broker/digital sample passes combined PDF page and flattened-field checks.

1. Reconcile the shared Schedule D calculation and print fields with this
   table for every remaining source, including nonbroker dispositions.
2. Implement QOF and Form 4952 branches and their tax worksheets. The
   current public input requires both answers, but a Yes answer fails until
   its calculation and attachment route exists.
3. Render a loss-with-carryover case and a multi-row Form 8949 case. Inspect
   both pages of each PDF and reopen the flattened output to check for stray
   widgets and a remaining AcroForm tree.
4. Replace the draft with the final 2026 Schedule D only after checking its
   hash, fields, instructions, and the current MeF/ATS attachment rules.

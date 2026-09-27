# TY2026 Form 8949 PDF map

Source: hash-pinned [2026 draft Form 8949](corpus/draft/f8949.pdf), SHA-256
`891d869c87ffe9c6d7f79079d19ebf4ac0afa7257f6374cd95936e44a7079ffe`.
Physical page 1 is the IRS draft cover. Physical pages 2 and 3 are printed
Parts I and II. The [field inventory](pdf-fields-f8949.csv) records all 202
widgets; all are in the AcroForm tree, split 101 per printed page.

| Section | Draft fields | Use |
| --- | --- | --- |
| Header | `Page1.f1_01`–`f1_02`, `Page2.f2_01`–`f2_02` | Name and SSN/TIN. |
| Category | `Page1.c1_1[0..5]`, `Page2.c2_1[0..5]` | One of A/B/C/G/H/I on a short-term page; one of D/E/F/J/K/L on a long-term page. Never combine categories on a page. |
| Transaction rows | `Page1.Table_Line1_Part1.Row1`–`Row11` with `f1_03`–`f1_90`; analogous `Page2.Table_Line1_Part2` with `f2_03`–`f2_90` | Eleven rows per page. Eight columns per row: description, acquired, sold, proceeds, basis, code, adjustment, gain/loss. Field number is `3 + 8 × rowIndex + columnIndex`, zero based. |
| Column totals | `f1_91`, `f1_92`, `f1_94`, `f1_95`; `f2_91`, `f2_92`, `f2_94`, `f2_95` | Total proceeds, basis, adjustments, gain/loss. The extra `f1_93`/`f2_93` are present in the AcroForm and need layout review; they are not amount totals. |

The TY2026 builder partitions transactions by box, repeats the relevant page
for groups of at most eleven rows, fills column totals, and flattens each
printed page. It excludes direct Schedule D trades. The combined PDF checks
the transaction records against Schedule D before attaching Form 8949; the
Schedule D builder groups the same records into its six summary rows.

Short-term adjusted 1099-B and digital-asset H pages were rendered and
inspected. A twelve-trade continuation and a long-term category have automated
page and field checks. Add visual review for negative gains and a combined
Schedule D/Form 8949 sample before replacing the draft with a final form.

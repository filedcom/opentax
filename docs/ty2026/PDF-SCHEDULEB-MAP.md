# TY2026 draft Schedule B PDF field map

Source: pinned [`corpus/draft/f1040sb.pdf`](corpus/draft/f1040sb.pdf), SHA-256
`aa6272f6b3b8a8c6a2aa6ef9d1069f1edb88fb9df4df60278d198da89cdfd93f`.
The 72 fields and widget rectangles are in `pdf-fields-f1040sb.csv`; all 72
are in the AcroForm tree. The first physical PDF page is a draft cover, and
the one printed Schedule B page is physical page 2. Regenerate the inventory
with `build_pdf_fields.py`. Recheck this map against the final 2026 form.

| Schedule B area | 2026 pending value | Draft PDF fields |
| --- | --- | --- |
| Header | Filer name, primary SSN | `f1_01[0]`, `f1_02[0]` |
| Part I, line 1 | `interest_rows`, 14 printed payer/amount pairs | `f1_03[0]`–`f1_30[0]`; first payer nested under `Line1_ReadOrder[0]` |
| Lines 2–4 | `print_line2_total`, `ee_bond_exclusion`, `print_line4_total` | `f1_31[0]`–`f1_33[0]` |
| Part II, line 5 | `dividend_rows`, 15 printed payer/amount pairs | `f1_34[0]`–`f1_63[0]`; first payer nested under `ReadOrderControl[0]` |
| Line 6 | `print_line6_total` | `f1_64[0]` |
| Part III, 7a foreign account | `foreign_account` yes/no | `TagcorrectingSubform[0].c1_1[0]`/`[1]` |
| Part III, 7a FBAR | `fbar_required` yes/no | `c1_2[0]`/`[1]` |
| Part III, 7b countries | `foreign_countries` | `f1_65[0]`, `f1_66[0]` |
| Part III, 8 foreign trust | `foreign_trust` yes/no | `c1_3[0]`/`[1]` |

The new 2026 Schedule B node emits all interest and dividend rows, the filed
totals, Part III answers, and `file_schedule_b`. Its interest rows show each
payer's gross amount followed by separately labeled negative adjustments.
When the rows exceed the printed 14/15 slots, the PDF builder must append a
statement in the same row format, with name, SSN, and line totals. Seller-
financed mortgage details (buyer SSN and address) also need a readable
statement. Do not truncate these arrays when filling the PDF. The 2025
interest statement renderer assumes nonnegative payer amounts and a 2025
title, so it cannot render 2026 adjustment rows as-is.

The 2026 draft instructions require Part III answers when taxable interest or
ordinary dividends exceed $1,500, or when a foreign account/trust trigger
applies. The 2026 calculation node checks the required answer combinations;
the PDF builder must check them again before producing a filed schedule.

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

The 2026 Schedule B node emits all interest and dividend rows, filed totals,
Part III answers, and `file_schedule_b`. Its interest rows show each payer's
gross amount followed by separately labeled negative adjustments. The
dedicated PDF filler verifies the source hash and row arithmetic, fills the
printed page, then appends continuation pages after the 14 interest or 15
dividend slots. Each continuation page carries the filer's name and SSN,
the additional payer/adjustment rows, and the filed line total. It also
appends seller-financed buyer SSN/address details and additional countries
when needed. The sample with gross and nominee rows and the sample with a
fifteenth payer and seller-financed details passed text extraction and visual
inspection. Recheck the field map and placement against the final 2026 PDF.

The 2026 draft instructions require Part III answers when taxable interest or
ordinary dividends exceed $1,500, or when a foreign account/trust trigger
applies. The calculation node and PDF builder check the answer combinations.
`pdf/core.ts` appends Schedule B to the 1040 bundle and reconciles its lines
4 and 6 with 1040 lines 2b and 3b. The bundle rejects a missing Schedule B
when either main-form amount exceeds $1,500. Other attachment triggers still
depend on Schedule B being passed from a fully registered product graph.

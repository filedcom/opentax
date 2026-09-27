# TY2026 draft Form 1040 PDF field map

Source: pinned [`corpus/draft/f1040.pdf`](corpus/draft/f1040.pdf), created
August 25 and modified September 17, 2026 according to its PDF metadata.
`pdf-fields-f1040.csv` records all 207 AcroForm fields, their IRS tooltips,
widget rectangles, and physical PDF pages. Regenerate it with
`build_pdf_fields.py` using the bundled `pypdf` runtime. The draft PDF has an
unnumbered cover page: printed Form 1040 pages 1 and 2 are physical PDF pages
2 and 3. Recheck every name against the final 2026 form before release.

The IRS field tooltips and rendered page 2 agree on these changed lines.
Names in the last column have the prefix `topmostSubform[0].Page2[0].`,
except line 11a's printed page 1 field.

The 2026 main-form descriptor also maps the retained income lines 1a–1i,
computed 1z, 2a–2b, 3a–3b, 4a–4b, 5a–5b, 6a–6b, and 7a to the pinned
page-1 widgets. The dedicated 2026 final node now preserves these source
amounts, sums accumulated wages and dividends for print, and combines the
capital-gain and capital-gain-distribution inputs on printed line 7a. A
populated income-page sample passed text extraction and visual inspection.
For a direct Form 1099-DIV box 2a distribution, `line7b_schedule_d_not_required`
checks `Page1[0].c1_45[0]`; a rendered draft sample shows line 7a and the
marked box together. The PDF boundary currently rejects a capital gain or loss
that requires the still-unimplemented 2026 Schedule D attachment.

| Form line | TY2026 pending key | PDF field suffix |
| --- | --- | --- |
| 11a | `line11a_agi` | `Page1[0].f1_75[0]` (page 1) |
| 11b | `line11b_agi` | `f2_01[0]` |
| 12e | `line12e_standard_or_itemized` | `f2_02[0]` |
| 12f | `line12f_nonitemizer_charity` | `f2_03[0]` |
| 13a | `line13a_schedule1a` | `f2_04[0]` |
| 13b | `line13b_qbi` | `f2_05[0]` |
| 14 | `line14_total_deductions` | `f2_06[0]` |
| 15 | `line15_taxable_income` | `f2_07[0]` |
| 16–23 | Existing respective `line16`–`line23` keys | `f2_09[0]`–`f2_16[0]` (the `f2_08` field is a form-name box) |
| 24a | `line24a_total_tax` | `f2_17[0]` |
| 24b | `line24b_form1062` | `f2_18[0]` |
| 24c | `line24c_total_tax` | `f2_19[0]` |
| 25a | `line25a_w2_withheld` | `Line25_ReadOrder[0].f2_20[0]` |
| 25b–25d | `line25b_withheld_1099`, `line25c_other_withheld`, `line25d_total_withholding` | `f2_21[0]`–`f2_23[0]` |
| 27b–27c | `line27b_clergy_schedule_se`, `line27c_declines_eic` | `c2_12[0]`, `c2_13[0]` |
| 30 | `line30_refundable_adoption` | `f2_29[0]` |
| 32a | `line32a_refundable_credits` | `Line31-32_ReadOrder[0].f2_31[0]` |
| 32b–32c | `line32b_public_benefit_reduction`, `line32c_net_refundable_credits` | `f2_32[0]`–`f2_33[0]` |
| 33–34 | `line33_total_payments`, `line34_overpayment` | `f2_34[0]`–`f2_35[0]` |
| 35a | `line35a_refund` | `f2_36[0]` |
| 36–38 | `line36_apply_to_2027`, `line37_amount_owed`, `line38_underpayment_penalty` | `f2_39[0]`–`f2_41[0]` |

Page 1's new work-authorization answers are `c1_11[0]`/`c1_11[1]`
(taxpayer yes/no) and `c1_12[0]`/`c1_12[1]` (spouse yes/no). The dependent table has new residence and
student/disability checkbox groups `c1_14`–`c1_29`; its credit selection uses
`c1_30`–`c1_33`. These need row-level mapping and data validation before the
2026 PDF builder is complete. The AcroForm tooltips provide the exact row and
column labels in the CSV.

`forms/f1040/2026/pdf/forms/f1040.ts` maps the currently computed 1040 fields,
and `forms/f1040/2026/pdf/f1040.ts` fills the pinned draft and removes its
cover page. A wages-only graph result was rendered and inspected on both
pages. This is the main-form component; the full PDF bundle still needs
dependent rows, remaining 1040 fields, and every supported attached form.

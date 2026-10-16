# TY2026 draft Schedule B PDF field map

Source: pinned [`corpus/draft/f1040sb.pdf`](../corpus/draft/f1040sb.pdf), SHA-256
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

## Current implementation

`forms/f1040/2026/pdf/schedule_b.ts` recomputes the retained investment claim
through the shared INT/DIV/Schedule B calculators, checks payer/adjustment
arithmetic in cents and reconciles lines 4 and 6 to Form 1040 lines 2b and 3b.
It rejects an unneeded attachment or mismatched filer. This is a component
builder; complete return attachment selection remains unfinished.

The builder verifies the pinned source and all 72 canonical fields/widgets,
fills the printed page, removes the cover, flattens appearances and removes
annotations/AcroForm. Every output page retains a draft warning. The source
contract currently permits only false foreign-account/trust answers; those No
boxes are marked, while the conditional FBAR question and countries stay blank.
Positive foreign disclosures require their own validated reporting path.

Interest payers print gross amounts, followed by a subtotal and separately
labeled negative adjustments. Below-threshold dividends remain visible when
interest independently requires Schedule B, without a second income handoff.
Payer/adjustment rows retain cents; return totals round only after summation.
If rows exceed 14 interest or 15 dividend slots, the last slot points to a
complete statement. Those statements repeat all rows, paginate at 30 rows,
identify their row range and carry filer identity and the whole-dollar total.
Seller-financed personal-residence interest prints first; separate buyer-detail
pages preserve name, SSN, address and exact interest, seven buyers per page.

[2026 draft instructions](https://www.irs.gov/pub/irs-dft/i1040sb--dft.pdf),
rechecked October 15, 2026, require labeled adjustments and filer-identified
statements with totals on Schedule B. OID, savings-bond exclusions, nominee
dividends and foreign-account/trust reporting are not enabled by this component.
Recheck the map and behavior against final 2026 forms/instructions before release.

## Verification

Four focused tests cover source arithmetic, multi-page payer/adjustment and buyer
printing, a below-threshold adjustment trigger, destination/filer disagreement,
unneeded attachments and static output. The complete current-2026 plus shared
INT/DIV/Schedule B regression run passed 480 tests. A six-page synthetic QA PDF
was rendered with Poppler and visually inspected, including two interest
statement pages, a dividend statement, buyer details and a single-page adjusted
return. No payer or adjustment was lost, and output has no widgets/AcroForm.

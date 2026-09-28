# TY2025 Schedule C PDF gap

The official two-page [2025 Schedule C](https://www.irs.gov/pub/irs-prior/f1040sc--2025.pdf) was inspected from its printed form and AcroForm field tree. The PDF descriptor is now registered for a bounded, identified taxpayer-owned business path. It imports the extracted pure `nodes/inputs/schedule_c/model.ts` rather than the graph node, avoiding the module-initialization cycle. One two-page copy is projected per business. Focused cases are written but unrun, and no filled PDF has been inspected.

## Verified AcroForm map

The names below have the prefix `topmostSubform[0].`; all fields are `[0]` unless another index is shown. Page coordinates were cross-checked against the printed line labels. The PDF was locally available as `/private/tmp/f1040sc--2025.pdf`.

| Printed location | AcroForm fields |
| --- | --- |
| Proprietor name, SSN | `Page1[0].f1_1`, `Page1[0].f1_2` |
| Header A, B, C, D | `Page1[0].f1_3`, `Page1[0].BComb[0].f1_4`, `Page1[0].f1_5`, `Page1[0].DComb[0].f1_6` |
| Business street, city/state/ZIP | `Page1[0].f1_7`, `Page1[0].f1_8` |
| F cash/accrual/other | `Page1[0].c1_1[0..2]`; other description `Page1[0].f1_9` |
| G yes/no, H, I yes/no, J yes/no | `Page1[0].c1_2[0..1]`, `c1_3[0]`, `c1_4[0..1]`, `c1_5[0..1]` |
| Statutory employee box | `Page1[0].Line1_ReadOrder[0].c1_6[0]` |
| Income lines 1–7 | `Page1[0].f1_10` through `f1_16` in order |
| Expense lines 8, 9, 10, 11, 12, 13, 14, 15, 16a, 16b, 17 | `Page1[0].Lines8-17[0].f1_17` through `f1_27` in order |
| Expense lines 18, 19, 20a, 20b, 21, 22, 23, 24a, 24b, 25, 26 | `Page1[0].Lines18-27[0].f1_28` through `f1_38` in order |
| Expense lines 27a, 27b | `Page1[0].Lines18-27[0].f1_40`, then `f1_39` (field numbers are reversed) |
| Lines 28, 29 | `Page1[0].f1_41`, `Page1[0].f1_42` |
| Line 30 total home area, business area, deduction | `Page1[0].Line30_ReadOrder[0].f1_43`, `f1_44`, then `Page1[0].f1_45` |
| Line 31, line 32a/b | `Page1[0].f1_46`, `Page1[0].c1_7[0..1]` |
| Line 33 cost/LCM/other; line 34 yes/no | `Page2[0].c2_1[0]`, `c2_2[0]`, `c2_3[0]`; `c2_4[0..1]` |
| COGS lines 35–42 | `Page2[0].f2_1` through `f2_8` in order |
| Vehicle line 43 month/day/year; line 44 business/commuting/other miles | `Page2[0].f2_9` through `f2_11`; `f2_12` through `f2_14` |
| Vehicle lines 45, 46, 47a, 47b yes/no | `Page2[0].c2_5[0..1]` through `c2_8[0..1]` |
| Part V nine description/amount pairs | `Page2[0].PartVTable[0].Item1[0].f2_15`/`f2_16` through `Item9[0].f2_31`/`f2_32` |
| Line 48 total | `Page2[0].f2_33` |

## Current projection and remaining boundaries

- The descriptor uses the pure model for COGS, gross income, meals, expenses, Form 8829 line 30, and preliminary line 31. Printed line 31 precedes any Form 6198 at-risk limitation to the Schedule 1 amount. It applies the model's section 163(j) exemption check to positive business interest.
- Taxpayer name/SSN is selected from the return's taxpayer identity. An omitted proprietor is treated as the taxpayer only with a known nonjoint filing status. A joint return requires an explicit proprietor in both MeF and PDF; spouse-owned native MeF uses the spouse's name/SSN, while its PDF remains blocked pending an owner-specific projection.
- Positive source-only top-level receipt, wage, interest, vehicle, depletion, and home-office amounts stop instead of disappearing. A direct item-level line 30 amount also stops unless the linked Form 8829 projection supplies it. Form 5884 WOTC reductions stop because its calculator imports the live Schedule C node and cannot be used in this pure PDF path without reopening the initialization cycle; a source-verified pure join remains to be extracted.
- Simplified home-office claims stop because total home square footage is absent. The `other` accounting method, `other` inventory method, and changed inventory valuation stop because required explanations are absent. Undescribed line 27b amounts and more than nine Part V rows stop. Vehicle expense needs complete Part IV facts; a Form 4562-only exception is not yet represented.
- The model's vehicle mile names refer to source positions; the PDF maps business/commuting/other miles to printed line 44a/b/c by meaning.
- The registered field map and focused projection/guard cases still need the deferred full test batch, a filled-PDF visual and field-data check, and source/return reconciliation for unsupported branches.

No tests, typecheck, XSD validation, or filled-PDF render were run during this build segment.

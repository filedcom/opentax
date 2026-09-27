# TY2026 Form 2441 PDF map

Pinned source: [draft Form 2441](corpus/draft/f2441.pdf), SHA-256
`67eca7567ce5ff06e72d40a07db487f406da33139e664c0c0d9c67a4e31e9385`.
The source has three physical pages: a draft cover and two printed form pages.
Retain source page 1 for a credit-only return and pages 1 and 2 when Part III
benefits apply (zero-based indices). Its
AcroForm has 72 terminal widgets on the printed pages; the complete field
inventory is [`pdf-fields-f2441.csv`](pdf-fields-f2441.csv). The printed pages
were rendered and visually inspected on 2026-09-27. Re-map against the final
IRS release before filing.

## Printed page 1

| Printed area | AcroForm widgets | Required projection |
| --- | --- | --- |
| Name and SSN | `f1_1`, `f1_2` | Form 1040 filer identity. |
| A and B | `c1_1`, `c1_2` | MFS considered-unmarried answer and calculated student/disability deemed-income use from monthly facts. |
| More than three providers | `c1_3` | Check only with a provider continuation statement. |
| Part I provider names, addresses, TINs, paid amounts | `f1_3`–`f1_14` | Three columns. Address widgets `f1_6`–`f1_8` have mismatched line spacing, so the current static builder draws street, unit, city, state, and ZIP directly on the printed rows. Preserve every provider beyond three on a continuation statement. |
| Part I line 1d | `c1_4[0/1]`–`c1_6[0/1]` | Paired Yes/No checkboxes, `/1` and `/2` on-state values. Check exactly one per populated provider. Reconcile Yes providers with Schedule H facts. |
| Dependent-care benefits question | **No widget** | The printed No/Yes lines after Part I are unfillable in the source AcroForm. Draw an overlay or use a verified static replacement and check its render. |
| More than three qualifying people | `c1_7` | Check only with a qualifying-person continuation statement. |
| Part II line 2 | `f1_15`–`f1_26`, `c1_8`–`c1_10` | Three rows: first/last name, SSN, over-12-and-disabled answer, and 2026 paid credit expenses. Preserve all extra rows in a statement. |
| Lines 3–11 | `f1_27`–`f1_37` | Map in numeric order, including 9a, 9b, and 9c. `f1_32` is the digits **after** the preprinted `X.` on line 8: a 35% rate prints `35`, not `0.35`. |

## Printed page 2

| Printed area | AcroForm widgets | Required projection |
| --- | --- | --- |
| Lines 12–21 | `f2_1`–`f2_10` | Benefits, carryover, forfeiture, limits, and earned income in line order. Line 14 has printed parentheses for the forfeited/carryforward amount. |
| Line 22 decision | `c2_1[0/1]`, `f2_11` | Separate No and Yes widgets; print the sole-proprietor/partnership amount only on Yes. |
| Lines 23–31 | `f2_12`–`f2_20` | Deductible, excluded, taxable benefits and remaining credit expenses in line order. |

## Filing checks before enabling the public input

1. Complete the [Form 2441 calculation contract](FORM2441-GRAPH.md): prior-year
   paid expenses and Worksheet A (9b/9c), proprietor/partner benefits
   (22/24), person eligibility, provider
   reconciliation, and earlier-credit inputs to line 10.
2. Fill every populated provider/person row and the applicable printed pages.
   The current builder prints the three highest-paid providers and three
   people with the highest qualifying expenses on the IRS form, checks the
   overflow boxes, and appends the remaining rows on statements. Both a
   fourth-row case and the 25-row maximum were rendered and inspected.
3. Reconcile line 26 to Form 1040 line 1e, line 11 to Schedule 3 line 2,
   line 9c to 9a+9b, and line 28 to 24+25 before rendering. The graph
   currently supports line 24 and 9b only as zero, so do not publicly file
   those cases yet.
4. Check the field values and widget appearances before flattening, then
   inspect rendered pages. The current builder fills the initial one- and
   two-page employee cases, overlays the source's missing benefits answer,
   and paginates provider/person continuations. Complete the MFS,
   student/disability, prior-year expense, and self-employed cases before
   exposing the filing input publicly.

This map records the draft layout and field topology. The current draft PDF
builder covers only the graph's employee-benefit calculation slice; it is
not a complete filing attachment for all Form 2441 cases.

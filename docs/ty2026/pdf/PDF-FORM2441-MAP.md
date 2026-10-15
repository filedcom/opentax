# TY2026 Form 2441 PDF map

Pinned source: [draft Form 2441](../corpus/draft/f2441.pdf), SHA-256
`67eca7567ce5ff06e72d40a07db487f406da33139e664c0c0d9c67a4e31e9385`.
The source has three physical pages: a draft cover and two printed form pages.
Retain source page 1 for a credit-only return and pages 1 and 2 when Part III
benefits apply (zero-based indices). Its
AcroForm has 72 terminal widgets on the printed pages; the complete field
inventory is [`pdf-fields-f2441.csv`](../inventories/pdf-fields/pdf-fields-f2441.csv). The printed pages
were rendered and visually inspected on 2026-09-27. Re-map against the final
IRS release before filing.

## Printed page 1

| Printed area | AcroForm widgets | Required projection |
| --- | --- | --- |
| Name and SSN | `f1_1`, `f1_2` | Form 1040 filer identity. |
| A and B | `c1_1`, `c1_2` | MFS current-credit eligibility or eligible prior-year credit, and calculated student/disability deemed-income use from monthly facts. |
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

## Current implementation and remaining filing checks

The current builder is `forms/f1040/2026/pdf/form2441.ts`; the source graph
connects the reviewed ordinary-W-2/child-care slice described in
[FORM2441-CURRENT.md](../graphs/FORM2441-CURRENT.md). This is a draft-only source
input, not a registered filing product.

It reconciles line 26 to Form 1040 line 1e, line 7 to AGI, line 10 to tax before
credits (FTC/Form 8978 are explicitly absent), and line 11 to Schedule 3 line 2.
Line 9b comes from the retained 2025-expense Worksheet A; lines 22 and 24
remain zero behind explicit proprietor/partner source gates. Schedule 3's care
credit reduces Schedule 8812's tax limit. One-page credit, two-page benefits and
25-row continuation cases were rendered and inspected on October 15.

The current source route computes checkbox B from monthly student/disability
income actually entered on the printed parts, including independent care combat
elections. Checked and unchecked examples were rendered and inspected.

A positive line 9b adds an equivalent Worksheet A statement after official forms.
It includes all numeric lines, provider identity/address/household answers, prior
qualifying-person identity/disability answers and payment dates. Prior-only
claims leave current line-2 person rows empty and current credit expenses zero.
The statement wraps and paginates using the existing continuation renderer.

Current line-2 rows now include disabled spouses and eligible nondependent
people, using resolved general identities and the calculated over-12/incapacity
flag. These rows do not add Form 1040 dependents. The six-page October 15 QA set
covers the disability and deemed-income boxes, a custodial child, a newborn and
an additional disabled-person continuation with zero expenses.

MFS benefit-only returns leave Part II and lines 27–31 blank. MFS prior-only
credit checks A and prints zero on 9a, followed by 9b–11 and Worksheet A.
Considered-unmarried MFS uses its own line-19 earnings and the $7,500 limit;
ordinary MFS uses reconciled separate spouse earnings and the $3,750 limit.
The eight-page MFS QA set verifies A/B boxes, both limits, disabled-spouse
income, prior-only credit and static output without annotations or AcroForm.

Before full filing support, complete the remaining eligibility,
changed-filing-unit prior expenses, self-employed benefit and special-provider routes in the
current contract, then reconcile final IRS forms and current MeF/business rules.

# TY2025 Form 982 QPRI PDF route

Scope: a single original Form 1099-C explicitly routed to the qualified
principal residence indebtedness (QPRI) exclusion. This is not general Form 982
coverage. Bankruptcy, insolvency, farm debt, and qualified real property
business debt still require their own tax-attribute reduction details before
native or PDF filing.

The IRS continues to publish the March 2018 Form 982 as the current form. Its
[instructions](https://www.irs.gov/instructions/i982) put QPRI on line 1e, the
excluded discharged debt on line 2, and the principal-residence basis reduction
on line 10b when the taxpayer retained the residence. The
[form](https://www.irs.gov/pub/irs-pdf/f982.pdf) itself is the field-location
source. The checked-in source-PDF field dump at
`.state/field-dumps/form982.json` and the PDF widgets identify these actual
AcroForm names:

| IRS field                                | AcroForm field                        | Export behavior                                            |
| ---------------------------------------- | ------------------------------------- | ---------------------------------------------------------- |
| 1e QPRI checkbox                         | `topmostSubform[0].Page1[0].c1_5[0]`  | Checkbox; widget on-state `/1`                             |
| 2 total discharged indebtedness excluded | `topmostSubform[0].Page1[0].f1_3[0]`  | Text                                                       |
| 10b principal residence basis reduction  | `topmostSubform[0].Page1[0].f1_11[0]` | Text, including an explicit zero if retained basis is zero |

The old Form 982 PDF mapping put line 2 in `f1_7[0]`, which is line 7, and
omitted the QPRI checkbox and line 10b. The new shared QPRI projector recomputes
the Form 982 deposit from one original excluded Form 1099-C, requires exact
deposited facts, applies the qualified-loan and filing-status cap logic, and
feeds the same derived line 2 and line 10b values to native XML and PDF.
Missing, multiple, or inconsistent original sources fail closed. The PDF route
also requires the return filing status to match the QPRI
married-filing-separately answer. A disposed residence leaves line 10b blank. If
the Form 982 pending slot is empty while the original Form 1099-C would deposit
a positive exclusion, both exports now reject the missing form.

The focused tests cover capped and mixed-use debt, retained/disposed residence,
zero basis, missing original source, source mismatch, filing-status mismatch,
non-QPRI rejection, a missing Form 982 deposit, and field names. They are **not
run** under the current build-first instruction. The later agreed batch still
needs typecheck, tests, IRS TY2025 XSD validation of native XML, and a
filled-PDF render with visual verification of the checkbox appearance and line
placement. Source-PDF inspection alone does not prove a filled widget's visual
appearance.

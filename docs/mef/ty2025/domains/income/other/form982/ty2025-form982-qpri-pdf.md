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
deposited facts, applies the current qualified-loan and filing-status cap logic (qualified by
the cap-ordering failure below), and
feeds the same derived line 2 and line 10b values to native XML and PDF.
Missing, multiple, or inconsistent original sources fail closed. The PDF route
also requires the return filing status to match the QPRI
married-filing-separately answer. A disposed residence leaves line 10b blank. If
the Form 982 pending slot is empty while the original Form 1099-C would deposit
a positive exclusion, both exports now reject the missing form.

## October 10 public source and complete export checkpoint

The existing 1099-C, Form982 calculation, native-contract and XSD modules now
run successfully: **84 passed, zero failed or ignored**. The new public export
module has **six passes and two failures**, for **90 passes and two failures**
across the grouped checks. The two failures remain active regression cases;
no production repair or ignored expectation was introduced.

Seven retained-residence returns reach native XML and actual flattened PDF.
All seven pass the full TY2025 v5.4 Return1040 schema. All 29 packet pages were
visually reviewed (20 distinct RGB hashes), including Form982 checkbox1e,
line2 and line10b; zero retained basis prints an explicit zero. Independent
Python checks reconcile PDF text and native Form982 amounts to the actual
calculation, validate flattened fields, and independently recompute exclusion,
taxable cancellation and ordinary tax. That agreement does **not** make the
two cap returns correct.

| Public case | Line2 actual / expected | Taxable COD actual / expected | Final tax actual / expected | Pages |
| --- | ---: | ---: | ---: | ---: |
| retained | 15,000 / 15,000 | 0 / 0 | 7,955 / 7,955 | 3 |
| mixed-loan-basis-limit | 50,000 / 50,000 | 50,000 / 50,000 | 19,067 / 19,067 | 5 |
| separate-cap | 375,000 / 175,000 | 25,000 / 225,000 | 13,455 / 69,035 | 5 |
| joint-cap | 750,000 / 550,000 | 50,000 / 250,000 | 10,746 / 56,134 | 5 |
| zero-basis | 15,000 / 15,000 | 0 / 0 | 7,955 / 7,955 | 3 |
| taxable-interest | 15,000 / 15,000 | 2,000 / 2,000 | 8,395 / 8,395 | 5 |
| deductible-interest | 15,000 / 15,000 | 0 / 0 | 7,955 / 7,955 | 3 |

Each return has wages75,000 and withholding11,000. The single/MFS standard
deduction is15,750; MFJ is31,500. Expected exclusion applies the qualified-debt
cap before subtracting nonqualified debt from the canceled principal. This
follows the exclusion limit and ordering rule in
[2025 Publication4681](https://www.irs.gov/publications/p4681).
In `separate-cap`, acquisition-use debt600,000 and canceled principal400,000
leave225,000 nonqualified debt after the375,000 cap; exclusion is175,000.
In `joint-cap`, debt1,000,000 and cancellation800,000 leave250,000 nonqualified
debt after the750,000 cap; exclusion is550,000. The current implementation
instead accepts an over-cap claimed qualified balance and caps the exclusion
only after ordering. Either reject that source claim or apply the cap before
ordering; this is **future_todo149**, outside the current repair queue.

Seven native and seven actual-PDF mutations of the retained basis reject
against the original1099-C deposit before the amount assertions. Four other
exclusion types (bankruptcy, insolvency, farm debt, real-property business)
reject at both final exporters: native currently stops at its earlier QPRI
filing-status check because these sources lack a QPRI flag, while PDF reports
missing tax-attribute reduction details. These eight rejections establish an
export boundary, not implemented or approved exclusion coverage.

Evidence is retained privately in
`.state/research/form982-qpri-2026-10-10/`: original inputs, pending deposits,
XML/PDF, component and final-public logs, page inventory, contact sheets,
independent verifier, packet-verification, visual-review and SHA256SUMS.
The earlier component XSD test is separate from these seven new public packets.
Run the public module with `deno test -A` and optional
`-- --evidence-dir=<directory>`; full XSD needs the local authorized schema
cache and `xmllint`, and PDFs need the template cache/network.
Synthetic lender/loan-use references do not authenticate real source documents.
Wider debt inventories, non-QPRI attribute reduction and IRS acceptance remain
open; the broad Form982 board task is not checked off.

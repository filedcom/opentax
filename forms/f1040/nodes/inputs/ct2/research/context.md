# TY2025 Form CT-2 source for Form 8959

The [2025 Form CT-2](https://www.irs.gov/pub/irs-prior/fct2--2025.pdf) is a
quarterly return for an employee representative. Form 8959 line 14 includes the
compensation subject to Tier 1 Medicare tax from CT-2 line 2, and line 23
includes Additional Medicare Tax paid from CT-2 line 3, per the
[2025 Form 8959 instructions](https://www.irs.gov/instructions/i8959).

The public Form 1040 input key is `ct2`, an array with four quarterly records
for each recipient entered. Each record names `tax_year: 2025`, `recipient`
(`taxpayer` or `spouse`), `recipient_ssn`, `quarter` (1–4),
`line2_tier1_medicare_compensation`, `line3_additional_medicare_compensation`,
`line3_additional_medicare_tax_paid`, and a `payment_reference` when claiming
paid tax. Zero-value quarters complete the annual ledger even when a quarter was
not filed. Duplicate or missing quarters, a line 3 compensation amount
inconsistent with the cumulative $200,000 threshold, or a payment inconsistent
with 0.9% of line 3 compensation stop the source. A positive payment needs a
reference and must match the full calculated line 3 tax. Partial payments still
need a supported allocation rule and are rejected by this source.

The node sums line 2 compensation to Form 8959 line 14 and confirmed paid line 3
tax to line 23. CT-2 does not establish the income tax reporting of the
underlying compensation; the return needs its separate wage/income source. Every
quarter's SSN must match the recipient's Form 1040 SSN. Spouse CT-2 records
require a joint return. CT-2 is not attached to the Form 1040 MeF package by
this route. Source, joint-return, full-return, and local XSD cases are written
but unrun. The source still needs reconciliation against actual filed CT-2
copies and payments, the complete Form 8959 business-rule set, and IRS ATS
acceptance.

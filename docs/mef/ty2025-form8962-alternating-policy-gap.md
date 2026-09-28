# TY2025 Form 8962: alternating same-state policies

The
[2025 Form 8962 instructions](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf)
use Form 1095-A columns A, B, and C for each covered month on lines 12-23. They
do not limit the number of same-state policy switches. This bounded route
accepts one single filer whose two identified Form 1095-A policies alternate
A-B-A (or switch again) without an overlap or uncovered month. Each policy names
the filer as its sole covered person, has the same Marketplace state as the
filed return, supplies all twelve monthly A/B/C values, and reconciles any
reported annual totals to those months.

The Form 1095-A node already sums monthly premium and APTC while counting the
active SLCSP once. Native Form 8962 independently checks policy identity, state,
no-overlap monthly ownership, household income, poverty table, contribution,
each monthly premium/SLCSP/APTC and credit, totals, and finalized Schedule 2/3
and Form 1040. The PDF instance invokes the same native check. The former
one-switch ceiling now remains only for the separately sourced interstate move
route. The new alternating route stops if any month is uncovered, rather than
silently extending an annual or partial-year assumption.

Focused source calculation, native XML, PDF projection, and tampering cases are
written but unrun under the build-first instruction. Other multi-policy,
overlapping, partial-year alternating, interstate, shared-tax-family, and
corrected-SLCSP paths are not admitted by this extension. IRS XSD, filled-PDF
visual, business-rule, and ATS verification remain open.

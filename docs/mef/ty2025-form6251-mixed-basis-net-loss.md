# TY2025 Form 6251 line 2k: audited same-term net loss

The [TY2025 Form 6251](https://www.irs.gov/pub/irs-prior/f6251--2025.pdf) labels
line 2k as the difference between AMT and regular gain or loss. Its
[line 2k instructions](https://www.irs.gov/pub/irs-prior/i6251--2025.pdf)
require refiguring Form 8949 and Schedule D under the AMT basis, then applying
the capital-loss limit separately to the AMT result. The
[TY2025 Schedule D instructions](https://www.irs.gov/pub/irs-prior/i1040sd--2025.pdf)
set the current-year loss limit at $3,000, or $1,500 for married filing
separately. Within one short- or long-term bucket, identified gains offset
identified losses before either limit is applied.

The bounded extension accepts audited Form 8949 rows of one term with both
positive and negative rows only when every row has whole-dollar proceeds and
regular/AMT bases, is unadjusted, and has the same sign under both bases. The
complete Schedule D audit must contain exactly those source rows and no other
capital activity. Both net totals must be losses inside their separate
current-year limits. Form 6251 line 2k then prints the signed difference between
those two fully deductible net amounts, without creating Part III preferential
gain. A positive Form 6251 computation emits that exact line through the
existing MeF and PDF fields.

It still rejects a net total outside either limit, mixed short/long-term rows,
additional Schedule D activity, qualified dividends, Form 4952 election, Form
2555, and special-rate gains. This does not determine regular or AMT
capital-loss carryovers, transactions whose gain/loss sign changes between
bases, or a net gain under one tax and net loss under the other. Focused source,
calculation, MeF, PDF, and rejection cases are written but unrun; the
coordinated test, XSD, filled-PDF, IRS-rule, and ATS gates remain open.

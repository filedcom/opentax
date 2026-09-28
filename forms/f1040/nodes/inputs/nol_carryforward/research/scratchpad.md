# TY2025 NOL carryforward research

The public `nol_carryforward` input has only a loss year, amount, broad
pre-2018/post-2017 label, and an asserted current-year taxable-income amount.
That is not enough to verify a surviving deduction. Positive inputs therefore
reject at the node. A zero-valued populated source remains blocked at both
exports; direct Schedule 1 line 8a and Form 6251 line 2f routes are guarded.

The [Form 172 instructions](https://www.irs.gov/instructions/i172) require a
loss-year calculation, each carryback/carryforward use and modified-taxable-
income refigure, and earliest-vintage ordering. Applicable Form 172s attach to
the carried-year 1040. The regular deduction appears as a negative Schedule 1
entry. The [2025 Form 6251 instructions](https://www.irs.gov/pub/irs-prior/i6251--2025.pdf)
require the regular NOL addback on line 2e and an independently refigured AMT
NOL deduction on line 2f. A zero AMT deduction cannot be inferred from the
regular loss amount.

No source-backed native/PDF route is registered. See
`docs/mef/ty2025-form172-nol-gap.md` for exact remaining evidence and graph
requirements. The old local tests that treated asserted amounts as a proved
deduction were replaced by unrun fail-closed cases.

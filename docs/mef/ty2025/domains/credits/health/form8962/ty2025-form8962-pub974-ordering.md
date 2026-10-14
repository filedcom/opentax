# TY2025 Publication 974 self-employed insurance and PTC ordering

The bounded route starts with Form 7206's `pub974_single_business` source. It
requires one identified profitable Schedule C business, Schedule SE line 13,
Schedule 1 line 16, twelve identified Form 1095-A policy months, and Worksheet
W/X income and premium facts. The graph compares those facts with the
independently routed Schedule C, Schedule SE, Form 1095-A, and Schedule 1
amounts. Unsupported special adjustment cases and nonconvergent iterations
remain closed.

The [2025 Publication 974 iterative method](https://www.irs.gov/publications/p974)
directs taxpayers to iterate the health-insurance deduction and PTC using
dollars and cents until both changes are below $1. Worksheet X line 25 supplies
Form 8962 line 28 when excess APTC requires that line. The graph keeps that
Worksheet X result on its internal Form 8962 reconciliation record, and the
Form 8962 calculation uses it instead of the ordinary Table 5 limit for this
route. Final native and PDF export require the calculated Schedule 1 line 17,
Schedule 1 total adjustments, Form 1040 income and AGI, and Schedule 2/3 PTC
amounts to agree with the converged result.

This route is limited to the one-business, one-policy, wholly specified monthly
premium facts modeled by the source schema. The IRS [2025 Form 8962
instructions](https://www.irs.gov/instructions/i8962) and Publication 974 govern
other policy allocations, special deduction interactions, and alternate
methods; those cases require their own verified source and calculation route.

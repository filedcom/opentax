# TY2025 Form 8962 three-policy same-state overlap

The [2025 Form 8962 instructions](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf)
say to add columns A and C from separate same-state policies covering the tax
family, but use the common column B SLCSP once. Worksheet 1-2 includes modified
AGI for each dependent required to file because income passes the filing
threshold. The 2024 poverty line used for 2025 coverage is $25,820 for three
people in contiguous states, $32,270 in Alaska, and $29,690 in Hawaii.

The bounded monthly route now accepts exactly three identified Form 1095-A
policies on a single-filer return with two claimed dependents. Each policy must
name exactly one different tax-family SSN, remain in the filer's state, and
report positive premiums, SLCSP, and APTC for all twelve months. The three
statements must agree on each month's positive SLCSP. Annual column totals,
when supplied, must match each statement's monthly columns. No shared-policy
allocation, marriage, SLCSP correction/review, interstate move, or Form 2555
is admitted. The annual line 11 branch is also written when all three policies
have unchanged positive monthly premiums and SLCSP, positive monthly APTC,
and reconciled Form 1095-A line 33 totals. It sums premiums and APTC across
policies and counts the common same-state SLCSP once.

Both dependents must have the existing source-backed required-filing route: a
referenced interest-only filed 2025 Form 1040 plus referenced Forms 1099-INT.
Each source document must name the dependent by SSN. The returns and interest
forms reconcile each dependent's AGI, tax-exempt
interest, and required-filing threshold, and all source document IDs must be
distinct. The monthly MeF route checks combined dependent MAGI, household
income, the family-size poverty line, 8.5% contribution, monthly A/B/C and
credit amounts, totals, Schedule 2/3, and finalized Form 1040. The annual
route checks the same household and policy identities, line 11 amounts, and
finalized Schedule 2/3 and Form 1040. PDF instance creation invokes the MeF
reconciliation. Focused source, native, PDF, identity, benchmark, evidence,
and final-return cases are written but unrun.

This source-to-output check does not authenticate Marketplace statements or
establish IRS business-rule acceptance. The full calculation, XSD, PDF render,
and ATS gates remain pending.

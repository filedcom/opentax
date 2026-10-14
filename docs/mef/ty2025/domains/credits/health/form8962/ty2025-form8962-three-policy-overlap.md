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
report positive premiums, SLCSP, and APTC together in every covered month. The three
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
income, the family-size poverty line, Table 2 contribution, monthly A/B/C and
credit amounts, totals, Schedule 2/3, and finalized Form 1040. The monthly
route now also accepts 100%-399%-FPL income for a sourced single filer who
cannot be claimed as a dependent, with the single-filing-status Table 5 cap;
the 200%-FPL component case passes, while the complete repayment case is
blocked as recorded below. The annual
route checks the same household and policy identities, line 11 amounts, and
finalized Schedule 2/3 and Form 1040. PDF instance creation invokes the MeF
reconciliation. Focused component cases passed the October 9 policy
regression. The complete monthly credit return now also passes the public entry, XSD and seven-page
visual review; the separate capped-repayment public return is blocked as
described below.

This source-to-output check does not authenticate Marketplace statements or
establish IRS business-rule acceptance. The annual and wider combination
full-return gates and ATS acceptance remain open.

## October 9 complete-return evidence and limit

The [overlap checkpoint](./ty2025-form8962-policy-month-gap.md#october-9-complete-overlap-and-shared-policy-returns)
retains the monthly three-policy return with $100,000 wages, $28,500 dependent
MAGI, $4,080 PTC, $3,600 APTC and $480 net credit. Two eligible children generate
$4,400 CTC; final tax is $9,055 and amount owed $575. All seven pages were
observed, and source/coverage/calculation/final-return drift is rejected.
The attempted 200%-FPL counterpart computes $975 repayment, but its complete
return stops on the newly deferred79 Schedule 8812 tax-limit ordering mismatch.
The component cap test does not establish a successful complete repayment return.

The later [family checkpoint](./ty2025-form8962-policy-month-gap.md#october-9-dependent-family-return-checkpoint)
also attempted the unchanged annual-line11 and three-policy partial-year
repayment returns. Their correct Form1040 line18 amounts13,578 and13,515
conflict with the same automatic Schedule8812 tax13,455, confirming deferred79.
Neither produces a complete filing packet; their component/native tests remain
narrower evidence.

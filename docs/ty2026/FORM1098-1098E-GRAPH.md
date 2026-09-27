# TY2026 mortgage and student-loan interest source graph

Snapshot: September 27, 2026. The IRS [April 2025 continuous-use Form
1098](corpus/authorities/f1098--2025.pdf) is the form specified by the
[December 2026 instructions](corpus/authorities/i1098--2026.pdf) for 2026
payments. Their SHA-256 hashes are `304da9c0f67a46ff04ba831359185dc13dde335199cbf7c413dc879e5410dd87`
and `ad68e1d312b85a66601477014d1e933a8b0e9fa008fae3fdf04a889e755be20b`.
The [2026 Form 1098-E](corpus/authorities/f1098e--2026.pdf) and [combined
1098-E/T instructions](corpus/authorities/i1098et--2026.pdf) are pinned at
`bffb9b5ec4f06d47391a5fa7b773d1c4197c587428ace03a96914a9038389602`
and `a06256fece2bfc5352e8647856b3c1aca0a4c96a79a5a5dd1324f4049c2f5655`.
These lender statements are source evidence; the current MeF package must
decide whether any source copy or explanation is a filed attachment.

## Form 1098 to Schedule A and activity owners

| Source facts | 2026 calculation and handoff |
| --- | --- |
| Borrower, loan, property, boxes 2/3/7–9/11 | Keep stable loan/property IDs, dates, acquisition/refinancing history, principal balances, proceeds use, qualified first/second residence and ownership. Apply the acquisition-debt cap across loans, including grandfathered debt and MFS amounts. Box 2 is a year-end snapshot, not enough to calculate the year's average balance or deductible fraction. Separate personal, rental and business use. The lender's $600 reporting rule is not a deduction threshold. |
| Box 1 interest | Reconcile cash paid, overpayment corrections, each loan's acquisition-use fraction and debt limit. Send eligible interest **reported on Form 1098** to the [2026 Schedule A draft](corpus/draft/f1040sa.pdf) line 8a. Other personal acquisition interest belongs on 8b, with seller-identification details when required. Send rental/business/home-office shares through Schedule E/C/Form 8829 once, with activity ID; Form 8396 mortgage-credit interest reduction must be reflected in the Schedule A deduction. |
| Box 6 principal-residence purchase points | Distinguish lender-reported points from deductible current-year points. Apply purchase/construction qualification, seller-paid treatment, excess debt and refinancing amortization; preserve basis/remaining amortization for later years or payoff. The deductible portion **reported on Form 1098 belongs on Schedule A 8a**. Line 8c is only for deductible points **not** reported on Form 1098. |
| Box 5 mortgage insurance premiums | The [2026 Publication 505](corpus/authorities/p505--2026.pdf) states the qualified home-acquisition MIP deduction returns from 2026. The 2026 Schedule A draft has **line 8d**. Check contract issue date, qualified home/debt, premium allocation and any income limitation in final Schedule A instructions before calculating the allowed amount. Keep rental MIP with Schedule E, not personal 8d. |
| Box 4 overpaid-interest refund | A same-year correction adjusts the corresponding interest paid, bounded at zero. A prior-year refund requires a tax-benefit recovery calculation using the actual year and deduction claimed; the gross refund is not automatically Schedule 1 line 8z income. Preserve recovered year and whether the earlier interest was personal, business or rental. |

The shared [`f1098` node](../../forms/f1040/nodes/inputs/f1098/index.ts)
is **absent from the focused TY2026 registry**. Its default Schedule A route
passes all box 1 interest with no debt/use calculation, sends all box 6
points to `line_8c_points_no_1098`, ignores box 5 under a TY2025 comment,
and sends the entire prior-year box 4 refund to Schedule 1 line 8z. Its
single-choice `for_routing` cannot divide one mortgage among personal,
rental and business uses. `refinance`, debt-date and principal inputs are
collected but not used in the calculation. The [deduction plan](DEDUCTION-GRAPH.md),
[Form 8396 plan](FORM8396-8859-8880-GRAPH.md) and [Form 8829 plan](FORM8829-GRAPH.md)
own the downstream limits and allocations. Pin the final 2026 Schedule A
instructions before implementing the full worksheet and MIP phaseout.

## Form 1098-E to Schedule 1

| Source facts | 2026 calculation and handoff |
| --- | --- |
| Borrower, lender/account, box 1 | Deduplicate servicer and loan records. Verify the taxpayer is legally obligated, paid the interest and is not claimable as another person's dependent. Check qualified education-loan use, eligible student/institution, excluded employer assistance and other double benefits. The lender's $600 issuance threshold does not disallow lower paid interest. |
| Box 2 old-loan checkbox | For loans before September 1, 2004, obtain the amount of capitalized interest/qualifying origination charges actually paid but omitted from box 1. The checkbox itself is not a dollar deduction. For later loans the lender includes those qualifying interest charges in box 1; do not add them again. |
| Allowed amount | Sum qualified interest across loans, cap at **$2,500 per return**, then apply 2026 filing status and MAGI phaseout. MFS is ineligible. The 2026 indexed config currently uses $85,000–$100,000 for single/HOH/QSS and $175,000–$205,000 for MFJ; verify these against final 2026 Schedule 1 instructions and the pinned inflation guidance before release. MAGI must exclude this deduction and apply foreign-income/housing and territory addbacks; do not calculate from a provisional AGI that drops taxable Social Security. Send the adjusted result to **2026 Schedule 1 line 21**, 1040 line 10 and AGI. |

The shared [`f1098e` input](../../forms/f1040/nodes/inputs/f1098e/index.ts)
is registered for TY2026. It caps reported box 1 at $2,500 and sends the
legacy semantic key to the shared AGI node. The dedicated 2026 Schedule 1
node accepts the AGI-adjusted result on line 21, and a focused graph/PDF
test exercises that handoff. The source intake has no loan, borrower,
eligible-expense or paid-but-unreported old-loan interest fields. Its box 2
comment incorrectly treats the box 1 amount alone as a complete deduction
when qualifying paid interest is omitted. The AGI implementation needs a
full MAGI/source-order audit, including Social Security and Form 2555.

## Build and acceptance

1. Build a loan-level source ledger with property/student, owner, payer,
   lender, dates, cash payments, corrections and duplicated-statement keys.
   Preserve allocation and prior-year records, not only a Form 1098 total.
2. Calculate mortgage debt/use and points amortization, box 4 tax-benefit
   recovery, 2026 MIP, Form 8396 reduction and activity allocation. Calculate
   student-loan eligibility, old-loan supplemental interest, MAGI and cap.
3. Wire typed amounts into the 2026 Schedule A/C/E/8829/1 and 1040 nodes.
   Render all resulting pages, reconcile each graph value to PDF fields and
   current MeF XML, and establish source-statement attachment rules from
   the selected v4 or later MeF release.
4. Test purchase vs refinance points (reported and unreported), debt over
   the cap, mixed property use, mortgage-credit reduction, rental MIP,
   deductible personal MIP, prior-year box 4 recovery without prior tax
   benefit, student loan below the lender reporting threshold, box 2
   supplemental interest, MFJ phaseout, MFS/dependent disallowance,
   employer-paid interest, foreign/territory MAGI and Social Security
   interaction. Keep TY2025 behavior isolated from the TY2026 changes.

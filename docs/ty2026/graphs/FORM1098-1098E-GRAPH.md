# TY2026 mortgage and student-loan interest source graph

Snapshot: September 27, 2026. The IRS [April 2025 continuous-use Form
1098](../corpus/authorities/f1098--2025.pdf) is the form specified by the
[December 2026 instructions](../corpus/authorities/i1098--2026.pdf) for 2026
payments. Their SHA-256 hashes are `304da9c0f67a46ff04ba831359185dc13dde335199cbf7c413dc879e5410dd87`
and `ad68e1d312b85a66601477014d1e933a8b0e9fa008fae3fdf04a889e755be20b`.
The [2026 Form 1098-E](../corpus/authorities/f1098e--2026.pdf) and [combined
1098-E/T instructions](../corpus/authorities/i1098et--2026.pdf) are pinned at
`bffb9b5ec4f06d47391a5fa7b773d1c4197c587428ace03a96914a9038389602`
and `a06256fece2bfc5352e8647856b3c1aca0a4c96a79a5a5dd1324f4049c2f5655`.
These lender statements are source evidence; the current MeF package must
decide whether any source copy or explanation is a filed attachment.

## Form 1098 to Schedule A and activity owners

| Source facts | 2026 calculation and handoff |
| --- | --- |
| Borrower, loan, property, boxes 2/3/7–9/11 | Keep stable loan/property IDs, dates, acquisition/refinancing history, principal balances, proceeds use, qualified first/second residence and ownership. Apply the acquisition-debt cap across loans, including grandfathered debt and MFS amounts. Box 2 is the January 1 balance (or origination/acquisition-date balance), not enough to calculate the year's average balance or deductible fraction. Separate personal, rental and business use. The lender's $600 reporting rule is not a deduction threshold. |
| Box 1 interest | Reconcile cash paid, overpayment corrections, each loan's acquisition-use fraction and debt limit. Send eligible interest **reported on Form 1098** to the [2026 Schedule A draft](../corpus/draft/f1040sa.pdf) line 8a. Other personal acquisition interest belongs on 8b, with seller-identification details when required. Send rental/business/home-office shares through Schedule E/C/Form 8829 once, with activity ID; Form 8396 mortgage-credit interest reduction must be reflected in the Schedule A deduction. |
| Box 6 principal-residence purchase points | Distinguish lender-reported points from deductible current-year points. Apply purchase/construction qualification, seller-paid treatment, excess debt and refinancing amortization; preserve basis/remaining amortization for later years or payoff. The deductible portion **reported on Form 1098 belongs on Schedule A 8a**. Line 8c is only for deductible points **not** reported on Form 1098. |
| Box 5 mortgage insurance premiums | The [2026 Publication 505](../corpus/authorities/p505--2026.pdf) states the qualified home-acquisition MIP deduction returns from 2026. The 2026 Schedule A draft has **line 8d**. Check contract issue date, qualified home/debt, premium allocation and any income limitation in final Schedule A instructions before calculating the allowed amount. Keep rental MIP with Schedule E, not personal 8d. |
| Box 4 overpaid-interest refund | A same-year correction adjusts the corresponding interest paid, bounded at zero. A prior-year refund requires a tax-benefit recovery calculation using the actual year and deduction claimed; the gross refund is not automatically Schedule 1 line 8z income. Preserve recovered year and whether the earlier interest was personal, business or rental. |

## Active implementation — October 15, 2026

The older shared-node description has been superseded by substantial TY2025
source validation. The current 2026 path reuses the Table 1 arithmetic from
`f1098/cashout_refinance.ts` and the ratable-points arithmetic from
`mortgage_refinance_points`, extracted into `f1098/amounts.ts`. The 2025 evidence
schemas remain unchanged; their hardcoded dates are not relabeled as 2026.

The incremental `mortgage_interest` source entry now holds a whole-return loan
inventory, property and borrower identities, dated interest payments, issued
1098 boxes or other lender statements, and twelve monthly balance records.
It supports wholly acquisition-use personal homes with continuing loans, current
purchases/construction/improvements and qualifying older refinances. One Table 1
ratio covers grandfathered, pre-2017 and post-2017 debt; MFS uses separate caps
and a payment/home-selection review. The 2017 binding-contract exception requires
its contract and closing dates. Mixed use,
servicer/account transfers, nonfiler sharing, cooperative homes and mortgage
credit certificates still require their source paths.

Payoffs and one current-year refinance of a prior-year loan now reconcile both
loan IDs, the payoff statement, dates, principal, property and borrowers. The
replacement must preserve acquisition history without cash out or term extension.
Monthly closing balances become zero at payoff; the divisor counts months the
property qualified, not months each loan existed. This follows the lender-statement
method in [Publication 936](https://www.irs.gov/publications/p936), used as a
prior-year method comparator. Remaining points are deductible on repayment or
different-lender refinancing; same-lender refinancing amortizes the remainder
over the replacement term, separately from new points. The old loan retains no
duplicate remainder. Prepaid insurance allocations stop in the payoff month,
without a writeoff of unused premiums under 26 CFR 1.163-11. Repeated in-year
refinances, binding-contract-exception refinancing and homes ceasing to qualify
during the year remain outside this source path.

Interest payments must reconcile to the statement after same-year refunds;
January prepaid interest included in a current 1098 is excluded from the current
deduction. Box 4 is reserved for prior-year refunds and is currently rejected
when positive, pending tax-benefit recovery. All box 5/6 amounts must reconcile
to the separate insurance/points records. Reported interest and points reach
Schedule A 8a; unreported interest goes to 8b, with seller identification when
applicable; unreported points go to 8c. Seller-paid purchase points retain the
basis reduction, and ratable points retain their allocation remainder. Those
remainders are not yet persisted as next-year carryforwards.

Mortgage insurance reaches 8d after the contract-date test, current-period or
84-month/shorter-term allocation, VA/RHS treatment and the §163(h)(3)(E) income
phaseout. This uses [IRC §163](https://uscode.house.gov/us/usc/119-118/t26/s163/),
[2026 Form 1098 instructions](https://www.irs.gov/instructions/i1098),
[26 CFR 1.163-11](https://www.ecfr.gov/current/title-26/section-1.163-11), and the
[2021 Schedule A worksheet](https://www.irs.gov/pub/irs-prior/i1040sca--2021.pdf)
as a prior-period method comparator. Prepaid premiums paid while the deduction
was expired in 2022–2025 are explicitly held for transition guidance. Final 2026
instructions and filing-output reconciliation remain release gates.

Schedule A verifies the mortgage source owner and inventory review, recalculates
its source result and passes the combined candidate to deduction resolution.
The graph fixture itemizes $24,000 of sourced mortgage interest at $150,001 AGI;
insurance is fully phased out and the nonitemizer gift deduction is removed.
The same-lender refinance fixture combines $24,000 interest and $92 points,
selects $24,092 itemized deductions and supplies $125,909 taxable income.
The fixture still supplies income-tax finalization independently. Mortgage
PDF/MeF and the remaining exception sources are unfinished.

## Form 1098-E to Schedule 1

| Source facts | 2026 calculation and handoff |
| --- | --- |
| Borrower, lender/account, box 1 | Deduplicate servicer and loan records. Verify the taxpayer is legally obligated, paid the interest and is not claimed on another person's return. Check qualified education-loan use, eligible student/institution, excluded employer assistance and other double benefits. The lender's $600 issuance threshold does not disallow lower paid interest. |
| Box 2 old-loan checkbox | For loans before September 1, 2004, obtain the amount of capitalized interest/qualifying origination charges actually paid but omitted from box 1. The checkbox itself is not a dollar deduction. For later loans the lender includes those qualifying interest charges in box 1; do not add them again. |
| Allowed amount | Sum qualified interest across loans, cap at **$2,500 per return**, then apply 2026 filing status and MAGI phaseout. MFS is ineligible. The 2026 indexed config currently uses $85,000–$100,000 for single/HOH/QSS and $175,000–$205,000 for MFJ; verify these against final 2026 Schedule 1 instructions and the pinned inflation guidance before release. MAGI must exclude this deduction and apply foreign-income/housing and territory addbacks; do not calculate from a provisional AGI that drops taxable Social Security. Send the adjusted result to **2026 Schedule 1 line 21**, 1040 line 10 and AGI. |

The [current student-loan source implementation](./STUDENT-LOANS-CURRENT.md)
now registers `student_loan_interest`, reconciles issued copies and payment
ledgers, and routes the eligible capped amount through shared AGI phaseout to
Schedule 1 and Form 1040. Its source and PDF tests include old-loan supplemental
interest, excluded funding, joint cap/phaseout and dependency claims. General
claimability and actual dependency claims are separate reviewed facts.
Foreign housing/territory source routes, coordinated SSA worksheets and final
2026 instructions/MeF remain unfinished; see the current contract for guards.

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

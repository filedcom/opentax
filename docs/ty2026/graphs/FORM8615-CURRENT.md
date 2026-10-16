# Current TY2026 child-tax sources and draft Form 8615

The `f8615` source claim now joins general filer facts and actual AGI before
selected deductions and income tax. It reuses the shared Form 8615 calculator
with `incomeWorksheet2026`; it does not register a public filing product.
The complete target remains [FORM8615-GRAPH.md](FORM8615-GRAPH.md).

## Sources and eligibility

The public claim contains school months, a complete support inventory, parent
life records, linked external family returns and document references. It cannot
supply `eligibility_confirmed`, this child's unearned income, or a tax override.
General supplies identity, birth date, dependent status and filing status; AGI
supplies actual wages, total income, AGI and early-withdrawal penalties.

The review derives the January 1 age convention, five-month student test,
scholarship support treatment, living-parent test and the earned-income/support
comparison. Exactly half of support remains within Form 8615. Education replays
the same review when both claims exist, rejects inconsistent facts, and retains
its distinct less-than-half refundable-credit boundary. Dependency alone does
not decide child tax.

For connected wage/investment sources without business activity, gross unearned
income is total income less wages. Line 1 uses AGI without earned income, or total income less wages and
the savings penalty with earned income. The connected Schedule D netting and
annual capital-loss limit reach these operands before this calculation.
Eligibility and line 1 remain separate, allowing a required form to stop after
line 3. A selected deduction can instead stop it after line 5.

Filing requirements are proved from the dependent income tests or income at or
above the applicable basic filing threshold, using audited 2026 deduction
amounts. If the other child-tax tests apply but these operands do not establish
a filing requirement, calculation stops for the remaining gross-income and
special-filing review. This is not a complete voluntary-return/filing-requirement
classifier.

The child claim now links the actual Schedule C inventory. A retained business
workpaper reuses activity validation, gross/net calculations and the allocated
half-SE deduction. Service-only support earnings use gross business income;
line 1 excludes service net income, with losses added back under the alternate
worksheet. Statutory employee gross is counted once through Schedule C, while
its net reaches line 1 and the dependent deduction. Material-capital activities
use reasonable compensation limited to 30% of profit after the allocated SE
deduction; when there is no profit the instruction removes that cap. The workpaper
preserves both the uncapped reviewed allowance and the loss add-back. A child
with no earned income and no loss uses AGI for line 1.

Filing evidence also includes business gross receipts and the actual Schedule SE
filing requirement. Dependent deductions continue using net income after half-SE;
education retains its own net-service support calculation. Both downstream owners
reconcile the complete business inventory to the child-tax record rather than
accepting a second set of business facts. Tests distinguish the child-tax and
education support boundaries using the same sources.

Farm, partnership, rental, NOL and foreign-income activity still need their
source owners. Non-W-2 scholarships, qualified disability trusts and directly
connected itemized expenses also remain. Existing business source limits (including
no inventory/COGS or unsupported assets) still apply; the child-tax route does
not expand those business-source capabilities. Under-24 screening reuses the
business child workpaper when no complete child-tax claim exists.

## Parent and sibling returns

Reviewed calendar-year 2026 external returns identify their primary and joint
owners, AGI, taxable income, line 16, excluded tax components and preferential
income. The selected parent's ordinary or qualified-dividend tax is independently
recomputed with 2026 rates before a positive family-tax calculation. Form 4972,
Form 8814 and education-recapture components are removed from line 16.

Selection covers joint parents, separate married parents, never-married parents
living together all year, custody after separation/divorce, surviving parents
and remarriage. Joint returns retain the first-listed owner, including a
stepparent. Custody uses credited residence and the higher-AGI equal-night rule;
married separate returns normally use higher taxable income. Living-apart
exceptions require residence, home-cost, spouse-absence and dependency records.
Remarried parents living apart need custody records for that new parent pair.
Unresolved equal-income comparisons, missing candidates, duplicate owners and
unrelated return records are rejected.

Every sibling record identifies this same selected parent return. Its line 5 is
reconciled to its unearned income, selected deductions and taxable income; its
preferential allocation is recomputed using the shared Line 5 worksheets.
Parent and sibling Schedule D special-rate, Schedule J and Form 2555 worksheets
remain gated when they affect tax. A stop-after-line-3/5 form does not require an
unused family-tax worksheet. Fiscal-year parent returns remain unimplemented.

## Tax and output

Income tax retains both the normal child tax and the complete reviewed Form 8615
record. The selected tax reaches Form 1040 line 16, Form 6251 regular tax,
dependent-care and education credit limits, and Schedule 8812.

AMT continues using the ordinary annual exemption. [P.L.119-21 §70107](https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm)
extends [§55(d)(4)(A)(iii)](https://www.govinfo.gov/content/pkg/USCODE-2024-title26/html/USCODE-2024-title26-subtitleA-chap1-subchapA-partVI-sec55.htm),
which suspends §59(j). The indexed child amount in the revenue procedure is not
an active cap. The child/PAB regression proves that AMT subtracts the actual
Form 8615 tax while preserving the ordinary exemption.

The draft bundle attaches Form 8615 at sequence 33. Its builder replays retained
child/family sources and reconciles filer identity, AGI, selected deduction,
taxable income and final tax to Form 1040. It maps all 23 text fields and nine
buttons in the pinned draft, including the four worksheet indicators. Ratios
print both their whole and fractional digits, including a rounded `1.000`.
Stop forms retain their required partial lines and leave subsequent lines blank.
The IRS cover is removed; output has no annotations or AcroForm tree and remains
marked as an incomplete development draft.

## Verification and remaining work

Source tests cover eligibility boundaries, school/support reconciliation,
parent/custody/remarriage selection, missing or inconsistent cross-return facts,
sibling allocation, capital losses, actual early-withdrawal penalties,
nondependent children, Form 8615/education boundaries, AMT and stop forms.
Seven PDF bundle cases cover ordinary and preferential tax, both stop points,
sibling ratios, AMT, and rounding the ratio to one. Three additional business
bundles reconcile Schedule C, SE and QBI with ordinary, material-capital and
loss/stop Form 8615 results. Typed source tests cover service gross versus net,
losses with/without wages, mixed activities, penalties, statutory wages,
capital compensation with/without profit, filing evidence and source mismatches.

Complete remaining earned/unearned source classification, remaining
filing-requirement cases, connected itemized-expense allocation, advanced family
worksheets, final forms/instructions, current MeF and ATS acceptance remain
required. This is progress toward full 2025 parity, not completion of that goal.

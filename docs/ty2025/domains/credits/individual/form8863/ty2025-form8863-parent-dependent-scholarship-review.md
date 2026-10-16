# TY2025 Form 8863 parent/dependent scholarship source review

The subsequent [positive-tax child and Form 8615 proof](ty2025-form8863-parent-child-kiddie-tax-review.md)
extends this low-income checkpoint with a settled parent tax source and actual
required kiddie-tax packets.

## Existing gap and official basis

The previous required-service scholarship checkpoint proved a student claiming
its own education credit. It correctly rejected a child's income placed on a
parent return, but had no separate retained child-return destination for taxable
school aid on a parent's Form 8863. The dependent standard deduction also
required a supplied earned-income amount even when the return retained the
actual income sources. This checkpoint completes paired parent/child public
source packets.

[2025 Publication 970, chapter 2, page 19](https://www.irs.gov/pub/irs-prior/p970--2025.pdf)
assigns the credit to the taxpayer who actually claims the dependent student;
the student cannot also claim it. A claimed dependent's qualified payments are
treated as paid by that claimant. Chapter 1 distinguishes taxable
required-service compensation and nonqualified room/board scholarships, with
issued Box 1 income reported as wages and amounts outside W-2 reported on
Schedule 1 line 8r. Chapter 2 explains when taxable scholarships do not reduce
education-credit expenses.

[2025 Form 1040 instructions, Standard Deduction Worksheet for Dependents](https://www.irs.gov/instructions/i1040gi)
include taxable scholarships in earned income for this worksheet. The ordinary
single dependent deduction is the lesser of $15,750 and the larger of $1,350 or
this worksheet's earned income plus $450. This definition differs from the AOC
refund support test: nonservice scholarship income does not become earned
support. The same instructions' filing chart treats taxable scholarships as
earned income; Form 8615 requires a filing obligation. These low-income child
packets voluntarily file to recover actual wage withholding and do not require
Form 8615.

## Source contract and actual routing

`general.dependent_education_income_review` retains student/parent identities,
student birth date, actual dependency and no-competing-claim references,
full-time enrollment, support payments, the exact school/payment/aid packet,
owned W-2 copies and taxable scholarship sources. Its deduction income is
derived from issued wages plus taxable scholarships outside W-2. It never adds
W-2 compensation a second time. Public inputs omit `dependent_earned_income`; a
conflicting supplied amount produces a calculation diagnostic and cannot export.

A parent's student ownership review retains `dependent_student_income_return`:
the actual computed child public-return pending record plus the same
claim/source review. Native/PDF preflight checks that school, expense, aid,
recipient, parent claimant, dependency record, competing-claim record and birth
date join the parent return. It independently checks the child's issued W-2,
actual scholarship income, Schedule 1 totals, income aggregator, finalized
income/AGI and dependent deduction. The child cannot contain Form 8863 or either
education-credit output. The parent uses the child's taxable income sources to
reconcile school aid without routing those sources into the parent's income
aggregator.

For the nonservice scholarship, optional detailed source records now retain the
actual award disbursement and distinct room/board payment. Their amounts, source
references, grant/recipient/payer identities and 2025 dates reconcile the
taxable allocation. The new paired review requires this evidence; preexisting
nonservice routes retain their earlier source contract.

The paired packet is a full-time 20-year-old qualifying-child dependent. Parent
paid ordinary support $24,500 ($20,000 housing/food and actual $4,500 tuition);
student paid ordinary support $8,000. The separately inventoried $3,000
scholarship support is excluded from this full-time dependency support
comparison. Student ordinary support is below half of $32,500. Parent retains
the actual dependency source and matching filed dependent row. This review does
not decide dependency from income receipts alone.

## Three genuine paired public positives

All three pairs retain the same owned school issued 1098-T:

- Box 1 $4,500 joins the dated actual bank tuition payment (parent in the first
  two pairs, student in the third).
- Box 5 $11,500 joins $500 tax-free aid, $8,000 ordinary
  required-teaching-service compensation, and $3,000 taxable nonservice
  room/board scholarship.
- Teaching compensation joins actual paid $8,000, required award terms and
  performed 225 teaching hours during 2025. The nonservice grant joins an actual
  $3,000 award disbursement and separate $3,000 room/board payment, permitted by
  its award terms. The special exempt service programs are reviewed false.
- Only $500 reduces tuition: $4,500 minus $500 gives $4,000 AOC expenses.

| Filed line                         | Parent in all pairs | Child, service on W-2 | Child, service outside W-2 |
| ---------------------------------- | ------------------: | --------------------: | -------------------------: |
| Form 1040 wages                    |              75,000 |                10,000 |                      2,000 |
| Schedule 1 line 8r                 |                   0 |                 3,000 |                     11,000 |
| Total income / AGI                 |              75,000 |                13,000 |                     13,000 |
| Dependent standard deduction       |                 N/A |                13,450 |                     13,450 |
| Taxable income                     |              59,250 |                     0 |                          0 |
| Tax before credits                 |               7,955 |                     0 |                          0 |
| Refundable AOC                     |               1,000 |                     0 |                          0 |
| Schedule 3 education credit        |               1,500 |                     0 |                          0 |
| ODC after education credit         |                 500 |                     0 |                          0 |
| Final total tax                    |               5,955 |                     0 |                          0 |
| Wage withholding refunded to child |                 N/A |                   300 |                        100 |

The third pair uses issued W-2 service compensation with tuition actually paid
from the student's owned bank account. Its support ledger joins that same $4,500
tuition debit to the student payer, plus $4,000 of student-paid personal support
and $20,000 of parent-paid housing/food. Student ordinary support $8,500 is
below half of $28,500. The parent's dependency/AOC claim remains valid because a
claimed dependent's qualified payments are treated as paid by the claimant. All
filed figures in the table remain unchanged. Payment payer identity is joined to
its actual support ledger; it is not restricted to the parent.

Parent MAGI excludes the child's $13,000. Parent's age/support review governs
its refundable AOC; the student's age does not impose the parent's under-24
restriction. The child has the filed can-be-claimed indicator and reports its
owned income on its own return. It has no education credit and no Form 8863. All
final numbers come from public execution and are asserted before full return
export.

## Verification and retained artifacts

Six complete XML/PDF artifacts (three pairs) are retained at
`/tmp/opentax-f8863-parent-child-scholarship-evidence/`, with stems
`{w2,line8r,w2-student-paid}-{parent,child}` and suffixes
`{source-input.json,full-return.xml,filled-return.pdf}`. Source inputs include
the parent's actual retained computed child record. Tests use cached TY2025 v5.4
complete `Return1040.xsd`; validation is local schema proof, not IRS acceptance.
The three parent packets have seven pages each; the three child packets four
pages each. Reopened filled PDFs require zero fields. All **33 pages** were
rendered and visually reviewed. Reopened PDFs have zero AcroForm fields and zero
widgets. Enlarged inspection checked the child's can-be-claimed indicator,
$13,450 deduction, blank education-credit line and $100 refund, and the parent's
issued school indicators, student identity and $4,000 qualified expenses. The 12
source JSON, complete XML and filled PDF files are recorded in `sha256.json`;
rendered pages, contact sheets and extracted text are alongside them. Prior
self-employed, material-capital and required-service scholarship artifact
manifests remain unchanged after regression.

Negatives exercise native Form 1040/Form 8863, PDF instance preflight and
complete return preparation: detached child return, wrong
owner/claimant/dependency/birth records, child claimed status, duplicate
education credit on the child, altered child W-2/actual grant
receipt/income/AGI/dependent deduction, omitted Schedule 1 income, child income
directed to the parent, wrong parent payment payer, false school Box 5/tax
treatment/allocation references, changed support and competing claim. Actual
nonservice receipt and paid expense changes are rejected.

## Precise limits

Proof is three synthetic source-backed paired single-filer returns for one
issued U.S. school and one actually claimed full-time qualifying child. The
child's income inventory comprises whole-dollar owned wages and the two
scholarships. Its dependent deduction is below the ordinary cap and its taxable
income is zero. This is not new proof of Form 8615, child business income,
taxable scholarships with positive child tax, multiple children/schools, custody
releases, joint child returns, or other tax credits' earned-income definitions.
Existing ownership, W-2, business/material-capital, missing-form and
mixed-school routes remain in regression coverage.

Final combined regression passed **421 tests, 0 failures** at
`/tmp/opentax-parent-child-regression-final.log`. The final focused verification
adds the genuine student-paid pair and checks the final enrollment/payer/source
joins: **5 tests, 0 failures**, at
`/tmp/opentax-parent-child-focused-final.log`. The combined run preceded those
last joins; the focused run verifies all three paired routes and their conflict
collections afterward.

Payer issuance, bank payments, award terms and actual teaching attendance are
retained synthetic evidence. Source consistency does not authenticate those
facts outside the return. Cross-return checks compare retained records; no IRS
account lookup or independently authenticated parent/child filing status is
claimed. No frozen board, future task, main checkout, PR or push is part of this
change.

# TY2026 Schedule R elderly/disabled credit graph

Implementation snapshot: October 16, 2026. The pinned IRS [2026 Schedule R draft](../corpus/draft/f1040sr.pdf),
SHA-256 `0fcbd9fe296b470b2a0ceadc497380159f7d872f7aa11d86ae856bbd2234f5b6`,
and [2026 instructions](../corpus/draft/i1040sr.pdf) define this route. The
[PDF inventory](../inventories/pdf-fields/pdf-fields-f1040sr.csv) has 27 AcroForm widgets, including
all nine Part I choices, the Part II certification and lines 10–22.
Refresh both documents when the final IRS revision appears.

## Source and calculation contract

| Stage | Required source facts | Filed calculation/answer |
| --- | --- | --- |
| Part I | Filing status; each spouse's end-of-2026 age; retired-on-permanent-and-total-disability status; taxable disability income; whether an MFS taxpayer lived apart from spouse for **all** of 2026. | Exactly one qualifying box 1–9. An MFS taxpayer without the lived-apart fact cannot claim by simply selecting age/disability. Under-65 disability requires retirement and taxable disability income, not a disability flag alone. |
| Part II | Prior physician statement/line B history and continued inability to engage in substantial gainful activity, or a new signed statement held for records. | Print the certification checkbox for boxes 2/4/5/6/9 only when its conditions hold. The physician's statement is generally retained, rather than attached. |
| Lines 10–12 | Selected Part I box and taxable disability income of the qualifying spouse(s). | Line 10 is $5,000 for boxes 1/2/4/7, $7,500 for 3/5/6, and $3,750 for 8/9. Line 11 is the printed disability formula: boxes 2/4/9 use the qualifying disability income, box 5 sums both spouses, and **box 6 adds $5,000 to the under-65 spouse's disability income**. Line 12 is the smaller of 10/11 where 11 applies. |
| Lines 13–20 | Nontaxable SSA/RRB from benefit records; qualifying nontaxable pensions/VA benefits from their own statements; 1040 line **11b** AGI. | Lines 13a/13b sum on 13c. Line 15 thresholds are $7,500 for boxes 1/2, $10,000 for 3–7, and $5,000 for 8/9. Line 17 is half the positive AGI excess; line 18 adds it to 13c; line 19 is nonnegative line 12 minus 18; line 20 is 15% of line 19. The printed QSS route is box 1 or 2, so its base and threshold are $5,000/$7,500. |
| Lines 21–22 | 1040 line 18 and Schedule 3 lines **1, 2 and 6l** as specified by the 2026 credit-limit worksheet. | Line 21 is the nonnegative tax liability after those prior credits. Line 22 is the smaller of lines 20/21 and feeds Schedule 3 line **6d**, then its nonrefundable-credit total and 1040 line 20. Resolve credit ordering before computing this worksheet. |

The IRS instructions also describe a choice to let the IRS figure the credit.
That path requires the applicable Part I/II answers and selected Part III
facts, `CFE` next to Schedule 3 line 6d, and the attached Schedule R. If
the product supports this choice, treat it as a distinct filing path; do not
invent a numeric credit on the return.

## Current implementation and shared reuse

The public `schedule_r.claim` inventory is registered in the 2026 source graph.
It supplies external medical, employer-plan and benefit evidence; return owners,
birth dates, finalized AGI, Social Security and tax amounts come from preceding
nodes. The 2026 adapter and the existing 2025 filed-form adapter both call
`calculateScheduleRAmounts` in the shared calculation module. Existing 2025
source checks and filing behavior remain in their adapter. No folder reorganization
or wholesale copy of the 2025 node is needed.

The reviewed route requires full-year citizen/resident treatment, a completed-year
inventory, and no foreign-tax or Form 8978 credit. Joint returns require distinct
owners and birth dates. MFS requires both the general lived-apart answer and its
full-year evidence reference. The January 1 birthday convention derives the
age-65 branch from birth dates. The general source still excludes deceased filers.

For each under-65 claimant, medical evidence establishes permanent and total
disability at retirement, onset and statement dates, duration and inability to
perform substantial gainful activity. The statement can be current, qualifying
prior-year evidence with continued disability, or authorized VA Form 21-0172.
Each employer disability pension must match an actual reviewed 1099-R copy and
its dated taxable payments. Same-account statements need consistent mandatory
retirement evidence. The minimum retirement age controls wage/pension reporting;
the employer's mandatory retirement date separately controls Schedule R income.
Payments before the mandatory date remain eligible even when already reported
as pension income. An employer plan with no mandatory retirement age has an
explicit evidence branch.

Social Security/RRB inventories reconcile to finalized gross and taxable benefits;
workers' compensation offsets already included in those source boxes are not
added again. Other benefits have owner, statement and statutory-treatment records.
VA pensions and qualifying exclusions outside the Internal Revenue Code count;
military disability, Foreign Service section 808, return of cost and exclusions
under the Code do not. Duplicate benefit/source references are rejected.

The graph resolves credits in this order:

```text
regular tax + Schedule 2 Part I
  -> dependent care
  -> Schedule R -> Schedule 3 line 6d
  -> education
  -> child / energy credit limits
  -> Form 1040 and Form 1062 replay
```

Child and energy reviews bind the actual Schedule R inventory. Form 1062 replays
these same sources and credit ordering for actual and hypothetical tax, while
preserving its existing AGI convention. Its scope review must explicitly include
Schedule R when supplied.

The PDF builder replays the claim and reconciles AGI, pre-credit tax, prior care
credit and the Schedule 3 destination. It fills exactly one box, the applicable
prior-statement checkbox and all required Part III amounts. Mixed joint returns
print the qualifying prior-statement first name above the checkbox. The two form
pages, without the IRS draft cover, join the return in attachment order. They are
static development drafts with no AcroForm or annotation dictionaries; medical
and plan record references are not printed. An exhausted credit has no attachment.

## Required remaining work

- Add dated employer disability payments reported on W-2, including separate
  treatment of accrued leave; the current claim explicitly requires all disability
  payments to be in the reviewed retirement inventory.
- Add the pre-1977 disability exception, deceased-filer age treatment and foreign
  residence/election branches with their source evidence.
- If offered, implement the separate IRS-figures-credit choice with its required
  partial Schedule R and Schedule 3 `CFE` expression.
- Reconcile final 2026 instructions and add the current MeF document, medical
  answer expressions and ATS acceptance. Existing 2025 filing serializers are
  regression comparators, not 2026 filing authorization.

The source cases cover all nine boxes, QSS, mixed-age joint returns, dated minimum
versus mandatory retirement, SSA reduction, MFS residence, medical evidence,
benefit exclusions, dependent-care ordering, education/child/energy limits and
Form 1062 replay. These checks establish development behavior, not complete
Schedule R parity or IRS filing acceptance.

Validation for this increment: 917 full TY2026 runtime tests, 102 typed focused
tests (including existing 2025 Schedule R node, PDF and MeF regressions), and
137 repository unit checks passed. The unit module-graph preflight found no
runtime changes during execution. Eight full-return pages and two standalone
mixed-age pages were rendered and visually reviewed; regenerated output matches
all ten reviewed pages and contains no AcroForm or annotation dictionaries.

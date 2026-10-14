# TY2025 Form 2210-F farmer/fisher underpayment gap

## October 10 complete public packet and boundary checkpoint

The registered box-B route now has three fresh complete public-return replays,
full local TY2025v5.4 Return1040 XSD validation, and nine reviewed packet pages.
The combined Forms2210/2210-F node, domain, native and PDF gate passes77 tests
with zero failures or ignored cases; the new focused packet/boundary gate passes4.
Earlier authored/unrun and never-rendered statements below are historical.
No production implementation or deferred repair is included in this checkpoint.

| Source case | Withholding | Underpayment | Days | Penalty | Form1040 amount owed |
| --- | ---: | ---: | ---: | ---: | ---: |
| Paid March1 | 1,000 | 8,000 | 45 | 69 | 25,967 |
| Unpaid through April15 | 1,000 | 8,000 | 90 | 138 | 26,036 |
| Withholding covers required payment | 9,000 | 0 | 0 | 0 | 17,898 |

Each synthetic joint return has wages200,000, standard deduction31,500,
taxable income168,500 and tax26,898. Two distinct2024 separate-return references
supply4,000+5,000 prior tax, below the current17,941 two-thirds calculation.
The claimed2024 farming share is70,000/100,000. The
[2025 Form2210-F](https://www.irs.gov/pub/irs-pdf/f2210f.pdf) line16 formula
is underpayment times days divided by365 times0.07; independently it rounds
to69/138. The covered case keeps boxB and omits native penalty-date/day/amount
fields and printed PartIII. Form1040 line38 and amount owed reconcile.

Four changed filed lines per case (tax, withholding, underpayment and penalty)
are rejected at both native and fresh full-PDF boundaries:24 rejection assertions.
The ordinary Form2210 full/partial waiver, annualized method, actual withholding
and changed-joint-status flags each preserve the baseline1040 while both exports
reject their missing sourced mandatory attachment (ten assertions). These
rejection cases do not establish positive support for those methods.

All three actual PDFs contain Form1040 pages1–2 and Form2210-F page3, with
no remaining AcroForm fields/widgets. Amounts, dates, boxB, primary TIN and
ordering reconcile. Each Form2210-F name header omits spouse Sam and prints
only Alex Example; this repeats deferred24 and remains unrepaired. Source
records remain reviewed synthetic references, not authenticated prior returns
or IRS payment confirmations. The paid case supplies an underpayment settlement
date, not proof of a filed-and-fully-paid return qualifying for the March2
exception in the [instructions](https://www.irs.gov/instructions/i2210f).
No early-filing exemption or accepted filing is inferred.

Evidence: `.state/research/form2210-packets-2026-10-10/`, including typed logs,
public inputs/pending, fullXML/PDF, XSD logs and nine rendered-page hashes.
Source authentication, remaining payment/credit/waiver branches and IRS
business-rule/acceptance gates remain open.

## October8 current registered-audit reconciliation

The [current bundled audit](../../../../readiness/ty2025-bundled-form-audit-reconciliation-2026-10-08.md) reconciles this form's current scope with actual native/PDF imports and retained terminal evidence. The completed October8 full run records **17 passed/0 failed/0 ignored across4 named modules**; all10 matching runtime paths still equal that tested snapshot. This is selected retained full-run evidence, not a new focused run, full-route support or fresh visual approval. Earlier dated authored/unrun statements below are historical; existing broader source, artifact and IRS requirements remain open. No original checkbox or future task is completed by this correction.


## Distinct current and prior return references (2026-10-05)

The box-B calculator now rejects a 2025 joint-return reference reused as
either 2024 separate-return reference. Native MeF and PDF projection recheck
the same source, so a plausible numeric worksheet cannot bypass the distinct
return identity requirement at export. Focused calculator, native, and PDF
fixtures pass. The references still identify caller-supplied records; this
guard does not authenticate the underlying filed 2024 returns.

The [2025 Form 2210-F](https://www.irs.gov/pub/irs-prior/f2210f--2025.pdf)
and its [instructions](https://www.irs.gov/instructions/i2210f) distinguish
the farmer/fisher penalty from ordinary Form 2210. A filer whose 2024 or 2025
farming/fishing gross income is at least two-thirds of total gross income
generally lets the IRS calculate any penalty. The filer must attach Form
2210-F when requesting a waiver in Part I box A, or when the 2024/2025 joint
filing-status change meets Part I box B. A positive penalty alone does not
require the attachment.

`forms/f1040/2025/domains/taxes/underpayment/form2210f/form2210f_box_b.ts` is a build-stage, isolated calculator
for one box-B pattern: two separate full-year 2024 taxpayer/spouse returns,
one joint 2025 Form 1040, reviewed 2024/2025 gross-income totals, and at most
one full settlement of the underpayment after January 15, 2026. It computes
the printed lines 1-16 from separate current and prior tax components and
rejects a missing two-thirds test, duplicate prior return references, absent
box-B condition, stopped penalty calculation, or invalid settlement date.
Focused positive and rejection cases are written but unrun.

The public `f2210f.source` input now routes this box-B calculation through
the finalized Form 1040. It requires MFJ status; exact whole-dollar agreement
with final lines 22 and 23 and withholding; no refundable credit,
estimated payment, or excess Social Security withholding; and no competing
ordinary `f2210` or direct line 38 penalty. A positive prior-year tax excludes
the no-prior-year-liability exception. The calculated penalty supplies line 38.
The registered native Form 2210-F builder reconciles the final worksheet and
Form 1040 lines 22, 23, 25d, and 38, then emits the TY2025 v5.4 XSD order.
Focused positive/conflict cases are written but unrun.

This is a **bounded filing and PDF-preview route, not full Form 2210-F coverage**. The
two 2024 tax components and farming/fishing gross-income workpapers are still
user-supplied reviewed facts, not independently authenticated filed-return
records. The canonical 2025 AcroForm fields are now mapped for this bounded
box-B route, including its split month/day payment date; reserved line 5 is
left blank. The PDF projection reuses the native reconciliation against
finalized Form 1040. Focused PDF field and rejection cases are written but
unrun, and no filled PDF has been rendered or visually checked yet. Nonzero
included Schedule 2 tax is now accepted only when it equals finalized Form 1040
line 23; native/PDF and changed-line tamper fixtures are authored but unrun.
Refundable credits, estimated
payments, excess Social Security withholding, section 965 exclusion, section
1062 relief, joint-to-separate prior-year allocation, partial late payments,
waiver evidence, disaster relief, and other exceptions need separate sourced
branches. The ordinary `f2210` input is not a substitute.

For the already supported one-full-settlement box-B calculation, a standalone
payment-source prerequisite now binds the 2025 underpayment to one reviewed IRS
payment confirmation and retained PDF copy. It checks the final filer's SSN,
effective 2026 payment date against line 14, exact amount applied against
line 13, the no-other-post-January-15-settlement assertion, and the copy's
SHA-256. Positive and changed-date/amount/bytes/owner fixtures are authored
for the deferred batch. The [IRS 2026 Q2 interest ruling](https://www.irs.gov/irb/2026-08_IRB)
confirms that the Q1 7% section 6654 rate extends through April 15 despite
the ordinary Q2 underpayment rate becoming 6%.

The confirmation identifier, effective date, and allocated amount are still
reviewed assertions; the retained PDF bytes are not parsed or authenticated
against IRS payment records. This prerequisite is not called by the active
native/PDF route, so it does not authorize a wider payment pattern.

Full-batch tests, generated TY2025 XSD validation, filled-PDF review, IRS
rules, and ATS acceptance are still pending. Do not claim release readiness.

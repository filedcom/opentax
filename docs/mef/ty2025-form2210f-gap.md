# TY2025 Form 2210-F farmer/fisher underpayment gap

The [2025 Form 2210-F](https://www.irs.gov/pub/irs-prior/f2210f--2025.pdf)
and its [instructions](https://www.irs.gov/instructions/i2210f) distinguish
the farmer/fisher penalty from ordinary Form 2210. A filer whose 2024 or 2025
farming/fishing gross income is at least two-thirds of total gross income
generally lets the IRS calculate any penalty. The filer must attach Form
2210-F when requesting a waiver in Part I box A, or when the 2024/2025 joint
filing-status change meets Part I box B. A positive penalty alone does not
require the attachment.

`forms/f1040/2025/form2210f_box_b.ts` is a build-stage, isolated calculator
for one box-B pattern: two separate full-year 2024 taxpayer/spouse returns,
one joint 2025 Form 1040, reviewed 2024/2025 gross-income totals, and at most
one full settlement of the underpayment after January 15, 2026. It computes
the printed lines 1-16 from separate current and prior tax components and
rejects a missing two-thirds test, duplicate prior return references, absent
box-B condition, stopped penalty calculation, or invalid settlement date.
Focused positive and rejection cases are written but unrun.

The public `f2210f.source` input now routes this box-B calculation through
the finalized Form 1040. It requires MFJ status; exact whole-dollar agreement
with final line 22 and withholding; no Schedule 2 other tax, refundable credit,
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
included Schedule 2 tax, refundable credits, estimated
payments, excess Social Security withholding, section 965 exclusion, section
1062 relief, joint-to-separate prior-year allocation, partial late payments,
waiver evidence, disaster relief, and other exceptions need separate sourced
branches. The ordinary `f2210` input is not a substitute.

Full-batch tests, generated TY2025 XSD validation, filled-PDF review, IRS
rules, and ATS acceptance are still pending. Do not claim release readiness.

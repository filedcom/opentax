# TY2025 Form 2210-F farmer/fisher underpayment gap

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

# TY2025 Form 8889 paired Medicare mixed months (build pass, unrun)

## One self-only owner enrolls in Medicare midyear (2026-10-01 build pass, unrun)

The [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889)
put zero in the line 3 limitation worksheet for a Medicare-enrolled month and
direct separate Forms 8889 for spouses with separate HSAs. A bounded paired
self-only route now accepts either owner's sourced July Medicare onset, six
self-only eligible months followed by six ineligible months, and the other
owner's full-year self-only eligibility. Each owner supplies a separate
twelve-month array; no family limit is allocated. The Medicare owner's limit
is $2,150 and the continuing owner's is $4,300. Their permitted personal
contributions produce separate Form 8889 deductions that sum once on Schedule
1 line 13 and Form 1040 line 10. Native MeF and PDF recompute both copies,
verify owner identity and printed limits, and reconcile the filed adjustment.
Primary/spouse positive and onset, contribution, printed-limit, and return
tamper fixtures are authored but unrun.

This path is limited to age-under-55 personal contributions within both
owners' limits, no last-month election, family month, distribution, employer
funding, prior excess, or testing-period event. No Form 5329 excess is created.
The Medicare notice reference is entered evidence, not authenticated bytes;
current excess and other mixed-event routes remain open.

The [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889)
assign zero to a month of Medicare enrollment in the line 3 worksheet. Line 6
allocates family-coverage months between spouses with separate HSAs and adds
other applicable contribution limits. The age-55 line 7 amount is calculated
for each eligible owner month and is not shared.

The new route covers two HSAs where both owners had family HDHP coverage
through the month before one owner's Medicare enrollment, that owner was
ineligible for every remaining month, and the other owner retained family HDHP
eligibility all year. It requires the Medicare onset month and a source
reference, twelve monthly eligibility entries per owner, both owners' marriage
and separate-HSA answers, and one referenced allocation agreement. The agreed
shares must add to the prorated family limit for the months both were eligible.
The continuing owner's line 6 adds the unshared family limit for the remaining
months. Each owner keeps their own catch-up amount and deduction. MeF and PDF
recompute both forms and reconcile them to Schedule 1 and Form 1040.

This path does not accept a last-month election, Archer MSA reduction, testing
period event, a gap before Medicare enrollment, two Medicare-enrolled owners,
or other differing monthly patterns. The Medicare notice and allocation
references are entered evidence, not independent document authentication.
Focused computation cases are written but unrun. The full test, typecheck,
XSD, PDF appearance, IRS-rule, and ATS gates remain pending.

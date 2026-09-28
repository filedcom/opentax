# TY2025 Form 8889 paired Medicare mixed months (build pass, unrun)

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

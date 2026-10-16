# TY2025 Form 8882 direct-employer route and remaining review

Authority: [IRS Form 8882](https://www.irs.gov/pub/irs-pdf/f8882.pdf) and
[TY2025 employer childcare credit guidance](https://www.irs.gov/businesses/small-businesses-self-employed/employer-provided-child-care-credit-tax-year-2025-and-earlier).

The public `f8882` input now requires a direct taxpayer-owned Schedule C
employer and documented current-year facility and/or resource-referral
contracts. It validates provider and payment identity, facility eligibility,
nondiscrimination, fair-market-value limit, no double benefit, and separate
expense rows. A staged reconciler checks Schedule C Part V deductions net of the
credited portion, business identity, taxpayer SSN, and participation.

The official TY2025 lines are 1/2 (qualified facility expense and 25%), 3/4
(qualified referral expense and 10%), 5 (pass-through credit, zero in this
direct route), 6 (sum), and 7 (smaller of line 6 or $150,000). Registered native
`IRS8882` and one-page fillable PDF projections have authored positive and
tamper fixtures. The source rejects cap-exceeding claims until a defensible
allocation of the capped credit to Schedule C deduction reductions is recorded.

Form 8882 line 7 now enters a typed Form 3800 Part III line 1k source and the
standard tax-liability limitation. The sourced Form 3800 credit passes to
Schedule 3 line 6a and Form 1040. Native and PDF registries include Form 8882;
both Form 8882 and Form 3800 reconcile the credit against the finalized Schedule
C deduction and the attached document ID. The shared attachment guard still
keeps public export closed pending the combined implementation test, selected
MeF schema and business-rule validation, and review of the contract, licensing,
and payment evidence. Employer-operated facilities, capital property, controlled
groups, pass-through credits, recapture, and a spouse-owned business are
separate routes.

Authored fixtures are intentionally unrun until the requested combined test.

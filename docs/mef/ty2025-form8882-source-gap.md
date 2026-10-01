# TY2025 Form 8882 staged source and export gap

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
direct route), 6 (sum), and 7 (smaller of line 6 or $150,000). Unregistered
native `IRS8882` and one-page fillable PDF projections have authored positive
and tamper fixtures. The source rejects cap-exceeding claims until a defensible
allocation of the capped credit to Schedule C deduction reductions is recorded.

**Public export must remain closed.** The old direct Schedule 3 route is
removed. Form 8882 line 7 must enter Form 3800 Part III line 1k and then pass
through its tax-liability limitation. The shared Form 3800 source and native/PDF
serializers do not yet have a typed Form 8882 direct-employer entry or exact
line 1k reconciliation. The staged descriptors remain absent from their
registries. The shared attachment guard must be updated to recognize the new
contract fields before the source shape is merged. Before opening export, add
that Form 3800 join, validate the selected MeF schema and business rules, and
review contract, licensing and payment evidence. Employer-operated facilities,
capital property, controlled groups, pass-through credits, recapture, and a
spouse-owned business are separate routes.

Authored fixtures are intentionally unrun until the requested combined test.

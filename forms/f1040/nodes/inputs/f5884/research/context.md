# Form 5884: work opportunity credit, TY2025 build status

The employer's credit is calculated from one employee row at a time. The
credit belongs on Form 3800 Part III line 4b, then on Schedule 3 line 6a only
after the Form 3800 tax-liability limit. The current `f5884` node still sends
its gross result directly to Schedule 3. This is an open filing gap, not a
verified Form 1040 route. See
[the business-credit routing audit](../../../../../../docs/mef/general-business-credit-routing.md).

Sources: [IRS Form 5884](https://www.irs.gov/pub/irs-pdf/f5884.pdf),
[IRS instructions](https://www.irs.gov/instructions/i5884), and
[Form 3800 instructions](https://www.irs.gov/instructions/i3800).

## Current source model

Each `f5884s` row requires an employee record reference, a pre-2026 hire date,
a state-workforce-agency certification reference, the targeted group, first-year
qualified wages, hours worked, and affirmative checks for qualifying payroll,
no prior employment, no related/dependent employee, more than half the wages
for work in the trade or business, and exclusion of disallowed wages. Duplicate
employee references are rejected. A summer-youth row additionally confirms the
zone and service period; a designated-community-resident row confirms the
qualifying work location.

Veterans require one `VeteranCategory`, rather than independent flags:

| Certified category | First-year wage cap |
| --- | ---: |
| SNAP recipient or short-term unemployed | $6,000 |
| Service-connected disability, recently discharged | $12,000 |
| Long-term unemployed | $14,000 |
| Service-connected disability and long-term unemployed | $24,000 |

Other first-year wage caps are $3,000 for summer youth, $10,000 for long-term
family assistance (LTFA), and $6,000 for other groups. Only LTFA may carry
second-year wages, capped separately at $10,000. Fewer than 120 hours yields
zero credit for every group, including LTFA. Other groups receive 25% of capped
first-year wages at 120–399 hours and 40% at 400 or more. LTFA uses the same
hours-based first-year rate and receives 50% of capped second-year wages after
the 120-hour threshold.

These checks are written but unrun under the requested build-first workflow.
The row still accepts affirmed eligibility facts rather than reconciling
certifications, payroll periods, and wage exclusions against primary source
documents. Successor-employer wages, controlled-group allocations, pass-through
credits, passive-activity limitations, carryovers, source XML, Form 3800 Part II,
and the final PDF/ATS route remain open. In particular, a positive source
credit must not be interpreted as a filed, allowed Schedule 3 credit until
the common Form 3800 path replaces the direct deposit.

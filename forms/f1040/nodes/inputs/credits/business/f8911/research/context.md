# Form 8911, tax year 2025

The input node computes the personal-use alternative fuel vehicle refueling
property credit. The 2025 form requires a separate Schedule A (Form 8911) for
each property. The configured MeF 2025v5.4 package contains both `IRS8911` and
`IRS8911ScheduleA`. Both serializers are implemented and their personal-use
Scenario 13 XML slice passes the v5.4 XSD. That structural check does not make
the full return ATS-ready.

Source:
[Form 8911 and instructions](https://www.irs.gov/forms-pubs/about-form-8911),
and the IRS TY2025 ATS Scenario 13 PDF stored privately under
`.state/research/docs/ats-ty2025/1040-scenario-13.pdf`.

## Input and calculation

The node accepts property cost, business-use fraction, fuel type, property
description, structured US address and dates, eligible-tract flag and 11-digit
GEOID, main-home flag, regular tax before credits, other specified credits, and
tentative minimum tax. A positive personal claim requires an eligible tract, the
main home, the GEOID, and both tax limitation amounts.

For a personal-only property, Schedule A line 21 is the smaller of 30% of cost
and $1,000. Form 8911 lines 5 through 9 reduce regular tax by foreign and other
allowable credits, then tentative minimum tax. Line 10 is the smaller of the
tentative property credit and the resulting tax limit. Only this allowed line 10
amount routes to Schedule 3 line 6j and Form 1040 line 20.

The Scenario 13 PDF has $1,000 of cost, a $300 tentative credit, $162 of regular
tax, zero tentative minimum tax, and a $162 allowed credit. Its printed $30,000
standard deduction differs from the current TY2025 $31,500 amount, so this is
not yet a complete reconciled return fixture.

Business or mixed-use claims are rejected. The 2025 Schedule A uses a 6%
business rate unless prevailing-wage and apprenticeship requirements support
30%, and Form 8911 line 3 routes through Form 3800. This path needs property-
level data and a correct Form 3800 integration before it can be emitted.

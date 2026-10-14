# Form 8994 direct-employer source for TY2025

The [January 2021 Form 8994](https://www.irs.gov/pub/irs-pdf/f8994.pdf) remains
the filing form for 2025 under the
[December 2024 instructions](https://www.irs.gov/instructions/i8994). Line 1 is
the sum of qualifying leave wages multiplied by each employee's applicable
percentage. The rate is 12.5% at 50% wage replacement and rises by 0.25
percentage points for each percentage point above 50%, capped at 25%. The first
12 weeks of qualifying leave for an employee count. The 2025 prior-year
compensation ceiling is $93,000. The employer must reduce its wage deduction by
the line 1 credit, even if the credit is limited or carried.

The direct Schedule C source requires the written policy, adoption/effective
dates, two-week full-time leave entitlement and proportional part-time
entitlement, 50%-or-greater employer-funded replacement rate, noninterference
compliance, FMLA-designated purpose, employee service and 2024 compensation
evidence, payroll and normal wage facts, and exclusions of state-required/paid
wages and wages used for another business credit. It checks the filed proprietor
SSN, employer EIN, payroll wages and Schedule C line 26 credit reduction. The
current bounded route requires the Form 8994 credit to be the only
`line_26_other_employment_credits` amount for that business.

The public node emits no tax credit. Direct credits belong on Form 3800 Part III
line 4j and must be limited through Form 3800 before reaching Schedule 3. A
K-1-only recipient does not file Form 8994 personally; partnerships, S
corporations, mixed direct and pass-through credits, and nonproprietor employers
remain outside this source. Actual written-policy and payroll bytes are retained
references, not independently parsed by the return graph.

The official PDF's four Yes boxes and lines 1-3 are staged in an unregistered
descriptor. The TY2025 `IRS8994` MeF XSD is not checked into this repository and
the IRS distributes 1040 schema packages through its e-Services Secure Object
Repository. No native XML tag names are inferred; the attachment/export guard
stays closed until that schema and Form 3800 linkage are available.

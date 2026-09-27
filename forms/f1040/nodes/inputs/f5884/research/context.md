# Form 5884: work opportunity credit, TY2025 build status

The employer's credit is calculated from one employee row at a time. The credit
belongs on Form 3800 Part III line 4b, then on Schedule 3 line 6a only after the
Form 3800 tax-liability limit. The current build pass sends a classified Form
5884 source credit to the shared nonpassive Form 3800 limit, with native
`IRS5884` and linked `IRS3800` XML. These paths have cases written but unrun and
are not yet a verified Form 1040 route. See
[the business-credit routing audit](../../../../../../docs/mef/general-business-credit-routing.md).

Sources: [IRS Form 5884](https://www.irs.gov/pub/irs-pdf/f5884.pdf),
[IRS instructions](https://www.irs.gov/instructions/i5884), and
[Form 3800 instructions](https://www.irs.gov/instructions/i3800).

## Current source model

Each `f5884s` row requires an employee record reference, a pre-2026 hire date, a
state-workforce-agency certification reference, the targeted group, dated
qualified-wage payroll records, hours worked, and affirmative checks for
qualifying payroll, no prior employment, no related/dependent employee, more
than half the wages for work in the trade or business, and exclusion of
disallowed wages. Duplicate employee references are rejected. A summer-youth row
additionally confirms the zone and service period; a
designated-community-resident row confirms the qualifying work location.

The certification is now a dated record of either SWA certification received by
the first workday or timely Form 8850 prescreening, signatures, and submission.
Each certification records whether a revocation notice was received. If it was
revoked for false employee information, the source requires the notice date, an
affirmation that later wages were excluded. Each claimed payroll row records its
service start and end dates, its 2025 paid-or-incurred date, the qualified
amount, and a retained payroll reference. Rows dated after notice are rejected.
This is a source assertion; it is not yet independently reconciled to payroll
documents. For successor employment, the first workday and Form 8850 deadline
are measured from the predecessor's start, not the acquisition date. The
successor record also requires the predecessor EIN, acquisition and
continued-employment facts, prior qualified wages and hours, a still-valid
certification, and confirmation that both wage periods start with the
predecessor. The calculation combines hours, reduces each wage cap by the
predecessor's qualified wages, and rejects payroll service before successor hire
or after the applicable period. These cases are written but unrun.

Payroll rows are classified by service period against the first workday's
anniversaries, which can precede TY2025 even though the wages are paid or
incurred in TY2025. A row crossing the first-year anniversary must be split.
Only LTFA can have second-year wages. Duplicate payroll references within an
employee claim are rejected. The previous undated year-one and year-two wage
totals are no longer accepted as input.

Each claimed payroll row now identifies the Schedule C business or Schedule F
farm whose gross payroll contains those wages. One employee may split payroll
between these destinations. Form 5884 allocates its whole-dollar line 2 credit
across the dated rows, passes the reduction to the business-profit graph, and
reconciles the reduction in a full MeF bundle. Form 3800's current-year tax
limit does not reduce this wage adjustment. Pass-through line 3 credit does not
cause a wage reduction on the recipient's Schedule C or F. Controlled-group rows
for other members may identify a separate entity return; the Form 1040 taxpayer
member must identify Schedule C or F for its line 2 share. The
business-location, graph, XML, and negative cases are written but unrun. When
eligible wages exceed a first- or second-year cap across different locations,
every payroll row in that year must now state its `credited_wages`. The row
amounts must be nonnegative, no more than their qualified wages, and add to the
remaining employee wage cap. Whole-dollar wage reductions are allocated by those
claimed amounts rather than by all qualifying payroll. The allocation and
rejection cases are written but unrun. Capitalized labor in inventory,
capitalized asset costs, and wage deductions on business forms other than
Schedules C and F still need separate, source-backed destinations and
sold-versus-ending-basis allocation. The full MeF bundle also compares qualified
payroll rows for each destination with its Schedule C line 26 gross wages or
Schedule F line 22 gross labor hired. A destination whose gross wages are
smaller than its assigned qualified payroll is rejected; this is not independent
payroll-document matching.

`pass_through_credits` separately identifies partnership, S corporation,
cooperative, estate, and trust allocations by entity EIN, source document
reference, amount, and passive-activity answer. Duplicate entity sources are
rejected. A 1040 recipient with only pass-through credit reports Form 3800 line
4b without their own Form 5884. If the recipient also earns credit from their
own employees, Form 5884 line 3 combines the identified allocations with lines
1a-1c; line 4 forwards the total. A partly limited multi-source claim requires
explicit Form 3800 Part V applied amounts for each source.

For a controlled group or businesses under common control, `controlled_group`
lists the member EINs and names and identifies the taxpayer member. Every
employee row identifies its employer EIN, and a retained group-classification
document reference is required. The group calculates the source credit once,
then allocates the rounded line 2 amount by each member's share of capped
qualified wages, with deterministic whole-dollar remainders. The taxpayer's
share, not the gross group credit, goes to Form 3800. The MeF form links a
native member-credit statement and an explanation with the wage and credit
arithmetic. The PDF prints "See attached" by line 2 and appends the same
calculation. These source, MeF, XSD, and PDF cases are written but unrun. An
employee paid by more than one group member in the same wage period still needs
a shared employee/payroll source model; the current distinct-employee rule
rejects that situation. An entity-return location is not a substitute for
reconciling the wages on that separate entity return.

Veterans require one `VeteranCategory`, rather than independent flags:

| Certified category                                    | First-year wage cap |
| ----------------------------------------------------- | ------------------: |
| SNAP recipient or short-term unemployed               |              $6,000 |
| Service-connected disability, recently discharged     |             $12,000 |
| Long-term unemployed                                  |             $14,000 |
| Service-connected disability and long-term unemployed |             $24,000 |

Other first-year wage caps are $3,000 for summer youth, $10,000 for long-term
family assistance (LTFA), and $6,000 for other groups. Only LTFA may carry
second-year wages, capped separately at $10,000. Fewer than 120 hours yields
zero credit for every group, including LTFA. Other groups receive 25% of capped
first-year wages at 120–399 hours and 40% at 400 or more. LTFA uses the same
hours-based first-year rate and receives 50% of capped second-year wages after
the 120-hour threshold.

These checks are written but unrun under the requested build-first workflow. The
row still accepts affirmed eligibility facts rather than reconciling
certifications, payroll periods, and wage exclusions against primary source
documents. Shared employees across controlled-group members, pass-through
credits, passive-activity limitations, carryovers, source-document
reconciliation, filled-PDF inspection, and ATS acceptance remain open. The
one-page PDF descriptor now maps the official fillable widgets for lines 1a-1c,
2, 3, and 4, but has not been visually verified after filling. Native XML and
the shared nonpassive tax limit still need the full test batch, local XSD
validation, and business-rule review before filing use.

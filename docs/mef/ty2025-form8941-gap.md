# TY2025 Form 8941 direct employer route and filing boundary

The [2025 IRS instructions](https://www.irs.gov/instructions/i8941) require
qualifying SHOP coverage, fewer than 25 FTEs, average annual wages below
$67,000, a two-consecutive-year credit period, and an employee/rating-area
premium calculation. A direct individual employer reports Form 8941 line 16 on
Form 3800 Part III line 4h. A K-1-only recipient generally reports on Form 3800
without a personal Form 8941; a tax-exempt employer uses Form 990-T. Those are
separate paths.

The old public input accepted asserted FTEs, average wages and total premiums.
It could not prove the credit. It has been replaced with one direct Schedule C
employer source: one owner and employment EIN, one full-year employee-only SHOP
plan that covers all nonexcluded employees, a uniform contribution of at least 50%, 1–24 identified nonseasonal
employees, hours, Medicare/Social Security wages, paid premiums, rating-area
average premiums, payroll/plan references, no state subsidies, no other
business/common control, and explicit 2024/2025 credit-period history. The
calculator builds Worksheets 1–7 and Form 8941 lines 1–16. It floors FTEs,
rounds average wages down to $1,000, caps employer premiums by the rating-area
average, and applies both FTE and wage phaseouts. Worksheet 6's printed formula
uses $33,300 even though the eligibility prose describes the reduction as
beginning above $33,000. The
[2025 average-premium table](https://www.irs.gov/instructions/i8941) lists
$9,358 for employee-only coverage in Albany County, NY, used in the authored
positive fixture. Other table values are not accepted by this staged source.

The staged SHOP review now checks the official Albany County row at $9,358 and
binds the Marketplace, plan, employer EIN, and exact employee set. Each employee
has 12 distinct coverage months with invoice and employer-payment references.
The monthly amounts must match the annual Worksheet 4 inputs and the uniform
employer contribution. Duplicated references, missing coverage months, changed
amounts, and another rating-area row are rejected. This deliberately narrows
the current staged source to Albany County, NY; other 2025 table rows need
authenticated entries. Document references are assertions until issuer/plan
and payment records are independently reviewed, so they do not open filing.

The native IRS8941 serializer follows the locally available TY2025 v5.4
IRS8941 schema. The official one-page PDF descriptor maps the same calculated
lines and SHOP/credit-period marks. The bounded node sends line 16 to Form 3800
Part III line 4h, a specified credit. The Form 3800 tax-use allocation carries
the amount allowed to Schedule 3 and Form 1040, and the source join requires
Schedule C wages, employment EIN, proprietor, and line 14 employee benefits to
reflect that allowed amount. The native/PDF registries include Form 8941.
Positive and tamper fixtures are authored but unrun.

**Filing remains closed by the attachment guard until the bounded route is
reviewed.** Payroll and SHOP document references, prior filed returns, local
XSD, rendered PDF, full-batch tests, IRS business rules, and ATS have not been
validated. Nonemployee, seasonal, dependent/family
coverage, multiple plans or businesses, county SHOP exception, tax-exempt, and
pass-through routes need separate source models.

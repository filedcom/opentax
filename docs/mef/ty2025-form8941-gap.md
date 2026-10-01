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
positive fixture. Other table values remain reviewed source assertions and must
be authenticated before export.

An unregistered native IRS8941 serializer follows the locally available TY2025
v5.4 IRS8941 schema. An unregistered official one-page PDF descriptor maps the
same calculated lines and SHOP/credit-period marks. Both reconcile the direct
source to one Schedule C business, its wages, employment EIN, proprietor, and
line 14 employee benefits after a proposed credit reduction. Positive and tamper
fixtures are authored but unrun.

**Filing remains closed.** The public node rejects the calculated positive
credit. Form 3800 line 4h, tax-use allocation and Schedule 3 joins are not
wired. Schedule C's final deduction reduction must be reconciled against the
credit actually allowed; payroll and SHOP records, rating-area table values,
prior filed returns, local XSD, rendered PDF, full-batch tests, IRS business
rules, and ATS have not been validated. Nonemployee, seasonal, dependent/family
coverage, multiple plans or businesses, county SHOP exception, tax-exempt, and
pass-through routes need separate source models.

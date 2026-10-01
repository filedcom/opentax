# TY2025 Schedule EIC child residency projection

The [2025 Schedule EIC](https://www.irs.gov/pub/irs-prior/f1040sei--2025.pdf)
line 6 asks for the number of months a qualifying child lived with the filer
**in the United States**. The
[2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
require more than half-year U.S. residence for the qualifying-child EIC, subject
to their stated exceptions.

`general.dependents` now records `months_lived_with_you_in_us` separately from
`months_in_home` and the U.S. residency Boolean. A child enters the EIC
calculation only with an explicit 7–12 U.S.-month answer that does not exceed
home months. The calculated EIC child detail retains that answer. Native MeF and
filled PDF Schedule EIC line 6 print it directly, while the shared export
preflight matches it and the residency Boolean to exactly one general child
source alongside SSN, name, relationship, date of birth, and home months. There
is no inference from home months or the Boolean. If all other EIC child
conditions hold, a missing or inconsistent U.S.-month answer fails the
calculation instead of silently treating the return as childless.

The bounded integer-month route does not yet model the printed **7** when actual
U.S. residence exceeded half the year but was under seven calendar months, or
the printed **12** for a child born or deceased in 2025 who met the special home
test. Kidnapping and other special residence rules also need their own reviewed
facts. An asserted month count is not proof of school, medical, or custody
records; source-document authentication remains open. The official
[TY2025 IRS ATS Scenario 5](https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-5-10202025.pdf)
shows 12 U.S. months for both qualifying children used by the corresponding
source fixture. Other synthetic fixtures explicitly state their own U.S. month
count.

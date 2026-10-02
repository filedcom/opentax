# TY2025 Schedule EIC child residency projection

The [2025 Schedule EIC](https://www.irs.gov/pub/irs-prior/f1040sei--2025.pdf)
line 6 asks for the number of months a qualifying child lived with the filer
**in the United States**. The
[2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
require more than half-year U.S. residence for the qualifying-child EIC, subject
to their stated exceptions.

`general.dependents` records actual calendar `months_lived_with_you_in_us`
separately from `months_in_home` and the U.S. residency Boolean. An ordinary
qualifying child needs an explicit 7–12 U.S.-month answer no greater than home
months. For a child born during 2025, a reviewed birth record, U.S. home record,
verified residence with the filer from birth through December 31, and verified
survival through December 31 support the narrower full-life birth route. The
actual months must equal the calendar months from the birth month through
December; the native MeF and filled PDF then print **12** on line 6 as the
Schedule EIC instructions require. Form 1040 dependent residency uses the same
reviewed birth fact. An EIC candidate born late in 2025 with an affirmative
U.S. residency answer and no birth review fails calculation so the return does
not silently become childless EIC. An inconsistent review cannot manufacture
residence months beyond the birth date.

The calculated EIC child detail retains the actual months and review. The
shared export preflight matches them and the residency Boolean to exactly one
general child source alongside SSN, name, relationship, date of birth, and home
months. Repeated EIC child SSNs fail calculation and both exporters. A
source-backed three-child fixture exercises ordinary 12 and 8 months plus a
December-born child with one actual month and printed 12, including TY2025
schema validation and a rendered filled PDF review.

The three-child source audit also found that a child's SSN could equal the
taxpayer's SSN and still reach the EIC graph and PDF projection. The general
EIC child selection now rejects an SSN reused by the taxpayer or spouse; the
shared final-export source check rejects a child SSN reused by the filer or
joint spouse before either native or PDF filing. A source-preserving
three-child graph/PDF/XML case validates against the local TY2025 v5.4 XSD;
negative cases cover a taxpayer collision in calculation and both filer and
joint-spouse collisions at final export. The native Schedule EIC serializer
already rejected filer/spouse collisions; the added shared check closes the
PDF/final-bundle gap.

The route does not yet model the printed **7** when actual U.S. residence
exceeded half the year but was under seven calendar months, a birth-year child
whose home was the filer's for more than half their life but less than the
entire remaining year, or the printed **12** for a child deceased in 2025 who
met the special home test. Kidnapping and other special residence rules also
need their own reviewed facts. A record reference is not authentication of
the source document; source-document authentication remains open. The official
[TY2025 IRS ATS Scenario 5](https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-5-10202025.pdf)
shows 12 U.S. months for both qualifying children used by the corresponding
source fixture. Other synthetic fixtures explicitly state their own U.S. month
count.

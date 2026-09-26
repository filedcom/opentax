# Form 7217, tax year 2025

Form 7217 reports property distributed by a partnership. The 1040 ATS Scenario
12 PDF includes the December 2024 revision for a distribution on March 1, 2025.
Its v5.4 MeF element is `IRS7217`; the earlier configured v3.0 schema did not
contain this form.

The input stores one item per distribution date. Part I amounts are calculated
from the partner's adjusted basis, cash and marketable securities received, and
the property rows in Part II. Each distribution becomes a separate MeF document.
Positive recognized gain is rejected until the type of gain can be routed
correctly to Schedule D or Form 4797.

The Scenario 12 PDF prints $32,507 partnership basis before distribution,
$10,000 partner basis, $4,000 cash received, zero gain, and $6,000 remaining
partner basis. Its sole Part II row describes `CASH`, checks section 734(b), and
prints $4,000 partner basis after section 732. Part I line 10 prints $6,000,
although its instructions say it should equal Part II total column (e), which
prints $4,000. The fixture and serializer preserve both values; the mismatch is
not silently reconciled or treated as proof of IRS business-rule acceptance.

Sources: [IRS Form 7217](https://www.irs.gov/forms-pubs/about-form-7217), the
private TY2025 ATS Scenario 12 PDF at
`.state/research/docs/ats-ty2025/1040-scenario-12.pdf`, and the local
`2025v5.4/Shared/IRS7217/IRS7217.xsd` schema.

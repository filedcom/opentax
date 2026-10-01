# TY2025 Form 8994 direct employer route and export boundary

The bounded direct Schedule C source calculates paid family and medical leave
credit from the written policy, eligible employee records, wage replacement
rates, and qualifying employer payments. It now sends Form 8994 line 3 to Form
3800 Part III line 4j as a specified current credit. Form 3800 retains source
identity through its tax-use order and prepares line 4j and Part V native/PDF
rows. The applied amount must match the explicit Form 3800 allocation and the
Schedule C gross wage ledger and employment-credit deduction reduction.

The [Form 8994 instructions](https://www.irs.gov/instructions/i8994) direct the
credit to Form 3800. The locally cached official TY2025 v5.4
`Shared/IRS8994/IRS8994.xsd` defines the four policy indicators and lines 1–3;
the locally cached `IndividualIncomeTax/Ind1040/ReturnData1040.xsd` places
IRS8994 after IRS8993 and before IRS8995. These XSDs are ignored research
artifacts, not checked in or reproducible from the repository. The native
descriptor and
[official PDF descriptor](https://www.irs.gov/pub/irs-pdf/f8994.pdf) are
registered with exact source, Form 3800 allocation, and Schedule C wage joins.
Form 3800 requires one reserved IRS8994 document ID. The public Form 8994
source requires one reviewed policy/payroll packet. Native and PDF export check
it against the same validated attachment bytes.

Positive and tamper fixtures cover line 4j, Part V, and a partial tax-use
allocation; they are authored but unrun pending the final bulk test pass. Policy
and payroll document references remain source assertions pending record review.
Pass-through, controlled-group, and other employer paths remain outside this
direct source.

A Form 8994-specific evidence helper reviews one written policy, one
Schedule C gross wage ledger, and each employee's leave payroll and 2024
compensation record. It matches employer EIN, policy dates and terms, employee
SSNs, leave dates/hours, wage replacement rates, paid wages, prior compensation,
and wage totals exactly to the direct source. Every distinct document reference
names one submitted PDF attachment with matching validated bytes and SHA-256;
missing, duplicate, or changed bytes fail. Unrelated form attachments are
allowed. Positive and tamper fixtures are authored for
the deferred bulk pass.

The required packet lives inside the single public `f8994` source shape.
`buildMefBundle` verifies it against the bundle's validated PDF attachments
before XML construction. `buildPdfBytes` rechecks it against the prepared MeF
bundle's attachments before rendering. Direct `buildMefXml` and standalone PDF
calls with Form 8994 fail closed because they carry no validated attachment
bytes. Other forms retain their existing entrypoints. Hashes bind reviewed
facts to supplied bytes; they do not authenticate an employer's policy, payroll
issuer, signatures, leave purpose, or wage-overlap assertions.

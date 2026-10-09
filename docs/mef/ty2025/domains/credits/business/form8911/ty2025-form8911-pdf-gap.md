# TY2025 Form 8911 PDF boundary

The December 2025 IRS [Form 8911](https://www.irs.gov/pub/irs-prior/f8911--2025.pdf)
requires Item A to count qualifying properties, and each property needs a
separate [Schedule A](https://www.irs.gov/pub/irs-pdf/f8911sa.pdf). The
[instructions](https://www.irs.gov/instructions/i8911) direct Schedule A line 21
to parent line 4, then parent line 10 to Schedule 3 line 6j.

The parent PDF uses the archived 2025 IRS URL. The Schedule A descriptor now
pins SHA-256 `8feda345747dfdb1c6bff573af3ef26c726235d8df91224ed9e20f85a364eb1c`
for the 76,534-byte, one-page December 2025 revision downloaded from the IRS
on October 9, 2026 (Stockholm). A retained blank fixture records provenance.
The PDF loader checks both cached and downloaded bytes before filling; a
mismatch fails without replacing the cache. Updating this pin requires review
of the new revision and mappings. This closes the named mutable-template
boundary, not the remaining property eligibility or full-return release gates.

The PDF build pass projects sourced personal-use electric and reviewed non-electric refueling properties and
one matching Schedule A per positive-cost property. It checks the property cost, dates, address,
eligible census tract and 11-digit GEOID, and main-home answer already required
by the native credit calculation. It computes the 30% property amount and $1,000
cap without using the old IRS ATS example's printed $162 tax limit. The
projection reconciles Form 8911 line 5 with finalized Form 1040 line 16 plus
Schedule 2 line 1z, line 8 with native Form 6251, and line 10 with Schedule 3
and the final return's nonrefundable-credit total. Both PDF pages are derived
from the same gate, so a positive parent page cannot be emitted without its
Schedule A page.

This remains a bounded personal-use refueling-property path. Business use,
other allowable-credit worksheet amounts, other fuel categories, and fractional
tax-limit worksheet operands stop for a separately reviewed source model. Optional
certification/permit and owner fields are not inferred from the address. The
source model does not independently authenticate the census tract or establish
original use of the property. The selected positive graph fixture now asserts
that native Form 8911/Schedule A values match both registered PDF projections,
checks the allowed credit on the parent and property schedule, rejects a
changed Schedule 3 amount at PDF projection, and validates the complete native
return against the local TY2025 v5.4 XSD. The four direct Form 8911 PDF cases
and three Schedule 3 line 6j cases also pass. In the six-page selected return,
the filled Form 8911 page was visually checked at line 4 = $300, line 5 =
$3,875, and line 10 = $300; its Schedule A page was checked at lines 8/19/21 =
$1,000/$300/$300. The amounts match the native values and PDF projections, and
both pages render without clipping. Other property shapes and the full batch
remain deferred.

## October 9 template-pin verification

The typed cache, Form 8911 projection, real-template and composed PDF-builder
tests pass 42/42 with Poppler available (`pdftotext` is required by an existing
shared-header case). Tests reject changed downloaded bytes before caching,
reject changed cached bytes without replacement, preserve unpinned behavior,
and fill the retained official template offline. The generated one-page
Schedule A was rendered and visually reviewed: name/TIN, property address,
dates, GEOID, eligibility/main-home checkboxes and 1,000/300 amounts are legible.
The flattened output has zero fields/widgets and SHA-256
`35df43fd18c8c601b890a46c9ee152568f2923b38056cdc26dddd4b02ff25425`.
This is template/mapping evidence, not a new full-return or IRS acceptance claim.

## Multiple personal properties — October 9

The public `f8911` input accepts either its original single-property fields or
`properties`, an array of property records with unique, nonempty
`property_reference` values. Each record retains its own cost, description,
address, dates, fuel type, census-tract answer/GEOID and main-home answer.
Regular tax, tentative minimum tax and other credit-limit operands remain at
the return level. Mixed single/array inputs and duplicate references fail.
References distinguish reviewed property records; they do not independently
authenticate invoices, original use or tract eligibility.

Following the [December 2025 instructions](https://www.irs.gov/instructions/i8911),
the calculation caps each property's 30% amount at 1,000, sums those amounts,
then applies the return-wide tax limit once. The native parent now emits Item A's
property count. Native Schedule A documents receive separate IDs, and the PDF
builder emits the same number of property copies. Parent/Schedule 3/Form 1040
credit reconciliation remains mandatory.

The public 50,000-wage fixture with 5,000 and 1,000 property costs yields
1,000 + 300 = 1,300 credit, total tax 2,575 and refund 4,425. Its complete native
return validates against cached TY2025 v5.4, and all seven PDF pages were
reviewed. The PDF has zero remaining fields/widgets and SHA-256
`94b8f474cf486952df4d6aacae2bcebf742ca435135196d78f00ceff40eaa9db`.
A four-property case separately exercises the aggregate tax limit: 4,000
tentative credit is limited to 3,875, producing zero total tax. Verification
records distinguish this local synthetic source from an accepted IRS return.

The tax-limited case also validates as a complete TY2025 v5.4 XML return.
All nine PDF pages were reviewed, including four separately identified charger
copies, parent count 4, credit 3,875, zero total tax and refund 7,000. Its
flattened PDF has zero fields/widgets and SHA-256 `00bdc3c583559ac7aa4fb09d6719655c61641d8d60d27714edd9fd842cfed515`.
The final focused and adjacent regression (including the base ATS fixture
directory and PDF builder) passes 109/109 with zero failures.

## Property-cost cents — October 9

Property costs retain cents through the 30% calculation and per-property cap.
The combined tentative credit is rounded once when entered on Form 8911 line 4,
before applying the return-wide tax limit and routing it to Schedule 3. This
implements the [Form 1040 whole-dollar instructions](https://www.irs.gov/instructions/i1040gi)
to retain cents while adding amounts and round the total. Individual Schedule A
fields use the shared whole-dollar output formatter. No source costs are mutated.

For two properties costing 1,001.49 each, 300.447 + 300.447 produces a filed
601 combined credit, while each printed/native property credit is 300. The
one-dollar difference is retained explicitly as the consequence of rounding the
aggregate rather than summing already-rounded displays. A second boundary case
checks two 300.501 amounts producing 601, not 602. The current implementation
still requires whole-dollar tax-limit worksheet inputs and rejects unreconciled
return totals. IRS business-rule tolerance/acceptance has not been verified.

The first cents case has a complete TY2025 v5.4 XSD-valid return and seven
reviewed PDF pages: credit 601, total tax 3,274, refund 3,726. The flattened PDF
has zero fields/widgets and SHA-256
`2a87fdb5addee86e7b9bcb7090198e82ae15e499386cb7e347e3e81ea7e717a3`.

Final regression after the cents change: 111 passed, zero failed across the
selected Form 8911, PDF builder/cache, and base ATS fixture modules.

## Property permits — October 9

Optional supplied certification/permit numbers now follow each property through
public intake, native `CertificationOrPermitNum`, and Schedule A PDF line 7.
The schema rejects empty values and values longer than the IRS XSD's
25-character limit; an absent permit remains absent. This records the supplied
identifier without claiming issuer authentication.

A two-property synthetic return retains distinct permits, including a
25-character identifier. The complete TY2025 v5.4 XML validates; all seven PDF
pages were reviewed, with credit 1,300, tax 2,575 and refund 4,425 unchanged.
The flattened PDF has no fields/widgets and SHA-256
`d69d38c6bbc8ee0966c1daedea7f8a8b437ac7bfe70fa9191efdcaa8ac2af48e`.
Final focused and adjacent regression: 113 passed, zero failed.

## Non-electric personal-use properties — October 9

The retained hydrogen, natural-gas and propane input categories now require
`non_electric_fuel_review`: a nonempty specification reference, the combined
qualifying-fuel volume fraction, and an affirmative answer that storage or
dispensing occurs at the vehicle tank. The fraction must be at least 0.85,
following the [December 2025 instructions](https://www.irs.gov/instructions/i8911).
The calculation and both exporters share this validation. A missing review,
84.99% fraction or off-site dispensing is rejected. This is a structured source
review, not independent authentication of the referenced specification; the
remaining original-use, census-tract and issuer-proof boundaries still apply.
Other fuel categories and business-use branches are not established by this case.

The three-property synthetic return uses costs 3,000 / 5,000 / 1,000 and
credits 900 / 1,000 / 300. Form 8911, Schedule 3 and Form 1040 carry 2,200;
total tax is 1,675 and refund 5,325. The complete XML validates against cached
TY2025 v5.4. All eight PDF pages were reviewed, including each property
identity and cap. The flattened PDF has no fields/widgets and SHA-256
`dcc96507fdb56846b7691110342908939bd5f6da5d29cada1eeefa31aa99d1bf`.
The selected regression passes 115 tests with zero failures. No IRS business-rule
or acceptance result is claimed.

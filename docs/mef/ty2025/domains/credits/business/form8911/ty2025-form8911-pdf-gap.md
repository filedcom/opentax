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

The PDF build pass projects one sourced, personal-use electric charger and
exactly one matching Schedule A. It checks the property cost, dates, address,
eligible census tract and 11-digit GEOID, and main-home answer already required
by the native credit calculation. It computes the 30% property amount and $1,000
cap without using the old IRS ATS example's printed $162 tax limit. The
projection reconciles Form 8911 line 5 with finalized Form 1040 line 16 plus
Schedule 2 line 1z, line 8 with native Form 6251, and line 10 with Schedule 3
and the final return's nonrefundable-credit total. Both PDF pages are derived
from the same gate, so a positive parent page cannot be emitted without its
Schedule A page.

This remains a bounded one-property build path. Multiple properties, business use,
other allowable-credit worksheet amounts, non-electric fuel, and fractional
printed dollar lines stop for a separately reviewed source model. Optional
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

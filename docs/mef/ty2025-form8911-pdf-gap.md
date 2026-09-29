# TY2025 Form 8911 PDF boundary

The December 2025 IRS [Form 8911](https://www.irs.gov/pub/irs-prior/f8911--2025.pdf)
requires Item A to count qualifying properties, and each property needs a
separate [Schedule A](https://www.irs.gov/pub/irs-pdf/f8911sa.pdf). The
[instructions](https://www.irs.gov/instructions/i8911) direct Schedule A line 21
to parent line 4, then parent line 10 to Schedule 3 line 6j.

The parent PDF now uses the archived 2025 IRS URL. Schedule A's current IRS PDF
is marked December 2025, but no 2025 archive URL is available yet. Its field
names passed the live IRS AcroForm check on 2026-09-29; the mutable URL still
needs a pinned source before the PDF release gate is complete.

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

This remains a bounded, untested build pass. Multiple properties, business use,
other allowable-credit worksheet amounts, non-electric fuel, and fractional
printed dollar lines stop for a separately reviewed source model. Optional
certification/permit and owner fields are not inferred from the address. The
source model does not independently authenticate the census tract or establish
original use of the property. Focused cases are written but unrun; the full test
batch and filled-page visual review remain deferred.

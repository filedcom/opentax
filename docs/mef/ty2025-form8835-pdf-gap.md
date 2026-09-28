# TY2025 Form 8835 PDF boundary

The [2025 Form 8835](https://www.irs.gov/pub/irs-prior/f8835--2025.pdf) prints
facility details on page 1, production and credit lines on page 2, and line 15
on page 3. The [instructions](https://www.irs.gov/instructions/i8835) require a
separate form for each qualified facility and carry the applicable line 15
credit to Form 3800 line 4e for production during the first four years after the
facility entered service.

The current PDF build pass is limited to one filer-owned geothermal facility
with 2025 production inside that first-four-year period. It prints the
source-backed facility name, address, coordinates, dates, AC nameplate capacity,
and geothermal kWh, then carries the calculated line 1c amount through lines 2,
4, 6, 8, 9, 12, 13, and 15. It prints zero on the no-bonus lines 10 and 11. The
source gate checks the exact Form 3800 line 4e entry and requires the full
credit to be used on finalized Form 3800, Schedule 3, and Form 1040. The
original PDF's geothermal rate cell is read-only and left untouched. All three
pages are retained.

This is a bounded, untested build pass. More than one facility, passive credit,
production outside the first four years, transfers, increased credit, domestic
content or energy-community bonuses, bond reduction, fiscal-year phaseout, and
other fuel types stop for a separate source-aware projection. A zero-credit
facility stops rather than silently omitting a PDF that the native XML exporter
would still emit. Source-only data without the finalized credit also stops.
Focused cases are written but unrun; the full test batch and filled-page visual
review remain deferred.

# TY2025 Form 8835 PDF boundary

The [2025 Form 8835](https://www.irs.gov/pub/irs-prior/f8835--2025.pdf) prints
facility details on page 1, production and credit lines on page 2, and line 15
on page 3. The [instructions](https://www.irs.gov/instructions/i8835) require a
separate form for each qualified facility and carry the applicable line 15
credit to Form 3800 line 4e for production during the first four years after the
facility entered service.

The current PDF route covers filer-owned, nonpassive wind and geothermal
facilities placed in service after 2021, with 2025 production during the first
four years. It prints a separate three-page copy for each facility, including
source-backed identity, address, coordinates, dates, and AC capacity. Wind
production and credit use line 1a; geothermal uses line 1c. Both carry their
calculated amount through lines 2, 4, 6, 8, 9, 12, 13, and 15. The two printed
rate cells are read-only and left untouched. The source gate matches each
indexed Form 3800 line 4e entry and the prepared native Part III source rows,
requires the facility credit to be fully used on line 4e, and checks the
return-wide Form 3800 total against Schedule 3 and Form 1040. Repeated
physical-facility identities reject at input validation.

Local source-to-XML-to-PDF cases cover one geothermal facility, two distinct
geothermal facilities, and one wind plus one geothermal facility. The mixed
packet's two source documents each carry a $600 credit, Form 3800 Part V has
two $600 rows, and line 38, Schedule 3 line 6a, and Form 1040 line 20 each
carry $1,200. Its local TY2025 v5.4 XSD case and focused source/PDF tests pass;
the 20-page filled PDF was rendered and its two Form 8835 copies and Part V
page inspected. The retained mixed PDF is
`.state/research/ty2025-filled-pdf-review/2026-09-29-v20/single-wind-and-geothermal-business-credits.pdf`
(SHA-256 `eb4c7bb295df8ae71ec0e3e11839c50b2fb51a417b8cf1499c7393ff502e907f`).
The canonical IRS field-name check passes for the new wind mappings.

One further synthetic return combines a $600 geothermal Form 8835 and a $500
New Markets Form 8874. Prepared Form 3800 parts keep distinct source IDs and
print $600 on Part III line 4e, $500 on line 1i, and $1,100 on line 38. The
same $1,100 appears on Schedule 3 line 6a and Form 1040 line 20. The prior
Form 8835 PDF guard treated its facility credit as the entire return credit;
it now checks the exact prepared line 4e source and applied amount separately
from the return-wide total. A changed prepared line 4e tax-use test fails
closed. The 18-page mixed packet and native XML pass focused and local TY2025
v5.4 XSD checks; both source forms and Form 3800 Part III pages were rendered
and inspected. The retained PDF is
`.state/research/ty2025-filled-pdf-review/2026-09-29-v26/single-geothermal-and-new-markets-credits.pdf`
(SHA-256 `a8e7f493b41b6069012d5583a691123692578cdbf19a28b0e5dfa7229a081d85`).

The fixed-source `81a2c713` repository-wide run passed 8,869/8,869,
zero failed, with no ignored tests reported in 20m35s. Its log is
`.state/research/ty2025-full-test-81a2c713.log`.

The synthetic facilities now use construction after January 29, 2023, a
reviewed maximum net output of 1.5 MW, and matching 1,500 kW AC nameplate
capacity. The source calculation rejects a post-2021 `no increase` answer when
the recorded construction date needs continuity review, maximum output is
missing or below 1 MW, AC nameplate capacity contradicts that output, or both
prevailing-wage and apprenticeship requirements are marked met. This prevents
the base-credit PDF from printing over contradictory source facts. The
corrected 20-packet review set is under
`.state/research/ty2025-filled-pdf-review/2026-09-29-v20/`.
The fixed-source `deno task test` run on `08786417` passed 8,860/8,860,
zero failed, with no ignored tests reported in 15m48s; its log is
`.state/research/ty2025-full-test-08786417.log`.

Other energy types, pre-2022 rates and wind phaseout, production after the
first four years, passive credits, transfers, increased credit, domestic
content or energy-community bonuses, bond reduction, fiscal-year phaseout,
and other mixed Form 3800 credit sources remain open. A zero-credit facility stops
rather than silently omitting a PDF that native XML would still emit.
Source-only data without the finalized credit also stops. IRS business-rule
and ATS acceptance are not established by these local checks.

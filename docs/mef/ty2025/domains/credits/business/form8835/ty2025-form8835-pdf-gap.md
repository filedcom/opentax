# TY2025 Form 8835 PDF boundary

The [2025 Form 8835](https://www.irs.gov/pub/irs-prior/f8835--2025.pdf) prints
facility details on page 1, production and credit lines on page 2, and line 15
on page 3. The [instructions](https://www.irs.gov/instructions/i8835) require a
separate form for each qualified facility and carry the applicable line 15
credit to Form 3800 line 4e for production during the first four years after the
facility entered service.

The current PDF route covers filer-owned, nonpassive wind, geothermal,
closed-loop biomass, open-loop cellulosic biomass, solar, sourced landfill-gas,
and trash-combustion facilities placed in service after 2021, with 2025 production during the first
four years. It prints a separate three-page copy for each facility, including
source-backed identity, address, coordinates, dates, and AC capacity. Wind
production and credit use line 1a; closed-loop biomass uses line 1b; geothermal
uses line 1c; solar uses line 1d; open-loop biomass uses line 1f; landfill gas
uses line 1g; trash combustion uses line 1h. All carry their calculated amount through lines 2, 4, 6, 8, 9,
12, 13, and 15. The printed rate cells are read-only and left untouched. The source gate matches each
indexed Form 3800 line 4e entry and the prepared native Part III source rows,
requires the facility credit to be fully used on line 4e, and checks the
return-wide Form 3800 total against Schedule 3 and Form 1040. Repeated
physical-facility identities reject at input validation.

The solar route requires construction before 2025, post-2021 placement in
service, positive DC capacity, a construction record, a 2025 production meter,
and an unrelated-buyer sale invoice. Their dates, facility description, and kWh
must agree with the claimed period and amounts, and all three record references
must be distinct. The source affirms that the same property basis was not used
for a section 48 energy credit. The [2025 Form 8835
instructions](https://www.irs.gov/instructions/i8835) assign post-2021 solar
electricity the 0.6-cent rate and require construction before 2025. Native line
1d, PDF line 1d and DC capacity, Form 3800 line 4e, Schedule 3, and Form 1040
now use the same calculated credit and existing finalized-return guard. Positive
and source/Form-3800 tamper fixtures are authored for deferred validation.
Meter, invoice, construction, and section 48 claim bytes are not authenticated;
expanded, transferred, passive, bonus, and increased-credit solar facilities
remain closed.

The closed-loop biomass route requires a planting record for material planted
exclusively for that facility, an original facility without co-firing, metered
production and an unrelated-buyer sale invoice with quantities equal to the
claimed kWh, construction before 2025, and attestations that no investment
credit election or section 1603 grant displaced the production credit. It uses
the 2025 post-2021 0.6-cent rate in the
[IRS instructions](https://www.irs.gov/instructions/i8835). Native line 1b
elements and PDF line 1b fields receive the same calculated amount and
Form 3800 source check. Calculation, native, PDF, and mismatch fixtures are
authored for deferred validation. Planting, meter, invoice, and election
record bytes are not authenticated; modified/co-fired facilities remain closed.

The original filer-owned open-loop biomass route now covers only solid,
nonhazardous cellulosic waste. It requires construction before 2025, placement
in service after 2021, no expansion, a distinct qualifying-feedstock record,
construction record, 2025 production meter, and unrelated-buyer sale invoice.
Construction and meter dates, invoice date, facility identity, and
meter/invoice kWh must match the claimed period and quantities, and all four
references must differ. The [2025 Form 8835 instructions](https://www.irs.gov/pub/irs-prior/i8835--2025.pdf)
define this open-loop resource, permit the original cellulosic facility, and
assign the post-2021 0.3-cent rate. The bounded 100,000-kWh source produces
$300 on Form 8835 line 1f and line 15, Form 3800 line 4e, Schedule 3 line 6a,
and Form 1040 line 20. Native XML uses the line 1f production tags; the PDF
prints line 1f and the same final amounts. Full-return, altered feedstock,
meter, and Form 3800 fixtures are authored for deferred validation. Source
references are entered evidence rather than authenticated feedstock, meter, or
invoice bytes. New-unit/expanded facilities,
non-owner producers, passive, bonus, transfer, and later-year Form 3800 line 1f
paths remain closed.

The filer-owned original open-loop route now also covers a distinct agricultural
livestock waste nutrient facility. The [2025 Form 8835
instructions](https://www.irs.gov/instructions/i8835) require original service
after October 22, 2004, construction before 2025, and a nameplate rating of at
least 150 kW for this feedstock. The bounded post-2021 facility uses a 2024
service date, 2023 construction start, 1,500 kW AC nameplate, and production
within the first four years. A separate strict source record identifies the
nutrient feedstock, construction, signed capacity, 2025 meter, and unrelated
buyer invoice; five distinct references, matching facility/dates/kWh, and the
150 kW threshold are required. The 100,000-kWh example uses the 0.3-cent rate
to place $300 on Form 8835 line 1f/15, Form 3800 line 4e, Schedule 3 line 6a,
and Form 1040 line 20. Native MeF uses the existing open-loop line 1f tags and
the PDF labels the livestock resource while projecting the same line and
amount. Positive full-return and feedstock, capacity, construction, meter,
invoice, and Form 3800 tamper fixtures are authored but unrun. Record references
are reviewed source assertions; retained bytes and issuer authenticity are
not established. New-unit/expanded, non-owner production, passive, bonus,
transfer, and later-year branches remain closed.

The bounded filer-owned landfill-gas route now covers an original municipal
solid waste facility placed in service after 2021 with construction before
2025 and first-four-year electricity sales. The
[2025 instructions](https://www.irs.gov/instructions/i8835) put this resource
on line 1g at the post-2021 0.3-cent rate and exclude facilities with an
allowed section 45K credit or an allowed section 48 credit for qualified
biogas property. The source requires seven distinct feedstock, section 45K,
section 48 biogas, other investment-credit/grant, construction, meter, and
unrelated-buyer invoice references. It reconciles facility identity, dates,
and kWh, and requires explicit no-overlap assertions. A 100,000-kWh fixture
puts $300 on native and PDF Form 8835 line 1g/15, Form 3800 line 4e,
Schedule 3, and Form 1040. Meter, duplicated-record, excluded-credit, and
prepared Form 3800 tamper cases are authored for deferred validation. Record
references and assertions do not authenticate source bytes or IRS prior-year
credit history; other municipal-solid-waste, transfer, bonus, passive, and
later-year routes remain closed.

The original filer-owned trash-combustion route now uses Part II line 1h for
municipal solid waste electricity. The [2025 instructions](https://www.irs.gov/instructions/i8835)
qualify original trash facilities placed in service after October 22, 2004,
whose construction began before 2025, exclude segregated commonly recycled
paper from municipal solid waste, and set the post-2021 rate at 0.3 cents per
kWh. The bounded source requires matching facility description, street address,
and coordinates; a municipal-waste intake record; explicit original-facility,
filer-production, no section 48 election/grant, and unrelated-buyer assertions;
and distinct election review, construction, production meter, and sale invoice
references. Construction, meter period, invoice date, and kWh reconcile to the
claimed facility and period. A 100,000-kWh source produces $300 on Form 8835
line 1h/15, Form 3800 Part III line 4e, Schedule 3 line 6a, and Form 1040 line
20. Native XML and the parent PDF project the same line 1h amount, with the
PDF's original 2025 AcroForm fields. Positive, facility/owner, feedstock,
meter, duplicate-record, and Form 3800 tamper fixtures are authored for the
deferred bulk gate. Record references and assertions are entered source facts;
the waste, meter, invoice, and prior-election bytes are not authenticated.
Expanded, non-owner, passive, increased, bonus, transfer, and later-year
production remain closed.

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

Other energy types beyond wind, geothermal, closed-loop biomass, open-loop cellulosic and livestock-waste biomass, solar, landfill gas, and trash combustion,
pre-2022 rates and wind phaseout, production after the
first four years, passive credits, transfers, increased credit, domestic
content or energy-community bonuses, bond reduction, fiscal-year phaseout,
and other mixed Form 3800 credit sources remain open. A zero-credit facility stops
rather than silently omitting a PDF that native XML would still emit.
Source-only data without the finalized credit also stops. IRS business-rule
and ATS acceptance are not established by these local checks.

## Non-owner cellulosic biomass lessee (2026-10-01, unrun)

The [2025 instructions](https://www.irs.gov/instructions/i8835) permit the
lessee or operator to claim the production credit for open-loop biomass when
the facility owner is not the electricity producer. A bounded lessee route now
requires one distinct business owner name/EIN, a matching facility identity,
a lease reference, and an owner acknowledgment that the owner neither produced
nor claimed the 2025 electricity credit. Those two references must differ from
the feedstock, construction, meter, and unrelated-sale records; the filer must
be the recorded producer. The original post-2021 cellulosic facility retains
its 0.3-cent line 1f rate, first-four-year Form 3800 line 4e routing, and
Schedule 3/Form 1040 tax join. Native Form 8835 carries the owner name/EIN; the
PDF now prints those same facts in Part I line 2b. An authored 100,000-kWh
$300 full-return fixture plus owner, lease, missing-entitlement, and Form 3800
tamper fixtures await the bulk validation pass. Lease, owner acknowledgment,
feedstock, meter, and sale bytes are not authenticated. Non-owner operators
other than a sourced lessee, expanded/co-fired, passive,
transfer, bonus, and later-year branches remain closed.

## Non-owner livestock-waste biomass lessee (2026-10-01, unrun)

The same [2025 Form 8835 owner rule](https://www.irs.gov/instructions/i8835)
also covers a qualified open-loop agricultural livestock-waste facility when
its owner is not the electricity producer. The bounded 150-kW-or-larger
livestock route now accepts the existing single lessee record with a business
owner name/EIN, exact facility address and coordinates, and distinct lease,
owner nonproduction acknowledgment, nutrient feedstock, construction,
nameplate-capacity, meter, and unrelated-sale references. The filer remains
the recorded producer. A 100,000-kWh case yields $300 on Form 8835 line 1f
and Form 3800 line 4e, through Schedule 3 to Form 1040. Native Form 8835
and the PDF include the owner identity; source and final-return tamper fixtures
are authored for the deferred bulk pass. The source references are reviewed
entries without document-byte authentication. Other non-owner operators,
pass-through, transfer, increased-credit, and later-year cases remain closed.


October8, 2026: the retained one-geothermal-facility packet has all16 pages visually inspected and its public graph replay reproduces native XML exactly with full local XSD success. Form8835 credit600, Form3800 PartIII4e and Schedule3/Form1040 totals reconcile. PartV is blank in PDF/native for this one-facility case, despite a stale `reviewFocus` claim; metadata correction is future-only. External facility/production/sale eligibility remains unauthenticated. See the [qualified source and page evidence](../../../../readiness/ty2025-readiness-execution-2026-10-07.md).


October8 two-geothermal-facility review: all19 retained pages are visually inspected. Two distinct facility copies and reserved native IDs join to two PartV4e rows of600each, PartIII1,200 and Form1040 credit1,200/refund6,133. Public/native replay reproduces filed XML exactly; local full XSD passes and all native references resolve. Duplicate facility rejects in the graph, conflicting filer-owned/other-owner data rejects in the native builder. External qualification and IRS acceptance remain unproved. See the [retained source/page and negative evidence](../../../../readiness/ty2025-readiness-execution-2026-10-07.md).


October8 mixed wind/geothermal review: all19 retained pages inspected. Wind PartII1a/AC12b and geothermal PartII1c/AC12c retain distinct facility identities; each600 joins its own native ID/PartV4e row, totaling1,200 on Form3800 and Form1040. Public/native replay reproduces XML exactly and full local XSD passes; all references resolve. Source qualification and IRS acceptance remain unproved. See the [qualified packet evidence](../../../../readiness/ty2025-readiness-execution-2026-10-07.md).

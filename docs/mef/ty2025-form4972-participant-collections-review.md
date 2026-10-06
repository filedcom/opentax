# TY2025 Form4972 distinct participant collections

Existing parent remains open. This advances two complete participant groups for
one filing owner and full-share inherited participant groups for spouses. Ordinary
reviewed eligibility/history records are not authenticated issued copies or proof
of accepted prior filing, and local XSD validation is not IRS acceptance.

## Authority and unresolved larger collections

[2025 Form4972 instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf),
pp2–3, require combining all distributions for one participant on one form, while
permitting separate forms/elections for own and inherited participants. Their
own/mother/father example explicitly permits three separate forms. The final
1040 combines special tax once on line16.

The reviewed local IMF2025v5.4 `ReturnData1040.xsd` line1284 explicitly says
`<xsd:element ref="IRS4972" minOccurs="0" maxOccurs="2">`.
SHA256 `3e38929827717ebb7c6fa17277b6844b1cc0264d3a87f12d83dc68ab1a455397`
matches the retained original. See [schema provenance](ty2025-v54-schema-provenance.md)
for the original local ZIP lineage and its limits: these digests establish local
byte identity, not official issuer authentication.

The official [accepted forms listing](https://www.irs.gov/pub/irs-efile/tax-year-2025-accepted-forms-schedules-individual-tax-returns-extensions.xlsx)
row68 states Form4972 count2 for1040. The official [forms/attachments listing](https://www.irs.gov/pub/irs-efile/tax-year-2025-forms-attachments-1040-series-extensions.xlsx)
rows1699–1702 lists Form4972 and "No Dependencies". The official
[recommended PDF names](https://www.irs.gov/pub/irs-efile/tax-year-2025-recommended-pdf-names-attached-mef-1040-series-extensions-submissions.xlsx)
has no4972 entry. These do not by themselves establish a complete prohibition,
but no authorized overflow mechanism was identified. [Publication4164](https://www.irs.gov/pub/irs-pdf/p4164.pdf),
pp56–57, lists the permitted1040 paper-document indicator forms;4972 is absent.
The ordinary BinaryAttachment/GeneralDependency schemas do not establish that a
third4972 can be substituted by a newly invented attachment. Original scope for
three/five participants remains open; no schema or paper/MeF workaround is claimed.

Official XLSX bytes were saved separately at `/tmp/opentax-4972-overflow-authority-oct6`.
Their SHA256s (in the same URL order as above) are
`0f0d2c252264f799d5c5107a3330a5ea49d6073dd5b0ebec1e0ebd2a382a1c7b`,
`7a6c53f2aa3991de8a4e7a85c12fbe6af47eacd4cfbf42122a4c135d94804c34`,
`306753b369e99cd7a9124ba52a0982a251ca9c55900dda2badc2af78edf33067`.

## Implemented contract

Issued copies are grouped by recipient/participant before the existing complete
copy calculation. Each group keeps exact source references, participant/plan/full
balance identity, recipient owner, and its own election. A dated participant
birth/death record, entitlement record, complete source inventory and reviewed
prior-election-history reference must agree. Positive death/estate amounts match
reviewed allowed/attributable amounts and their source references. No external
authentication is invented. Native and direct PDF projections repeat validation.

More than two computed participant forms explicitly reject in both final native
and direct PDF routes. They remain staged with all actual source records; neither
truncation nor a manufactured overflow attachment is allowed.

## Verification

Independent Python Decimal worksheets are retained in
`scripts/review-form4972-participant-oracle.py` and the checked-in expectedJSON.
Four positive public cases exercise two inherited participants for one owner,
own PartII plus one inherited NUA/annuity/estate participant, independent spouse
beneficiaries and pre-1996 death/estate allocations. Three larger staged cases
exercise own+parents, three joint participants and five inherited participants
(including PartIII-only); their final filing boundary remains negative.

The own+parent single filer receives24000 ordinary pension income,17750 age-
adjusted standard deduction and6000 senior deduction: taxable250. The official
[2025 tax table](https://www.irs.gov/publications/p1040) gives26 regular tax.
Special tax3198 is added once, yielding1040line16=3224.

Final gates, preserved source replays and visual review are recorded after they
reach terminal status. No parent-completion credit is claimed here.

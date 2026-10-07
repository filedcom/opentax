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
authentication is invented. Native and direct PDF projections repeat validation. `plan_reference` identifies
the employer plan; different participants may legitimately share it. Participant
identity and the complete participant-specific source inventory remain separate.
Shared-beneficiary reconciliation applies when the participant identity matches,
not solely because the employer plan reference is reused.

More than two computed participant forms explicitly reject in both final native
and direct PDF routes. They remain staged with all actual source records; neither
truncation nor a manufactured overflow attachment is allowed.

## Verification

Independent Python Decimal worksheets are retained in
`scripts/review-form4972-participant-oracle.py` and the checked-in expectedJSON.
Six positive public cases exercise two inherited participants for one owner,
own PartII plus one inherited NUA/annuity/estate participant, independent spouse
beneficiaries, two different inherited participants sharing an employer plan,
two own-plan spouse participants sharing an employer plan,
and pre-1996 death/estate allocations. Three larger staged cases
exercise own+parents, three joint participants and five inherited participants
(including PartIII-only); their final filing boundary remains negative.

The own+parent single filer receives24000 ordinary pension income,17750 age-
adjusted standard deduction and6000 senior deduction: taxable250. The official
[2025 tax table](https://www.irs.gov/publications/p1040) gives26 regular tax.
Special tax3198 is added once, yielding1040line16=3224.

Final ordinary typed source/native/XSD/PDF and existing core gate reached
terminal exit0: **116 passed,0 failed** (4m20s). It held production digest
`0d2eb98dae5f9843aad0f09222f8c63ad9d78c7bd60754193d1e63956253dfe2`
at code/test commit `75e35c3b70ba891bc55bfc0cbe7e8998eb822a64`.
Log: `/tmp/opentax-4972-participant-final-v8-oct6.log`.

The final actual saved-source export is
`/tmp/opentax-4972-participant-final-savedsource-v2-oct6`:
six positive packets,12 Form4972 documents,26 issued1099R copies and36 flattened
PDF pages. Every full native1040 packet passes the complete reviewed XSD; all
six PDFs reopen with zero Fields/widgets. All36 page instances were visually
inspected, including the12 new shared-employer inherited/own spouse pages.
Three additional actual staged packets retain11 participant forms and27 issued
copies, with explicit native and direct-PDF max2 rejection.

The original four captured JSON/XML/PDF packets were transferred byte-for-byte
from the retained runtime-v4 archive. The two new employer-plan packets were
transferred byte-for-byte from the separate held-source-v1 archive. Captured filer
timestamps were reused; original archives were not rewritten. The ordinary
final-v8 gate's input, pending, prepared pending, carry, page origins, independent
expected results and PDF bytes exactly match these final packets. Its fresh XML
ReturnTs may differ. `source-transfer-report.json` retains per-file SHA256 and
these comparisons. A digest proves retained byte identity, not issuer provenance.

Final replay at held75e executed95 original saved input wrappers from nine
existing archives, without fixture factories or archive writes. All95 match
pending exactly, native XML exactly except ReturnTs, and PDF bytes exactly;
input bytes remained unchanged. Those historical wrappers contain no saved carry
field: `carryExact:false` records that unavailable comparison, not a mismatch.
Final rehash preserves all376 archived physical files. Report/log:
`/tmp/opentax-4972-participant-all-saved-final-v2-replay-oct6.{json,log}`.
The earlier95 replay started before the explicit max2 boundary; the next95 replay
held7e2 after max2 but before employer-plan correction. Both are historical and
are not the final held-code preservation result. The114-pass ordinary core gate
at7e2 likewise predates the employer-plan correction.

A read-only baseline run against87012d21e uses the same nine saved input maps;
all nine produce unsupported diagnostics. Final saved input maps are retained
without factory regeneration. Initial failed runtime gates and superseded typed
gates remain preserved with their actual outcomes. Final116-pass gate is the
ordinary typed result after the plan-identity and own-date-control corrections.
No parent-completion credit, issuer authentication, prior accepted election,
IRS acceptance, or authorized overflow filing route is claimed here.


## Final main integration verification

Production5b498099c/b03b6ec26 andtest551c3a19f retain allsevenheldproductionhashes. Main ordinary ten-module typed `deno task test` terminal exit0, **116 passed /0 failed (6m30s)**; `/tmp/opentax-4972-participant-main-standard-oct6.log`. Its six generated packets match reviewed36pages byte-for-byte. Independent main actualsix-source replay terminal0 checks graph normalization and both native prepared representations separately, carry/origins/PDF/nativeonlyReturnTs/freshfullv5.4XSD and18originalJSON/PDF/XMLhashesunchanged; `/tmp/opentax-4972-participant-main6-held-oct6/report.json`. Main actual95legacy replay terminal0, `/tmp/opentax-4972-participant-main95-replay-oct6.json`, exactwholepending/PDF/nativeexceptReturnTs andall293JSON/PDF/XMLhashes unchanged before/after. Older95wrappers lackcarry; no95carrycomparison orfresh95XSD result is claimed. Sevenproductionhashes remained held throughout. Main95preservation297files, ordinary23files, worker122 andcorrection20files are retained separately in private research. Ledger1540 records this bounded distinctparticipant/sharedemployerplan source route. Three/fiveparticipant paper/native overflow, widerAMT/authentication/IRSacceptance remain existingopen requirements.

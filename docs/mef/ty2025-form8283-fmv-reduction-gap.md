# TY2025 Form 8283 FMV-reduction statement

## Purchased short-term Section B art at $20,000 or more (2026-10-01, unrun)

The bounded purchased short-term tangible-property route now includes one
artwork with appraised FMV above the basis-limited claim of at least $20,000.
The reviewed source requires a purchase/basis PDF, complete signed qualified
appraisal PDF, FMV-reduction computation PDF, completed signed Form 8283 PDF,
and distinct appraiser and donee signature PDFs. It ties short-term appreciation
removed under section 170(e)(1)(A) to appraised FMV minus basis; the claim must
equal basis. The native form reports original appraised FMV separately from the
reduced claim and links all six distinct reviewed documents. Schedule A and
Form 1040 must reconcile to the same one-gift source; the official PDF preview
prints the art-at-least-$20,000 box, both values, appraiser/donee facts, and a
supplemental explanation. A $25,000 FMV/$22,000 basis example and altered
reduction, appraisal, and signed-form byte rejection fixtures are authored but
unrun. This does not verify signatures or
appraisal content automatically; document review remains required. Other
Section B reduction reasons, multi-item forms, and carryovers stay closed.

## Donor-prepared Section A manuscript reduction (2026-10-01, unrun)

[Publication 526 (2025)](https://www.irs.gov/publications/p526) explicitly
identifies manuscripts prepared by the donor as ordinary-income property.
The bounded Section A route now takes one donor-prepared manuscript with a
2025 contribution, original FMV no more than $5,000, substantial-completion
date, preparation record, capitalized-cost record, and confirmation that those
basis costs were not previously deducted. It requires a 50%-limit donee,
no vehicle or competing reduction reason, and a claim equal to adjusted basis
below FMV. Native Form 8283 links the reduced column (h) amount to a separate
statement showing the original FMV, hypothetical ordinary gain removed under
section 170(e)(1)(A), both record references, and basis claim. The PDF prints
the same reason. Complete current-gift Schedule A and Form 1040 itemized
deduction reconciliation is required. Positive and source-tamper native/PDF
fixtures are authored but unrun. The preparation and cost references are
reviewed structured facts, not authenticated record bytes; Section B manuscripts
and later-year carryovers remain closed.

## Section A unrelated-use tangible property (implementation staged 2026-10-01)

The [2025 Form 8283 instructions](https://www.irs.gov/instructions/i8283)
and [Publication 526](https://www.irs.gov/publications/p526) reduce an
appreciated long-term tangible-personal-property gift to basis when the donee
puts it to an unrelated use. A separate bounded Section A route now requires a
purchased nonvehicle gift with original FMV no more than $5,000, a 50%-limit
donee, purchase and donee-use record references, an explicit unrelated-use
review, and a claim equal to adjusted basis below FMV. It does not use the
return-wide 50%-limit capital-gain election. The source produces a distinct
native FMV-reduction statement, PDF explanation, and current-gift Schedule A
and Form 1040 reconciliation. Positive and mismatched-source fixtures are
authored but unrun. The underlying purchase and donee records are not byte
authenticated; Section B, later donee disposition, and other reduction reasons
remain open.

## Donor-created Section A artwork reduction (implementation staged 2026-10-01)

The 2025 [Form 8283 instructions](https://www.irs.gov/instructions/i8283)
identify donor-created artwork as ordinary-income property and use its
substantial-completion date in the acquisition-date column. A separate bounded
Section A source route now requires a creation record, a capitalized-cost
record, confirmation that those basis costs were not previously deducted, and
confirmation that the entire hypothetical FMV-sale gain would be ordinary.
It requires a nonvehicle 2025 gift with original FMV no more than $5,000,
adjusted basis equal to the claim below FMV, and a 50%-limit donee category.
The native FMV statement names the creation and cost records, ordinary gain
removed under section 170(e)(1)(A), and basis claim; the PDF uses the same
explanation. Complete current-gift Schedule A and Form 1040 reconciliation is
required. Native and PDF fixtures are authored but unrun for the bulk pass.
The record identifiers and taxpayer confirmations do not authenticate the
underlying creation or cost bytes. Other creator property and Section B remain
outside this route.

## Purchased Section A inventory reduction (implementation staged 2026-10-01)

A distinct Section A route now identifies purchased inventory held for sale to
customers, a purchase invoice reference, and an inventory cost-record
reference. The source confirms that a hypothetical FMV sale would produce only
ordinary gain and that no other reduction reason applies. The bounded route
requires a nonvehicle gift with FMV no more than $5,000, a 50%-limit donee
category, a 2025 contribution, and a claim equal to cost below FMV. It uses
the complete current-gift inventory and Schedule A/Form 1040 reconciliation.
Native Form 8283 links column (h) to a separate `FairMarketValueStatement`
that explains the FMV, ordinary gain removed under section 170(e)(1)(A),
invoice and cost-record references, and resulting basis claim. The PDF uses
the same reason and prints the basis claim. Native and PDF source fixtures are
authored for the bulk verification pass; tests, XSD, and PDF review have not
yet run for this slice. The references and verified assertions are source
fields, not authenticated invoice or ledger bytes. Section B inventory and
other special reduction reasons remain outside this route.

## Bounded Section A election return review (2026-09-30)

The synthetic `single-section-a-capital-gain-reduction-gift` fixture now runs
through the finalized return graph, TY2025 v5.4 MeF XML, and filled PDF. A
purchased collectible coin with $4,500 original FMV and $3,000 adjusted basis
produces a $3,000 Section A column (h) amount linked to a native
`FairMarketValueStatement`. The statement computes the $1,500 reduction and
names the 50% AGI-limit election. Schedule A line 12 is $3,000 and Form 1040
line 12e is $39,000, including $24,000 state tax and $12,000 mortgage interest.
The five-page filled PDF was rendered and visually checked: Form 8283 prints the
donee, property, dates, basis, reduced claim, and a separate matching FMV
explanation; Schedule A and Form 1040 show the same totals. The focused fixture
passes local TY2025 v5.4 XSD validation and checks its native link, statement,
Schedule A, and Form 1040 amounts. The focused Form 8283 source, native, and PDF
suites passed 93 tests. The PDF reviewed here has SHA-256
`ea7556683edb34931ef0e43a1756657868ae9724bbb565ab793276debecc3469`. This
synthetic case does not verify a taxpayer's valuation, basis, donee, or
election, and does not open the other reduction reasons or carryover routes.

## Two purchased short-term Section A gifts (2026-09-30)

The non-election purchased short-term reduction now uses the same complete
current-gift inventory, finalized Schedule A, and itemized Form 1040
reconciliation in native Form 8283, Schedule A MeF, and the PDF. A synthetic
two-print return claims $700 for each $1,000 original FMV gift, links each
reduced column (h) amount to a distinct native FMV statement, and retains the
second gift's item B label in both statements. Local TY2025 v5.4 full-return
XSD passed. The five-page filled packet was visually checked: both rows show
$700, the supplemental page explains both $300 reductions, Schedule A line 12
shows $1,400, and Form 1040 line 12e shows $37,400. The reviewed PDF has
SHA-256
`b81969831c5c5629da73fc85d748a3f7355cbad591416bac890f751fe1a83537`.
Native Form 8283 and Schedule A reject a mismatched filed amount in focused
checks. This synthetic source does not verify the taxpayer's purchase, holding
period, valuation, or donee record, and does not cover other reduction reasons.

The separate
[prior-year carryover attachment gap](ty2025-form8283-carryover-source-gap.md)
now has one bounded, unverified native Section A and reviewed-PDF route. Other
carryover variants remain fail-closed.

The
[2025 Form 8283 instructions](https://www.irs.gov/pub/irs-prior/i8283--2025.pdf)
require a statement showing the original FMV, the computation, and the reason
whenever Section A column (h) is reduced below FMV.
[Publication 526 (2025)](https://www.irs.gov/publications/p526) says the
election to use the 50% AGI limit for capital-gain property given to a 50%-limit
organization reduces FMV by the long-term appreciation. The election applies to
all such gifts in the tax year, including relevant carryovers.

The native TY2025 v5.4 schema allows `FairMarketValueAmt` on Section A to
reference `FairMarketValueStatement`; that statement holds
`ShortExplanationTxt`. The existing implementation already covers
donee-certified vehicle sale proceeds and purchased short-term ordinary-income
property. A pure helper can calculate a bounded election statement for a
purchased, nonvehicle capital asset held more than one year. The input
identifies capital-gain property and a 50%-limit donee category, confirms the
election, supplies purchase/contribution dates and adjusted basis, and claims
exactly that basis below FMV. Election-tagged Section A gifts must have both
original FMV and a strictly lower claimed contribution; missing or unchanged
amounts cannot produce a statement. The statement shows the original FMV,
appreciation removed, adjusted basis, and reduced claim. Filing additionally
requires the reconciled source and native statement reference described below.

The `f8283` node routes elected current-property facts to Schedule A. Schedule A
requires the current noncash gift inventory to be complete and classified and
requires an explicit prior capital-gain-property carryover ledger (including
`[]` when none exist). Its current gifts carry per-property IDs, original FMV,
basis, and election state. The bounded calculation also requires affirmative
source facts that other prior charitable carryovers are absent and the ordinary
carryover rules apply. Unaffected Form 8283 gift routes remain open.
[Publication 526 (2025)](https://www.irs.gov/publications/p526) requires the
election across all current-year capital-gain-property gifts to 50%-limit
organizations and refigures prior carryovers: reduce original FMV by
appreciation, then subtract amounts actually deducted in prior years.

The bounded source model records each older property's original FMV, basis,
contribution year, and deductions already used. It calculates a refigured
carryover after current 50%-category gifts and cash, applying older properties
first. Pub. 526 expressly says not to use Worksheet 2 when a prior carryover
exists, so this is a separate calculation. Its published $27,000 FMV/$20,000
basis/$15,000 prior-deduction example produces a $5,000 refigured carryover;
with a $24,000 current reduced gift and $60,000 AGI, the focused unrun case
expects $24,000 on Schedule A line 12 and $5,000 on line 13. Mixed 20%/30%
categories with such a carryover remain fail-closed, as do special carryover
histories. The input's basis, holding period, donee category, and election need
external verification. Other unrelated-use tangible-property variants, foundation gifts,
intellectual property, taxidermy, recapture, combined vehicle sale/appreciation
reductions, and Section B reduction statements remain separate unsupported
paths. Full MeF XSD, business-rule, PDF, and return-batch validation remain
pending.

## End-to-end blocker audit (2026-09-28)

The new ledger and complete-inventory fact establish an explicit return-wide
source boundary, not independent verification that every gift or historical
deduction was supplied truthfully. Pub. 526 lists married-status/spouse changes,
NOLs, standard-deduction years, and surviving-spouse cases as special carryover
rules. The bounded path requires an affirmative ordinary-rules fact for every
older property; those special histories need a separate supported calculation.

The bounded **current-year Section A MeF** route now requires the same pending
Form 8283 source as the filed descriptor, an itemized Form 1040 with matching
AGI, a complete Schedule A gift inventory, an explicitly empty prior
capital-gain-property carryover ledger, no Section B items, exact Form 8283 gift
IDs and amounts in that inventory, and Schedule A lines 11–13 reproduced by its
source calculator. Every reduced elected item needs a distinct native
`FairMarketValueStatement` document ID; Section A column (h) links to that
statement and prints adjusted basis. Schedule A MeF opens only through that same
reconciliation. Focused positive and fail-closed cases are written but unrun.

The follow-up native-statement pass applies this same return-wide reconciliation
when the elected `FairMarketValueStatement` descriptor is invoked directly,
before it emits a statement. It also requires distinct, nonblank linked
statement IDs for **all** Section A reductions, not just elected gifts; two
ordinary-income reductions can no longer point to one native statement. Focused
elected-source mismatch and duplicate-ID cases are written but unrun.

For the non-election purchased short-term route, the source must also identify
the donee and address, describe the property, give acquisition and contribution
dates, purchase method, adjusted basis, and an FMV method. The existing
calculation requires the claim to equal basis below original FMV. Both native
Form 8283 and the direct `FairMarketValueStatement` descriptor reject an
incomplete source; when bundle IDs are available, the direct descriptor also
requires one distinct, nonblank statement ID per reduced Section A item. The
Form 8283 column (h) references each statement in item order. Focused source,
calculation, and link cases are written but unrun. These fields remain supplied
facts, not independent proof of acquisition, valuation, or donee identity.

The elected Section A source gate now also requires nonblank donee name and
address, property description, contribution date, acquisition date/method and
basis for the over-$500 gift, and a valuation method. These are printed Section
A columns (a), (c)–(g), and (i) on the
[December 2025 form](https://www.irs.gov/pub/irs-prior/f8283--2025.pdf); the
[2025 instructions](https://www.irs.gov/pub/irs-prior/i8283--2025.pdf) require
the section to be completed and a reduction statement for column (h). The
existing statement retains original FMV, the dollar reduction and its reason,
while native Section A column (h) remains the reduced claim. Positive and
missing-field cases are written but unrun. This gate checks presence, not the
independently unverified truth or descriptive sufficiency of a valuation.

The route remains incomplete beyond that narrow MeF slice. The 2025 instructions
put appraised FMV in Section B column (c), and local v5.4 links
`FairMarketValueStatement` from Section A only; Section B must keep appraised
FMV separate from its reduced deduction, without inventing an XML statement
link. One bounded Section B election route now accepts a single purchased,
unimproved investment-land gift held more than a year with appraised FMV above
adjusted basis, a deduction equal to basis, a qualified appraisal, and signed
appraiser and donee copies. It requires a supplied PDF described exactly as
`Form 8283 Section B FMV reduction statement`, showing original FMV, basis,
long-term appreciation removed, and the reason for reduction. Native Form 8283
retains the appraisal in `AppraisedFairMarketValueAmt`, puts basis in
`DeductionClaimedAmt`, and links that PDF as a `BinaryAttachment`. It also
requires the complete current-gift Schedule A inventory, itemized Form 1040,
empty prior-carryover ledger, and recalculated Schedule A lines 11–13. Source,
native, and rejection cases are written but unrun. The supplied PDF's contents
and the underlying appraisal, signatures, holding period, and basis still need
document review; a filename and description do not prove their truth. The
Section B reduction PDF now requires a named reviewer and date, affirmative
review of its original FMV, basis, appreciation computation, and election
reason, and a SHA-256 digest of the reviewed PDF. The MeF bundle checks that
digest against the exact attachment bytes and requires this PDF to be separate
from the signed Form 8283 and signature excerpts. This is a source-review gate,
not automated verification of the appraisal or tax facts. Focused mismatch and
missing-review cases are written but unrun.

At that implementation stage, other Section B items with a claimed amount below
appraised FMV stopped at native export. The bounded land election then was the
only Section B reduction with a sourced computation and reviewed statement PDF;
another reduced Section B gift could not be filed as if its FMV were unreduced.
A focused rejection case is
written but unrun. Positive Section B fixtures that did not intend a
property-level reduction now use equal appraised FMV and claimed amount. This
does not implement inventory, recapture, unrelated-use, or other Section B
reduction reasons.

The canonical December 2025 Form 8283 PDF now has bounded Section A and Section
B election field maps. It prints filer identity and up to four reconciled
current-year Section A gift rows on page 1, followed by a supplemental
FMV-reduction explanation. One standalone current-year Section B investment-land
election prints on both official pages, with appraised FMV and claimed deduction
kept separate. Its supplemental preview states that the required signed
appraiser/donee PDFs and reduction statement are separate attachments; it is not
a signed paper form. For Section B MeF filing, a reviewed completed signed Form
8283 is additionally required as a distinct PDF. Its source review records the
reviewer, review date, signature/data checks, and SHA-256 of the submitted
bytes; the bundle verifies that digest and links the PDF to the IRS8283
document. Form 8453 mailing is not an implemented alternative in this export.
Schedule A PDF calls the return-wide election reconciliation before printing the
deduction. At that checkpoint, the descriptor rejected other Section B routes,
mixed Section A/B, more than four Section A items, vehicles, missing return-wide
source, and non-election routes rather than printing a partial form. Mapping and negative
cases are written but unrun; the filled PDF has not been rendered or visually
checked. The
[Form 8283 instructions](https://www.irs.gov/pub/irs-prior/i8283--2025.pdf) also
require filing the form in a section 170(d) carryover year, so each deducted
older property needs a carryover-year Form 8283 document, not only a Schedule A
line 13 amount. The next build must cover other Section B paths, signed PDF
composition, carryover-year Form 8283 documents, other vehicle and Section A PDF
routes, and continuation pages. No tests, typecheck, XSD validation, or
filled-PDF rendering ran in this pass.

The Section A PDF preview now also accepts a mixed, non-election set containing
at least one purchased short-term reduced gift and a fully sourced unreduced
companion. The companion is a nonvehicle, noncapital purchase with a 2025 gift
date, basis at least FMV, a claim exactly equal to FMV, and complete printed
donee/property/acquisition/valuation facts. It gets a Section A row but no
reduction statement. The reduced gift keeps its original property letter in the
PDF explanation and native `FairMarketValueStatement`, even when an unreduced
row precedes it; only the reduced item consumes a native statement ID. This
follows the
[2025 Form 8283 Section A column (h)
instructions](https://www.irs.gov/instructions/i8283), which call for the
statement when the contribution amount is reduced below FMV. Focused mixed
preview, native-link and incomplete-companion cases are written but unrun. This
adds no full Schedule A reconciliation for non-election gifts, no Section B
mixed layout, and no new reduction reason.

The current Schedule A `capital_gain_property_carryovers` ledger contains the
original year, FMV, basis, and previously deducted amount. By itself it cannot
complete the required carryover-year Form 8283 because it lacks property, donee,
acquisition, contribution, and valuation facts. The bounded reviewed source and
PDF join described in the
[carryover source gap](ty2025-form8283-carryover-source-gap.md) now supplies
those facts for one Section A publicly traded securities gift. The Schedule A
MeF descriptor still refuses a nonempty ledger without that matching Form 8283
source. Other carryover properties, required appraisals, and multiple gifts
remain blocked. See
[2025 Form 8283 instructions, When To
File](https://www.irs.gov/pub/irs-prior/i8283--2025.pdf) and
[2025 Pub. 526](https://www.irs.gov/pub/irs-prior/p526--2025.pdf).

The instructions' "Noncash Contributions Carried Over to Later Year" section is
more specific: attach a completed copy of the previous-year Form 8283 for each
carried contribution, plus the appraisal copy if that appraisal had to be
attached to the earlier return. No actual taxpayer's filed copy or appraisal is
in the workspace. The bounded route requires an externally supplied prior PDF
with reviewed source fields and byte hash. A newly generated current-year PDF
alone does not establish what was filed in the previous year.

For a Section A vehicle sale with proceeds below original FMV, the native
reduction statement now requires the printed Form 8283 donee, property,
acquisition, contribution, basis, and valuation-method facts. The donee name and
address must agree with the supplied donee-certified sale acknowledgment; the
source cannot attach a correct proceeds statement to an incomplete or
contradictory Form 8283 row. Focused positive and rejection cases are written
but unrun. Other vehicle exception and special-reduction routes remain bounded
as described above; this check does not independently authenticate the PDF.

## Remaining reduction-route audit (2026-09-28)

No additional positive FMV-reduction route was opened in this pass. The
[December 2025 instructions](https://www.irs.gov/pub/irs-prior/i8283--2025.pdf)
require the deduction for ordinary-income property to exclude the amount that
would be ordinary income or short-term gain on a hypothetical FMV sale. For
capital-gain property, separate reductions may apply to private-foundation
gifts, intellectual property, taxidermy, unrelated-use tangible property, or
property disposed of by the charity without the required exempt-use
certification. A reduced Section A column (h) needs the original FMV,
computation, and reason in a statement; Section B still prints appraised FMV and
the reduced claimed deduction in separate columns.

A purchased short-term Section B tangible gift is the narrowest plausible next
case: an appraised value above basis would ordinarily reduce the claim to basis.
The present Section B schema, however, has no typed short-term ordinary-income
route or fact proving that the property was a capital asset with no
depreciation/recapture or inventory treatment. Its reviewed reduction PDF and
byte-digest contract is land-election-specific, as are the native Section B
acceptance check, Schedule A/return reconciliation, PDF property type checkbox,
and supplemental explanation. Reusing that election flag or changing only the
explanation would misstate why the deduction was reduced. An independent
positive route must first bind acquisition/basis and use history to the actual
qualified appraisal and signed donee Form 8283, review the ordinary-income
computation in a distinct statement PDF, and verify those attachment bytes. It
must then recompute the complete Schedule A gift inventory and Form 1040
itemized total, map every required Section B field, and preserve the distinct
signed-form/appraiser/donee attachments. No such taxpayer evidence or complete
source contract is currently available for this case.

Other Section A reasons need similarly specific source evidence: a
donee's actual unrelated or exempt use and any disposition/certification,
foundation status, intellectual-property basis, taxidermy costs, or a prior
filed Form 8283 and appraisal for carryovers. The current supported Section A
short-term, inventory, donor-created artwork, election, and certified-sale cases do not prove those facts by
analogy. These routes remain fail-closed rather than emitting a generic FMV
statement. This audit changed documentation only; no tests, typecheck, XSD
validation, or filled-PDF rendering was run.

## Section B source contract needed for the next reduction route

The current `sectionBItemSchema` distinguishes appraised FMV from the claimed
deduction, but only its purchased, unimproved investment-land election has a
typed reduction reason and a reviewed statement attachment. Its
`donee_acknowledgment.unrelated_use` boolean is not evidence of the donee's
actual use or a later disposal. The
[2025 instructions, FMV reductions](https://www.irs.gov/pub/irs-prior/i8283--2025.pdf)
distinguish ordinary-income property, unrelated-use tangible property, and
tangible property disposed of without an exempt-use certification. They also
require a statement showing how the reduction was figured. Section B line 3(c)
is the appraised FMV, while line 3(i) is the amount claimed; neither is a
substitute for the calculation statement.

| Candidate                                        | Missing typed source and reconciliation                                                                                                                                                                                                                                                                                                          | Required reviewed artifact                                                                                                                                                                                                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Purchased short-term tangible capital asset      | Identity-matched acquisition and contribution records, proof of basis and that the asset was held no more than one year, classification excluding inventory, creator property, and depreciation/recapture, and a hypothetical FMV-sale gain calculation. The existing Section A confirmation cannot be borrowed for an appraised Section B item. | Qualified appraisal covering that exact item; completed signed Form 8283; separate reduction statement identifying original FMV, basis, short-term gain removed, and reduced claim. Each PDF needs a reviewer, review date, byte digest, and distinct MeF attachment identity. |
| Long-term tangible property put to unrelated use | Evidence of the donee's actual use and why that use is unrelated to its exempt purpose, acquisition/basis and any ordinary-income recapture, plus reconciliation of FMV and the basis-limited claim. The current `unrelated_use` flag does not establish these facts.                                                                            | Qualified appraisal, completed signed Form 8283, donee-use evidence, and a separately reviewed computation statement, all tied to the same property and filed bytes.                                                                                                           |
| Tangible property disposed of by the charity     | Actual disposition date and terms, proof the statutory exempt-use certification was absent or inapplicable, basis and recapture history, and an item-level deduction recomputation. None of those are in the present item schema.                                                                                                                | Qualified appraisal, completed signed Form 8283, the donee's disposition/certification documents, and a separately reviewed computation statement, with distinct attachment identities.                                                                                        |

A future route must also join the item to the complete current-year Schedule A
gift inventory and Form 1040 itemized result, as the land election does, and
must retain the signed-form, appraiser, and donee evidence separately from the
reduction statement. The current native Section B builder correctly rejects a
claim below appraised FMV without the supported land-election reason. No new
positive Section B route can be asserted from the existing typed and reviewed
facts alone; these source and document contracts are the build prerequisite.

## Bounded purchased short-term Section B equipment (2026-10-01)

One current-year purchased equipment gift can now use a basis-limited claim
above $5,000 when the acquisition and contribution dates show no more than one
year of holding. The source requires an identified capital asset that was not
inventory, donor-created property, or subject to depreciation/recapture. Its
purchase/basis record, full signed qualified appraisal, completed signed Form
8283, and separate FMV-reduction computation each require reviewer/date and
SHA-256 evidence; appraiser and donee signature PDFs are separate. The reduction
statement must show original FMV, basis, removed short-term gain, and the claim.
Native filing checks the actual attachment digests, distinct document IDs,
and complete Schedule A inventory against the Form 8283 source and itemized
Form 1040 total. The PDF prints appraised FMV and basis-limited claim separately
and describes the reduction. A synthetic full-return positive, altered-PDF-byte,
and altered-Form-1040 fixture are authored but unrun. Actual taxpayer source
bytes and reviews are required before a real filing can use this route.
Other Section B variants, multiple gifts, other reduction reasons, and
carryover attachment combinations remain closed. This route follows the
[2025 Form 8283 instructions](https://www.irs.gov/pub/irs-prior/i8283--2025.pdf)
for ordinary-income-property reductions and signed Form 8283 attachments.

## Purchased short-term Section B art below $20,000 (2026-10-01)

The same reviewed-document and basis-limited route now accepts one purchased
art item with appraised FMV below $20,000 and a claim above $5,000. It retains
the capital-asset, holding-period, no creator/recapture, full appraisal, signed
Form 8283, purchase/basis record, and reduction-statement requirements. The
native form chooses the art-under-$20,000 property indicator and still requires
six distinct attachment IDs; the PDF prints that art checkbox and the reduced
claim. The complete Schedule A inventory and Form 1040 itemized total are
recomputed as for equipment. A synthetic full-return art fixture and an
out-of-range FMV rejection are authored for the deferred bulk pass. Art valued
at $20,000 or more, multiple items, donor-created art, and unrelated-use art
remain outside this route.

## Purchased short-term Section B collectible (2026-10-01, unrun)

The same reviewed-document and basis-limited route accepts one purchased
non-art collectible, such as a rare coin, when its claimed deduction exceeds
$5,000. A full qualified appraisal, completed signed Form 8283, purchase/basis
record, separate reduction computation, and distinct reviewed attachment bytes
remain required. The claim equals adjusted basis, and the FMV sale gain from
the short holding period is removed under section 170(e)(1)(A). Native Form
8283 selects `CollectiblesInd`; the PDF selects its collectibles box and keeps
appraised FMV separate from the claim. The full-return fixture covers Schedule
A, itemized Form 1040, native attachments, PDF projection, altered
reduction-PDF bytes, and altered Form 1040 itemization. Actual taxpayer
documents and source assertions still need review; long-term collectibles,
art, inventory, multiple gifts, and carryovers remain outside this slice.

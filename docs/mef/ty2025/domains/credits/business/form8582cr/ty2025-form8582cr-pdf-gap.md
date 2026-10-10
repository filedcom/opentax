# TY2025 Form 8582-CR PDF boundary

Status: a bounded source-backed Form 8582-CR PDF descriptor is registered for
current-year passive New Markets credit inventories from distinct
self-earned Form 8874 investments and reviewed partnership K-1 box 15
code AD or S corporation K-1 box 13 code AD sources in any mix. One passive
self-earned investment may also be paired with one distinct nonpassive Form
8874 investment when no K-1 credit enters the route. The ordinary route supports a complete reviewed inventory of positive
Schedule E passive rental income activities, including positive box 2/3 income on credit-bearing or separate income-only K-1s under the current-acquisition source contract. Other branches remain closed at PDF
export until their source, final-return, and carryforward joins are complete.

## Ordinary-tax filing route and historical implementation notes

The October10 checkpoint below supersedes the historical fifteen-source capacity
statements and unrun status for its five mixed K-1 cases. Other historical
source/authentication qualifications remain.

`form8582cr.line6_ordinary_worksheet` is a direct reviewed source record for
the ordinary-tax calculation, using either the legacy single rental or a complete
`passive_income_sources` inventory with activity IDs, owners, references and net amounts. The native and PDF exporters recompute
its taxable-income-with/without-passive tax pair from the finalized Form 1040
method, Schedule E rental ledger, Schedule 1, and filer status. The credit
activity may be distinct from the rental income activity: each
passive Form 8874 investment must exactly match one distinct Form 8582-CR
source's activity, source document, and current-year amount. Form 3800 Part V now uses continuation pages beyond fifteen sources. When there is only one passive
investment, one additional nonpassive investment on that Form 8874 enters
Form 3800 line 1i outside the passive Worksheet 9.
Alternatively, each partnership K-1 box 15 code AD or S corporation K-1 box
13 code AD must match one source's pass-through EIN/name, K-1 reference,
recipient TIN, passive classification, and current-year amount. All K-1
sources must have distinct activity and document references, and no K-1 may
remain unclaimed. Credit-bearing or separate income-only K-1s may carry reviewed positive box 2/3 rental income owned by the primary taxpayer; every such activity must match its retained source and line 6 inventory. Other income, deduction, or credit boxes remain outside this bounded route. No prior credit, PTP, special allowance,
additional passive income source, or Part VI election enters this route.
The [2025 partnership K-1 instructions](https://www.irs.gov/instructions/i1065sk1)
identify box 15 code AD as the New Markets credit, direct it to Form 8874 or
Form 3800 Part III line 1i, and require Form 8582-CR for passive credits. The
[2025 S corporation K-1 instructions](https://www.irs.gov/instructions/i1120ssk)
give the same filing directions for box 13 code AD. The
bounded pass-through route uses the direct Form 3800 path and does not attach
an unsourced individual Form 8874.

Both exporters re-derive the current-year Worksheet 9 ledger and match its
allowed/unallowed amount to line 37 and the Form 3800 passive allocation.
Form 3800 line 38, Schedule 3 line 6a/8, and Form 1040 line 20 must agree
with the allowed passive credit plus any one bounded nonpassive Form 8874
investment. The PDF prints Parts I and V: line 4a/4c, lines 5-7,
and line 37; unused special-allowance fields stay blank. Its AcroForm mappings
follow the official two-page blank, including page 2 `f2_21` for line 37.
The two-investment route also admits a partially allowed current-year passive
credit: its Worksheet 9 row retains the 2025 unallowed balance, Form 3800
line 1i uses the allowed passive amount beside the fully used ordinary amount,
and the final-return join uses their sum. This does not open a prior-year
carryover import or establish accepted-return evidence for future use.
The two-passive-investment route uses one sourced ordinary line 6 amount and
keeps separate 2025 Worksheet 9 balances by investment activity. Its $10,000
total credit is limited to $4,412; the two $5,000 source rows each retain
$2,206 allowed and $2,794 unallowed. Form 3800 Part III line 1i and its two
Part V details, Schedule 3, Form 1040, native XML, and the printable forms
reconcile to that $4,412 allowed amount. The full-return and source/prepared
activity tamper fixtures are authored for the deferred bulk validation.
The same direct source matching and proportional whole-dollar Worksheet 9
allocation now apply to three through fifteen distinct passive investments.
Three unequal credits exercise per-activity allowed/unallowed balances;
seven investments exercise the Form 8874 attachment; fifteen fill every
printable Form 3800 Part V row. A sixteenth activity is rejected at the
printable capacity boundary. These full-return/native/PDF and tamper fixtures
are authored but unrun.
The mixed pass-through route now joins a $5,000 partnership code AD credit
and a $2,500 S corporation code AD credit to one sourced ordinary line 6 of
$4,412. Their separate 2025 Worksheet 9 rows retain $2,941 and $1,471
allowed, with $2,059 and $1,029 unallowed. Form 3800 line 1i and two Part V
rows carry the distinct pass-through EINs; Schedule 3/Form 1040, native MeF,
and the PDF use the $4,412 allowed total. No individual Form 8874 is attached
for this bounded direct K-1 route. Full-return and issuer, recipient, extra-box,
and prepared-detail tamper fixtures are authored for deferred validation.
The same direct source reconciliation now covers up to fifteen credit-only
pass-through code AD K-1s, including multiple partnerships or S corporations
with distinct issuers and document references. A four-activity return with
three partnerships and one S corporation allocates $9,500 of credit against
$4,412 of sourced ordinary tax, retaining each activity's separate 2025
Worksheet 9 balance and Form 3800 Part V EIN. A fifteen-source return fills
the physical Part V capacity; a sixteenth source is rejected. Positive,
missing/changed K-1, prepared-detail, and capacity fixtures are authored but
unrun. [2025 Form 3800 instructions](https://www.irs.gov/instructions/i3800)
require Part V when a credit has multiple pass-through sources.
Self-earned and K-1 passive credits may now share the same Form 8582-CR
ordinary line-6 limit. In a three-source return, the $5,000 self-earned
investment and $2,500/$1,500 pass-through credits produce $9,000 before the
limit and $4,412 allowed. Their separate 2025 Worksheet 9 balances retain
$2,451/$1,226/$735 allowed. The attached Form 8874 prints $5,000 on line 1,
$4,000 of K-1 credits on line 2, and $9,000 on line 3; Form 3800 Part V
retains its IRS8874 document reference only for the self-earned detail and
the issuer EINs for K-1 details. A second full-return fixture combines two
self-earned investments and three K-1s. Source-amount and prepared-detail
tamper cases are authored but unrun. A nonpassive investment alongside K-1
credits, K-1 boxes other than the reviewed positive box 2/3 extension below, Form 3800 tax-use restrictions below the allowed
passive credit, and prior-year carryforward imports remain closed.
Full-return/native/PDF fixtures for all three source kinds and source, credit, tax,
and return-tamper fixtures are authored for deferred validation.
The [2025 IRS instructions](https://www.irs.gov/instructions/i8582cr) direct
the same Form 1040 tax method for both line 6 worksheet tax calculations and
state that line 7 zero allows direct line 37 reporting; Worksheet 9 applies
when source credits remain unallowed. The retained current-year ledger covers
that latter case but is not yet an authenticated accepted-return record or
2026 importer. Source bytes, filled-output/XSD review, and wider credit or
income mixes remain open.

### Remaining native-only and rejected branches

The existing native builder can still emit broader `IRS8582CR` rows from
supplied tax values. The printable descriptor rejects these branches pending
their line 6 source, final-return tax method, or carryforward join:

| Native calculation branch | Printable gap |
| --- | --- |
| Other-category current-year credits from estate, trust, or cooperative K-1 sources; partnership or S corporation K-1s with other income, deduction, or credit boxes; or self-earned sources other than the bounded Form 8874 investments | Complete passive-income inventory, issuer evidence, and final-return line 6 join. |
| K-1s with other income/deduction/credit boxes, nonpassive investments beside K-1 credits, mixed passive/nonpassive sources beyond the one-investment pair, or mixed Form 3800 reporting lines 3, 24, and 33 | Per-activity Form 3800/Form 1040 tax-use proof for every source. |
| Prior-year unallowed credits in any category | Authenticated prior filed Worksheet 9 by origin year and activity, accepted-return reference, and current-year vintage allocation. |
| Active-participation rental, rehabilitation/pre-1990 housing, or post-1989 low-income housing credits | Parts II-IV MAGI, Form 8582 line 9, and tax-on-reduced-income worksheets with native/PDF parity. |
| Other tax methods, rental losses, K-1 income outside reviewed positive box 2/3, farm-rental passive income, and passive dispositions | Reperform line 6 under the actual finalized Form 1040 method and complete passive net-income set. |

Publicly traded partnerships are already rejected by the source schema.
Allowed Form 8834 credits are rejected by the native builder pending their
separate filing/tax limit. Estate/trust orphan-drug box 13 code M remains
rejected for absent reviewed passive-source evidence. These are not positive
native-only filing paths. The Part VI basis-increase election has no modeled
source and remains outside both exporters.

Estate and trust K-1 **box 13 code M is orphan-drug credit**; **box 14 code M
supplies clean electricity investment-credit information**, under the
[2025 beneficiary instructions](https://www.irs.gov/instructions/i1041sk1).
The box 13 orphan-drug claim through Form 8582-CR remains rejected at the
activity and required-source input because its reviewed source and passive
activity route have not been built. Native export repeats that gate. Rejection
fixtures are authored for the deferred batch. The distinct box 14 statement
feeds Form 3468 Part V and Form 3800 line 1v where supported.

The [official Form 8582-CR](https://www.irs.gov/pub/irs-pdf/f8582cr.pdf) is the
December 2024 revision used with the
[December 2025 instructions](https://www.irs.gov/instructions/i8582cr). The
two-page blank has Part I credit worksheets 1-4 and lines 5-7, special
allowances in Parts II-IV, allowed credit on line 37, and a separate
basis-increase election in Part VI. The current model has no Part VI election
source, so even a future bounded PDF route must reject that election rather than
silently leave it blank.

The official two pages were rendered and visually inspected on 2026-09-29.
Their canonical AcroForm contains 51 leaf fields: page 1 has filer name/TIN at
`f1_1`/`f1_2`, then 24 numeric fields `f1_3`-`f1_26` for lines 1a-16; page 2
has 21 numeric fields `f2_1`-`f2_21` for lines 17-37, then the Part VI box
`c2_01_0_` and four text fields `f2_22`-`f2_25` for lines 39-41. The logical
names have the `topmostSubform[0].Page1[0]` or `Page2[0]` prefix. This is a
field-location inventory; the bounded descriptor above now uses the verified
line order and page 2 line 37 field.

The native `IRS8582CR` builder recalculates Parts I-IV and line 37 from
`form8582cr.credit_sources`, `regular_tax_all_income`, and
`regular_tax_without_passive`. The bounded current-year sources are one passive,
self-earned Form 8874 investment, one credit-only partnership K-1 box 15
code AD, or one credit-only S corporation K-1 box 13 code AD. The native builder
can join the first to its attached Form 8874 and each pass-through source to
its issuer, recipient, reference, and reported credit. All three join
their allowed allocations to Form 3800. Form 3800 separately requires finalized Part II tax
context and a matching passive allocation. These joins do not prove the Form
8582-CR tax attributable to passive income on line 6:
`regular_tax_without_passive` remains an entered number in the general model.
The bounded ordinary-tax route above replays both tax sides against the same
final return and its identified passive rental income; other tax methods and
passive income sets remain unproved.

The [December 2025 IRS instructions](https://www.irs.gov/instructions/i8582cr)
require line 6 to use taxable income with and without net passive income, with
both tax amounts computed by the method used for the return. They also use
prior-year Worksheet 9 column (b) as the source for multiple unallowed
activities or credit types. The bounded current-year route preserves that
worksheet's activity/source identity and recomputes both tax sides from the
finalized ordinary-tax method.

The apparent zero-tax subset is not a safe shortcut. A positive source credit
with line 37 equal to zero becomes an unallowed passive activity credit. The
node currently returns only the scalar `suspended_pac_8582cr` carryforward; it
does not persist the activity, source document, original credit year, reporting
route or per-source suspended amount needed to use that credit in a later
return. A PDF-only success would mask that missing carryforward contract.

A versioned, storage-ready TY2025 Worksheet 9 result now exists for the
current-year-only subset. It preserves every activity's complete credit source,
Form 3800/8834 route, allowed and unallowed dollars, and 2025 origin year;
its schema reconciles all rows to line 5, line 37, and the suspended total.
It deliberately rejects any prior-year unallowed credit because the filed
prior Worksheet 9 and an ordering rule are still needed to assign allowed
amounts to vintages. This helper is not yet a persisted accepted-return record
or a next-year importer. Authored positive and tamper fixtures remain unrun.
The accepted-return import and wider line 6 sources still block broader
source-to-return parity.
The current source schema now requires whole-dollar tax values and rejects a
tax-without-passive amount above the all-income amount before the line 6
subtraction. This prevents an inverted input from being silently clamped to
zero; it does not establish either tax amount from the finalized return method.

The bounded route now uses the reviewed tax-without-passive worksheet and a
current-year per-activity ledger. Wider routes still need accepted-return
carryforward records, all passive-income sources, and a source-backed treatment
of special allowances and Part VI before their lines can print.

The prior audit added no PDF descriptor or print test. The bounded route above
adds both, authored but unrun; no typecheck, XSD validation, or filled-PDF
rendering has been run in this implementation pass.

## Ordinary-tax line 6 source implementation

A bounded worksheet now recomputes both line 6 tax sides using the same TY2025
ordinary Tax Table/Tax Computation Worksheet function as Form 1040 line 16.
It accepts one positive passive Schedule E rental activity, a retained income
ledger reference on that property, and final Form 1040 lines 8, 9, 11, and
14-16. Schedule 1 line 5 and line 10 must equal the activity's computed net
income; final taxable income and the all-income tax must match the filed
return. The worksheet subtracts that net passive income from taxable income
and independently computes the without-passive tax. It compares both results
to the Form 8582-CR tax pair, rejecting changed sources and tax amounts.
This follows the [2025 line 6 instructions](https://www.irs.gov/instructions/i8582cr),
which require the same tax method used for the return on both taxable-income
amounts. Positive and tamper fixtures are authored for deferred verification.

The worksheet is registered only for the bounded route above. The current
graph still does not prove an exclusive passive-income inventory across wider
Schedule E, K-1, Form 4835, property-disposition, and other sources, or persist
accepted-return Worksheet 9 balances. Preferential tax methods, special
allowances, PTPs, and Part VI remain closed.

### One taxable-interest source with the rental (2026-10-01, unrun)

The ordinary-tax line 6 route also accepts one retained Form 1099-INT with a
positive whole-dollar box 1 amount, payer, and source-document reference. It
requires no other 1099-INT boxes or adjustments, matches box 1 to finalized Form
1040 line 2b, and includes that amount in line 9 and in both ordinary-tax
calculations. The passive rental remains the only income removed for the
without-passive side, following the
[Form 8582-CR line 6 instructions](https://www.irs.gov/instructions/i8582cr).
The resulting credit still joins Form 3800, Schedule 3, Form 1040, native MeF,
and the two-page PDF. A positive full-return fixture and altered box 1,
unsupported box 3, filed interest, and final-tax fixtures are authored but
unrun. OID, bond premium, foreign interest, other
income types, and issuer-copy authentication remain outside this bounded branch.

### Distinct box 1 interest payers (2026-10-01, unrun)

The same Form 8582-CR line 6 route now sums any number of retained Form
1099-INT box 1 records with distinct payer TINs and source-document references.
Each record must have positive whole-dollar box 1 interest and no other boxes
or adjustments. The exporter compares the sum to finalized Form 1040 line 2b
and includes it in total income and both ordinary-tax calculations; only the
sourced rental income is removed for line 6's without-passive calculation.
Positive two-payer full-return/native/PDF and changed amount, duplicate copy,
duplicate payer, missing payer, unsupported box, and filed-interest fixtures
are authored for deferred validation. Issuer-copy byte authentication remains
outside this bounded branch.

### Two copies from one payer (2026-10-01, unrun)

The ordinary-tax branch now also accepts two Form 1099-INT box 1 copies issued
by the same payer for different accounts. Each row must carry a distinct
retained-document reference and account number plus an independent review of
that copy's document, account, and box 1 amount. The [Form 1099-INT
instructions](https://www.irs.gov/instructions/i1099int) require account
numbers when a payer files multiple copies for a recipient. Duplicate
document/account identities, different payer names for one TIN, other interest
boxes, or mismatched reviewed amounts close the route. A 2025 fixture joins
$600 and $400 from one payer to Form 1040 line 2b and applies the same ordinary
tax method to Form 8582-CR line 6 with and without the separately sourced
rental income; Form 3800, Schedule 3, Form 1040, native MeF, and PDF must agree
on the $500 allowed credit. Positive and duplicate/amount/return tamper cases
are authored but unrun. Account and document references remain reviewed source
assertions; retained issuer bytes are not authenticated.

## 2026 opening credit prerequisite

The current-year-only Worksheet 9 ledger now has a strict, standalone 2026
opening contract. `reconcileForm8582CRNextYearOpening` re-derives the 2025
ledger from its original Form 8582-CR input, compares it to the recorded filed
ledger and accepted-return reference, then requires every positive unallowed
credit to appear exactly once with the same activity, source document, credit
route, 2025 origin, and amount. Missing, duplicate, changed, or extra rows
reject. Positive and tamper fixtures are authored for the deferred batch.

The accepted-return reference is still a supplied identifier, not verified IRS
acknowledgment evidence. There is no durable store or 2026 engine importer;
prior-year Worksheet 9 credits that originated before 2025 remain closed.
The bounded 2025 PDF route does not create an authenticated 2026 opening.

## Reviewed 2023/2024 activity-vintage opening candidate (2026-10-01, unrun)

The [2024 Form 8582-CR instructions](https://www.irs.gov/pub/irs-prior/i8582cr--2024.pdf)
derive the unallowed credit for a single activity/type from prior lines 5 less
37; multiple activities use prior Worksheet 9 column (b), with column (a)
equal to allowed column (c) plus unallowed column (b). The standalone candidate
now follows one self-earned Form 8874 New Markets credit originating in 2023
through the 2024 Worksheet 9 beside a distinct 2024-origin Form 8874 activity.
It requires a reviewed single activity/type for 2023, binds that year's line
5/37 difference to the 2024 carried row, reconciles
both 2024 rows' columns (a)/(b)/(c) to prior lines 5/37, and requires exactly
those two activity, source, document, reporting-route, origin-year, and dollar
amount rows in the 2025 Form 8582-CR input. It previews 2025 Part I lines
4b/5/37 and per-source Form 3800 passive allocations. The packet retains
reviewed 2023/2024 return and Form 8582-CR copy references, taxpayer TIN, and
an explicit no-recapture/bankruptcy-transfer review. Positive and tamper
fixtures for both vintages, Worksheet 9, return totals, activity, and taxpayer
are authored.

This replaces the earlier one-activity candidate shape. Copy references and
review assertions do not establish accepted IRS returns or match the copies
to accepted bytes. No authenticated acknowledgment/status parser or accepted
prior-return importer exists, so the candidate is not passed to native or PDF
export and does not open a Form 3800, Schedule 3, or Form 1040 claim. The
bounded ordinary PDF route still rejects prior credits; the general native-only
shape remains an audit gap, not evidence of complete filing support. Same-
activity mixed vintages and other credit categories remain outside this
candidate.


## October6 passive-credit packet omission repair and shared review

Shared fullgraph review exposed two missing8582CR pages: descriptor includeWhen tested rawcredit_sources after projecting scalar filedlines. Replace inclusion condition with validated projectedline5 positive; retain whole source/native/final-return projection guards. Existing partnership test now asserts exactlytwo realForm8582CR PDForigins, reusing the exact same filer timestamp during preparation/rendering. Finalsource26/0 (18s), typedfixture/source/descriptorcheck andlint/diffclean. Source tests share unchanged single/mixedK1 publicinput helpers with the catalog. Logs `/tmp/opentax-8582cr-catalog-source-fixed-v2-oct6.log`, `/tmp/opentax-8582cr-catalog-final-typecheck-oct6.log`. Earlier26/0 did not cover missingpagepresence; diagnostic25/1 was timestamp mismatch in newly authoredtest, repaired without changing productionguards.

Two actual full-local2025v5.4XSD packets18+18=36pages generated at `/tmp/opentax-8582cr-catalog-review-v4-oct6`, all36 visually reviewed across9sheets in `/tmp/opentax-8582cr-catalog-rendered-oct6`. Completed read-only source/artifact/native/PDF/XSDchecker2/36 passes `/tmp/opentax-8582cr-catalog-check-v2-oct6.log`; completedmanifestSHA8ee667879bd92b0af1d7e9c13966c2c52377eb7a2b819c79ab19708ff3bc12bd. PDFSHAs9c5a6be182e14e462575c0711f9dc47dc1155e801d34836953a50f8e719b26d9 / e238df97254ff25d44beb04e69cd6a3fd86a1990e8618a709d31b51f8ffdbcb2. Single500credit→1040tax17367/owed1367; mixedpartnership5000+Scorp2500→allowed4412/unallowed3088, PartVrows2941/1471, finaltax13455/refund2545. Wage100000/rental20000/AGI120000/taxable104250/regular17867/passivetax4412 andTMT8294/AMT0 match native andpaper. Singleentity is reported directlyPartIII, mixed usesPartV; unusedPartsIV/VI blank. ActualRevDec2024two-page8582CR applies here.

Failed sharedv1 wrongform3800key, v2 missingexpected6251, v3 actualmissing8582CR and initialincompletechecker are retained diagnostics; v4 pluscompletedchecker govern. Older missing-form packets are not preservation proof. Registereddescriptors151native/118PDF unchanged; actualplanner369fixtures/99covered/16uncovered `/tmp/opentax-pdf-planner-8582cr-catalog-oct6.json`. This closes existing packet omission and selectedreview gap only: authenticated prioracceptedreturns/carryovers, direct8874issuerbytes, otherpassiveincome/specialallowance/IRS parent stillopen. Ledger1473/frozen52/future unchanged. V6immutable69dab5754 is live and predates this repair; a passing full run including latestproduction remains required.


October8 one-partnership passive new-markets packet: all18 retained pages reviewed;500 source credit joins Form8582-CR passive limit4,412, Form3800 PartIII1i/PartI3 and Form1040 amount owed1,367. Public/native replay reproduces XML exactly and full local XSD passes; recipient and amount conflicts reject. Worksheet9/PartV review-note claims are future-only metadata corrections; issuer authenticity and wider routes remain unproved. See [qualified evidence](../../../../readiness/ty2025-readiness-execution-2026-10-07.md).


October8 mixed partnership/S-corporation review: all18 retained pages inspected;7,500 current credit allocates4,412 allowed/3,088 unallowed across distinct entity rows. Partnership allowed2,941/unallowed2,059 and S corporation1,471/1,029 reconcile independently with Worksheet8/9 arithmetic, two native/PDF PartV EIN rows and Form1040 refund2,545. Source recipient/omission conflicts reject, exact native replay/full XSD pass. Worksheets are retained arithmetic JSON, not printed/authenticated records; accepted carry and issuer authenticity remain unproved. See [qualified evidence](../../../../readiness/ty2025-readiness-execution-2026-10-07.md).

## October 10 complete passive-credit inventories and continuation pages

The ordinary passive-credit route no longer treats the fifteen rows on one
Form3800 PartV page as a filing limit. Form8582-CR and the Form3800 PDF now
allow all reconciled current-year sources through the existing continuation
builder. Per-source issuer/recipient, passive classification, amount, document,
Worksheet9 allocation, final tax and detail-count checks remain. Unmatched
additional sources still reject. This does not open other income methods,
prior-year imports, credit categories or unauthenticated direct Form8874 filing.

Five public complete-return cases use15,16,30,31 and46 mixed partnership/S
corporation codeAD sources, with their reviewed source order reversed relative
to the K-1 inventory. Fully allowed and tax-limited cases cross one through four
PartV pages. Wages100000 plus rental20000 produce taxable104250 and ordinary
tax17867; without passive income, TaxTable income84250–84299 gives13455,
so the passive-credit limit is4412. Independent integer allocation retains
all138 sources and their current-year unallowed amounts.

| Sources | Total credit | Allowed | Passive unallowed | Final tax | Packet pages |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 15 | 1605 | 1605 | 0 | 16262 | 18 |
| 16 | 1720 | 1720 | 0 | 16147 | 19 |
| 30 | 15435 | 4412 | 11023 | 13455 | 19 |
| 31 | 15965 | 4412 | 11553 | 13455 | 20 |
| 46 | 5635 | 4412 | 1223 | 13455 | 21 |

The five focused tests pass (44s); final grouped typed regression73/0 (20s).
Forty native and40 freshly hashed PDF mutations reject, including late-source
recipient/amount/removal, source reference, reviewed tax, rental and final credit
drift. All five complete returns pass local TY2025v5.4 XSD. Both archive layers
preserve the exact XML/manifest;20 missing/altered variants reject. Synthetic
package identifiers are local only; no transmission or acknowledgment exists.

All97 packet pages were rendered and observed:53 unique pages on14 inspected
sheets plus44 exact pixel duplicates. All138 source EINs and before/after-passive
credit amounts reconcile in native detail and12 printed PartV pages. Final
packets have zero Widget annotations and no AcroForm. Existing26/68/76/84
qualify the packets: skipped Form3800 SectionB values, OWNER ALEX versus
Alex Owner names, blank required zeros and omitted native Form6251 line1a.
No clean presentation approval or new deferred item is claimed. Business totals
now122 XSD-valid complete returns/2367 observed pages; PartVI37 roots/17 pages
remain separate.

Evidence: `.state/research/form8582cr-overflow-2026-10-10/` retains original
inputs, pending/native/PDF, Worksheet9 ledger, archive layers, request/manifest,
independent arithmetic and native/printed row checks, XSD logs, typed logs,
source/packet/pixel hashes and visual qualifications. Prior head2589a0c24 passed
CI38030409197. This completes the current-source capacity extension, not the
broader Form8582-CR/Form3800 main tasks or IRS business-rule acceptance.

Sources checked: [Form8582-CR instructions](https://www.irs.gov/instructions/i8582cr)
and [Form3800 instructions](https://www.irs.gov/instructions/i3800).

## October 10 complete passive rental income inventories

The ordinary Form8582-CR route now reviews all entered positive passive residential
rentals rather than requiring exactly one. A strict inventory records each activity
ID, owner, document reference and net amount. Every ScheduleE row must match once;
reordering is accepted, duplicate/missing rows and offsetting per-row amount drift
are rejected. The legacy one-rental source contract remains supported. Rental
expenses, aggregate Schedule1 income, both ordinary-tax sides, credit allocations,
Schedule3 and final Form1040 tax reconcile through the complete return.

The [Form8582-CR line6 instructions](https://www.irs.gov/instructions/i8582cr)
require the difference between tax with and without net passive income, using the
return's applicable tax method. Independent arithmetic and the [2025 Tax Table
and Computation Worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf) agree:
single taxable84250 yields13455; taxable94250 yields15655; higher tested taxable
amounts use24% less7153. No new tax method or loss/disposition route is claimed.

| Rentals | Net rental income | Credit sources | Total credit | Allowed | Passive unallowed | Final tax | Pages |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | 10000 | 2 | 201 | 201 | 0 | 15454 | 18 |
| 3 | 20000 | 15 | 1605 | 1605 | 0 | 16262 | 18 |
| 4 | 30000 | 16 | 8120 | 6812 | 1308 | 13455 | 20 |
| 7 | 20000 | 31 | 15965 | 4412 | 11553 | 13455 | 22 |

Seven focused tests pass, followed by73 related typed regression tests. All64
native and64 freshly hashed prepared-PDF mutations reject, including missing,
duplicate, wrong-owner and wrong-reference rental reviews; source amounts shifted
between rentals without changing total income; K-1 identity/amount changes; and
final credit/tax drift. Four complete returns pass the retained TY2025v5.4 XSD.
Both local archive layers retain exact XML/manifest bytes and16 missing/altered
variants reject. Package identities are synthetic; nothing was transmitted.

All78 pages were rendered and observed:60 unique pages across15 inspected sheets
plus18 exact pixel duplicates. Independent native and printed-cell checks retain
all16 rental addresses, gross rents, insurance, repairs and net amounts, and all64
credit-source EINs and before/after-limit amounts. There are seven ScheduleE pages
and seven Form3800 PartV pages. Final packets have no Widget annotations or
AcroForm fields. Existing26/68/76/84 still qualify the packets: Form3800 skipped
SectionB values, OWNER ALEX name order, blank required zeros and omitted native
Form6251 line1a. This is not clean presentation approval.

The original seven-rental/40000-net-income case remains preserved separately:
Form8582-CR allows9212 but Form3800 allows9173 after tentative minimum tax13494.
Native and the Form8582-CR PDF descriptor reject the differing limits; full PDF
export cannot obtain a prepared bundle. New future item142 records this separate
limitation/carryforward reconciliation, left unimplemented. Its source was not
replaced by the independent supported20000-net-income seven-rental case.

Evidence: `.state/research/form8582cr-rentals-2026-10-10/` retains source and
pending records, ledgers, XML/PDF, archive/request/manifest bytes, XSD and test logs,
independent verification, blocked source/exports, hashes and visual qualifications.
Runtime hashes were unchanged across final checks. This advances existing passive
income, business-credit and full-return tasks; it does not close their broader
52 parent TODOs or establish IRS business-rule acceptance. Business checkpoint
totals are126 XSD-valid complete returns/2445 observed pages; separate PartVI
37 roots/17 pages remain unchanged. Current PR71 adds four returns/78 pages.

## October 10 reviewed K-1 rental income inventories

The ordinary line 6 route now admits primary-taxpayer-owned positive rental
income from box 2 and/or box 3 on partnership and S corporation K-1s that also
supply the already-supported New Markets credit. It reuses the existing
current-acquisition passive activity source contract: issuer/recipient, issued
K-1 and activity-statement references, participation record, acquisition year,
no prior passive loss and non-PTP status. Direct Schedule E rentals and K-1
activities form one exact inventory; each worksheet row matches owner, activity,
source reference, amount and, for K-1s, entity kind/EIN. The tax pair is recomputed
from the final return. Reversed source ordering does not change matching.

| Case | Credit K-1s / income K-1s | Passive income | Credit / allowed / unused | Final tax | Evidence |
| --- | --- | --- | --- | --- | --- |
| Four-row boundary | 4 / 4 | 20,000 | 8,006 / 4,412 / 3,594 | 13,455 | XSD-valid complete return, 19 pages |
| Partnership plus rental | 2 / 1 | 20,000 | 201 / 201 / 0 | 17,666 | XSD-valid complete return, 19 pages |
| Mixed two-box, no direct rental | 2 / 2 | 20,000 | 10,001 / 4,412 / 5,589 | 13,455 | XSD-valid complete return, 18 pages |
| Sixteen mixed issuers | 16 / 16 | 20,000 | 8,120 / 4,412 / 3,708 | 13,455 | XSD-valid native only; PDF blocked |
| Thirty-one mixed issuers | 31 / 31 | 20,000 | 3,565 / 3,565 / 0 | 14,302 | XSD-valid native only; PDF blocked |

All five use wages100,000, taxable income104,250, regular tax17,867,
without-passive taxable income84,250/tax13,455 and line6 limit4,412.
The three complete packets retain seven income K-1s with thirteen activity
records and two direct rentals. The two larger native returns retain all47
income/credit K-1s; the original inventories were not reduced to bypass the
existing Schedule E four-row PDF guard (future143).

Focused gate: **5 passed, 0 failed**. Related ordinary/rental/worksheet/child-credit
and detail regression: **77 passed, 0 failed**. Altered owner, issuer, reference,
activity, classification, amount, worksheet and final-credit facts reject in
**90 native and54 freshly hashed PDF** cases. Independent checks reconcile
source box sums, Schedule E rows, credit allocations and final tax. All five
returns pass local XSD validation. Three local archive packages preserve exact
XML/manifest/container bytes; **12 malformed archive variants reject**.
Synthetic filer/software identifiers were used locally; nothing was transmitted.

The **56 pages** include36 unique rendered pages and20 exact pixel duplicates;
all nine contact sheets were reviewed. Existing deferred26/68/76/84 presentation
and native qualifications repeat. Both Schedule E PartII line27 answer boxes
are blank on all three packets (new future144). These are qualified complete
packets, not evidence of IRS acceptance or flawless PDF parity. The new capacity
and answer items remain deferred and were not repaired.

Private evidence: `.state/research/form8582cr-k1-income-2026-10-10/`, including
focused/grouped logs, source JSON, prepared XML/PDF, XSD logs, local archives,
independent verification, rendered sheets, runtime hashes and visual review.
Business-credit cumulative evidence becomes **129 complete returns/2,501 pages**;
the two native-only cases and PartVI37 roots/17 pages remain separate. PR71 now
contains seven complete returns/134 pages plus these two native-only returns.
Other K-1 income, losses, prior histories, spouse-owned credit K-1s, authenticity,
further Form3800 limitations and broader passive methods remain open.

## October 10 separate K-1 income and credit inventories

The ordinary filing reconciler no longer requires every positive rental-income
K-1 to carry a New Markets credit. Partnership and S corporation K-1 inventories
are checked in full, then only credit-bearing records are matched to credit
sources. Income-only records must have positive reviewed box2/3 income and no
orphan credit-classification flag. The existing line6 source contract continues
to bind all income activities, owners, issuer references and amounts; an extra
unclaimed credit or unsupported income box still rejects. This follows the
[IRS line6 computation](https://www.irs.gov/instructions/i8582cr), which uses
net passive income in the with/without taxable-income calculation.

| Case | Credit / allowed / unused | Final tax | Complete packet |
| --- | --- | --- | --- |
| Partnership income, corporate credit | 5,001 / 4,412 / 589 | 13,455 | 18 pages |
| Corporate income, partnership credit | 5,000 / 4,412 / 588 | 13,455 | 18 pages |
| Four income issuers, two credit issuers | 4,005 / 4,005 / 0 | 13,862 | 19 pages |
| Separate income, fully allowed credit | 101 / 101 / 0 | 17,766 | 19 pages |

All four retain20,000 passive income and17,867 regular tax; the line6 limit is
4,412. Current-year income sources remain primary-owned, non-PTP, positive and
without prior loss histories. Self-earned source authentication, spouse credit
ownership, losses, other boxes, special allowances and accepted histories remain
outside this proof. No deferred PDF capacity, line27 answer or tax-limit repair
is included.

Focused4/0 and related82/0 pass. Across four complete preparations,88 native and
88 freshly hashed PDF mutations reject changed source/owner/amount facts,
unclaimed new credits, orphan classifications, unsupported ordinary business
income and missing income records. Single-credit native returns retain the
issuer/credit directly on PartIII; the printable PartV remains blank. The
multiple-credit case retains two PartV rows. All four have local archive
packages;16 malformed variants reject and XML/manifest/container bytes match.

Private evidence: `.state/research/form8582cr-separate-income-2026-10-10/`.
Synthetic records and local transmission identifiers do not prove authenticity
or IRS acceptance. Final schema/render review is recorded with the checkpoint
verification and visual-review artifacts.

Final review: **four XSD-valid complete returns/74 reviewed pages**, with43
unique rendered pages and31 exact pixel duplicates covered by11 reviewed sheets.
Nine income K-1 rows and five credit sources reconcile independently with native
and printed values. Existing deferred26/68/76/84/144 repeat; no new item or
repair. Business evidence totals133 complete returns/2,575 pages; earlier two
native-only returns and PartVI37 roots/17 pages remain separate. PR71 now retains
11 complete returns/208 pages plus two native-only returns.

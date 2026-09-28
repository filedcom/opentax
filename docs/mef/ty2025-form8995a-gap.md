# TY2025 Form 8995-A coverage gap

Status: bounded one-business parent, one-SSTB Schedule A, two-business
aggregation Schedule B, two-business current-loss Schedule C, and
one-cooperative Schedule D native/PDF routes written but unrun. Local tests, XSD
validation, filled-PDF rendering, and IRS ATS remain outstanding.

Unsupported broader Schedule A/B/C and broader Schedule D triggers reject at the
Form 8995-A node **before** any Form 1040/standard-deduction output is produced.
This is a source-local filing boundary, not whole-form Schedule A-D coverage.
Focused rejection cases were written but not run.

## Schema and form check

The checked-in TY2025 v5.4 `Shared/IRS8995A/IRS8995A.xsd` begins with zero or
more `QBIDeductionInformationGrp` rows. Each row has a required trade or
business/person name, specified-service and aggregation indicators, and a
required EIN, SSN, or missing-EIN reason. Its line 2
`QualifiedBusinessIncomeAmt`, line 4 `AllocableShareW2WagesAmt`, and line 7
`AllocableShareUBIAQlfyPropAmt` are nested _inside that business row_. The
top-level form then carries line 16 and lines 21-40, including
`TaxableIncomeBeforeQBIDedAmt` (line 33), `NetCapitalGainAmt` (line 34), and
`QualifiedBusinessIncomeDedAmt` (line 39).

The former 11 flat fields in `forms/f1040/2025/mef/forms/f8995a.ts` were
removed. The new descriptor emits a native business row followed by ordered Part
IV fields for one explicitly identified business. It rejects the old
aggregate-only payload rather than treating it as another API shape.

The [2025 Form 8995-A](https://www.irs.gov/pub/irs-pdf/f8995a.pdf) requires one
Part I and Part II column per trade, business, or aggregation. Its
[instructions](https://www.irs.gov/pub/irs-pdf/i8995a.pdf) also require
Schedules A, B, C, and/or D when specified-service, aggregation, loss netting,
or agricultural-patron facts apply. Taxpayers below the 2025 threshold normally
use Form 8995 instead of 8995-A.

## Source and calculation blockers

1. The node now retains a `form8995a` pending record whenever QBI activity is
   present, even when its deduction is zero. The bounded descriptor requires a
   sourced business name and EIN, explicit per-business QBI, W-2 wages, and UBIA
   matching the aggregate calculator inputs, confirmation that this is the only
   non-SSTB non-patron business and that taxable income is the return-wide
   pre-QBI amount, and a single filer fully above the wage-limit phase-in range.
   It computes row lines 2-15 and top-level lines 16 and 28-40, skipping Part
   III as the printed form directs above the range. It reconciles line 39 to
   Form 1040 line 13 and rejects simultaneous Form 8995 pending.
2. The broader calculator still aggregates non-SSTB QBI, SSTB QBI, wages, UBIA,
   and carryforwards. The BAN aggregation input now forwards its groups to Form
   8995-A so the Schedule B guard sees and rejects the election instead of
   silently dropping it. It lists group and business names but not the amounts,
   tax IDs, or eligibility evidence required for XML rows and Schedule B.
   Schedule E's separate `qbi_aggregation_number` now also rejects at source
   instead of being ignored. Forwarding and rejection cases are written but
   unrun.
3. A bounded one-identified-SSTB Schedule A route now retains a source-attested
   business row in the single-filer phase-in range; independent source-document
   authentication and wider SSTB/PTP configurations remain open. A bounded
   two-business current-loss Schedule C ledger is now sourced from two distinct
   Schedule C items; prior QBI loss and REIT/PTP loss inputs remain aggregates
   without the required historical provenance. A bounded patron-reduction
   Schedule D route now exists, but nonzero section 199A(g) DPAD, multiple
   cooperatives, and filled-PDF verification remain open.
4. The 2025 printed line 34 is net capital gain _increased by qualified
   dividends_. The input `net_capital_gain` is not documented as that combined
   amount, so using it unadjusted could overstate the income limitation. The
   node also does not prove Form 8995-A rather than the simpler Form 8995 is
   required in every direct-call case.
5. Focused node and serializer cases now assert a native row, final-line
   calculation, and missing-identity, alternate-schedule, and reconciliation
   failures. They are written but unrun. The shared MeF builder still has three
   old aggregate-only Form 8995-A fixtures for central reconciliation. No flat
   fallback or silent Form 8995/8995-A selection is provided.

## Smallest safe rebuild boundary

The written base slice uses one identified non-SSTB, non-aggregated trade or
business above the entire phase-in range, with no prior loss, REIT/PTP,
agricultural patron, or pass-through special items. It requires explicit zero
net capital gain and confirmation of zero qualified dividends, so line 34 is not
guessed from the older ambiguous aggregate input. The parent PDF now has a
bounded descriptor; verify its filled values in the deferred visual batch. A
separate bounded one-cooperative Schedule D route is described below. Broader
SSTB, aggregation, prior-loss and other current-loss netting, and patron paths
need their own schedule models and attachments before filing.

## Required Schedule A-D boundary

The checked-in TY2025 v5.4 schema has distinct `IRS8995AScheduleA`, `B`, `C`,
and `D` roots. Schedules A/B/C/D are registered in `ALL_MEF_FORMS` for bounded
routes below, with native and PDF descriptors. Filled appearance is unverified.
The [2025 IRS instructions](https://www.irs.gov/instructions/i8995a) require
Schedule A for an SSTB within the taxable-income phase-in range, B for an
aggregation election, C for a current qualified business loss or prior QBI loss
carryforward, and D for a specified agricultural/horticultural cooperative
patron claiming a QBI deduction from that business. Outside the bounded one-SSTB
Schedule A route, the node rejects nonzero SSTB QBI, wages, or UBIA, including a
fully phased-out SSTB in a mixed return, rather than silently omitting an
identified business. A prior REIT/PTP loss alone is not the Schedule C trigger;
it remains separately unsupported by the bounded native route.

| Schedule | Source-local guard                                                                                     | Needed for a supported filing route                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A        | SSTB outside the bounded one-business single-filer phase-in source                                     | Other identified SSTB or PTP rows, MFJ phase-in, source authentication, and filled-PDF verification.                                                                                                                                                                                                                                                                                                                                    |
| B        | Aggregation outside one group of two sourced Schedule C businesses                                     | The bounded route requires ownership, tax-year, operational-factor, election-continuity, reviewed QBI-allocation, member tax ID, source and parent joins. Broader groups and RPE statements remain unsupported. The BAN input alone retains only names and a boolean.                                                                                                                                                                   |
| C        | Current qualified business loss outside the bounded two-business route, or prior QBI loss carryforward | One positive and one negative identified Schedule C business can now net a small positive current QBI with no unused loss, but wider activities, zero/negative net, and prior carryforward still reject. The scalar prior loss lacks filed-return and suspended-loss provenance. Preserve each business, proportionally allocate losses, and carry remaining line 6 forward. Even a zero parent deduction does not excuse the schedule. |
| D        | Affirmative `patron_of_specified_cooperative` without the bounded source                               | Multi-cooperative allocations and nonzero section 199A(g) DPAD remain open; the bounded PDF descriptor still needs filled-page verification.                                                                                                                                                                                                                                                                                            |

`patron_of_specified_cooperative` is a direct optional fact on the Form 8995-A
input. `true` now requires the bounded source object and companion document;
omission is **not** a no-patron attestation. The business filing details retain
an explicit no-aggregation confirmation. No alternate shape, alias, or fallback
was added.

The former Form 8995-A PDF descriptor mapped eleven aggregate calculator inputs
without an identified business row or final-return reconciliation and was
guarded. Subsequent build passes replaced it with bounded parent and Schedules
A/C/D descriptors, using calculated line values and source, companion, and Form
1040 line 13 checks. Direct projection and builder cases are written but unrun.
The old aggregate map was not retained as a fallback. Filled-page inspection and
any triggered Schedule B or wider Schedule C pages remain open.

The bounded route must pass the agreed single full calculation/test batch,
TY2025 local XSD and PDF checks, IRS business rules, and ATS acceptance before
coverage is claimed.

## Build-first Schedule A SSTB route (written, unrun)

One identified SSTB for a single filer inside the 2025 taxable-income phase-in
range now produces a separate registered `IRS8995AScheduleA` native document.
Its attested business identity and QBI, W-2 wage, and UBIA amounts must match
the parent source. The calculated applicable percentage and phased-in wage limit
reconcile to the parent Form 8995-A and Form 1040 line 13a. A bounded
official-field PDF descriptor for the companion and parent is registered. This
excludes multiple businesses, PTPs, MFJ, patron, aggregation, gain, REIT/PTP
loss, and prior-loss combinations. The asserted business source has not been
independently authenticated. Focused cases are written but unrun; local XSD,
filled-PDF inspection, IRS business rules, and ATS acceptance remain open.

## Build-first Schedule C current-loss route (written, unrun)

One single filer above the full 2025 wage-limit phase-in with exactly two
distinct, identified Schedule C businesses can now produce a registered
`IRS8995AScheduleC`. One business has positive QBI and one has negative QBI; the
loss nets against the positive amount with a small positive whole-dollar
deduction and no unused line 6 loss. Each business name, EIN, reference, W-2
wages, UBIA, material participation, at-risk and no-other-adjustment facts must
match its Schedule C source item. The route excludes prior or suspended losses,
SSTB, aggregation, patron, net capital gain, REIT/PTP, other business and
negative-business wage/UBIA variants. The native companion and bounded PDF map
reconcile their rows and final deduction with parent Form 8995-A and Form 1040
line 13. No current net-zero/negative result or prior-year loss carryforward is
supported. Focused cases are written but unrun, and source authentication, full
XSD, filled-PDF, IRS-rule and ATS gates remain open.

## Build-first Schedule D patron route (written, unrun)

One non-SSTB business, one specified cooperative, and a nonzero patron reduction
now have a distinct registered `IRS8995AScheduleD` native descriptor. The
canonical Form 8995-A input carries an actual TY2025 Form 1099-PATR item using
the existing source schema. That item must identify its payer, have box 13
checked, positive box 7 qualified payments, and zero box 6 section 199A(g)
deduction. Its QBI and W-2 wage allocations need a confirmed business-record
worksheet with a nonempty reference, reviewer, and review date and cannot exceed
the identified business amounts. The worksheet bytes are not attached or
independently verified by this native builder. A retained `f1099patr` source
record must contain the same item; missing, multiple, or different cooperative
sources reject at MeF build. The two distinct pending records must match;
missing/changed Schedule D rejects the parent, and missing/changed parent
rejects Schedule D.

For this fully-above-phase-in single filer, Schedule D lines 3 and 5 are 9% of
allocable QBI and 50% of allocable W-2 wages. Line 6 is their lesser amount.
Form 8995-A line 14 uses that line 6, line 15 subtracts it from line 13 (not
below zero), and line 39 must equal Form 1040 line 13. The route requires a
positive whole-dollar reduction and excludes SSTB, aggregation, loss, REIT/PTP,
capital-gain, qualified-dividend, and nonzero cooperative section 199A(g)
deduction variants. No old box-name alias or fallback exists.

The [2025 Form 1099-PATR](https://www.irs.gov/pub/irs-prior/f1099ptr--2025.pdf)
and [2025 Form 8995-A instructions](https://www.irs.gov/instructions/i8995a) are
the sources for the box meanings and line relationship. The former 1099-PATR
node had box 6/8/9 incorrectly labeled; the TY2025 source schema, focused cases,
and research notes were corrected directly. Business income itself still needs
its Schedule F/C source routing.

## Schedule B aggregation source contract (wired, unverified)

The
[TY2025 Form 8995-A instructions](https://www.irs.gov/pub/irs-prior/i8995a--2025.pdf)
require Schedule B when the filer elects to combine businesses for the W-2
wage/UBIA limit. A valid election requires 50% common ownership for a majority
of the year **including the last day**, the same tax-year end, no SSTB in the
group, and at least two of the three operational relationship factors. The
aggregation must be reported consistently in later years unless a material
change disqualifies it. An RPE's aggregation cannot be separated and its
statement must be attached. The latest
[Schedule B form](https://www.irs.gov/pub/irs-prior/f8995ab--2022.pdf) has lines
1–2 for the group description and prior-year change, line 3 for each member's
name, TIN, QBI, wages, and UBIA, and line 4 for their totals. The checked-in
TY2025 v5.4 `IRS8995AScheduleB.xsd` has matching group, member, and total
elements.

The `qbi_aggregation` input still has only a group name, member **names**, and
`combined_for_limitation`. A new optional, strict
`form8995a.aggregation_filing_details` object stages the one-group/two-member
evidence contract below. Its pure validator compares the member ledger with the
group's ordered names, each copied Schedule C source, and the parent
QBI/wages/UBIA totals. Bounded native parent and Schedule B projections now
calculate the aggregate parent row and two Schedule B member rows from this
typed source. Their join requires matching retained parent and companion
records, two retained Schedule C items matching the copied source, a common
owner SSN matching the return header, and Form 1040 line 13 matching the grouped
deduction. The parent PDF projection includes the aggregation checkbox. The
Schedule B PDF field map was inspected from the official December 2022 fillable
revision, but no filled page has been rendered. The existing
`business_filing_details.no_aggregation_confirmed` cannot truthfully describe an
aggregation. These bounded native/PDF functions are registered. The node still
rejects aggregation without the two-business evidence or outside its narrow
source conditions.

A first positive route should be limited to one group of exactly two positive,
non-SSTB Schedule C businesses, one single filer above the full phase-in range,
no RPE interest, no change to a prior election (or an explicitly new election),
and no Schedule A/C/D, REIT/PTP, gain, or prior-loss facts. Its **single
canonical aggregation source** must supply:

1. Group label, a written description of the qualifying relationship, tax year
   end, and an election/continuity record. A prior-year election needs its filed
   Schedule B reference; a new election needs an explicit first-year answer. The
   record must say whether any RPE aggregation exists and attach the statement
   if it does; the first bounded route should reject RPEs.
2. Ownership percentage and period for each business, with record references
   proving the same person or group held at least 50% for the required period
   including December 31. This first two-Schedule-C contract restricts both
   members to 100% taxpayer ownership from no later than July 2, 2025, through
   December 31. At least two selected operational factors need concrete
   descriptions and source references, not just booleans.
3. For each member, a distinct business reference, name, EIN, retained 2025
   Schedule C item, calculated net profit, adjusted QBI, W-2 wages, and UBIA.
   The staged source separately records the deductible portion of SE tax,
   self-employed health insurance, and retirement-plan deductions allocated to
   that business, with a described allocation method, worksheet reference,
   reviewer, and review date. Each member confirms no other attributable
   adjustments, and the group confirms no other business adjustments. Each
   member's QBI equals Schedule C net profit less those amounts. The native join
   checks the sum of the member adjustments against Schedule 1 lines 15–17.
   Require material participation and at-risk source facts; reject losses,
   SSTBs, duplicate members, and items not present in the retained Schedule C
   collection.
4. Reconcile Schedule B line 3 rows and line 4 totals to those two source items
   and to Form 8995-A's aggregate row lines 2, 4, and 7. Mark that parent row as
   aggregated and use the group label, not one member's name or EIN. Recompute
   the wage limitation, line 39, and Form 1040 line 13 from the grouped totals.
   Both the parent and companion must require the same source and reject a
   missing, changed, or extra Schedule B.

The typed source, grouped calculation, retained-source join, registered native
serializers, and PDF projections have focused positive and tampering cases but
are **unrun**. This is **not** verified Schedule B filing coverage. No
aggregate-only fallback, manual deduction, or fabricated member allocation was
added. The bounded descriptors must pass the TY2025 XSD, full graph test batch,
filled-PDF visual review, IRS business rules, and ATS before coverage is
claimed.

The [TY2025 instructions](https://www.irs.gov/pub/irs-prior/i8995a--2025.pdf)
explicitly require QBI to include deductions attributable to a business,
including deductible SE tax, self-employed health insurance, and qualified
retirement contributions. Ordinary Schedule C net profit is therefore **not**
generally a valid member QBI amount. The required method, worksheet reference,
reviewer and review date, no-other-adjustments assertions, and exact Schedule 1
lines 15–17 totals prevent silent omission and arithmetic drift. They do **not**
make the worksheet bytes or its conclusion available to the graph. It therefore
cannot independently verify that each allocation method is reasonable and
consistently applied across years, or that the no-other-business assertion is
true. The
[section 199A regulations](https://www.irs.gov/pub/irs-drop/td-reg-107892-18-corrected.pdf)
require a reasonable method based on the facts and circumstances for items
attributable to more than one business. The staged source now names a reviewer,
but there is no independently inspected workpaper or prior-year allocation
record. This is a human-reviewed source assertion, not an independently verified
result. The bounded path is wired for the deferred full batch, but filing use
remains gated on real workpaper review and those checks. No pro-rata allocation
is invented here.

This is **native and PDF descriptor build work, not end-to-end filing
coverage**. The bounded parent and Schedule D PDF projections are registered,
but no filled page has been rendered or visually inspected. Full tests, TY2025
XSD validation, filled-PDF visual review, IRS business rules, and ATS acceptance
are not done. Broader Schedule B/A/C and the broader patron routes remain open.

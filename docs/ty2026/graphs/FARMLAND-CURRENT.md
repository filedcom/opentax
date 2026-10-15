# TY2026 farmland disposition and Form 1062 implementation

## Current state (October 15, 2026)

The next ATS scenario 1 dependency is Form 1062. The current source graph still
has no Form 1062 election, farmland sale or Form 4797 attachment route. The
existing Form 1040/Schedule 3 arithmetic accepts internal settlement fields;
that is not a source-derived deferral calculation. Do not mark scenario 1 or
Form 1062 complete from those fields or the new helpers described here.

The first prerequisite now implemented is a reviewed land-disposition calculator
and year-aware section 1231 history replay. Both are internal and unregistered.
The public 2026 intake rejects `land_dispositions`. No land amount can yet be posted through the source return graph or public
intake. Internal Schedule D, AMT and NIIT consumers and their component PDF
builders now accept the retained source handoff described below; this is not
a completed return or bundle route.

## Shared calculation and annual records

`forms/f1040/2026/inputs/land-disposition-source.ts` retains each seller, parcel,
activity, acquisition/closing reference, purchase cost, capitalized acquisition
cost, basis adjustment, selling expense and reported Form 1099-S copy. The
current contract is for direct, fully taxable, nondepreciable business land
used in business throughout ownership, with reviewed absence of passive/at-risk
limitations and no related-party, installment,
exchange or recapture treatment. These boundaries are explicit source reviews;
they do not establish eligibility for a section 1062 election.

The source ledger uses integer cents, checks dates and ownership, prevents
duplicate property/ledger/copy entries and reconciles a corrected 1099-S to its
closing record. Gross proceeds and basis plus sale expenses are rounded into
the printed columns before calculating each property's gain. Rows held one
year or less have ordinary character; longer-held rows enter section 1231
netting. The shared 2025 Form 4797 calculator resolves ordinary versus capital
character from those derived amounts and the reviewed prior-loss balance.

The shared history replay now takes a return year. Its 2025 wrapper retains the
existing schema, field names and output. The 2026 adapter requires filed
2021-2025 records and a 2021 opening ledger with eligible 2016-2020 vintages.
It reconciles each filed gain/loss, prior-loss line and recapture amount before
consuming losses oldest first. A 2020 balance may be consumed by 2025 gain but
expires before the 2026 calculation. A remaining 2021 balance expires before
2027. The preliminary amounts calculator replays only the opening history and
returns sale amounts and character without a current deductible loss or outgoing
vintage. The internal limitation owner now consumes the sale loss before
finalizing its deductible amount, without a circular dependency. The final
calculator still requires that owner's finalized loss-limitation amount and
source reference for a net loss; only the amount taken into account is added
to the new loss vintage. Public intake cannot assert that deductible amount.

The 2026 result separates the semantic history workpaper from printed lines:
net section 1231 is line 8, prior loss is line 9, residual capital gain is line
10, ordinary section 1231 loss is line 12, prior-loss recapture is line 13, and
ordinary totals are lines 19/20b. The standalone PDF component now applies the
printed skip rules described below. No depreciable property, rental/passive allocation,
K-1, casualty, QOF, livestock, Part III/IV or return-wide QBI integration is claimed.
NIIT support is limited to the explicitly reviewed internal handoff below.

## Internal capital and NIIT connection

`land-disposition-bridge.ts` retains the actual property records and any internal
finalized-loss workpaper. The capital and land inventories cross-reference one
another, require identical return owners, and explicitly reconcile regular/AMT
basis and history. A linked inventory without the corresponding sources fails.
No calculated land gain or NIIT exclusion is accepted from public intake.

The existing capital calculator replays the 4797 source, sends its residual
long-term gain through the shared Schedule D line-11 key, and nets it with
investment sales, distributions and prior carryovers. Its result separately
retains ordinary disposition gain/loss for Schedule 1. All-lookback gain can be
entirely ordinary without forcing Schedule D. AMT replays the same combined
preference source. The regular 2027 capital-loss workpaper consumes the actual
combined short/long results, while section 1231 history keeps its own vintages.

The [Form 8960 instructions](https://www.irs.gov/instructions/i8960), checked
October 15 as a **2025 comparator**, specify the lines 5a-5d worksheet. The
internal NIIT route now reconciles both capital and ordinary amounts against
its AGI handoffs. Exclusion requires one owner/activity review per business,
participation history throughout ownership, section 162 treatment, no financial
trading or former-passive adjustments, and no prior NIIT capital-loss adjustment.
The source gain is excluded without applying a second capital-loss limit.
For example, $100,000 of investment loss plus $40,000 of excluded capital gain
and $5,000 of excluded ordinary gain gives line 5a of $2,000, line 5b of
-$45,000 and line 5d of -$43,000. A new Schedule D calculation capped at -$3,000
would be wrong. State-tax allocation uses income after this exclusion.

Standalone draft components now print Schedule D line 11 and Form 8960 lines
5a/5b/5d. They require matching Form 4797/Schedule 1 destinations, retain draft
markings and are visually checked. These component PDFs are not a complete
filing package: the graph and attachment/bundle owner remain unfinished.
The capital graph node and deduction finalizer deliberately reject this handoff
until QBI, loss limitations and the remaining source/attachment routes are
connected. This prevents an internal helper from bypassing ordinary-gain QBI.

## Standalone Form 4797 draft component

The component replays the finalized land source and requires matching Schedule D
line 11, Schedule 1 line 4 and current deductible section 1231 loss destinations.
It uses the pinned October 1 draft, verifies its page/field inventory, prints
Parts I/II, and omits the cover and unused Parts III/IV page. Positive gain
without a lookback loss skips lines 9/10/12/13; a loss prints its full disposition
amount on line 12 even when a separately finalized deductible loss is smaller.
The line 1a information-return control aggregates cents before dollar rounding.

More than four properties, or an overlong description, uses a continuation with
all seven columns and seller/sale references. Long descriptions can span pages;
amounts appear once per detail row and totals reconcile to the official form.
Output is flattened with no form fields or annotations, retains draft markings,
and is not yet registered in the return bundle or public intake.

## Internal business-loss prerequisite

The [Form 461 workpaper](FORM461-GRAPH.md) now replays the retained business,
capital and land sources to calculate the 2026 excess-loss adjustment. It
separates the individual-line filing trigger from the excess-loss threshold,
removes investment capital losses, limits business capital gains and excludes
employee services. The Schedule C route now connects this calculation to AGI, allowed-loss QBI
and the draft bundle; the land route remains internal.
The September 28 instruction draft is pinned in the corpus.

The internal land loss owner now runs preliminary capital/4797 amounts through
the same Form 461 arithmetic, allocates the disallowed loss, finalizes section
1231 history and replays the final capital/461 sources. It checks that the tax
destinations did not change. A stale caller-supplied deductible loss is rejected.
This is an internal component; public land intake remains disabled.

The reviewed allocation convention is proportional to negative source buckets:
each nonemployee Schedule C result, each owner's half-SE deduction, the net
section 1231 ordinary result, and net short-term land result. Capped business
capital gain offsets the Form 461 loss but never becomes an ordinary-loss
bucket. Integer largest remainders and stable source references conserve
dollars. This is explicitly a reviewed bookkeeping convention, **not an
IRS-prescribed attribution rule**. Existing C-only QBI allocation keeps its
own reviewed weights and reuses the same dollar-allocation helper.

Every land owner/activity has a farming classification and a review confirming
no omitted current income, deductions or suspended items for that activity.
Positive EBL with farming loss stops for Form 172 and the farming-first
threshold rule; a farm loss below the EBL limit can finalize its full amount.
Mixed farm/nonfarm NOL allocation, complete qualified-loss attribution, land AGI
registration and bundle integration remain open.

## Internal land contribution to QBI

The QBI component consumes the finalized loss owner and retains every sale's
activity. Taxpayer-wide section 1231 netting occurs before activity-level QBI:
in a net loss year all section 1231 amounts are ordinary; in a net gain year
only lookback recapture is ordinary. A separately reviewed convention allocates
recapture in proportion to positive net section 1231 gains by activity. The
remaining capital amounts are excluded from QBI, including a losing activity's
capital amount when the taxpayer has an overall section 1231 gain.

The component allocates disallowed long/short losses to the corresponding
negative activity amounts, separates qualified domestic non-SSTB items from
reviewed foreign-business items, and retains material participation separately
for active QBI. Suspended qualified and nonqualified amounts stay distinct from
current allowed QBI and from Form 8995's allowed-loss carryforward. These are
the land contributions only; the return still needs to combine Schedule C and
other QBI, prior losses and taxable income before claiming a deduction. SSTBs,
other exclusions and Form 8995-A need their own calculation routes.

For example, a $400,000 nonfarm land loss gives a $144,000 Form 461 adjustment,
$256,000 of current qualified loss and a $256,000 section 1231 vintage. Form
4797 still prints the $400,000 disposition loss. A $45,000 gain with $5,000 of
lookback recapture contributes $5,000 of ordinary QBI and $40,000 to Schedule D.
These semantics follow the [2026 draft 8995 instructions](https://www.irs.gov/pub/irs-dft/i8995--dft.pdf)
and [4797 instruction comparator](https://www.irs.gov/instructions/i4797);
the proportional attribution conventions are reviewed implementation choices.

## Current IRS source checks

The [October 1 draft Form 4797](../corpus/draft/f4797-2026-10-01.pdf) was fetched
from the [IRS draft URL](https://www.irs.gov/pub/irs-dft/f4797--dft.pdf) and pinned
separately from the September corpus snapshot. SHA-256:
`66e57b82213189baa8564ed9cb83e75d6f556edb0bd051df458879280bc1fec9`.
It has a cover, two printed pages and 188 widgets. In this draft, line 20a sends
the specified income-producing casualty loss to Schedule A **17d**; the earlier
research contract named line 16. The 2025 instruction comparator remains
prior-year evidence, not final 2026 filing instructions.

The [Form 1062 instructions](https://www.irs.gov/instructions/i1062) require the
election, a Schedule A for each qualified sale and the enforceable farming-use
covenant. The [2026 draft Form 1062](https://www.irs.gov/pub/irs-dft/f1062--dft.pdf)
uses regular tax and applicable credits both with and without elected gain;
its first installment is one quarter of the resulting net tax difference.
The [Schedule A](https://www.irs.gov/pub/irs-pdf/f1062sa.pdf) supplies the property
and gain information. These sources were checked but no Form 1062 calculation
or attachment is implemented by this prerequisite work.

Estimated-tax relief is in **Notice 2026-3**, published in
[IRB 2026-02](https://www.irs.gov/irb/2026-02_IRB). The Form 1062 landing page's
"Notice 2026-2" label must not be turned into a guessed PDF URL: the actual
`n-26-02.pdf` concerns pension interest rates and is unrelated to farmland.

## Remaining connected implementation

1. Finish registering the internal Schedule D/AMT/NIIT handoff, post Schedule
   1 line 4 once, and retain activity/source character for QBI,
   dependent support and earned-income calculations. A 4797 ordinary amount is
   not automatically earned income or self-employment income. Apply loss limits
   before finalizing deductible losses and carryforward vintages. Expand asset
   and recapture cases using the full [4797 contract](FORM4797-GRAPH.md).
2. Establish section 1062 qualification from the property-use history, buyer's
   qualified-farmer evidence and enforceable covenant. Reconcile each elected
   Schedule A gain to the same disposition inventory; retain actual covenant
   bytes and their filing references. Source records alone are not the required
   attached covenant. Support partnerships, S corporations and allocations with
   their own source owners before enabling those claims.
3. Recalculate tax and the applicable credits with elected gain removed using
   shared tax/credit calculators and correct gain character, rather than a flat
   rate, user-asserted tax difference or copied current credit. Resolve the
   regular-tax scope against section 26(b); do not automatically defer AMT,
   NIIT, SE or household taxes merely because they appear on Schedule 2.
4. Post Form 1062 line 14 to Schedule 3 line 13e and the first installment to
   Form 1040 line 24b after credit resolution, without creating a graph cycle.
   Retain the future installment ledger, election timing and acceleration
   evidence. Integrate any estimated-tax relief from the applicable authority.
5. Connect the standalone Form 4797 component to the bundle and build Form 1062,
   Schedule A and covenant attachments;
   reconcile source, printed lines, return settlement and current MeF/rules.
   Verify the full ATS scenario independently. Its assumed $200 installment
   does not supply the missing farmland proceeds, basis, covenant or tax
   recalculation and must not become a public tax override.

Tests cover history rollover/expiry, oldest-first consumption, current limited
losses, ownership, source conflicts, gain/loss netting, holding periods, basis
and whole-dollar columns, corrected 1099-S copies and rejection by public
intake. Full 2026 return integration and filing acceptance remain unfinished.

Verification: the history prerequisite passed 86 focused/shared/2025
return-workflow tests. The capital/NIIT connection passed 13 typed focused
checks, all 631 tests in the 2026 directory, and 137 unit checks. Three rendered
component pages were inspected for the line 11 and NIIT adjustments, identity,
branch selection and draft markings. The legacy 2025 history schema and
carryforward output are preserved.

The preliminary/final history split and Form 4797 component passed 44 typed
focused tests, all 661 tests in the 2026 directory, 75 shared/2025 history tests
and 137 unit checks. Rendered gain, loss, multi-property and long-description
continuations were checked for signs, skip rules, row spacing and pagination.

The internal loss/QBI owner passed 43 typed calculation/integration checks and
one typed two-form PDF reconciliation check, all 678 tests in the 2026 directory,
and 137 unit checks. The derived $400,000 loss example was rendered as Form 4797
and Form 461 and inspected for full-loss versus limitation amounts, signs,
identity and draft markings. No 2025 implementation changed in this step.

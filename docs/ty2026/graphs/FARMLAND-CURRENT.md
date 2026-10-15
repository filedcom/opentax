# TY2026 farmland disposition and Form 1062 implementation

## Current state (October 15, 2026)

The next ATS scenario 1 dependency is Form 1062. Reviewed direct business-land
sales now enter the 2026 source graph and draft PDF bundle, including Form 4797.
Form 1062 source qualification and covenant-bound Schedule A drafts are now
implemented as components. The internal tax/credit replay now derives the draft
Form 1062 lines. Election registration and settlement remain open; internal
Form 1040/Schedule 3 settlement fields do not complete that work or scenario 1.

The `land_dispositions` input accepts original property records and reviews.
General supplies the return owners. The capital inventory links to the land
inventory, and the land node derives preliminary capital/ordinary amounts,
Form 461 allocation, finalized section 1231 history and combined QBI before
posting final capital destinations. Schedule 1 line 4 and its Form 4797 checkbox,
line 8p, AGI, AMT, NIIT and the selected deduction use those same records.
Public intake cannot supply a finalized loss, QBI amount or Form 461 total.

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
K-1, casualty, QOF, livestock or Part III/IV support is claimed.
NIIT support requires the reviewed nonpassive activity handoff below.

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
filing package. The registered land source owner now supplies the graph and
draft bundle; the capital graph node stages original linked records rather
than accepting a finalized land handoff. Deduction selection accepts it through the
combined QBI/loss owner below, with matching finalized capital sources. An
unaccompanied internal land handoff still cannot bypass ordinary-gain QBI.

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
and is included by the registered land route in the draft return bundle.

## Internal business-loss prerequisite

The [Form 461 workpaper](FORM461-GRAPH.md) now replays the retained business,
capital and land sources to calculate the 2026 excess-loss adjustment. It
separates the individual-line filing trigger from the excess-loss threshold,
removes investment capital losses, limits business capital gains and excludes
employee services. The Schedule C route now connects this calculation to AGI, allowed-loss QBI
and the draft bundle; the registered land route reuses the same calculation.
The September 28 instruction draft is pinned in the corpus.

The internal land loss owner now runs preliminary capital/4797 amounts through
the same Form 461 arithmetic, allocates the disallowed loss, finalizes section
1231 history and replays the final capital/461 sources. It checks that the tax
destinations did not change. A stale caller-supplied deductible loss is rejected.
The registered land route calls this component from original source claims.

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
Mixed farm/nonfarm NOL allocation and complete qualified-loss attribution remain
open; the supported direct-land route is registered with AGI and the draft bundle.

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
the land contributions only; the combined owner below now reconciles them with
Schedule C, prior losses and deduction candidates. SSTBs,
other exclusions and Form 8995-A need their own calculation routes.

For example, a $400,000 nonfarm land loss gives a $144,000 Form 461 adjustment,
$256,000 of current qualified loss and a $256,000 section 1231 vintage. Form
4797 still prints the $400,000 disposition loss. A $45,000 gain with $5,000 of
lookback recapture contributes $5,000 of ordinary QBI and $40,000 to Schedule D.
These semantics follow the [2026 draft 8995 instructions](https://www.irs.gov/pub/irs-dft/i8995--dft.pdf)
and [4797 instruction comparator](https://www.irs.gov/instructions/i4797);
the proportional attribution conventions are reviewed implementation choices.

## Combined QBI and deduction selection

The combined source contract contains the land loss/QBI workpaper, a Schedule C
component review when C records exist, one prior Form 8995 loss record, and a
complete-inventory review. It does not reuse the C-only assertion that there
are no other current QBI sources. Both paths share the C/SE contribution
calculation, prior-owner checks and 2026 simplified deduction evaluator.

The combined owner applies each C loss bucket's disallowed amount to its own
business. A disallowed half-SE deduction is allocated in cents, weighted by the
original source SE deduction allocations, so no business gets more than its
original deduction. This convention is explicitly reviewed. Statutory-employee
QBI remains in the qualified total but receives no Form 461 allocation. Qualified
and foreign-business suspended amounts reconcile to the single excess loss;
current allowed losses and prior Form 8995 carryforwards remain separate.

Deduction selection accepts the retained combined source only with identical
finalized capital records and owners. Repeated graph references must match the
combined owner exactly; conflicting C/loss records are rejected.
Standard and itemized candidates use their own taxable income before QBI and
section 68, one prior loss, the actual net capital gain/qualified dividends and
one active-income minimum. Land businesses retain an EIN when supplied.

The combined Form 8995 component replays selection and reconciles the receiving
1040 deduction lines. It shares the pinned form mapping and continuation renderer
with the existing C-only builder. The source graph and draft bundle now select
this component for both mixed C/land and land-only returns. Schedule C declares
`no_current_qbi_sources_other_than_listed_businesses: false` and the matching
`linked_land_qbi_inventory_reference`; its component review and prior losses
must match the combined inventory. A second C-only loss-allocation review is
rejected. The C-only QBI calculator cannot consume this linked contract.

Form 4797 attaches at sequence 27, before Form 6251; one Form 8995 attaches at
55, with Form 461 at 64 when required. The bundle replays receiving amounts,
retains static draft markings and includes any continuations. Synthetic gain,
mixed-loss and land-only cases verify once-only income and QBI routing; a
separate investment sale verifies that NIIT excludes reviewed land amounts only.
Child-tax land/loss coordination, negative-AGI NOLs, positive EBL with farming
loss, eligible EIC disposition worksheets and remaining QBI source families
still require their calculation owners. Public filing and current IRS acceptance
remain disabled.

## Form 1062 source qualification and Schedule A

`inputs/form1062-source.ts` reuses the original land-source calculator. Each
elected sale must match its return owner and property; the election may select
a subset but cannot duplicate a sale. The component derives Schedule A gross
proceeds, net sales price, original basis, adjusted basis and recognized gain
from the same closing and basis ledger used by Form 4797. Loss elections and
asserted gain totals fail. If separately rounded Schedule A and Form 4797 columns
differ, tax deferral stops pending coordinated rounding; no gain is invented to
force reconciliation.

The source records retain U.S. property location, the qualified individual
buyer's evidence under 7 USC 1308-1(b)/(c), and dated farming/qualified-tenant use.
The ten-year lookback ends on the sale date. Distinct nonoverlapping periods
produce supported-day and gap workpapers. A substantive substantially-all
review must address any gaps; the code does not invent a percentage threshold.
Covenant evidence must identify the same property, seller and buyer, bind on the
sale date and cover the entire ten-year restriction beginning the following day.
These are reviewed source assertions, not independent legal authentication.

`pdf/form1062-schedule-a.ts` uses the shared `VerifiedSourceDocuments` verifier
for the exact reference/digest set. It requires readable, unencrypted covenant
PDF copies before checking Schedule A line 8. One document may cover multiple
parcels if the repeated reference has a consistent digest. Covenant originals
are returned separately without byte changes, preserving existing fields and
signatures; only generated Schedule A pages are flattened and draft-marked.
Long property descriptions continue on source-identified attachment pages.

The current IRS Schedule A revision is December 2025 (continuous-use, not an
annual 2025 tax form). The October 15 source check follows the IRS Form 1062
landing page to `https://www.irs.gov/pub/irs-pdf/f1062sa.pdf`. The pinned file at
`corpus/continuous/f1062sa.pdf` has SHA-256
`dc50ba9b52db27a01492962b7349b71070812956c56feff376928dcd17a4953d`.
Its field inventory records 27 terminal widgets; the canonical tree also contains
two nonterminal container entries. The print component checks every terminal
field, retains the current revision label and clears the printed date placeholder
before painting the actual closing date.

This component is not registered as a public election or a completed Form 1062.
Timely election, installment records, settlement, full bundle and MeF work remain.

## Internal Form 1062 tax and credit replay

`inputs/form1062-tax.ts` consumes retained income-tax, AMT, care, education,
child/energy and Schedule 2 sources, the qualified election, and actual return
lines. It checks return owners, income, deductions, tax, prior credit handoffs,
earned-income sources and actual refundable/nonrefundable credits before
calculating a tax difference. This is an internal calculation contract, not
public intake for asserted tax totals.

`form1062-gain-replay.ts` removes only the selected sales from the property
inventory and reruns the shared Form 4797 calculator against the original
opening section 1231 loss balance. It then reuses the shared Schedule D input
and calculator with the recomputed land-capital contribution. Investment sales,
losses, carryovers, qualified dividends and distributions remain. A remaining
sale may change from capital to ordinary treatment after the election subset is
removed. Hypothetical net losses do not produce a filed section 1231 vintage.
The actual history, capital carryovers and source records remain unchanged.

The [Form 1062 instructions](https://www.irs.gov/instructions/i1062), lines 6–12,
prescribe actual taxable income less Schedule A elected gain, floored at zero,
followed by tax and credit recomputation. The component follows that form
mechanic and retains the actual AGI, deduction choice and QBI deduction. It does
not rerun the whole source graph after deleting the sale. Ordinary/preferential
tax uses the existing 2026 calculator. AMT arithmetic is shared with the existing
Form 6251 owner: the hypothetical credit-limit calculation subtracts the elected
gain from signed regular-tax income, uses the line 8 taxable amount and new
preference mix, and retains the actual deduction and adjustment sources.

The credit order is care, education, then the shared child/energy coordinator.
The actual and hypothetical calculations each retain full workpapers.
Nonrefundable care/education/energy credits enter lines 4b/12b and nonrefundable
child/other-dependent credits enter 4d/12d. Refundable ACTC and AOTC are excluded:
[section 24(d)](https://www.govinfo.gov/content/pkg/USCODE-2024-title26/html/USCODE-2024-title26-subtitleA-chap1-subchapA-partIV-subpartA-sec24.htm)
and [section 25A(i)(6)](https://www.govinfo.gov/content/pkg/USCODE-2024-title26/html/USCODE-2024-title26-subtitleA-chap1-subchapA-partIV-subpartA-sec25A.htm)
treat those portions as subpart C credits. Hypothetical ACTC or energy
carryforwards never replace the actual return's credits or carryforwards.

[Section 26(b)](https://www.govinfo.gov/content/pkg/USCODE-2024-title26/html/USCODE-2024-title26-subtitleA-chap1-subchapA-partIV-subpartA-sec26.htm)
excludes AMT from regular tax, while section 26(a) allows personal credits to
offset AMT. The currently registered SE, NIIT, employment and section 4999 taxes
are also outside chapter 1. The component therefore has zero additions on
lines 2/10 for its explicit audited Schedule 2 field set, and preserves the
actual amounts on the return. New regular-tax addition sources require their
own replay before extending that set. Foreign/general-business and other credit
families, child-tax, special-rate and investment-interest election routes remain
unimplemented for Form 1062 rather than silently contributing zero.

The [2026 draft](../corpus/draft/f1062.pdf) explicitly caps line 12z at line 11;
it prints no corresponding cap on line 4z. The component retains that asymmetry,
including a potentially negative line 5 when personal credits offset AMT, and
floors line 14 at zero. The first installment is rounded from 25% of line 14.
Final form/instruction and current MeF verification remain required before filing.

For example, $40,000 wages and $45,000 land gain (including $5,000 ordinary
lookback gain), with $17,100 actual deductions, produce taxable income $67,900
and regular tax $5,871. Line 8 is $22,900 and recalculated tax is $2,503. Without
credits the applicable tax is $3,368 and first installment $842. With the tested
care, AOTC, child and energy records, actual applicable credits are $4,850 and
hypothetical credits $2,503: applicable tax becomes $1,021, first installment
$255. Copying the original credit totals would not reproduce this result.

`pdf/form1062.ts` now renders the pinned December 2026 main-form draft from
that replay. It checks all 26 canonical fields/widgets, removes the IRS cover,
prints negative net income tax in parentheses, and verifies the receiving
Schedule 3 line 13e and Form 1040 line 24b amounts. It reuses the Schedule A
builder and requires the exact covenant bytes before generating the main draft.
The returned components retain attachment sequences 106 and 106A, matching sale
references, and separate original covenant PDFs. All generated pages are static
and draft-marked. This does not yet wire the components into return settlement
or the public election flow.

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
and gain information. The Schedule A component below implements that current
continuous-use form. The internal main-form tax and PDF components above now
derive and render its lines; return settlement and attachment registration
remain open.

The September 29 [proposed section 1062 regulations](https://www.govinfo.gov/content/pkg/FR-2026-09-29/html/2026-19888.htm)
were found during the October 15 tax-source review. Their regular-tax definition
also references section 26(b). They permit pre-final reliance only with complete,
consistent compliance. Before opening the election route, audit that entire
package, including property use/acquisitions, covenant requirements, timing,
payment allocation and acceleration. The current reviewed source component does
not claim complete reliance on those proposed regulations.

Estimated-tax relief is in **Notice 2026-3**, published in
[IRB 2026-02](https://www.irs.gov/irb/2026-02_IRB). The Form 1062 landing page's
"Notice 2026-2" label must not be turned into a guessed PDF URL: the actual
`n-26-02.pdf` concerns pension interest rates and is unrelated to farmland.

## Remaining connected implementation

1. Extend the registered direct-land route to coordinated dependent support,
   child-tax and EIC disposition calculations. A 4797 ordinary amount is not
   automatically earned income or self-employment income. Preserve the existing
   loss-limit-before-history ordering while expanding asset and recapture cases
   using the full [4797 contract](FORM4797-GRAPH.md).
2. Register the implemented direct-sale qualification/Schedule A components with
   the completed election and tax owner. Resolve cross-form rounding differences,
   timing and installment records. Support partnerships, S corporations and
   allocations with their own source owners before enabling those claims.
3. Integrate the internal source-reconciled tax/credit replay above with the
   election owner and extend remaining tax/credit families. Preserve its
   regular-tax scope and hypothetical-only AMT/credit calculations; do not
   replace actual return credits, carryforwards, AMT, NIIT, SE or household tax.
4. Post Form 1062 line 14 to Schedule 3 line 13e and the first installment to
   Form 1040 line 24b after credit resolution, without creating a graph cycle.
   Retain the future installment ledger, election timing and acceleration
   evidence. Integrate any estimated-tax relief from the applicable authority.
5. Register the implemented Form 1062, Schedule A and covenant components
   alongside the registered Form 4797 component;
   reconcile source, printed lines, return settlement and current MeF/rules.
   Verify the full ATS scenario independently. Its assumed $200 installment
   does not supply the missing farmland proceeds, basis, covenant or tax
   recalculation and must not become a public tax override.

Tests cover history rollover/expiry, oldest-first consumption, current limited
losses, ownership, source conflicts, gain/loss netting, holding periods, basis
and whole-dollar columns, corrected 1099-S copies and rejection of calculated
public overrides. Advanced 2026 return integration and filing acceptance remain
unfinished.

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

Combined-owner verification passed 26 typed calculation/PDF checks, 31 existing
business/capital typed checks, all 691 tests in the 2026 directory and 137 unit
checks. Gain, loss and nine-business continuation pages were rendered and
inspected. The loss-case integration exposed and fixed a key-order mismatch:
the limitation owner now returns its schema-parsed final inventory for downstream
source comparisons. No 2025 implementation changed in this step.

The direct-land source graph and bundle passed 38 typed focused tests, all 700
tests in the 2026 directory and 137 unit checks. Three complete synthetic draft
bundles (gain, mixed loss and land-only with investment NIIT) were rendered;
all 36 pages were visually reviewed and verified without fields or annotations.
The first full run found one obsolete guard-message expectation, updated to
require original source claims rather than finalized capital handoffs. Final
verification passed. The original worktree and all 2025 implementations were
left unchanged in this step.

The Form 1062 source and Schedule A components passed 12 typed focused tests,
all 712 tests in the 2026 directory and 137 unit checks. Four rendered pages
cover the ordinary Schedule A and a long-description continuation; each was
visually inspected after correcting the date placeholder and word wrapping.
Generated pages have no fields or annotations. Tests verify that original
covenant bytes and their existing form fields remain unchanged, and reject
missing, altered or mismatched documents. At that milestone the main Form 1062
tax calculation, public election and return-bundle registration were unfinished.

The internal Form 1062 tax and main-form PDF components passed 32 typed
calculation/reconciliation checks and six typed PDF checks, all 728 tests in the
2026 directory and 137 unit checks. Three synthetic main-form/Schedule A pairs
(no credits, ordered credits, and AMT with the line 12z cap) were rendered;
all six pages were visually inspected, with no fields or annotations in the
generated output. Original covenant bytes remain unchanged. Early tests exposed
duplicate synthetic closing references and a fixture above the existing 8995-A
boundary; the corrected fixtures exercise the intended source contracts. No
2025 implementation changed in this step. Public election, timing/ledger,
settlement, full return-bundle registration and filing acceptance remain open.

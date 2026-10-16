# TY2026 Form 8839 adoption credit and benefits contract

The pinned [2026 draft Form 8839](../corpus/draft/f8839.pdf), SHA-256
`b8eefaaeb9faad7972f65d9f1457d8eb15ce9b2b2c84ee042620e95614384770`,
prints a **$17,670** per-child credit/exclusion maximum, **$5,120** maximum
refundable credit per child, and a phaseout beginning at **$265,080** over
**$40,000**. Check its hash in the [manifest](../corpus/manifest.json) before
using the values; the form is still a draft. The pinned [2025
instructions](../corpus/authorities/i8839--2025.pdf), SHA-256
`90dd5f4de0ca435d4e92666b5b50434e1ece488c67fc43a8c6697765bfb684eb`,
are a **prior-year comparator** for timing, worksheets and evidence. Obtain
the 2026 instructions before finalizing those branches. The
[101-widget inventory](../inventories/pdf-fields/pdf-fields-f8839.csv) covers both pages.

## Per-child source and timing ledger

Keep a record per child with identity/year of birth/identifying number,
domestic or foreign status, state or Indian tribal-government special-needs
determination, finalization date, qualified expenses by **payment year**,
employer reimbursements, W-2 box 12 code T benefits by year, credit and
exclusion claimed in prior years, and unused nonrefundable credit by origin
year. Do not use the same expense for both exclusion and credit. Domestic
pre-final expenses can have a different claim year from their payment year;
foreign adoption generally waits for finalization. Special-needs finalization
can allow the full per-child amount without equal cash expenses. Apply the
2026 instruction rules before building the filed per-child row.

| Printed lines | Calculation and destination |
| --- | --- |
| Part I; 2–6 | Print every eligible child and its foreign/special-needs/finalization answers. For each child, subtract credit previously claimed from the annual maximum, then cap qualified expenses unless the special-needs rule applies. Continue beyond the three printed child columns with the prescribed attachment. |
| 7–13 | Compute credit MAGI from the 2026 worksheet, including applicable Form 2555/Puerto Rico/Form 4563 addbacks, then apply the printed phaseout per child. Lines 11b–11c cap the **current-year refundable share** at $5,120 per child; line 13 sums it and goes to 2026 Form 1040 line 30. It also enters the 1040 refundable-credit pool considered by Schedule 3-A. |
| 14–18b | Subtract current refundable credit before adding **nonrefundable-only** prior-year carryforwards. Apply the full credit-limit worksheet and other-credit ordering, then line 18a goes to 2026 Schedule 3 line 6c. Retain the allowable balance on line 18b for 2027 with origin year and five-year expiration. Never convert a prior-year nonrefundable carryforward into a refundable amount. |
| Part III 19–31 | Calculate exclusion **per child** using current/prior employer benefits and W-2 code T, special-needs finalization, and the separate exclusion MAGI worksheet. Reconcile total benefits (line 23), excluded benefits (line 30) and **signed** taxable/recovery amount (line 31) to 2026 Form 1040 line 1f/AGI; a negative line 31 is possible under the printed instruction. |

Eligibility includes MFS separation/living-apart exceptions and required
child-identification documentation. The final 2026 instructions must fix
their exact evidence and filing gates. Check the [Schedule 3-A
contract](../pdf/PDF-SCHEDULE3A-MAP.md) after computing 1040 line 30; it can change
net refundable credits without rewriting Form 8839 line 13.

## Current development workpapers (October 16)

`prepareAdoptionSources2026` now reconciles the actual return owners, current
W-2 code T inventory, employer programs, child identity/finality, dated expenses,
reimbursements and latest filed credit/exclusion history. Domestic pre-final,
current-final and post-final payment years remain distinct; foreign expenses
wait for the reviewed finality year. Employer-paid and reimbursed costs cannot
also become personal credit expenses. Current code T benefits are allocated
exactly once across children and statements, including spouse-owned sources.

State/tribal special-needs determinations, disability effective dates, separate-
return living-apart/home-cost/residence evidence and affirmative prior-history
reviews are separate source facts. Special-needs finalization can use the
remaining statutory maximum without cash expenses; the separate employer
program requirement controls the additional exclusion. More than three children
retain individual limits and refundable caps rather than sharing one cap.

The 2025 and 2026 calculations now share phaseout arithmetic. The 2025 public
source route still requires its original 2025 evidence and late settlement;
its limits, receipt rules and outputs are unchanged. This supersedes the historical plan's description
of a broad flat shared calculator. Annual 2026 limits live separately in `2026-adoption.ts`.

`calculateAdoptionExclusion2026` replays the source workpaper and explicit
printed MAGI worksheet operands. It calculates Part III per child, including
signed line 31 for special-needs benefits. The foreign prior-benefit worksheet
retains line 9 separately and marks `requires_prior_benefit_recovery_reconciliation`
when positive; its eventual return/affected-year treatment still needs final
instruction review and binding before a filing route can accept that result.
Pending foreign adoptions and ineligible separate-return claims retain their
current taxable benefits outside the qualifying Part III rows.

`settleAdoptionCredit2026` separately consumes the finalized return's actual
AGI, foreign addbacks, tax and every prescribed priority credit, including the
Schedule 8812 Worksheet B alternative. It calculates the 2026 refundable split,
nonrefundable limit, oldest-origin use and five-year expiration. Prior balances
remain nonrefundable even above the current MAGI phaseout. Receipt cents are
summed before filed lines; the 2026 calculation rounds printed child lines to
dollars while the shared 2025 source calculation retains its original convention.

The internal AGI adapter now consumes the retained adoption source ledger and
reconciles its filing status and rounded W-2 wages to the incoming income graph.
It derives the Part III worksheet from those income lines and Schedule 1,
without accepting entered adoption MAGI or line 1f. Social Security is computed
with current employer benefits before exclusion: the taxable wage adjustment
and Pub. 915's exclusion addback cancel, including when a special-needs exclusion
exceeds cash benefits. The chosen lump-sum election amount then enters exclusion
MAGI. The adapter calculates the signed line 1f, student-loan interest using
post-exclusion income, and final AGI in that order. Retained SSA workpapers show
both the actual taxable wages and the separate adoption exclusion addback.

The shared income aggregator and 2026 Form 1040 now preserve signed adoption
income. Shared Schedule 1 arithmetic supplies the exclusion worksheet rather
than a second list of income rules. Schedule 1 line 24 adjustments and student-
loan interest are omitted from the adoption exclusion worksheet's prescribed
adjustments; foreign earned income is added back. Current benefits for pending
foreign adoptions remain taxable outside Part III. Previously taxed foreign
benefits still require affected-year recovery reconciliation and cannot enter
this internal income path yet.

The internal child-credit stage now settles adoption within the same calculation
as CTC/ACTC and energy carryforward. It receives the retained adoption source
and actual MAGI addbacks from AGI, verifies return owners, and uses the actual
regular tax, Schedule 2 Part I and preceding care/education/Schedule R/saver
credits. With qualifying children, Schedule 8812 Worksheet B line 14 reserves
child credit before adoption; adoption uses available tax before energy, and
both nonrefundable amounts enter Worksheet B line 15. ODC-only returns retain
their ordinary priority; no-dependent and zero-tax adoption returns still
calculate the refundable portion. Signed wage subtotals reach the shared child
earned-income worksheet, whose nonpositive-total rule is preserved.

Matching adoption references are required in child and energy reviews rather
than retaining contradictory no-other-credit answers. The internal outputs
feed Schedule 3 line 6c and Form 1040 line 30. Form 1062 replays nonrefundable
adoption with its hypothetical tax and preceding credits, while retaining
actual AGI and the refundable amount. It verifies both actual nonrefundable
and refundable adoption destinations and requires the matching review inventory.
The refundable share is excluded from regular-tax credit totals under
[IRC 23(a)(4)](https://uscode.house.gov/us/usc/119-118/t26/s23/).

### Corrected 2025 carryforward accounts

The IRS's [2025 systemic-adjustment FAQ, Topic G](https://www.irs.gov/faqs/questions-and-answers-about-adoption-tax-credit-carryforward)
requires corrected adoption carryforwards for 2026. Its special refund treatment
applies only to 2025; it does not make 2026 prior-year balances refundable.
Every carryforward source now includes a completed-year account review and
transcript reference, with either no adjustment or the adjustment notice and
corrected worksheet. Pending adjustments cannot be asserted as final balances.

For an adjustment, reconstruct available 2025 credit by origin (2020–2025),
reconcile original nonrefundable use and filed surviving origins, then allocate
original use plus the notice's **refundable adoption credit increase** oldest
first. The credit increase is not the cash refund or balance-due change. Retain
2020's separate expiration so a correction consuming otherwise expired credit
does not wrongly reduce the 2026 opening balance. The corrected worksheet total
must match the resulting 2021–2025 balances; only those balances enter 2026
settlement. The original filed data and both allocation workpapers are retained.

### Development intake and remaining consumers

The development registry now exposes `form8839` as a claim-only input. General
supplies actual filer identity and dependent records; W-2 supplies issued wages
and code T. The node reconciles the code T total and checks child identity against
matching dependent records before emitting the retained source to AGI. Positive
code T requires a reviewed adoption claim. An ordinary expense claim also works
without W-2s. No caller-entered MAGI or credit capacity is accepted.

Social Security review now names the actual adoption inventory when an exclusion
applies; a contradictory no-exclusion review or a different inventory fails.
EIC accepts signed wage subtotals and replays the adoption income operands against
actual owners. Its disability-wage reconciliation uses wages before the adoption
adjustment. Taxable employer adoption benefits count in EIC earnings; excluded
benefits do not, following [Pub. 596](https://www.irs.gov/publications/p596).

The ordinary no-claim care and education consumers accept signed wages. Care
claims with unchanged reconciled wages and adult education claims proceed.
Care now replays actual adoption sources and matches the issued W-2 inventory.
Each child's signed adjustment follows its employer-program owner, and all owner
adjustments must sum to Form 1040 line 1f. Special-needs cases retain the actual
qualifying program even when no benefit was paid. The workpaper keeps separate
spouses' adjustments even when their return total is zero. Monthly care reviews
allocate the actual owner adjustment across all twelve months, require a cited
service-month review, and apply the student/disability floor after each month's
signed adjustment. Gross support compensation is not substituted for care wages.

Care claims naming the adoption inventory now defer their benefit calculation to
AGI. One coordinated stage resolves actual taxable care, the adoption exclusion
and taxable Social Security before emitting income. The final care calculation
replays the retained source and must match the executed line 1e. It no longer
requires the old care exclusion to remain unchanged. A child with multiple
employer-program owners and a nonzero adjustment still requires a reconciled
per-spouse exclusion allocation; it is never assigned a joint total by default.

The coordinator searches the bounded whole-dollar care-benefit amount. Increasing
taxable care increases adoption MAGI, reduces its exclusion and increases care
earnings, so the computed taxable-care amount cannot increase. Monthly service
allocations remain reviewed source facts and must match the final derived owner
adjustment; no trial values enter the executed graph. Each attempt retains its
care amount, derived care amount, adoption exclusion, taxable Social Security and
phaseout precision. Final replay also verifies monthly taxable-care allocations.

The [2026 draft Form 8839](https://www.irs.gov/pub/irs-dft/f8839--dft.pdf) permits
at least three decimal places on line 27. The stage tries three through six places,
retaining the first consistent result. Six places represent the exact ratio of
whole-dollar excess MAGI to $40,000. The retained precision is replayed by every
income consumer and printed on Form 8839, with the widget's three-digit limit
removed only when needed. Default/shared 2025 calculations still use three places.
A remaining whole-dollar gap fails explicitly instead of emitting inconsistent
Form 2441/8839/1040 amounts; resolving those source-cent/printed-line cases remains
required work.

This coordination follows the printed Form 8839 line-25 worksheet and
[IRC 137(b)(3)](https://uscode.house.gov/us/usc/119-118/t26/s137/), the care
instructions' taxable-wage definition, and Pub. 915's adoption addback. The
published adoption instructions and Pub. 915 still describe 2025 and are method
comparators. It is a simultaneous application of their worksheet relationships,
not an IRS worked example of the combined case.

Under-24 education and child-tax support reviews now name the actual adoption
inventory. Both consumers replay its exclusion using the actual return owners,
restore the signed line 1f adjustment, and add actual current benefits received
as compensation. A program with paid benefits requires a referenced employer
review that the benefits compensate personal services and are not a distribution
of corporate earnings or profits. The retained workpaper traces each payment,
program, owner and review. Payments are summed before whole-dollar rounding.
Missing classification evidence, mismatched source inventories and unreconciled
issued wages fail explicitly. These internal operands cannot be entered through
the public claim schema.

This applies the personal-services definition in
[IRC 1(g)(2)](https://uscode.house.gov/us/usc/119-118/t26/s1/) and
[911(d)(2)](https://uscode.house.gov/us/usc/119-118/t26/s911/), together with the
[2026 draft education instructions](https://www.irs.gov/pub/irs-dft/i8863--dft.pdf)
and [child-tax instructions](https://www.irs.gov/pub/irs-dft/i8615--dft.pdf).
It is an application of their general compensation definition to reviewed
employer payments, not an adoption-specific IRS worked example. The support
calculation is taxable wages minus the signed adoption adjustment plus actual
current compensation. Thus $10,000 wages and $4,000 excluded benefits give
$14,000 support earnings while AGI retains $10,000 wages. A $17,670 special-needs
exclusion with no actual payment restores $10,000 support earnings without
inventing $17,670 compensation. Taxable pending-foreign benefits count once.

This support calculation does not add excluded compensation to gross income,
Form 8615 unearned income, the dependent standard deduction or EIC. Concurrent
education/child-tax reviews must agree on income sources, enrollment and support.
Draft bundles replay the same results when selecting Form 8615 and settling the
refundable education and adoption credits. Prior foreign-benefit recovery remains
blocked until its affected-year income binding exists.

This is **development calculation intake, not public filing support**. Native
MeF remains open. Nonspouse allocations, combined unrelated
adoption attempts, reimbursements of previously credited expenses, missing child
identifiers, stronger foreign finality/history binding and the prior-benefit
recovery destination also remain open.

### Draft attachment and continuation mapping

The static development bundle now includes Form 8839, sequence 38, using the
pinned two tax pages after removing the IRS cover. It replays the atomic
child/adoption/energy credit calculation and the retained exclusion source,
requires identical source inventories, and reconciles Form 1040 lines 1f, 11b,
18, 19, 28 and 30 plus Schedule 3 line 6c before rendering. Signed line 31 and
2027 carryforward print in their own fields. All 101 template fields must retain
the reviewed inventory and one widget each; output contains no widgets or
AcroForm tree.

Part I prints identity, birth year, disability, special needs, foreign status
and finalization. Prior records now retain the filed form copy and child column;
multiple children may cite one document only with consistent ownership/year and
distinct positions. Placement preserves each prior column and fills unused
columns with new children. When needed, additional two-page Forms 8839 carry
per-child rows while aggregate Parts II/III amounts appear only on the main copy.
The “See Attached” notation sits beside the Part I caution. This follows the
[2025 instructions' continuation and prior-column rules](https://www.irs.gov/instructions/i8839),
which remain a method comparator until final 2026 instructions are available.

Carryforward-only claims select an attachment; empty/inactive inventories do
not. Part III stays blank when no qualifying benefit claim exists. Current
benefits outside Part III remain taxable on line 1f and receive a separate income
reconciliation after the official forms, without changing printed line 31.
The retained calculations continue to hold carryforward origin/expiry details;
no private supporting decree or wage statement is fabricated as an attachment.

PDF tests inspect values at their printed coordinates, reject each mismatched
return destination and owner, and cover negative special-needs income, five
children, partial phaseout, prior-column placement, shared prior documents,
carryforward-only claims, inactive claims and pending foreign benefits. A
synthetic five-child bundle with mixed ordinary/special-needs benefits is rendered
for visual inspection. This does not establish native MeF or filing readiness.

The income sequence follows the current [Form 8839 instructions' line 25
worksheet](https://www.irs.gov/instructions/i8839), [Pub. 915 Worksheet
1](https://www.irs.gov/publications/p915) and [Pub. 970 student-loan MAGI
rules](https://www.irs.gov/publications/p970). These publications still describe
2025 and remain method comparators pending final 2026 instructions.

Fresh IRS checks on October 16 found that both the published and draft
instruction URLs still serve **2025**. The visible 2026 draft form supplies the
annual amounts and line destinations; the 2025 instructions are explicitly a
method comparator. The preceding income/credit regression run passed 281 typed
tests, including shared 2025 child/adoption regressions, 2026 source workpapers,
corrected carryforwards, child/energy ordering, Form 1062 replay, signed income,
public claim routing and care/education reconciliation diagnostics. The repository
unit gate passes 137 tests with 3,897 modules in preflight and unchanged runtime
files. The current PDF/source regression passes 52 tests, including six adoption
PDF cases and the existing energy/saver attachment checks. Footer pixel checks
confirm visible draft text outside the template clipping state; appearance fonts
are materialized before isolated page embedding.
Full public return/PDF/MeF validation remains
required below.

## Build order and acceptance

1. Pin final 2026 Form 8839 instructions, current XSD and rules. Resolve
   domestic/foreign timing, special-needs evidence, per-child expenses and
   benefit history, the two MAGI worksheets, MFS exception and attachment
   requirements against those sources.
2. Add a child-keyed adoption ledger and W-2 code T allocation; calculate
   Part III exclusion and the AGI effect before final credit MAGI when the
   instructions require iteration. Prevent expense reimbursement overlap.
3. Calculate Parts II/III completely, including the credit-limit worksheet,
   carryforward origin/expiry, signed line 31, and Schedule 3-A handoff.
   Reconcile 1040 lines 1f/30, Schedule 3 line 6c and 2027 carryforward.
4. Render all required 2026 PDF answers/continuations and current `IRS8839`
   XML, then validate the full return, XSD, active rules and attachment
   references. Inspect the per-child print fields, not just 1040 totals.
5. Cover one/multiple/>3 children, special needs with zero expenses,
   domestic pre-final and foreign final timing, employer reimbursement,
   phaseout boundaries, MFS exception, prior-year credit/exclusion, 2025
   nonrefundable carryforward, negative line 31 and zero tax liability.
   Retain TY2025 regressions for shared calculation code.

This is a research and implementation contract, not a registered TY2026
Form 8839 filing route.

The support-compensation follow-up passes 112 distinct targeted tests across
adoption income/credits, education, child tax, business combinations and draft
PDFs, plus the 137-test repository unit gate (3,901 modules, runtime unchanged).
Cases include excluded and taxable payments, zero-payment special needs,
annual rounding of fractional payments, separate-return spouse identity,
source/owner/evidence rejection, agreed support inventories and unchanged
unearned-income/dependent-deduction treatment. The combined draft was rendered
and inspected; pixel checks also verify both education draft warnings across
ordinary, LLC and extra-school pages. These checks establish this development
increment, not complete TY2026 coverage or filing readiness.

The coordinated-income follow-up passes 184 typed source/PDF tests, including
shared 2025 adoption regressions, plus the 137-test unit gate (3,907 modules,
runtime unchanged). A $20,000 wage/$17,670 exclusion example now derives $2,670
taxable care and $5,000 AGI; adding the reviewed $10,000 net Social Security
source yields $1,335 taxable Social Security and $6,335 AGI. The joint phaseout
case with $270,030 wages settles at $2,069 taxable care, $14,569 adoption exclusion
and $257,530 AGI using four decimal places. Both forms' final pages were rendered
and inspected. The $270,039 companion case still has a whole-dollar gap at all
permitted retained precisions and explicitly fails rather than filing inconsistent
lines. These are synthetic regression fixtures, not taxpayer returns.

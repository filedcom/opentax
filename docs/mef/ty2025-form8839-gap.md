# TY2025 Form 8839 coverage gap

Status: **active filing fails closed** in the tax node, MeF descriptor, and PDF
descriptor. The pure Part II calculation helper remains for future source-backed
work, but it does not emit Form 1040, Schedule 3, IRS8839 XML, or a filled PDF.
No tests, typecheck, XSD validation, PDF rendering, or IRS ATS were run for this
change.

The child input is now a **single typed source-ledger shape**, replacing the old
aggregate `qualified_expenses`, `special_needs`, `prior_year_credit`,
foreign/finality flags, and filer-confirmation booleans. It requires a named
child and 2025 domestic final-decree record reference; each paid expense has a
date, category, payee, amount and receipt reference, with a separate
reimbursement amount/reference. An optional state/tribal special-needs
determination and prior filed Form 8839 lines 3 and 6 have their own record
references. The pure Part II helper now derives line 5 from 2024/2025
unreimbursed receipt amounts, derives line 3 from the last filed form's lines 3
plus 6, and uses the remaining statutory maximum for a 2025-final U.S.
special-needs adoption. It rejects over-reimbursement, missing reimbursement
reference, out-of-window payment dates, and prior credit above the per-child
maximum. Old amount-only child objects fail schema validation; there is no
compatibility alias. These are source _claims with provenance keys_, not
verified document contents or filing authorization. Focused cases are written
but unrun.

The pure worksheet now follows the
[2025 line 5 special-needs instruction](https://www.irs.gov/instructions/i8839):
a qualifying U.S. special-needs adoption finalized in 2025 uses $17,280 less
prior-year credit on line 5 even when paid expenses are zero. It rejects a
prior-year per-child credit over $17,280. Focused positive and negative cases
are written but unrun. This does **not** prove that an asserted special-needs
determination or finalization is eligible, and it does not reopen filing.

### Staged one-child reviewed-evidence preflight (unrun)

`nodes/intermediate/forms/form8839/reviewed_source.ts` now adds a strict
**preflight for the existing child ledger**, not a second input format or an
export route. For one single-filer, 2025-final U.S. child, no special-needs or
prior-year claim, and no employer benefits, it cross-checks the child's name,
SSN, decree date/jurisdiction/document ID, and every receipt's document ID,
payment date, category, payee and whole-dollar amount against a structured
review record. Each expense needs a distinct payment-proof document, and
duplicate/missing/mismatched records, reimbursements, and unsupported facts
reject. Review facts explicitly cover U.S. status when adoption efforts began,
under-18 status, adoptive-parent identity, spouse-child/other-claimant
exclusions, government/employer/other reimbursement, duplicate federal tax
benefits, and surrogacy/illegal expenses. This narrows the
[2025 qualified-expense and eligible-child rules](https://www.irs.gov/instructions/i8839)
to a deliberately smaller path. Focused preflight, arithmetic, and rejection
cases are written but unrun.

The supplied SHA-256 strings and review metadata **do not authenticate the
underlying document bytes**. No document ingestion or independent reviewer
workflow is connected, so the gate is not invoked by the active node; node, MeF,
and PDF positive claims still fail closed. The preflight does not supply MAGI or
prove tax capacity.

`nodes/intermediate/forms/form8839/pre_adoption_reconciliation.ts` now stages a
separate **pure, unrun** final-return arithmetic join for this same narrow
one-child/no-benefit path. It first runs the reviewed child preflight and
prepares Part II from that same child ledger; it does not accept an independent
prepared-credit object. Given the existing typed Form 1040 sink input, it
re-runs that sink to obtain its own pre-adoption line 11b AGI and line 18 tax;
it rejects an asserted AGI inconsistent with computed income minus adjustments.
It uses the sink's typed `credit_limit_schedule3_lines` and checks Schedule 3
line 7 and total Form 1040 line 20, then uses the explicit Form 1040 line 19
branch for the child-credit priority. Worksheet B cases and late Schedule 3
finalizations reject rather than silently taking an unsettled priority. An
already populated Form 8839 line 30, Schedule 3 line 6c, Form 2555 deposit, or
employer benefit also rejects. This feeds the existing `settleForm8839Credit`
function and derives refundable line 13, nonrefundable line 18, and the credit
limit capacity **without accepting a caller-provided MAGI or worksheet line 5**.

The zero MAGI add-backs are allowed only with three strict, separately
referenced return-wide nonapplicability reviews for §933 income, Form 2555, and
Form 4563. Absent entries do not default to zero. These reviews are supplied
metadata, not authenticated tax records; the function is not called from the
executor and does not settle employer benefits or territory-positive returns.
Focused positive/rejection cases are written but unrun. It remains necessary to
prove that the child source and this sink input come from the _same_ executor
return, then reconcile their settled values into Form 1040, Schedule 3, native
`IRS8839`, and the canonical PDF before any filing route opens.

`nodes/intermediate/forms/form8839/staged_documents.ts` now provides an
**unregistered** projection for that last comparison. It takes the reviewed
child source, the pure pre-adoption sink calculation, and a proposed final
pending snapshot; the source ledger must match pending `form8839` exactly, and
final Form 1040 lines 11/18/19/20/30 and Schedule 3 lines 6c/7/8 must equal the
independently settled pre-adoption figures plus Form 8839 lines 13/18. It emits
one-child `IRS8839` XML in the TY2025 XSD order and a field-value map for page 1
of the
[canonical 2025 Form 8839 PDF](https://www.irs.gov/pub/irs-pdf/f8839.pdf). This
is deliberately narrower than the arithmetic helper: single filer, nonnegative
whole-dollar MAGI no higher than $259,190, no phaseout, no prior child claim or
carryforward, no employer benefits, positive nonrefundable credit, and no unused
nonrefundable adoption amount that would create a later carryforward. Focused
projection and mismatch cases are written but unrun. The function does **not**
certify that its plain pending argument came from the executor. Neither native
nor PDF descriptor calls it; both remain blocked.

An integration audit found the exact provenance stop: the executor receives
start-node inputs as caller data, validates nodes, and stores only pending
fields and diagnostics. It has no reviewed-document bytes, content-hash
verification, reviewer attestation service, or return-scoped evidence handle for
the decree, receipts, payment proofs, and MAGI nonapplicability findings.
`reviewed_source.ts` and `pre_adoption_reconciliation.ts` accept review objects
as independent function arguments. Matching asserted document IDs and
SHA-256-shaped strings to the child ledger does not establish that the
underlying documents were read or that both reviews belong to the executed
return. Copying those objects into a Form 8839 node or pending field would make
them executor-_carried_ caller assertions, not executor-owned reviewed evidence.
Therefore no prepared-credit deposit or finalizer join has been activated. The
first missing integration is a return-scoped reviewed-evidence ingress that
verifies source bytes and metadata and binds the review result to the same
immutable child ledger and execution; the tax joins described below follow that
gate. Until then, positive claims still fail at the node and both exporters.

The minimal shared change for a live route is an executor-owned prepared Form
8839 deposit that carries the **same child-ledger identity and reviewed facts**,
plus a Form 1040 sink field for that deposit. A sink/finalizer would have to
compute pre-adoption Form 1040 line 11b and line 18 once, use the settled
child-credit basis and named Schedule 3 priorities, settle Form 8839, then
deposit its line 13 into Form 1040 line 30 and line 18 into Schedule 3 line 6c
(and thence Form 1040 line 20). The executor must own both the pre-adoption and
final pending snapshots and verify no intervening late credit changed those
inputs; it must not accept either snapshot from the filer. Only after that
provenance join may native/PDF descriptors consume the exact same settled
object. No shared sink, executor, Schedule 3, registry, or exporter was changed
here.

For this narrow source to reach a positive return, an executor-owned Form 8839
prepared deposit must reach the final Form 1040 sink (currently absent). That
sink must form line 7 MAGI from its computed line 11b plus a reviewed §933
excluded-income amount or documented zero, calculated Form 2555 lines 45/50, and
calculated Form 4563 line 15 or a reviewed no-Form-4563 finding. Before
inserting adoption credit, it must calculate Form 1040 line 18 and select the
correct Schedule 8812 Worksheet B line 14 versus Form 1040 line 19 priority
amount, then use the already deposited named Schedule 3 priority lines while
excluding adoption line 6c. The resulting Form 8839 line 13 must join Form 1040
line 30 and line 18 must join Schedule 3 line 6c/Form 1040 line 20, without
feeding either amount back into its own limit. Native `IRS8839` and PDF must
then reconcile those same settled values and child identity. None of these joins
is wired by this preflight.

## Why the former bounded route was not filing-ready

The [2025 Form 8839](https://www.irs.gov/pub/irs-pdf/f8839.pdf) and
[instructions](https://www.irs.gov/pub/irs-pdf/i8839.pdf) require child
eligibility and timing, qualified unreimbursed expenses, modified AGI, and a
completed Credit Limit Worksheet. A plausible child identity and self-attested
confirmation of finalization/payment are not evidence of an adoption decree,
payment ledger, or employer reimbursement. The current graph does not reconcile
those asserted facts to primary records.

The old caller-supplied `magi` and `credit_limit_worksheet_line5` inputs have
now been removed from the strict Form 8839 source schema. A typed two-stage pure
contract separates `prepareForm8839Credit` (child ledger and Part II lines 2–6)
from `settleForm8839Credit` (the finalized pre-adoption-credit return snapshot).
Settlement derives line 7 MAGI from Form 1040 line 11b plus named Puerto Rico,
Form 2555 lines 45/50, and Form 4563 line 15 amounts. It derives Credit Limit
Worksheet lines 2–5 from Form 1040 line 18, a discriminated Form 1040 line 19
versus Schedule 8812 Worksheet B line 14 basis, and precisely the Schedule 3
lines listed in the 2025 worksheet. Adoption line 6c is not in that priority
sum. This is a calculation contract, **not** an accepted caller-supplied
final-return substitute or an open filing route.

The settlement calculates Credit Limit Worksheet line 5 as the smaller of Form
8839 line 16 (currently line 14 without carryforwards) and remaining tax after
the listed prior credits. Thus a caller can no longer inject the impossible
$12,000 worksheet value for a $10,000 line 16. This calculation remains
unconnected to executor-owned finalized return data.

The pure settlement now accepts a finite **negative** Form 1040 line 11b AGI, as
a tax return can have negative AGI. It exposes Form 8839 line 13 separately from
line 11c so a later finalizer can reconcile that refundable amount to Form 1040
line 30. Focused written-but-unrun cases cover negative AGI and a return with no
nonrefundable tax capacity: line 13 remains refundable while lines 17 and 18 are
zero. This is calculation-only progress, not permission to file from a
caller-supplied final-return snapshot.

### Source-graph progress and remaining MAGI facts

Schedule 3 now sends its typed, calculated priority-line snapshot to the Form
1040 sink whenever Schedule 3 has an active amount, rather than only when
another late-settled credit is pending. This is the source for the Form 8839
Credit Limit Worksheet's listed Schedule 3 lines; it excludes adoption line 6c
from the priority sum. Form 2555 now sends its _calculated_ line 45 to the Form
1040 sink for Form 8839 line 7. Its strict employee-only physical-presence
filing source also calculates line 50 as zero: Form 2555 line 36 equals line 33,
so the [2025 Part IX gate](https://www.irs.gov/instructions/i2555) cannot be
met. This is a source-derived nonapplicability finding, not a default zero for
other Form 2555 routes. These deposits have focused cases written but unrun and
do not activate Form 8839 filing.

The [2025 Form 8839 line 7 instructions](https://www.irs.gov/instructions/i8839)
also require Puerto Rico excluded income, Form 2555 line 50, and Form 4563 line
15 when applicable. The aggregate Form 2555 route has no filed line 50
calculation; only the strict employee-only route now establishes zero. There is
no Form 4563 source/calculation node. Schedule 8812 accepts a
`puerto_rico_excluded_income` number, but it is not a reviewed §933 income
ledger and cannot be reused as proof of Form 8839's add-back. The Schedule 1-A
zero-exclusions review fields are declarations with references, not record-level
derivations. Therefore a finalizer must not infer zero for any of these missing
facts or accept caller-supplied MAGI additions. A sound positive route needs a
reviewed §933 income record or reviewed zero-income source, a calculated Form
4563 line 15 or reviewed no-Form-4563 filing record, and a completed Form 2555
line 50 or source-backed proof that Part IX is inapplicable. The active Form
8839 guard remains in place.

### Territory add-back source audit (2025)

The [2025 Form 8839 line 7 instructions](https://www.irs.gov/instructions/i8839)
require the Puerto Rico exclusion and the amount from **filed** Form 4563 line
15. [2025 Publication 570](https://www.irs.gov/publications/p570) makes the
Puerto Rico amount conditional on bona fide residence and income source, with
special treatment for U.S. government pay and mixed-location services. It also
requires disallowing deductions and credits allocable to excluded territory
income on the federal return. Consequently, neither a Puerto Rico wage total nor
a territory-resident checkbox would establish the §933 add-back. A usable record
needs the residency/presence and tax-home facts, each income document and
sourcing workpaper, the federal/territory return treatment, and the
excluded-income deduction/credit allocation that reconciles to Form 1040 line
11b. There is no such reviewed record or return-wide allocation in this graph.

[Form 4563](https://www.irs.gov/pub/irs-pdf/f4563.pdf) line 15 sums its lines
7–14, but the form also requires Part I bona fide-residence and absence details,
and its Part II lines include wages, interest, dividends, business, gains,
rents/royalties, farm, and other income.
[Publication 570](https://www.irs.gov/publications/p570) requires an eligible
exclusion to be claimed on an attached Form 4563 and similarly disallows
allocable federal deductions/credits. A reviewed 2025 Form 4563 source would
need its complete Part I residency/absence record, source and
government-employer classification for every Part II line, the line 7–14 sum,
and a native/PDF attachment and Form 1040 exclusion reconciliation. This repo
has none of that, so adding a standalone `line15` number or record ID would be a
new assertion-only input rather than a source-backed path. A purported zero
likewise needs a return-wide review that no §933 exclusion or Form 4563 filing
applies; the existing Schedule 1-A review declarations do not establish that for
Form 8839. Focused pure-settlement cases now reject either missing territory
component instead of inferring zero; they do not activate filing.

The Form 1040 sink also currently lacks an executor-owned prepared Form 8839
deposit. Before any positive route can open, that deposit must be settled
against its actual pre-adoption line 11b/18, the Schedule 8812 line-19 versus
Worksheet B basis, and the named Schedule 3 priority lines **after** other
late-settled credits. The resulting Form 8839 lines 13/18 then need one native
and PDF projection reconciled to final Form 1040 lines 30/20 and Schedule 3 line
6c. Record IDs in the current child ledger and a raw
`FinalizedReturnCreditContext` caller object cannot substitute for those
executor-owned facts.

The Schedule 8812 node now calculates Worksheet B line 14 from its line 12,
qualifying-child count, complete earned-income worksheet, and, when the IRS line
6 branch requires it, W-2/payroll, Schedule 1/2, EIC and Schedule 3 line 11
sources. The old caller-provided `worksheet_b_line14` is rejected, and the
calculated amount reaches the Form 8859 credit-limit input. That Form 8859 sink
field can still be populated independently of this node and needs a source
reconciliation before it is treated as final-return evidence. This corrects the
arithmetic source of the Form 8839 substitution for Form 1040 line 19, but does
**not** make the adoption credit filing-ready. The Schedule 8812 node still
receives caller-provided Worksheet A Schedule 3 amounts, Worksheet B line 15,
and sometimes payroll/EIC amounts, rather than a settled return snapshot. In
particular, Worksheet B line 10's refundable adoption amount must be settled
before using line 14 to limit the nonrefundable adoption credit. The finalizer
must reconcile these values and the Schedule 8812 result to the same filed
return before it can use this line 14 as trusted credit-priority evidence. This
is separate from the missing territory add-backs and child-record review.

## Reopening the route

### Source-graph audit

- `w2` routes Box 12 code T to `form8839.adoption_benefits`. The new child
  ledger can identify decree, receipt, reimbursement, special-needs
  determination, and last-filed-form records, but no current ingestion/review
  path verifies their contents or links a W-2 Box 12T amount to the particular
  child's reimbursed expenses and written employer assistance-plan terms. Under
  the [IRS 2025 instructions](https://www.irs.gov/instructions/i8839), a credit
  and employer exclusion cannot use the same reimbursed expense, and a W-2
  benefit amount alone does not prove an exclusion.
- Registry order currently runs `form8839` before `agi_aggregator`, `agi_final`,
  `income_tax_calculation`, `schedule3`, and `f1040`. The node cannot yet obtain
  the typed finalized-return context. Taxable employer benefits on line 1f also
  feed AGI, so that path requires a separate ordered exclusion calculation, not
  a backward edge from finalized AGI. The pure settlement contract rejects
  employer benefits.
- The new pure settlement computes the actual credit-limit capacity from line 18
  and required preceding credits; a raw worksheet-line-5 amount no longer enters
  the source model. It still cannot prove that its typed context came from the
  executor's finalized return, so active node/MeF/PDF guards remain in place.
- The bounded native `IRS8839` group previously encoded one child, but native
  identity fields cannot establish eligibility or expenses. MeF and PDF remain
  fail-closed even with plausible decree and receipt references; focused
  negative cases are written but unrun.
- Even a fully phased-out result from the pure settlement is not an escape
  hatch: it has not been invoked with executor-owned finalized return data and
  W-2 benefits may remain taxable.
- The former `magi` and worksheet-line-5 inputs now reject at schema parsing,
  including in direct calls; the pure settlement's MAGI/limit values are derived
  from a complete typed snapshot instead.
- The typed `prior_filed_form8839` reference now records the
  [2025 instructions'](https://www.irs.gov/instructions/i8839) lines 3 and 6
  from the last filed form for line 3. No actual prior return is ingested or
  verified, and no five-vintage nonrefundable carryforward worksheet is wired
  into the graph.

### Exact graph integration still required

`staged_sink_finalizer.ts` now demonstrates the smallest direct sink join
without accepting caller-provided pre- or post-adoption return snapshots. It
uses the existing one-child reviewed source and typed Form 1040 sink input,
recomputes the pre-adoption Form 1040 through the sink, settles Form 8839 once,
inserts only the resulting line 18 into Schedule 3 line 6c/Form 1040 line 20 and
line 13 into Form 1040 line 30, and computes the final Form 1040 again. It
checks the unchanged AGI, tax before credits, and child-credit priority, as well
as the derived Schedule 3 line 7/8 and final Form 1040 line 20/21/30. The
final-return values returned by this helper come from its own computation; there
is no accepted `finalPending` argument. This is **staged pure logic**, not an
executor-owned pending deposit or a filing route. The early Form 8839 node still
rejects every active claim, and the registered MeF/PDF descriptors still reject.
Focused cases were written but not run in the build-first phase.

Activation still requires the executor to own the reviewed source and pass its
immutable prepared result to this sink exactly once, then merge the computed
Schedule 3 line 6c/7/8 and Form 1040 line 20/30 into pending without a second
credit pass. Before that, the required adoption decree/payment evidence must be
bound to reviewed bytes, MAGI nonapplicability findings authenticated, and all
earlier/late credit-priority branches proved settled. Native and PDF must
consume those same final values. A caller-transcribed review record is not
independent evidence, and this helper must not be wired around the active filing
guard as a shortcut.

The smallest one-pass integration does **not** move the existing node after
`f1040`. In `forms/f1040/nodes/intermediate/forms/form8839/index.ts`, the early
node would validate/review one eligible domestic source case and send only its
prepared Part II lines (and immutable child source) to a new typed Form 8839
staging field on `forms/f1040/nodes/outputs/f1040/index.ts`; no credit amount is
emitted early. The `f1040` sink would calculate its own pre-adoption line 11b
and line 18 and consume already assembled Schedule 3 **non-adoption** line
items, plus sourced Form 2555/4563 and Puerto Rico additions. It would call
`settleForm8839Credit` once, insert its nonrefundable line 18 into Schedule 3
line 6c/1040 line 20 and refundable line 13 into Form 1040 line 30, then compute
final totals. It must not use its own post-adoption line 20/21 to derive
worksheet capacity. The Form 8839 MeF descriptor
(`forms/f1040/2025/mef/forms/f8839.ts`) would reconcile the prepared source,
settled line values, final 1040 and Schedule 3 pending records before emitting
`IRS8839`; the PDF descriptor would project the same settled values.
`forms/f1040/2025/registry.ts` order could remain unchanged if the early node
only stages source and the sink owns finalization. The current `f1040` sink does
not yet have that staging field or a verified record-review path, so this bridge
was deliberately **not** wired as a caller-asserted bypass.

Validate child source records against actual documents or a reviewed ledger and
determine whether prior-year returns exist. For a no-employer-benefits,
one-domestic-child path, the minimal graph change is to defer the Form 8839
calculation until **after** AGI and income tax/AMT are assembled, but **before**
Form 1040's credit/payment totals are finalized: derive Form 8839 MAGI from Form
1040 line 11b plus the required Form 2555/Form 4563/Puerto Rico additions, then
calculate Credit Limit Worksheet lines 2–5 from Form 1040 line 18 and the named
prior credits (including the Schedule 8812 worksheet-B substitution when
applicable). Feed refundable line 13 to Form 1040 line 30 and nonrefundable line
18 to Schedule 3 line 6c, without reading those amounts back into their own
limits. Today's `form8839` runs before `agi_aggregator`, `agi_final`,
`income_tax_calculation`, `schedule3`, and the `f1040` sink, so merely moving
its registry entry after `f1040` would create a backward edge; this requires a
pre-credit return finalization stage or a scoped final-sink deferred-credit
computation plus native-output reconciliation. Neither is currently sourced or
implemented, so the positive route remains closed. The PDF needs a verified 2025
AcroForm field map and visual filled-PDF check. Separate routes remain for
employer benefits, multiple children, foreign adoptions, carryforwards, ATIN,
and MFS exceptions. Do not restore the old flat XML or add an asserted-facts
bypass.

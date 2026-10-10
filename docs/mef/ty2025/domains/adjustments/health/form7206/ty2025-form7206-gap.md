# TY2025 Form 7206 source-to-filing gap

## October 10 single-plan policy-source checkpoint

[Single-plan source proof](./ty2025-form7206-single-policy-review.md) extends the
shared policy/payment contract to scalar taxpayer and spouse plans. Native/PDF
exports require reviewed policy and twelve payment records; legacy calculation
without them remains staging-only. Six packets pass full XSD across71 reviewed
pages, with14 public/108 native/108 fresh-PDF and24 archive rejections. Five
reconcile filed AGI; the original cents case retains a1-dollar derived-line
rounding mismatch (deferred104). Names68/zeros76/positive-C choices86 remain
qualified. The new source gate7/0 and existing single-route gate21/0 pass.
The related gate passed43/45 initially; a corrected synthetic spouse-owner
fixture passed its four-test rerun, verifying all45 related checks (73 unique
tests overall). No full-suite rerun was performed.
Broader parent scope and authenticity/IRS acceptance remain open.

## October 10 independent Schedule C policy-source checkpoint

[Complete policy-inventory evidence](./ty2025-form7206-policy-inventory-review.md)
extends the existing farm issuer/payment reconciliation to both Schedule C
proprietors. Missing or conflicting policy and twelve-month payment records now
reject across all independent-owner plans. Five complete XSD-valid returns and85
qualified reviewed pages reconcile120 monthly records, owner SE, excluded months,
income limits, QBI and final tax;14 public/90 native/90 fresh-PDF and20 archive
mutations reject. The fresh typed gate passes65 tests across nine related modules.
Broader single-plan, owner/business, LTC/PTC, authentication and
IRS acceptance work remains open; no original parent or deferred task is closed.

## October8 current registered-audit reconciliation

The [current bundled audit](../../../../readiness/ty2025-bundled-form-audit-reconciliation-2026-10-08.md) reconciles this form's current scope with actual native/PDF imports and retained terminal evidence. The completed October8 full run records **50 passed/0 failed/0 ignored across9 named modules**; the21 matching runtime paths equaled that snapshot at that checkpoint. The October10 source change above has separate fresh verification. This is selected retained full-run evidence, not a new focused run, full-route support or fresh visual approval. Earlier dated authored/unrun statements below are historical; existing broader source, artifact and IRS requirements remain open. No original checkbox or future task is completed by this correction.


## Current evidence checkpoint (2026-10-06)

The early one-ScheduleC status below is historical. The later
[independent-plan source review](./ty2025-form7206-independent-spouse-plans-review.md)
verifies C/C, primaryC/spousecashF and two-cash-farm owner plans. Actual policy,
month payments, establishing business and ownerSE inventories determine the
deduction after full WOTC wage reductions. The two-farm loss owner retains
policy sources with zero capacity and no invented SE/Form7206 copy. Main
combined source/conflict gate51/0 and replay7/212 C/F plus7/217 two-farm pages
pass; all reviewed PDF bytes remain unchanged.

[Actual business-tip health sources](../../../general/composed-returns/ty2025-business-tip-health-source-review.md)
join plan identifiers on issued NEC/MISC/K tip reviews to actual7206 plans,
apply owner health before eligible-tip net-income limits, and reduce QBI with
both deductions. Nine current PDFs match149 reviewed pages; the same51/0
gate covers source conflicts and prior health/tip/Publication974 routes.
The newer mixedC/F tip source is integrated with combined verification running.
MixedC/F loss-owner, retirement, several establishing businesses/plans,
Marketplace overlap, insurer/payment authentication and IRS acceptance remain
open; these route proofs do not close the parent.

Status: a narrow taxpayer-owned one-Schedule-C, one-non-Marketplace-plan path is
coded and verified in a full TY2025 return with local v5.4 XSD validation and a
12-page filled-PDF inspection, 2026-09-30. Source document bytes, the full bulk
regression, IRS business rules, and ATS acceptance remain unverified.

On 2026-10-04 the checked-in one-plan fixture was regenerated from current
source. All 12 pages were reviewed against its source, pending graph, and
native XML; the selected-scope checker passed exact source/PDF/XML hashes,
page origins, and local TY2025v5.4 XSD. The current packet location and
manifest digest are in the
[validation batch](../../../../testing/ty2025-form1040-validation-batch.md). This does not expand
the supported plan or owner boundary.

The [2025 Form 7206](https://www.irs.gov/pub/irs-pdf/f7206.pdf) and
[instructions](https://www.irs.gov/instructions/i7206) require a separate form
for each trade or business under which a different insurance plan is
established. Its line 4 is the establishing business's earned income, while line
5 is total positive profit from all eligible businesses. Line 6 is their ratio,
line 7 allocates the Schedule 1 line 15 self-employment tax deduction, line 9
allocates the Schedule 1 line 16 retirement deduction, and line 14 is the
smaller of eligible premiums and line 13. An S corporation's more-than-2%
shareholder wages use line 11. The 2025 native `IRS7206` XSD requires
`NameLine1Txt` and `SSN` before any optional line elements.

## Current coded boundary

- `nodes/intermediate/forms/form7206/index.ts` calculates and emits the one-plan
  Schedule C lines 1-10 and 12-14 only after the establishing business's
  reference, taxpayer owner, and computed line 31 match the Schedule C node;
  Schedule SE's computed line 13 matches Schedule 1 line 15; and the actual
  retirement source and plan both show zero line 16. The prior aggregate
  `eligible_health_premiums` and eligibility flag were replaced with twelve
  ordered premium-month records. Each has policy/payment references, a one
  taxpayer-or-spouse covered-person fact, an employer-plan eligibility review
  reference, Marketplace/LTC classification, and any public-safety-officer
  exclusion. The helper excludes employer-eligible months and the sourced
  public-safety-officer amount; a positive exclusion needs its own source
  reference and the plan total cannot exceed $3,000. It rejects Marketplace,
  LTC, missing/duplicate months, and an exclusion larger than the paid premium.
  This is traceable source calculation, not independent authentication of those
  records. The premium source remains a document-reference claim, not a parsed
  insurer or payment record. Literal no-Form-2555 and sole-business claims are
  checked again against the assembled return at MeF/PDF projection.
- The old flat `se_net_profit` and `health_insurance_premiums` inputs are
  rejected. The separate `self_employed_health_insurance` CLI entry now accepts
  the node's single object with `items` and the required
  `marketplace_ptc_premium_overlap` answer. It rejects positive premium-only
  claims at entry with a Form 7206 direction, and rejects an affirmative
  Marketplace-overlap answer with the Publication 974 limitation. Its zero
  premium answer may be retained for review but produces no deduction. There is
  no premium-only bypass.
- `2025/mef/forms/f7206.ts` emits the checked-in TY2025 v5.4 native sequence
  with the identified proprietor name and SSN, recalculates every printed line, and checks the
  one Schedule C, Schedule SE, Schedule 1 lines 3/15/16/17, and Form 1040 line
  10. It rejects Form 2555 and Marketplace/PTC overlap. Schedule 1 MeF now
  includes native lines 16 and 17, which were previously omitted.
- The PDF descriptor maps the sourced recipient and line 6 as `100%`, checks the
  core Schedule C/Schedule 1 reconciliation and overlap exclusions, then
  projects the official fields. The one-plan full-return PDF was inspected on
  Form 1040, Schedule 1, Schedule C, Schedule SE, Form 7206, and Form 8995
  pages. Schedule SE's previously blank computed lines 3-13 now print from the
  same calculation as Schedule 1 line 15 and Schedule 2 line 4; native XML
  carries the corresponding tax and deduction elements.
- The existing Publication 974 single-business calculator remains a separate
  Marketplace-overlap route. It does not emit a Form 7206 document; its
  worksheet and return reconciliation still needs end-to-end review.

### Joint-return spouse-only policy slice

The one-Schedule-C route now also accepts a non-Marketplace policy covering only
the taxpayer's spouse for all twelve months. The plan identifies the spouse and
every monthly premium record identifies that covered person. MeF and PDF
projection require a joint return and match the spouse's name and SSN to both
general source facts and the finalized Form 1040; MeF additionally matches the
return header spouse. The deduction still belongs to the taxpayer-owned
establishing business and uses the same Schedule C, Schedule SE, Schedule 1,
QBI, and Form 1040 reconciliation. A positive full-return fixture and
identity/month-coverage tamper cases are authored but unrun pending the agreed
bulk test. The same identified policy can now switch between taxpayer and spouse
coverage months on a joint return; any spouse-covered month needs the spouse
identity check at MeF and PDF projection. A full-return positive fixture and
spouse identity, missing identity, and premium tamper cases are authored but
unrun pending the bulk test. Separate spouse business ownership, dependents, and
multiple policies remain outside this slice. The policy and payment references
are source claims, not authenticated records.

### Spouse-owned Schedule C Medicare Part B slice

The [2025 Form 7206 instructions](https://www.irs.gov/instructions/i7206)
permit voluntarily paid Medicare premiums similar to qualifying private health
insurance in the deduction. One joint-return spouse-owned Schedule C and one
non-Marketplace plan can now identify the spouse as both business proprietor and
Form 7206 recipient. The same spouse SSN is required in the plan, general source,
final Form 1040, MeF filer, and no-EIN Form 8995 business row; the Schedule C
reference and owner must match the plan. Form 7206 limits the deduction to that
business's net profit after its reconciled half-SE-tax deduction. Schedule SE's
native SSN and PDF header now use the sole spouse proprietor for this bounded
case. The $2,220 Part B example and owner/identity/premium/QBI tamper fixtures
are authored for the deferred bulk gate. Insurer and payment references remain
reviewed source claims, without authenticated bytes. Multiple businesses,
multiple plans, Marketplace/PTC overlap, LTC, nonzero retirement allocation,
and any joint self-employment income requiring separate spouse Schedule SE
calculations remain outside this route.

### Publication 974 mixed-month boundary

The iterative route now accepts one identified Marketplace policy with
partial-year _specified_ premiums even if Form 1095-A coverage continues in
other months. It requires a policy-numbered premium/APTC record for every
covered month, matches those records to the 1095-A node, and matches each
specified Worksheet W month to its full policy month. This directly replaces the
old coverage-month/all-specified source shape, without a fallback. Under
[2025 Publication 974](https://www.irs.gov/publications/p974), Step 2 calculates
PTC for all Marketplace enrollment, but Steps 3 and 5 attribute only the PTC for
months with specified premiums. When monthly Form 8962 column (e) varies and
specified premiums cover fewer than 12 months, those steps use the sum of column
(e) for the specified months; otherwise they use the specified- month to
coverage-month ratio. Business nonspecified premiums must first go through
Worksheet P or Form 7206. The new calculation reconciles both attribution steps
to final Form 8962 and does not subtract total PTC from specified premiums or
infer monthly PTC from annual Form 1095-A totals. Multiple policies,
within-month partial specified premiums, other SE income sources, Form 2555, and
special adjustment ordering remain unsupported here. Worksheet W's establishing
Schedule C reference, net profit, all-positive- business total, Schedule 1 line
15 self-employment tax deduction, and line 16 retirement deduction must now
match the one taxpayer-owned Schedule C, computed Schedule SE, and retirement
source deposited in the return graph. Absent or changed business records reject
before the iterative PTC calculation. Positive and tampered graph-source
fixtures are authored but unrun. This is a source prerequisite for the existing
Publication 974 worksheet route; it does not emit a Form 7206 native/PDF
document for Marketplace premiums. The records are source references, not
authenticated insurer/payment records; the full batch, native XSD, and
filled-PDF visual review remain unrun.

The month-level premium and employer-coverage records are referenced but not
authenticated against actual documents. The bounded route rejects a positive
Schedule 1 line 16 because SEP/SIMPLE/qualified plan inputs have no business
owner; it also rejects a second Schedule C, Schedule F, Form 2555,
Marketplace/PTC overlap, Schedule E/4835/4797, and LTC. The current return-wide
exclusion check is only as complete as the listed source fields and must be
challenged in the full batch. It does not establish broader plan or
covered-person support beyond the single taxpayer or spouse policy.

## Required build boundary

1. Authenticate each insurance plan, establishing business, covered persons,
   eligible months, actual premiums, and excluded employer-subsidized or
   nontaxable public-safety-officer amounts. Reconcile business profit, Schedule
   SE optional-method amounts, Schedule 1 lines 15-16, S-corporation W-2 wages,
   and any Form 2555 amount. For LTC, apply each person's age limit across all
   plans rather than once per form.
2. Extend printed lines 1-14 per business/plan, including line 6's
   cross-business ratio and the line 7/9 allocations. Reconcile the sum of filed
   line 14 amounts once to Schedule 1 line 17 and QBI/AGI. Treat Marketplace
   overlap through Publication 974's sourced calculation, not a guessed
   subtraction.
3. Rebuild native MeF documents with required identity and the exact TY2025
   sequence. Reconcile each document to its own source and the filed return.
   Remap the PDF to the actual 2025 AcroForm, then inspect filled pages.
4. Write cases for one sole proprietorship, two profitable businesses sharing
   the line 7 allocation, a loss-making second business, an S-corporation
   shareholder, Form 2555, LTC per-person limits across plans, and Marketplace
   overlap. Execute them in the agreed full batch after implementation.

No legacy-tag remapping, empty-document skip, or externally asserted deduction
would establish complete filing support. The broader route remains open in the
inventory until the remaining sources and execution gates are satisfied.

A retained Form 7206 export record now requires computed filing lines in both
MeF and PDF. A record with Form 7206-specific identity or plan facts fails at
export instead of being silently omitted in MeF or passed to the PDF writer.
Schedule C/SE context alone may remain for other calculations without filing
Form 7206; the truly empty no-form case also emits no document. This guard
does not expand the one-plan source route or authenticate plan and payment
records.

## Mixed proprietor C/F plan source extension (2026-10-06)

The actual MFJ primary Schedule C/spouse regular cash Schedule F family now
retains issuer policy and twelve issued monthly/payment records for each plan,
actual owner/business inventories and G/NEC farm income joins. Full, individually
income-limited and employer-month-excluded plans flow to separate filed Form7206
copies, Schedule1/1040 and attributable QBI; the reviewed farm-WOTC phase/above
source preserves full determined wage reductions and actual limited current
credit use before/after the correct owner SE and health order. Seven reusable
source fixtures have full TY2025v5.4 XSD and native/direct-PDF conflict evidence;
held replay confirms all 212 visually reviewed pages. See
[the mixed C/F source equations and terminal evidence](./ty2025-form7206-independent-spouse-plans-review.md#mixed-cf-independent-plan-extension-2026-10-06).
Broader loss/optional/patron, multiple-business-owner, ordinary advanced farm,
retirement/PTC and external issuer authentication scope remains open.

### Independent two-farm source extension (2026-10-06)

The existing regular owner-health source family now retains actual independent
primary/spouse cash-farm WOTC income/payroll/control records with one
established issuer/payment/month plan per owner, full/limited/month-excluded
deductions, below/phase/above QBI and limited current credit use. An actual loss
proprietor's paid plan and negative income remain source-bound with zero
capacity and no fabricated positive Form7206/SE copy. See the
independent-spouse-plans-review proof table, seven held source fixtures and
remaining parent limits; this does not establish
optional/patron/PTC/multiple-business or external authentication.

### Mixed C/F loss-owner established source plans

The bounded regular-method mixed C/F owner-health route now retains an actual
loss C or loss F with established policy/payments and zero capacity, while
independently filing only the positive owner's SE/7206 copy. Actual public
G/NEC/payroll/control sources, full WOTC reductions, owner half-SE, income-limited
and employer-excluded month cases settle through QBI and1040. Six full-XSD/PDF
returns and source/native/directPDF conflicts, plus182 all-page inspections,
are documented in `ty2025-form7206-independent-spouse-plans-review.md`.
The source inventory repair preserves negative C profit previously omitted by
a legacy SE tax input; it does not fabricate SE or health amounts. Broader
owner-plan source coverage and external authentication/ATS remain open.

### Section 179 inventory and health ordering — October 9

The related Form4562 route now reconciles the established primary-owner plan,
monthly exclusions and allowed health deduction before its active-income limit,
preserving SE earnings and the resulting QBI reduction. Full and income-limited
premiums, six employer-excluded months and a larger credit-limited asset have
independent final-tax checks; see [section179 evidence](../../../deductions/business/form4562/ty2025-form4562-gap.md).
The fully employer-excluded primary-owner Form8995 rejection remains future-only;
no zero-health filing support or parent-task closure is claimed.

Verification: **44 typed tests passed, zero failed** across the current-year depreciation and health-calculation regression. Four complete returns passed local TY2025v5.4 XSD and have110 reviewed PDF pages (23 inspected distinct renders;87 exact reviewed-page matches), with zero AcroForm fields/widgets. Source inputs, pending results, XML/PDF bytes and hashes are retained in `.state/research/form4562-section179-health-returns/`. No IRS acceptance or broader parent completion is claimed.

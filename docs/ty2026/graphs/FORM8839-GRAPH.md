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

These remain **internal workpapers, not a registered public adoption route**.
General and actual W-2 source routing, SSA source-review scope, the remaining
earned-income consumers (EIC, care and education, including negative wage
subtotals), public source registration, all 2026 PDF fields/continuations and native
MeF remain to connect. Nonspouse allocations, combined unrelated adoption
attempts, reimbursements of previously credited expenses, missing child
identifiers, stronger foreign finality/history binding and the prior-benefit
recovery destination remain open. No caller-entered MAGI or credit capacity
has been added to public intake.

The income sequence follows the current [Form 8839 instructions' line 25
worksheet](https://www.irs.gov/instructions/i8839), [Pub. 915 Worksheet
1](https://www.irs.gov/publications/p915) and [Pub. 970 student-loan MAGI
rules](https://www.irs.gov/publications/p970). These publications still describe
2025 and remain method comparators pending final 2026 instructions.

Fresh IRS checks on October 16 found that both the published and draft
instruction URLs still serve **2025**. The visible 2026 draft form supplies the
annual amounts and line destinations; the 2025 instructions are explicitly a
method comparator. The current income/credit regression run passes 213 typed
tests, including shared 2025 child/adoption regressions, 2026 source workpapers,
corrected carryforwards, child/energy ordering, Form 1062 replay and signed
Form 1040 income. The repository unit gate
passes 137 tests with 3,891 modules in preflight and unchanged runtime files.
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

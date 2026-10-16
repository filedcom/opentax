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

These are **internal workpapers, not a registered return route**. The exclusion
MAGI/AGI sequence, final credit ordering, public source registration, all 2026
PDF fields/continuations and native MeF remain to connect. Nonspouse allocations,
combined unrelated adoption attempts, reimbursements of previously credited
expenses, missing child identifiers, stronger foreign
finality/history binding and the prior-benefit recovery destination remain open.
No caller-entered MAGI or credit capacity has been added to public intake.

Fresh IRS checks on October 16 found that both the published and draft
instruction URLs still serve **2025**. The visible 2026 draft form supplies the
annual amounts and line destinations; the 2025 instructions are explicitly a
method comparator. The new workpapers and unchanged 2025 source/settlement
route pass 42 typed tests covering reimbursement, timing, special needs, signed
benefits, phaseout, multiple children, joint owners, MFS evidence and carryforward
expiry. The repository unit gate passes 137 tests with 3,888 modules in
preflight and unchanged runtime files. Full return/PDF/MeF validation remains
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

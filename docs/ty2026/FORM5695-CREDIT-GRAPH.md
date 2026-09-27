# TY2026 Form 5695 carryforward and credit ordering

Sources: the pinned [2026 draft Form 5695](corpus/draft/f5695.pdf), its
[2026 draft instructions](corpus/draft/i5695.pdf) (SHA-256
`1efab06c78f27ce81c7f3ee0335a91e7a195c2702f35d908609e4cfee0db4bf0`),
and the pinned [2026 draft Schedule 8812 instructions](corpus/draft/i1040s8.pdf).
The current draft Form 5695 has one printed page, six AcroForm fields, and
only four amount lines. The prior-year Form 5695 expense and Part II inputs
are no longer its 2026 filing surface.

The PDF builder maps `Page1.f1_01` and `f1_02` to name/SSN and `f1_3` through
`f1_6` to lines 1–4. It checks the draft hash and arithmetic, requires the
Schedule 3 line 5a amount to equal line 3, removes the draft cover, and
flattens the page. A used-and-unused credit sample passed visual review.
The normal graph still needs the ordered credit calculator below before it
can produce that attachment from source facts.

| 2026 Form 5695 | Required value | Graph consequence |
| --- | --- | --- |
| Line 1 | Unused credit from **2025 Form 5695 line 16**, with origin-year provenance | This is the only new 2026 source amount. Expenses paid or property placed in service after 2025 do not create a new 2026 credit on this form. |
| Line 2 | `max(0, 1040 line 18 − applicable earlier credits)` using the instructions' Residential Clean Energy Credit Limit Worksheet | Resolve after income tax, Schedule 2 line 3, and higher-priority credits are known. The instruction worksheet lists Schedule 3 lines 6l, 1, 2, 6d, 3, 4, 6m, 6f, 6g, 6c, 6h, plus the Schedule 8812 amount described below. |
| Line 3 | `min(line 1, line 2)` | Schedule 3 line 5a, then 1040 line 20. File the form even if line 3 is zero. |
| Line 4 | `line 1 − line 3` | 2027 carryforward, including when line 2 is zero. |

## Schedule 8812 interaction

The Form 5695 worksheet normally subtracts Form 1040 line 19. When the
taxpayer must use Schedule 8812 Credit Limit Worksheet B, its **line 14**
replaces 1040 line 19 for this purpose. Worksheet B line 14 is computed from
the provisional child credit, earned income, Social Security/Medicare tax,
Schedule 1 line 15, Schedule 2 lines 16c/17c, EIC, and Schedule 3 line 11.
It does not depend on Form 5695. Worksheet B line 15 later includes Schedule
3 line 5a and affects the final nonrefundable child credit. The correct order
is therefore:

Schedule 3 line 11 is **excess Social Security and tier 1 RRTA withholding**;
the TY2026 worksheet input now names that source explicitly. The older shared
field name called it an adoption credit, although its line number and
arithmetic were unchanged.

```text
income tax + Schedule 2 line 3 + other credit sources
             ↓
Schedule 8812 Worksheet B through line 14 (when applicable)
             ↓
Form 5695 line 2 → line 3 → Schedule 3 line 5a
             ↓
Schedule 8812 Worksheet B line 15 / Worksheet A → 1040 line 19
             ↓
Schedule 3 total, 1040 tax settlement, PDF and MeF attachments
```

The current registry still expects a user-supplied
`credit_limit_worksheet_2026` for Schedule 8812. Schedule 3 passes its
pre-5695 totals to `credit_resolution`. The new `f5695` input carries the
2025 Form 5695 line 16 amount, while the income-tax and Schedule 2 nodes
supply Form 1040 line 18. For returns without dependent credits, the stage
calculates lines 1–4, finalizes Schedule 3 lines 5a/8, sends the final line
20 amount to Form 1040, and records the unused amount for 2027. Graph and
PDF tests cover a $200 usable credit and a zero-tax full carryforward.
The PDF bundle now includes Schedule 3 from the calculated pending record.

A carryforward return with child or other dependent credits currently gets
an explicit provisional-credit diagnostic. The next graph step is to feed
dependent counts, AGI and the Earned Income Worksheet, payroll-tax, EIC, and
Schedule 3 line 11 source values through Worksheet B line 14 before running
Form 5695. Then Worksheet B line 15 and final Schedule 8812 line 19 can use
the calculated Schedule 3 line 5a. Feeding Form 5695 directly into Schedule
3 without this order would use an unfinished child-credit amount.
`forms/f1040/2026/credit-resolution.ts` now calculates Worksheet B lines
1–14 and the four Form 5695 carryforward lines from named, reconciled inputs.
It covers the earned-income and payroll-tax branches, including Schedule 2
lines 16c/17c. This is a pure calculation module; the registry does not yet
collect all its source inputs or execute the ordered stage.
The shared Schedule 8812 calculator now exposes and uses
`calculateProvisionalSchedule8812Lines` for lines 1–12, so the future credit
stage can obtain the same phaseout result as the final filed Schedule 8812.
The graph planner executes each node once. The credit-resolution node must
next calculate Form 5695, finalize Schedule 3 line 5a and line 8, feed the
final credit list to Schedule 8812, and feed Form 1040 line 20 once. Sending
separate partial line 20 amounts to Form 1040 would produce an accumulated
field and leave the printed Schedule 3 total unfinalized.
Refactor the pure Schedule 8812 worksheet functions into the shared 2026
credit-resolution stage, or provide separate pre- and post-5695 stages with
explicit graph edges. Derive the inputs from registered source nodes and
reconcile any supplied worksheet evidence to them. Preserve the existing
TY2025 path; no 2025 Form 5695 shape belongs on the 2026 input surface.

## Completion checks

1. A $200 prior-year carryforward with sufficient line 18 tax and no
   competing credits prints line 1 as $200, line 2 as at least $200, and line 3
   as $200; line 4 is blank or zero as appropriate. ATS
   [scenario 1](ATS-SCENARIO-01.md) supplies
   this carryforward.
2. A limited-tax case prints line 4 and emits a matching 2027 carryforward;
   a zero-limit case still prints Form 5695.
3. A qualifying-child case using Worksheet B calculates line 14 before
   Form 5695, then line 15 and Form 1040 line 19 afterward. Check the
   combined Schedule 3/Form 5695/Schedule 8812 pages and line 20.
4. Validate the XML form and business rules against the selected current
   TY2026 MeF package, then compare the ATS fixture. The May v1 XSD is
   insufficient for the September return topology.

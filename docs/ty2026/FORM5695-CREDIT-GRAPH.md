# TY2026 Form 5695 carryforward and credit ordering

Sources: the pinned [2026 draft Form 5695](corpus/draft/f5695.pdf), its
[2026 draft instructions](corpus/draft/i5695.pdf) (SHA-256
`1efab06c78f27ce81c7f3ee0335a91e7a195c2702f35d908609e4cfee0db4bf0`), and the
pinned [2026 draft Schedule 8812 instructions](corpus/draft/i1040s8.pdf). The
current draft Form 5695 has one printed page, six AcroForm fields, and only four
amount lines. The prior-year Form 5695 expense and Part II inputs are no longer
its 2026 filing surface.

The PDF builder maps `Page1.f1_01` and `f1_02` to name/SSN and `f1_3` through
`f1_6` to lines 1–4. It checks the draft hash and arithmetic, requires the
Schedule 3 line 5a amount to equal line 3, removes the draft cover, and flattens
the page. A used-and-unused credit sample passed visual review. The registered
graph calculates that attachment from the 2025 carryforward, 2026 tax, and
earlier credit sources.

| 2026 Form 5695 | Required value                                                                                                              | Graph consequence                                                                                                                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Line 1         | Unused credit from **2025 Form 5695 line 16**, with origin-year provenance                                                  | This is the only new 2026 source amount. Expenses paid or property placed in service after 2025 do not create a new 2026 credit on this form.                                                                               |
| Line 2         | `max(0, 1040 line 18 − applicable earlier credits)` using the instructions' Residential Clean Energy Credit Limit Worksheet | Resolve after income tax, Schedule 2 line 3, and higher-priority credits are known. The instruction worksheet lists Schedule 3 lines 6l, 1, 2, 6d, 3, 4, 6m, 6f, 6g, 6c, 6h, plus the Schedule 8812 amount described below. |
| Line 3         | `min(line 1, line 2)`                                                                                                       | Schedule 3 line 5a, then 1040 line 20. File the form even if line 3 is zero.                                                                                                                                                |
| Line 4         | `line 1 − line 3`                                                                                                           | 2027 carryforward, including when line 2 is zero.                                                                                                                                                                           |

## Schedule 8812 interaction

The Form 5695 worksheet normally subtracts Form 1040 line 19. When the taxpayer
must use Schedule 8812 Credit Limit Worksheet B, its **line 14** replaces 1040
line 19 for this purpose. Worksheet B line 14 is computed from the provisional
child credit, earned income, Social Security/Medicare tax, Schedule 1 line 15,
Schedule 2 lines 16c/17c, EIC, and Schedule 3 line 11. It does not depend on
Form 5695. Worksheet B line 15 later includes Schedule 3 line 5a and affects the
final nonrefundable child credit. The correct order is therefore:

Schedule 3 line 11 is **excess Social Security and tier 1 RRTA withholding**;
the TY2026 worksheet input now names that source explicitly. The older shared
field name called it an adoption credit, although its line number and arithmetic
were unchanged.

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

Schedule 3 passes its pre-5695 totals to `credit_resolution`. The `f5695` input
carries the 2025 Form 5695 line 16 amount. Tax, Schedule 2, dependent counts,
filing status, AGI, and W-2 wages arrive through registered graph edges. One
`f8812_facts` input supplies the complete Earned Income Worksheet and any
additional Worksheet B, modified AGI, and Part II-B facts. The credit stage
reconciles worksheet wages to the W-2 route and rejects a Worksheet B case
without complete earned-income facts. Its provisional Schedule 8812 lines 1–12
use the same calculator as the final form.

The stage calculates Form 5695 lines 1–4, finalizes Schedule 3 lines 5a/8,
passes the calculated Worksheet A or B fields to final Schedule 8812, sends Form
1040 line 20 once, and records the unused amount for 2027. Graph and PDF tests
cover a $200 usable credit, a zero-tax full carryforward, and a qualifying-child
Worksheet B case with the combined Schedule 3, Form 5695, and Schedule 8812
attachments. A payroll-tax Worksheet B branch requires its line 7 source amount;
the calculator rejects missing evidence.

The TY2025 route remains separate. TY2026 MeF XML and ATS verification still
need the current TY2026 package; the downloaded May v1 package cannot prove the
September return topology.

## Completion checks

1. A $200 prior-year carryforward with sufficient line 18 tax and no competing
   credits prints line 1 as $200, line 2 as at least $200, and line 3 as $200;
   line 4 is blank or zero as appropriate. ATS [scenario 1](ATS-SCENARIO-01.md)
   supplies this carryforward.
2. A limited-tax case prints line 4 and emits a matching 2027 carryforward; a
   zero-limit case still prints Form 5695.
3. A qualifying-child case using Worksheet B calculates line 14 before Form
   5695, then line 15 and Form 1040 line 19 afterward. Check the combined
   Schedule 3/Form 5695/Schedule 8812 pages and line 20.
4. Validate the XML form and business rules against the selected current TY2026
   MeF package, then compare the ATS fixture. The May v1 XSD is insufficient for
   the September return topology.

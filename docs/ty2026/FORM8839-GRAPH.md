# TY2026 Form 8839 adoption credit and benefits contract

The pinned [2026 draft Form 8839](corpus/draft/f8839.pdf), SHA-256
`b8eefaaeb9faad7972f65d9f1457d8eb15ce9b2b2c84ee042620e95614384770`,
prints a **$17,670** per-child credit/exclusion maximum, **$5,120** maximum
refundable credit per child, and a phaseout beginning at **$265,080** over
**$40,000**. Check its hash in the [manifest](corpus/manifest.json) before
using the values; the form is still a draft. The pinned [2025
instructions](corpus/authorities/i8839--2025.pdf), SHA-256
`90dd5f4de0ca435d4e92666b5b50434e1ece488c67fc43a8c6697765bfb684eb`,
are a **prior-year comparator** for timing, worksheets and evidence. Obtain
the 2026 instructions before finalizing those branches. The
[101-widget inventory](pdf-fields-f8839.csv) covers both pages.

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
contract](PDF-SCHEDULE3A-MAP.md) after computing 1040 line 30; it can change
net refundable credits without rewriting Form 8839 line 13.

## Current code boundary

- The shared [calculator](../../forms/f1040/nodes/intermediate/forms/form8839/index.ts)
  contains the draft 2026 limits and a per-child credit array, plus 1040
  line 30 and Schedule 3 line 6c outputs. It is **not registered** in the
  2026 registry. Its child schema lacks identity, payment/finalization dates,
  reimbursed-expense and per-child employer-benefit history. `magi` defaults
  to zero, MFS is rejected without the exception, and the exclusion uses
  child count instead of the printed per-child Part III ledger.
- The calculator's Part III output is positive taxable benefits only; it
  cannot produce the printed negative line 31 case. It takes an external
  `income_tax_liability` as the credit-limit worksheet result rather than
  calculating its 2026 credit-order inputs. Its outputs contain no complete
  printable Form 8839 record, even though it tracks nonrefundable balances
  by origin year.
- The TY2025 [PDF descriptor](../../forms/f1040/2025/pdf/forms/f8839.ts)
  maps only three aggregate fields, and the [MeF
  serializer](../../forms/f1040/2025/mef/forms/f8839.ts) emits only the
  corresponding XML amounts. Neither describes the 2026 per-child credit,
  refundable split, Part III or carryforward. There is no 2026 Form 8839
  PDF/MeF route.

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

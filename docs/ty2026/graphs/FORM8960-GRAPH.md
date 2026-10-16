# TY2026 Form 8960 investment-income tax contract

> Current-main update, October 15: the investment source graph, reviewed
> income-tax allocation, Schedule 2 line-6 route and one-page draft PDF are now
> implemented. See [the current investment contract](INVESTMENTS-CURRENT.md)
> for the exact scope; the broader paths below remain the completion plan.

## HSA source classification (October 16)

The registered Form 8960 path now replays the complete executed HSA source
workpaper. It requires the same return owners and exact agreement with the HSA
income and deduction already included in AGI, including when MAGI is below the
NIIT threshold. This replaces the former above-threshold HSA guard.

Authority: [26 CFR 1.1411-3(b)(1)(iv)](https://www.ecfr.gov/current/title-26/section-1.1411-3)
identifies exempt accounts, including section 223 HSAs;
[26 CFR 1.1411-4(a), (e) and (f)](https://www.ecfr.gov/current/title-26/section-1.1411-4)
defines investment income, trust pass-throughs and allocable deductions. The
[2012 proposed-rule preamble, part 5.F, printed pages 72622–72623](https://www.govinfo.gov/content/pkg/FR-2012-12-05/pdf/2012-29238.pdf)
explicitly explains the HSA distribution treatment. That preamble is historical
explanatory material, not a final regulation. The implementation applies the
current income definition to the source categories below; it does not rely on
the HSA being one of the qualified retirement plans listed in section 1411(c)(5).

| Reconciled source category | Retained NIIT treatment |
| --- | --- |
| Form 8889 line 16, ordinary taxable account distributions | Remains in MAGI; no look-through to investment income earned inside the exempt account. |
| Earnings distributed with timely excess returns, Schedule 1 line 8z | Retained as account-distribution income in MAGI, outside the investment numerator. |
| Employer excess not already included in W-2 wages, Schedule 1 line 8z | Compensation inclusion in MAGI, reconciled against actual payroll inclusions. |
| Form 8889 line 20, contribution/qualified-funding testing recapture | Restores contribution or IRA-funding income in MAGI; it is not a new investment return. |
| HSA deduction, Schedule 1 line 13 | Already reduces AGI/MAGI; no additional investment-expense deduction. |

The workpaper retains the owner distribution/testing breakdown and separate
earnings, employer income and deduction amounts. Actual bank interest and other
investment sources still enter NII normally. The existing reasonable state-tax
allocation uses the complete MAGI denominator and unchanged investment-income
numerator. Shared 2025 NIIT arithmetic calculates the tax; the 2026 PDF replays
sources and checks all four related Schedule 1 amounts plus Schedule 2 line 6.

Validation: 554 distinct focused tax/source/PDF checks pass across the main run
and corrected test rerun, including six new HSA NIIT source/return cases and two
PDF cases. Single and joint owners, threshold crossings, testing recapture,
employer wage inclusions, state-tax allocation and missing/stale sources are
covered. Rendered threshold-limited and investment-limited drafts were inspected;
their printed tax is $38 and $760 respectively, reconciled to Schedule 2.

This route covers the currently supported ordinary owned HSA sources. Inherited
accounts, prohibited transactions and other unsupported source categories remain
rejected by their HSA workpapers. ABLE's separate classification guard, other
investment routes, native MeF and final-source acceptance remain open.


The pinned [2026 draft Form 8960](../corpus/draft/f8960.pdf), SHA-256
`2306f4f334a8b3b1ed73fd5045dec86eed194902923462bf485431c756f66982`,
prints the individual NIIT calculation on lines 1–17. The current [IRS
instructions](https://www.irs.gov/instructions/i8960) and pinned
[PDF](../corpus/authorities/i8960--2025.pdf), SHA-256
`b10fbb23ff4a053db197285497a00914c558e3ae0cdf5c956b7c0c7867376428`,
are explicitly **2025 comparators**. Obtain 2026 instructions before
finalizing line-specific inclusion, deductions, and election worksheets.
The 2026 [Schedule 2 draft](../corpus/draft/f1040s2.pdf) places NIIT on line 6.

## Source ownership and calculation order

| Printed lines | Source and rule to preserve |
| --- | --- |
| Part I election boxes | Carry the §6013(g), §6013(h), and Reg. §1.1411-10(g) elections and their required statement/history. The joint-return election can change the NIIT inclusion and threshold. |
| 1–3 | Reconcile taxable interest to Schedule B/1040 line 2b, ordinary dividends to 1040 line 3b (including pass-through and Form 8814 inclusions), and only annuities subject to NIIT to line 3. Keep account and income-source identity to avoid a blanket retirement-distribution inclusion. |
| 4a–4c | Start with potentially subject rental, royalty, partnership, S-corporation, trust, Schedule C/E/F and related trade/business items. Line 4b is the **adjustment for ordinary-course income/loss from a non-§1411 trade or business**, not a second rental-income bucket. Compute 4c from both signed values after passive/at-risk and activity limits. |
| 5a–5d | Reconcile dispositions to Schedule D/8949 and Form 4797 after basis, character, installment, exchange and passive-limit calculations. Line 5b excludes gains/losses not subject to NIIT; line 5c separately adjusts a partnership-interest or S-corporation-stock disposition. Preserve sale/activity identity through all three lines. |
| 6–8 | Line 6 handles CFC/PFIC differences, including the §1.1411-10(g) election; line 7 handles other modifications and applicable §1411 NOL. Line 8 combines lines 1, 2, 3, 4c, 5d, 6 and 7. Maintain a separate investment-income/NOL ledger rather than using ordinary AGI as a substitute. |
| 9a–11 | Form 4952 allowed investment interest, allocable state/local/foreign tax, miscellaneous investment expense, and additional modifications feed 9a/9b/9c/10. Deduct only the amount properly allocable to NII and not already deducted within the source activity. Reconcile 9d and 11. |
| 12–17 | Line 12 is max(0, line 8 minus line 11); line 13 is **modified** AGI, which may need the §911/Form 2555 addback and other NIIT-specific adjustments. Apply the printed status threshold, max(0, line 13 minus line 14), lesser-of limit, then 3.8% on line 17. Route to 2026 Schedule 2 line 6, then Schedule 2 line 21 and 1040 line 23. |

The prior-year instructions say to attach Form 8960 when MAGI exceeds the
applicable threshold; positive tax is not the only filing condition. Confirm
the exact 2026 filing instruction before retaining or changing that gate.

## Current code boundary

- The [2026 adapter](../../../forms/f1040/2026/nodes/form8960.ts) uses the shared
  NIIT arithmetic with explicit thresholds and whole-dollar rounding. It
  recomputes investment claims, reconciles AGI income/penalties, waits for
  deduction selection and sends tax to Schedule 2 line 6. Positive foreign
  exclusions or unowned activity fail instead of defaulting to ordinary AGI.
- Income-tax allocation currently supports the reviewed proportional-SALT,
  gross-NII/AGI method described in the current contract. Other allocation
  methods, investment-interest expenses and broader adjustments still need
  their source owners. There is no public input for asserted NIIT or deductions.
- The new [PDF component](../../../forms/f1040/2026/pdf/form8960.ts) uses the
  [38-field inventory](../inventories/pdf-fields/pdf-fields-f8960.csv), verifies
  calculation destinations, and prints one static draft page without the IRS
  cover. Above-threshold zero-tax forms are retained. Unsupported elections,
  5c, 6 and 9c remain blank because those branches are not accepted.
- The historical prototype's PDF/registry and the TY2025 MeF serializer are
  comparators, not 2026 filing evidence. Current XSD elements, attachments and
  active reject IDs remain to map; the May v1 package alone is insufficient.

## Build order and acceptance

1. Pin the published 2026 instructions and current MeF release. Recheck
   status thresholds, §911 MAGI worksheet, line 7 §1411 NOL, line 9/10
   deduction limits, CFC/PFIC elections, filing trigger and active rules.
2. Give every interest/dividend, rental/K-1, disposition, foreign entity,
   Form 4952, Schedule A/tax and Form 2555 source one owned NIIT output.
   Track item/activity IDs and signed adjustment reason; reconcile to the
   ordinary 1040 source without double counting.
3. Expand the node and print record to all individual lines and election
   fields, with 4b/5b/5c/6/7/10 adjusted by their actual source rules.
   Reconcile 8, 9d, 11, 12, 15, 16 and 17 and the Schedule 2/1040 route.
4. Fill the current PDF fields and any required election statement, including
   a zero-tax attachment when the current instruction requires it. Build
   TY2026 `IRS8960` XML from the current XSD and test its arithmetic and
   cross-form business rules against complete-return fixtures.
5. Cover threshold boundaries for each status; §911 MAGI addback; passive
   versus active rental; partnership-stock sale adjustment; CFC/PFIC
   election; §1411 NOL; investment-interest and allocable-tax limits; and
   zero/negative NII. Preserve TY2025 regressions for the shared node.

This is a research and implementation contract. The existing 2026 graph/PDF
slice does not yet prove full Form 8960 filing parity.

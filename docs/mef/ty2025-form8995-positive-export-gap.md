# TY2025 Form 8995 positive export boundary

Status: one tightly bounded, positive Schedule C route is implemented for Form
8995 MeF and PDF. All other positive shapes still fail explicitly. This is not
complete Form 8995 coverage and is not an approved product exclusion.

The [IRS TY2025 Form 8995 instructions](https://www.irs.gov/instructions/i8995)
require each trade or business on line 1, the qualified business income or loss
per row, the prior QBI loss and REIT/PTP loss carryforwards, the current
REIT/PTP component, and the taxable-income limit. Line 12 is net capital gain
**increased by qualified dividends**. Line 15 must reconcile to Form 1040
line 13. The checked-in TY2025 v5.4 `Shared/IRS8995/IRS8995.xsd` orders
`QualifiedBusinessIncomeDedGrp` rows before lines 2-17 and requires line 15. The
group has `minOccurs="0"`, so an aggregate-only XML fragment can be
syntactically accepted by the schema while still failing to represent a complete
claimed calculation. Schema permissiveness is not source proof.

## Implemented one-business route

The Schedule C node now retains an identified business row for positive QBI, and
the Form 8995 node records lines 1-17 for one business. Export accepts the
record only when the business has a name, EIN, reference, positive integer net
profit, an explicit no-other-adjustments confirmation, and an explicit no-prior-
or-suspended-loss confirmation, plus confirmation that the filer is not a patron
of a specified cooperative. The source Schedule C must independently recalculate
to that QBI amount and match Schedule 1 line 3. The final Schedule 1 must show
zero on lines 15-17, so no attributable self-employment tax, health insurance or
retirement-plan deduction is silently allocated. No other QBI, REIT/PTP, gain or
qualified-dividend input is allowed. The
[corrected IRS TY2025 instructions](https://www.irs.gov/instructions/i8995)
define Form 8995 line 11 for 1040 filers as Form 1040 line 11a minus lines 12e
and 13b. The code checks the same equation using its internal `line11_agi`,
`line12c_deduction_total` (the filed line 12e total), and zero
`line13b_additional_deductions` keys. Form 8995 line 12 is qualified dividends
plus net capital gain; both are explicitly checked zero here. Form 1040 line 13
must equal Form 8995 line 15. The native XML includes the required business
group and every line 2-17 in XSD order. The PDF maps the same business and lines
to the official TY2025 AcroForm fields.

The bounded calculation rounds each printed 20% component to whole dollars and
routes the resulting line 15 amount exactly to Form 1040; export rejects even a
fractional mismatch. It also rejects original Schedule F/E, K-1, Form 1099-DIV,
Schedule D, Schedule SE and retirement-plan sources, plus any Form 7206 claim,
even if their deposits were omitted from Form 8995 pending data.

These zero-source conditions are an explicit supported boundary, not inferred
zeros: export checks the final Schedule 1 and Form 1040 before producing a
document. A typical profitable sole proprietor with positive half-SE tax is
still outside this route and fails closed.

## Remaining gaps

- Broader source-backed implementations must identify and independently
  reconcile each business name/TIN and QBI, allocate Schedule SE, self-employed
  health insurance and retirement deductions to the right business, prove prior
  losses, calculate REIT/PTP lines, derive line 11 and the line 12 qualified-
  dividend-adjusted gain from the finalized return, choose Form 8995 rather than
  8995-A under the 2025 threshold/patron rules, and join line 15 to Form 1040
  line 13. The PDF must print the same rows and lines.

The native descriptor returns no document for no-claim tracking fields or a zero
deduction. Positive claims outside the bounded route raise a
source-reconciliation error in both MeF and PDF. Malformed claimed amounts also
reject. Focused cases are written. No tests, typecheck, local XSD, filled PDF or
ATS validation was run in this tranche.

The zero-deduction route needs a separate audit: a current REIT/PTP loss may
still need a Form 8995 carryforward line even when no line 13 deduction is
allowed. The existing calculation node can return no pending form in that case.
Do not interpret the no-claim omission here as approval to drop a reportable
carryforward.

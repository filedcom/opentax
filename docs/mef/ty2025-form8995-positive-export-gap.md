# TY2025 Form 8995 positive export boundary

Status: tightly bounded, positive one-business Schedule C and one-farm Schedule
F routes are implemented for Form 8995 MeF and PDF. Other positive shapes still
fail explicitly. This is not complete Form 8995 coverage and is not an approved
product exclusion.

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
to the business profit and match Schedule 1 line 3. The final Schedule 1 line 15
must match the sourced half of self-employment tax when Schedule SE applies;
that deduction reduces line 1 QBI. Lines 16-17 remain zero, so health insurance
or retirement-plan deductions cannot be silently allocated. No other QBI, REIT/PTP, gain or
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
Schedule D and retirement-plan sources, plus any Form 7206 claim beyond its
retained Schedule C and Schedule SE source records, even if their deposits were
omitted from Form 8995 pending data.

These zero-source conditions are an explicit supported boundary, not inferred
zeros: export checks the final Schedule 1 and Form 1040 before producing a
document. The synthetic profitable Schedule C fixture exercises the ordinary
half-SE-tax route through calculation, native XML, and PDF projection.

## Implemented one-farm route

The Schedule F node now retains an identified farm row with the source Schedule
F item and its computed profit. A positive Form 8995 claim requires one farm ID,
farm name, a sourced line 1(b) TIN, material participation, and an explicit confirmation
that there are no other attributable QBI adjustments. The return must also
confirm no prior or suspended QBI loss and no patronage of a specified
cooperative. The exporter rechecks linked farm source amounts, recalculates the
farm profit including sourced WOTC wage reductions, and reconciles it to
Schedule 1 line 6. It ties the half-SE-tax
deduction to Schedule SE, Form 7206's retained Schedule SE calculation, and
Schedule 1 line 15. It checks Form 1040 taxable income and the line 13 QBI
deduction against every printed Form 8995 line. The route rejects other QBI
businesses, cooperative source records and Schedule F cooperative lines, the
farm optional SE method, capital gain, REIT/PTP amounts, and separately
attributable health insurance or
retirement deductions. Missing or conflicting facts stop MeF and PDF export.

A synthetic $80,000 cash-farm return passed graph execution, native full-return
TY2025 XSD validation, and Form 8995 MeF/PDF reconciliation. A separate
$80,000 accrual-farm case also passes graph execution, Form 8995 MeF/PDF
reconciliation, and full-return XSD validation with explicit zero inventory. The filled
nine-page PDF packet was generated; visual review of its Form 8995 page matched
the farm row ($74,348 QBI), line 15 ($11,720), and Form 1040 line 13a ($11,720).
Local review artifacts are in
`.state/research/review/ty2025-form8995-farm/` (ignored by Git). This is
synthetic coverage; it does not establish an ATS acceptance or the remaining
multi-farm and cooperative routes.
The reviewed Form 8995 PDF SHA-256 is
`ba84326e126840c6ba96286b8e1c323c25bbec65127258890840d23621c5100d`;
the nine-page packet SHA-256 is
`640c25a118d1d88494c481c135a003f21f010d18499e211f69a8934f6b173ad7`.

The [IRS 2025 Form 8995 instructions](https://www.irs.gov/instructions/i8995)
allow the owner SSN in line 1(b) when a sole proprietor has no EIN. The
single-filer farm route now carries the sourced taxpayer SSN through the
Form 8995 node. MeF emits the TY2025 `SSN` choice and the PDF prints that SSN in
the TIN column; the exporter rejects a missing or changed SSN and a joint
filing-status claim without an identified farm owner. The no-EIN synthetic
return passed graph, full-return XSD, and filled-PDF visual checks. Its review
artifacts are in `.state/research/review/ty2025-form8995-farm-ssn/`; the
Form 8995 PDF SHA-256 is
`c3e1764f0b91d9db34b8e992f5773857c2f69a1e01e9ddf673fad9515dec7983`,
and the nine-page packet SHA-256 is
`90d5b9d11aee66e6d09c5d5efff8b41f132c93b9966512a2c78bdef0066aa9d1`.

## Remaining gaps

- Multi-farm returns, joint-filer farms without owner identity, farms without a
  separate farm name, cooperative
  patrons, and returns with other attributable QBI deductions remain outside
  the bounded one-farm exporter. The accrual Schedule F source case with $12,100
  of profit still exercises a zero-claim return because its taxable income is
  below the single standard deduction; it does not verify positive accrual-farm
  QBI. Complete source-level allocation and multi-business Form 8995 rows before
  treating those claims as supported. The [2025 IRS Form 8995 instructions](https://www.irs.gov/instructions/i8995)
  include trade or business QBI, the taxable-income limit, and the specified
  cooperative routing decision. These remain live release gaps, not approved
  exclusions.
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
reject. Focused and graph-to-export cases pass for the two bounded sources.
The synthetic Schedule F filled PDF was visually reviewed and its full return
passed local XSD validation. ATS validation and the broader routes remain open.

The zero-deduction route needs a separate audit: a current REIT/PTP loss may
still need a Form 8995 carryforward line even when no line 13 deduction is
allowed. The existing calculation node can return no pending form in that case.
Do not interpret the no-claim omission here as approval to drop a reportable
carryforward.

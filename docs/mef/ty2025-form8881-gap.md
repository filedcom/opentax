# TY2025 Form 8881 source and filing gap

The December 2025 [Form 8881](https://www.irs.gov/pub/irs-pdf/f8881.pdf) and
[instructions](https://www.irs.gov/instructions/i8881) distinguish startup costs
and employer contributions in Part I (Form 3800 line 1j), auto-enrollment in
Part II (line 1dd), and military-spouse participation in Part III (line 1ee). A
direct employer attaches Form 8881. A taxpayer whose only source is a
partnership or S-corporation K-1 generally reports the credit on Form 3800
without a personal Form 8881.

## Staged implementation

- The public `f8881` node requires explicit plan, payroll, and eligibility facts
  for each claimed part. It calculates the startup-cost credit using the greater
  of $500 or $250 per eligible non-HCE, capped at $5,000, and applies the
  100%/50% prior-year employer size tiers. It computes the employer-contribution
  five-year rates and per-employee contribution ceiling, the three-year $500
  auto-enrollment credit, and the three-year $200 participation plus up-to-$300
  contribution credit for each eligible military spouse.
- The node sends separate Part I/II/III gross source amounts to the
  source-backed Form 3800 input. Form 3800 now includes them in its standard
  current-year credit before its final tax-liability limit, Schedule 3 line 6a,
  and Form 1040 line 20 calculation. The old direct Schedule 3 deposit and
  approximate startup cap have been removed.
- An unregistered `IRS8881` builder and one-page PDF descriptor project the
  three parts and reject a missing or changed Form 3800 source amount. Authored
  source, XML, PDF-field, and tamper fixtures are deferred to the requested full
  test batch.
- Public MeF and PDF export still reject an active Form 8881 source. The staged
  descriptors are not in either exporter registry, and the shared Form 3800 Part
  III/PDF writer does not yet print lines 1j, 1dd, or 1ee.

## Remaining filing work

Reconcile the direct-employer input to actual plan/payroll documents and the
claimed deduction reduction; add controlled-group and predecessor rules,
pass-through K-1 parts, passive activity and transfer/elective-payment
classification where applicable, and source allocation for multiple plans.
Register the XML and PDF descriptors only together with Form 3800 Part III line
1j/1dd/1ee, Part V if required, and exact Form 3800/Schedule 3/Form 1040
reconciliation. Then run full tests, XSD validation, visual PDF review, IRS
business rules, and ATS acceptance. No current positive Form 8881 claim is
represented as export-ready.

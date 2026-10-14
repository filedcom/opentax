# Issue 77 reconciliation — October 14, 2026

This review changes arithmetic expectations in 121 fixtures. It does **not**
certify 121 complete returns. Sixty-five fixtures explicitly retain unresolved
source or eligibility limitations, including case 78 whose numeric expectations
are preserved pending age evidence. The benchmark now reports those limitations
as errors even if every compared number matches. Existing unsupported-oracle and
executor errors still fail the benchmark; the $5 legacy tolerance is unchanged.

[issue77-changes.json](./issue77-changes.json) records each changed numeric value,
its previous value, the calculation basis, and source limitations. Each changed
fixture also carries its review scope and assumptions outside the numeric
`correct` namespace. No engine-produced output was used to populate expectations.
The archived `output.json` files remain historical outputs, not new evidence.

## Sources and independent checks

[irs-tables.json](./irs-tables.json) is a numeric extraction of the TY2025
[Form 1040 instructions](https://www.irs.gov/instructions/i1040gi), downloaded
October 14, 2026. Its metadata records the source HTML SHA-256. The extraction
retains all 2,062 Tax Table rows and 1,362 ordinary EIC rows; EIC rows containing
terminal footnotes are deliberately excluded, not converted to zero. Regression
checks compare all four Tax Table columns and all eight retained EIC columns
against the engine at both ends of each interval. Existing terminal-band tests
remain responsible for the footnote exceptions.

The same instructions supply the QDCGT Worksheet, Tax Computation Worksheet,
Social Security Benefits Worksheet, rounding rules, and Schedule 1-A senior
rules. Other sources are the TY2025 instructions for
[Form 8962](https://www.irs.gov/instructions/i8962),
[Schedule SE](https://www.irs.gov/instructions/i1040sse),
[Form 8995](https://www.irs.gov/instructions/i8995),
[Form 8959](https://www.irs.gov/instructions/i8959), and
[Form 8960](https://www.irs.gov/instructions/i8960).

## Disposition of the reported patterns

| Report | Reconciliation |
| --- | --- |
| Tax Table instead of continuous brackets | Recomputed tax on ordinary income, including the ordinary-income portion of the QDCGT Worksheet; above $100,000 uses the Tax Computation Worksheet. The existing engine already implements this rule. |
| Senior deduction | Recomputed the nine listed scenarios, plus senior cases 27 and 51, including taxable-income floors and the QBI limit. These are conditional on valid employment SSNs, which the sparse inputs do not establish; no SSNs were invented. |
| PTC | Annual arithmetic now uses the 2025 poverty amounts and Table 2. Case 110's 2026 revenue-procedure reference and repayment description were corrected. Annual eligibility/allocation evidence remains explicitly incomplete. |
| EIC | Replaced formula amounts with published table amounts; updated dependent credits and payment balances where affected. Child relationships, residency and SSN eligibility are not established by arithmetic alone. |
| Whole-dollar rounding | Added amounts within each source line before rounding; added rounded return/schedule lines afterward. Form 8949 columns, IRA versus pension lines, Schedule SE tax components and deductible half, Schedule A, QBI and payment lines are handled separately. Source documents retain cents. |
| Line 18 meaning | Removed Part II taxes from line 18; excess APTC repayment remains in Part I. SE, Additional Medicare, NIIT and early-distribution tax contribute to line 24 separately. In complex cases this retains the archived assumptions about AMT and source classification rather than certifying their absence. |

## Cases requiring particular attention

- Case 02: tax **3,875**, refund **1,125**.
- Cases 18/24/29: EIC **1,983 / 5,718 / 7,272**; CTC/ACTC limits and
  payment totals are recomputed. Case 24's third child's relationship is
  `other`; the intended three-child treatment remains conditional.
- Cases 36/45/48/52: net PTC **3,952 / 3,860 / 4,700 / 3,600**.
  Case 53: repayment **3,725**, withholding/payment **6,500**.
- Case 110: FPL 15,060; truncated percentage 212; applicable figure .0248;
  annual contribution 794; allowed PTC 5,006; net PTC **1,406**;
  tax **1,715**, payments **3,906**, refund **2,191**.
- Case 67: rounded line 9 is **211,365**, Additional Medicare **0**,
  NIIT **95**. Rounding Form 8949's separate proceeds, basis and adjustment
  columns matters; rounding only the original net gain gives a different sum.
- Case 76: worksheet income tax **100,487**; NIIT is a separate **212**.
  Combined tax remains close to the archive because the old income-tax amount
  effectively included that investment tax. Total withholding is **97,303**.
- Case 86: total withholding is **40,471**. For 76/86 (and 97), missing W-2
  ownership prevents verification of the excess Social Security credit and final
  payments/refund. The archived excess-credit assumption is retained visibly as
  conditional and cannot produce a passing benchmark. It is not replaced by zero.
- Case 78: age is absent; the conditional childless table credit would be **316**.
  Numeric expectations remain archived and flagged, pending source evidence.
- Case 91: worksheet tax **4,121**. Case 96: other-dependent credit **500**.
- Case 106: contrary to the report, `input.json` contains a child, DOB,
  residency and 48,000 wages. Under the intended eligibility assumptions,
  the table EIC is **385**, ACTC **215**, payments/refund **4,400**.
- Case 133: table EIC **864**, payments **4,364**, refund **4,339**.

### Case 95: proposed amount is not reproduced

The proposed **297,368** does not follow from the supplied taxable income and
qualified income. Whole-dollar taxable income is 957,088; qualified dividends
43,237 plus net capital gain 30,046 leave ordinary taxable income 883,805.
The Single Tax Computation Worksheet gives
`883,805 × .37 − 42,979.75 = 284,028.10`.
All 73,283 of preferential income is above the 20% threshold, producing
`73,283 × .20 = 14,656.60`. Their sum is **298,684.70**, rounded **298,685**.
The archive's 298,684.60 was consistent with its unrounded operands to cents.
The regression checks the published worksheet calculation, not the issue's
suggested replacement. Partnership eligibility, basis and AMT remain separate
source limitations on the complete return.

## Scope and remaining work

The table-rule checks isolate existing engine arithmetic from old expected-value
errors. They do not establish that every archived input can be prepared by the
current engine: many lack reviewed ownership, business references, foreign tax
holding periods, or other required evidence. Complex fixtures retain their
archived income classifications and eligibility assumptions; these limitations
now prevent a successful benchmark result. This reconciliation does not close
issue 77 or claim IRS/ATS acceptance. Supply and review those source facts before
removing a limitation or treating the complete return as an authoritative oracle.

Run the focused checks with:

```sh
deno test --allow-read --allow-write --allow-run \
  benchmark/issue77_reference.test.ts benchmark/fixture_contract.test.ts \
  benchmark/harness.test.ts benchmark/run_benchmark.test.ts \
  benchmark/run_benchmark.integration.test.ts
```

Validation: **30 focused tests passed**. The full benchmark discovers all 133
cases: **10 pass, 123 fail, 0 skipped**, with 273 line failures, 1,198 unsupported
checks and 163 errors (categories overlap). The failures retain engine diagnostics
and incomplete sources; no pass-rate or issue-closure claim is made. The separate
full-suite run at pre-merge runtime `da40ac96d` is not evidence for this branch.

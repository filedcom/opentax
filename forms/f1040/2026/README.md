# TY2026 shared-calculation foundation

This directory starts the 2026 implementation on current main. It is not the
historical prototype restored wholesale, and it is not registered as a filing
product. The ongoing branch is `codex/ty2026-readiness`.

## Implemented

- The existing 2025 standard-deduction node and the 2026 wage baseline call the
  same `standardDeductionAmount` implementation. Year-specific amounts are
  supplied explicitly, including dependent minimum/earned-income additions.
- The existing 2025 ordinary-tax path above the Tax Table cutoff and the 2026
  baseline call the same `rateScheduleTax` implementation. The existing 2025
  Tax Table and preferential-income worksheets retain their behavior.
- `nodes/config/2026-income.ts` contains the audited subset of 2026 constants
  from [Rev. Proc. 2025-32 §§4.01, 4.14](https://www.irs.gov/irb/2025-45_IRB),
  checked October 15, 2026. It does not fill missing constants with 2025 values
  or enable unaudited nodes through a complete `F1040Config` registration.
- `calculateWageBaseline2026` sums classified taxable wages, applies the base
  standard deduction and calculates an ordinary rate-schedule preview. It
  rejects unrecognized input fields and reports `canFile: false`.
- The CLI rejects unsupported return products before creating metadata files.

Example, from the repository root:

```sh
deno eval 'import { calculateWageBaseline2026 } from "./forms/f1040/2026/wage-baseline.ts"; console.log(calculateWageBaseline2026({filing_status:"single", wages:[150000]}));'
```

This produces a $16,100 base deduction, $133,900 taxable-income baseline and
$24,734 ordinary rate-schedule tax before credits and other taxes. It does
not calculate total tax, a refund or an amount due. In particular, the preview
assumes base-standard-deduction eligibility and excludes age/blind additions,
dependent eligibility, itemization, Schedule 1-A and charitable deductions,
credits, other income/taxes, and withholding. Below $100,000, annual rate tax
is an estimate until the final 2026 Tax Table is implemented and checked.

## Reuse and folder rules for subsequent work

Keep shared algorithms in the existing `nodes` domain folders and preserve
year-specific configuration and output assembly. Extract only the code needed
by both years; avoid wholesale domain moves while 2025 work continues. A shared
algorithm does not by itself verify a node's input rules or downstream routes.

For each next node, separately prove:

1. Source schema and eligibility for the selected year, including dates and
   taxpayer/spouse ownership.
2. All constants and rule branches, with no fallback to another year's config.
3. Input and output destinations in that year's registry; changed printed lines
   require explicit mappings even when the underlying amount is unchanged.
4. Regression behavior for the existing 2025 product and source-derived 2026
   boundary cases.

Next work is source intake/identity and AGI integration, followed by deductions,
credits and settlement in a bounded 2026 registry. Current general and W-2 nodes
contain year-specific evidence schemas and cross-form routes, and the full
income-tax node still invokes 2025 preferential-income/Tax Table helpers.
Do not register those entire nodes for 2026 just because their arithmetic
helpers are shared. Port individual differences from `b7c07b616` only after
reconciling current paths and the latest 2025 source-validation changes.

PDF, current-version MeF schemas/rules, submission archives and ATS acceptance
remain separate release gates. See the [current assessment](../../../docs/ty2026/readiness/CURRENT-BASELINE-2026-10-10.md)
and [product assembly plan](../../../docs/ty2026/readiness/PRODUCT-ASSEMBLY.md).

## Verification on October 15

- 98 typed tests passed across the 2026 baseline/configuration, existing 2025
  standard deduction, ordinary/preferential tax, Tax Table and CLI return suites.
- `deno task test:unit` passed: 137 tests in 14 selected modules, with a complete
  module-graph preflight. This is the repository's PR gate, not the full private
  PDF/schema/ATS evidence suite.
- The CLI's old $206,926.37 QBI taxable-income expectation also failed on untouched
  `origin/main` at `9a17a7282`; it now expects the filed whole-dollar $206,926.
  No QBI calculation was changed.

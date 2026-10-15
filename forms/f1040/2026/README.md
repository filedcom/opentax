# TY2026 calculation and return-assembly foundation

This directory starts the 2026 implementation on current main. It is not the
historical prototype restored wholesale, and it is not registered as a filing
product. The ongoing branch is `codex/ty2026-readiness`.

## Implemented

- The existing 2025 standard-deduction node and the 2026 wage baseline call the
  same `standardDeductionAmount` implementation. Year-specific amounts are
  supplied explicitly, including dependent minimum/earned-income additions.
- The existing 2025 ordinary-tax path above the Tax Table cutoff and the 2026
  baseline call the same `rateScheduleTax` implementation. The existing 2025 Tax
  Table and preferential-income worksheets retain their behavior.
- `nodes/config/2026-income.ts` contains the audited subset of 2026 constants
  from [Rev. Proc. 2025-32 §§4.01, 4.14](https://www.irs.gov/irb/2025-45_IRB),
  checked October 15, 2026. It does not fill missing constants with 2025 values
  or enable unaudited nodes through a complete `F1040Config` registration.
- `calculateWageBaseline2026` sums classified taxable wages, applies the base
  standard deduction and calculates an ordinary rate-schedule preview. It
  rejects unrecognized input fields and reports `canFile: false`.
- The CLI rejects unsupported return products before creating metadata files.
- `assembleReturn2026` runs the shared input router and executor with a bounded
  Form 1040/Schedule 3-A registry. It consumes finalized upstream amounts; it is
  an internal assembly API, not a public facts/source-document API.
- The 2026 finalizer assembles income, deductions, credits, withholding, refund
  allocation and balance due. It maps nonitemizer charity to 12f, Schedule 1-A
  to 13a, QBI to 13b, Form 1062 to 24b, and the Schedule 3-A reduction to 32b.
  Individual printed operands use the existing signed whole-dollar helper.
- Schedule 3-A implements the zero-benefit stop and line 7/8 answer branches;
  its Schedule 2 line 20 exclusion cannot exceed Form 1040 line 23. Header work
  authorization is kept separate from the schedule's eligibility answer.
- Separate Schedule 1 and Schedule 2 output calculations reject stale line
  mappings. Schedule 1 requires agreement with finalized AGI totals. Positive
  Schedule 2 section 965 installments remain held because the pinned draft's
  line 12/15 instructions conflict. These sinks are not yet source-wired.
- Fourteen local rules reconcile income, tax, deductions, payments, refund and
  required attachments. They are arithmetic checks, not IRS MeF acceptance.
- Draft Form 1040 and Schedule 3-A PDF components use pinned IRS hashes and the
  shared 2025 template cache. Form 1040 supports four dependent columns plus a
  continuation. Draft markings remain visible. The loader accepts checked-out
  LFS bytes or downloads exactly the reviewed bytes into the ignored cache;
  changed sources fail verification.

Example, from the repository root:

```sh
deno eval 'import { calculateWageBaseline2026 } from "./forms/f1040/2026/wage-baseline.ts"; console.log(calculateWageBaseline2026({filing_status:"single", wages:[150000]}));'
```

This produces a $16,100 base deduction, $133,900 taxable-income baseline and
$24,734 ordinary rate-schedule tax before credits and other taxes. It does not
calculate total tax, a refund or an amount due. In particular, the preview
assumes base-standard-deduction eligibility and excludes age/blind additions,
dependent eligibility, itemization, Schedule 1-A and charitable deductions,
credits, other income/taxes, and withholding. Below $100,000, annual rate tax is
an estimate until the final 2026 Tax Table is implemented and checked.

## Reuse and folder rules for subsequent work

Keep shared algorithms in the existing `nodes` domain folders and preserve
year-specific configuration and output assembly. Extract only the code needed by
both years; avoid wholesale domain moves while 2025 work continues. A shared
algorithm does not by itself verify a node's input rules or downstream routes.

For each next node, separately prove:

1. Source schema and eligibility for the selected year, including dates and
   taxpayer/spouse ownership.
2. All constants and rule branches, with no fallback to another year's config.
3. Input and output destinations in that year's registry; changed printed lines
   require explicit mappings even when the underlying amount is unchanged.
4. Regression behavior for the existing 2025 product and source-derived 2026
   boundary cases.

Next work is source intake/identity and AGI integration, followed by upstream
deduction and credit calculations feeding the internal assembly registry.
Current general and W-2 nodes contain year-specific evidence schemas and
cross-form routes, and the full income-tax node still invokes 2025
preferential-income/Tax Table helpers. Do not register those entire nodes for
2026 just because their arithmetic helpers are shared. Port individual
differences from `b7c07b616` only after reconciling current paths and the latest
2025 source-validation changes.

Complete PDF attachment coverage, current-version MeF schemas/rules, submission
archives and ATS acceptance remain separate release gates. No complete public
2026 product, MeF serializer or filing catalog entry is enabled. Missing tax
calculations must not be supplied as zeros to make a public return pass. See the
[current assessment](../../../docs/ty2026/readiness/CURRENT-BASELINE-2026-10-10.md)
and [product assembly plan](../../../docs/ty2026/readiness/PRODUCT-ASSEMBLY.md).

## Verification on October 15

- 98 typed tests passed across the 2026 baseline/configuration, existing 2025
  standard deduction, ordinary/preferential tax, Tax Table and CLI return
  suites.
- `deno task test:unit` passed: 137 tests in 14 selected modules, with a
  complete module-graph preflight. This is the repository's PR gate, not the
  full private PDF/schema/ATS evidence suite.
- The CLI's old $206,926.37 QBI taxable-income expectation also failed on
  untouched `origin/main` at `9a17a7282`; it now expects the filed whole-dollar
  $206,926. No QBI calculation was changed.

- A further 56 typed tests passed for the 2026 calculation/assembly/PDF modules
  and the existing 2025 input-router and template-cache suites.
- The repository unit/preflight gate passed again after the shared extractions.
- Rendered and visually inspected a synthetic three-page Form 1040/Schedule 3-A
  fixture. All pages retain draft markings, amounts reconcile across forms, and
  no editable widgets remain. This exercises rendering and assembly; its
  supplied credit amounts do not establish taxpayer eligibility.

## Source recheck

The IRS drafts below were checked on October 15, 2026. The two rendered PDF
components matched the hashes already recorded in the research corpus.

- [Form 1040](https://www.irs.gov/pub/irs-dft/f1040--dft.pdf)
- [Schedule 1](https://www.irs.gov/pub/irs-dft/f1040s1--dft.pdf)
- [Schedule 2](https://www.irs.gov/pub/irs-dft/f1040s2--dft.pdf)
- [Schedule 3-A](https://www.irs.gov/pub/irs-dft/f1040s3a--dft.pdf)

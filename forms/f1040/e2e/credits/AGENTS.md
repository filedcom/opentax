# e2e/credits

Return contracts for credit forms. Each test runs the real `registry` through
`buildExecutionPlan`/`execute` (or `f1040_2025` from `../../2025/index.ts`).
Most then export the return with `buildMefXml`/`buildPdfBytes`. The section map
is at [../../nodes/inputs/credits/AGENTS.md](../../nodes/inputs/credits/AGENTS.md).

## Contents

- `business/form5884/`, `business/form8826/`: routing to `f3800`. The tests
  assert that `pending.f3800` holds the typed source entry, that nothing is
  deposited to `line6a_general_business_credit`, and that `allowed_credit`
  (written back by the `f1040` sink) reaches Schedule 3 `line6a_total` and
  Form 1040 line 20.
- `earned-income/eic/`: investment-income limit, prior disallowance (Form 8862)
  and the resident election.
- `foreign/foreign_tax_credit.test.ts` (graph only) and
  `foreign/form1116/` (alternative compensation, employer packet fixture).
- `health/form8941/`: 16 `*_2025.test.ts` SHOP scenarios.
  `health/form8962/`: APTC cents, no-APTC and corrected-policy returns.
- `individual/form8936/`: business, commercial and dealer-transfer routes.

## Conventions verified here

- Files are `<form>_<topic>_2025.test.ts`. The older business, EIC and 8936
  tests drop the `_2025` suffix.
- The `process.env` variables used here (`FORM8941_RATING_EVIDENCE`,
  `FORM8941_GEOGRAPHIC_ROUTES_EVIDENCE`, `OPENTAX_FORM1116_EMPLOYER_PROOF_DIR`)
  only name output directories for the XML/PDF evidence. They gate no
  assertion.
- `bun run test:unit` does not run these tests. Run them by path.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/e2e/credits/<group>/`
- There are more Form 8962 scenarios in `2025/mef/forms/credits/health/f8962/`
  and `2025/pdf/reviews/credits/health/`, and more Form 1116 packets in
  `2025/domains/credits/foreign/form1116/`. Run them too when you change one of
  these routes.

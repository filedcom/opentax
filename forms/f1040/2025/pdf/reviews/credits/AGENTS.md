# 2025/pdf/reviews/credits

Review-route tests for credit forms. Each test runs a synthetic return through
the graph, MeF and PDF (`execute` → `buildPending` → `buildMefBundle` →
`buildPdfBytes`), and some also check the printed fields. The section map is at
[../../../../nodes/inputs/credits/AGENTS.md](../../../../nodes/inputs/credits/AGENTS.md).

## Contents

- `business/`: Form 8835 landfill-gas and trash-combustion tests, the 8864
  direct-producer route, and `review_8826_interpreter.fixture.ts`. That fixture
  is the only file here that `../../review_fixtures.ts` imports.
- `health/`: nine `form8962_*_route.test.ts` cases (shared policies, alternating
  or sequential no-APTC months, corrected/overlapping policies). They pick
  their return from `pdfReviewFixtures` by `id`.
- `individual/`: `form8862_*` reinstatement routes (CTC, ODC, ODC with AOTC)
  and `form8863_*` claimant, school-source, scholarship and kiddie-tax cases,
  with their `*.fixture.ts`.

## Conventions verified here

- Most review returns are defined in `../../review_fixtures.ts` or next to the
  input nodes (`nodes/inputs/credits/business/f8864/f8864.fixture.ts`, ...), not in
  this folder. Find a case by its `id`.
- `form8863_*.fixture.ts` are imported outside this folder too: by
  `../../forms/credits/individual/f8863.test.ts`,
  `../../../mef/forms/credits/individual/f8863.xsd.test.ts` and
  `../../../domains/income/foreign/form8621/form8621_1294_8863_refigure.test.ts`.
- `form8863_missing_1098t.test.ts` writes its PDFs to `FORM8863_EVIDENCE_DIR`
  when that variable is set.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/pdf/reviews/credits/<group>/`
- After changing a fixture: `bun scripts/research/plan-ty2025-pdf-review.ts`.

# 2025/pdf/reviews/deductions

Synthetic deduction returns for PDF review, with tests that run them through
the graph, MeF and `buildPdfBytes`. Section map:
[../../../../nodes/inputs/deductions/AGENTS.md](../../../../nodes/inputs/deductions/AGENTS.md).

## Folders

- `additional/` — Schedule 1-A qualified tips (health, mixed Schedule C/F).
- `business/` — `form8995_qualified_tips.fixture.ts`, the business-tip QBI
  base the `additional/` fixtures import.
- `charitable/` — Form 8283 Section A/B scenarios;
  `form8283_source_documents.fixture.ts` (`giftSourceRecord`,
  `completed8283Source`) builds the simulated signed documents the others use.
- `investments/` — Form 4952 route tests (K-1 code B, 1099-MISC royalty,
  traced debt, combined payers, MFJ spouse royalty).
- `mortgage/` — `review_1098_copy.fixture.ts` (`withSyntheticForm1098Copy`,
  `canonicalForm1098CopyDocument`): the lender-copy builder imported by Form
  1098 tests in nodes, domains, e2e and `mef/xsd_validation.test.ts`.

## Conventions verified here

- Only `additional/review_qualified_tips.fixture.ts` and
  `mortgage/review_1098_copy.fixture.ts` are imported by
  `../../review_fixtures.ts`; the Form 8283 fixtures serve sibling tests only.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/pdf/reviews/deductions/`
- `bun scripts/research/plan-ty2025-pdf-review.ts` after changing a registered fixture.

# 2025/pdf/reviews/taxes

PDF review fixtures and route tests for three Taxes families. Form
counterparts: [section map](../../../../nodes/inputs/taxes/AGENTS.md).

- `amt/form6251_*_route.test.ts` — six private-activity-bond (PAB) routes
  (OID, interest+dividend, dividend, mixed, two issuers, same issuer two
  bonds). Each starts from the `single-w2-refund` entry of
  `pdfReviewFixtures` and checks the MeF bundle and the filled Form 6251 PDF.
- `retirement/form4972/` — `review_4972_multiple_annuity` and
  `review_4972_multiple_nua` are spread into `pdfReviewFixtures`
  (`../../review_fixtures.ts`). `review_4972_fractional`,
  `review_4972_partial_multiple` and `review_4972_partial_multiple_death_estate`
  are imported only by tests in `domains/taxes/retirement/form4972/`, as is
  `review_4972_fractional.expected.json`.
- `self-employment/` — three Schedule SE owner/farm fixtures, all registered
  in `review_fixtures.ts`.

## Verify

- `bun test ./forms/f1040/2025/pdf/reviews/taxes --timeout=1800000`
- `bun scripts/research/plan-ty2025-pdf-review.ts` after adding or renaming a
  registered fixture.

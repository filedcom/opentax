# Income — PDF review routes

Whole-return route tests that fill the real IRS PDFs for Income forms:
`business/` (Form 4797 investment 1245, full recapture and K-1 line 2 routes;
Form 8824 section 1231), `investments/` (Form 6252, Form 6781 prepared rows),
`other/` (W-2G prepared copy), `retirement/` (IRA rollover eligibility).
Form crosswalk: [section map](../../../../nodes/inputs/income/AGENTS.md).

## Conventions here

- No `*.fixture.ts` lives here. Every test picks a base return from
  `pdfReviewFixtures` (`../../review_fixtures.ts`) by `id`: five use
  `single-w2-refund` and add the Income inputs inline; the others use
  `single-form6781-two-section1256-accounts`, `single-ira-rollover` /
  `single-ira-qualified-plan-rollover`, and a W-2G fixture rebuilt with
  `w2gPayerCopyFixture` (`2025/domains/income/other/w2g_payer_copy.fixture.ts`).
- They run the real graph (`buildExecutionPlan` + `execute` with
  `registry`; the 6781 test uses `f1040_2025`), then `buildPending`, `buildMefBundle` and `buildPdfBytes`;
  all but `investments/form6781_prepared_rows.test.ts` reopen the filled PDF
  with `pdf-lib` to check fields.
- File names are `<form>_<route>_route.test.ts` or `<form>_<topic>.test.ts`.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/pdf/reviews/income`
- Needs the IRS templates in `.pdf-cache/` (downloaded on first use) and,
  for the business and 6252 routes, the private `Return1040.xsd`: without it
  9 of 17 tests fail on xmllint "failed to load external entity" (observed
  2026-10-17), which means unverified, not broken.

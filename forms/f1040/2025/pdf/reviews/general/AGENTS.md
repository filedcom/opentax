# 2025/pdf/reviews/general/

PDF review fixtures for returns that combine several sections. Single-section
fixtures go in `../<section>/`.

- `composed-returns/*.fixture.ts` export `PdfReviewFixture`s.
  `../../review_fixtures.ts` collects them into `pdfReviewFixtures`, which
  `scripts/research/plan-ty2025-pdf-review.ts` plans from. JSON siblings
  hold retained sources and the tip/health/C/F/beneficiary catalog
  (`.inputs.json`; `.metadata.json` has hashes and page origins).
  `review_tip_health_cf_beneficiary.test.ts` checks `inputsSha256`, so
  editing `.inputs.json` fails until the metadata is re-reviewed.
- `composed-returns/builder.test.ts` — the PDF final-export contract
  (identity, TIN match, W-2G, digital-asset answer).
  `return-assembly/form1040_required_zero_lines.test.ts` covers Form 1040
  lines that must print `0`.
- `composed-returns/qbi_percentage.ts` is a helper, not a fixture; PDF
  `deductions/business/f8995a*.ts` import it.
- Research: `docs/ty2025/domains/general/composed-returns/`.

## Verify

- `bun test ./forms/f1040/2025/pdf/reviews/general --timeout=1800000` (about
  a minute). Without the private XSD, catalog and `review_fixtures.xsd`
  cases fail on `Return1040.xsd` or `Missing verification prerequisite`;
  report them as unverified. Seven `mixed-cf-tip-*` catalog cases also fail
  with "Form 1040 line 1z differs from lines 1a through 1h". That is an
  engine failure, not caused by the missing XSD (seen 2026-10-17).
- `bun scripts/research/plan-ty2025-pdf-review.ts` after changing a fixture.

Section map: [../../../../nodes/inputs/general/AGENTS.md](../../../../nodes/inputs/general/AGENTS.md)

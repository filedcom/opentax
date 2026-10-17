# Adjustments — PDF review fixtures and contracts

Filled-packet review tests for Forms 7206 and 8889 (all under `health/`).
Each runs a full return, then checks Form 1040 lines, native XML tags and the
rendered PDF. Section map:
[../../../../nodes/inputs/adjustments/AGENTS.md](../../../../nodes/inputs/adjustments/AGENTS.md).

| File | Covers |
| --- | --- |
| `health/form7206_independent_owner.{fixture,test}.ts` | spouse-owned Schedule C businesses with separate plans; tampering rejections |
| `health/form7206_spouse_medicare.{fixture,test}.ts` | spouse Medicare premiums through Form 7206 and joint Form 8995 |
| `health/form7206_zero_eligible.test.ts` | all months employer-eligible: no `IRS7206`, Form 8995 still filed |
| `health/form8889_spouse_patient_route.test.ts`, `health/form8889_two_1099sa_medical_route.test.ts` | HSA distributions paying a spouse's or dependent's receipts, two 1099-SA copies |

## Conventions verified here

- The Form 7206 fixtures are imported by
  `../../../domains/adjustments/health/form7206/` tests too; changing an
  input here changes those returns.
- Form 8889 tests start from a `pdfReviewFixtures` entry
  (`../../review_fixtures.ts`: `joint-two-hsa-owners`, `single-w2-refund`) and add HSA source.
- The three Form 7206 tests shell out to `xmllint` (private Return1040.xsd
  under `.state/research/docs/IMF_Series_2025v5.4/`) and `pdftotext`; they
  fail without the XSD. The Form 8889 tests need neither.

## Verify

- `bun test --timeout=1800000 forms/f1040/2025/pdf/reviews/adjustments`

# inputs/taxes/interest

Interest charges reported as additional tax. Only §453A interest is
computed; both look-back forms stop the return.

| Node             | Source                                                          | Route                                   | CLI shape             |
| ---------------- | --------------------------------------------------------------- | --------------------------------------- | --------------------- |
| `f453a_interest` | §453A(c) installment-obligation workpaper (no IRS form)         | `schedule2.line15_section453a_interest` | `inputSchema`, strict |
| `f8697`          | Form 8697, look-back interest for completed long-term contracts | none: `compute()` throws                | `isArray`, `f8697s`   |
| `f8866`          | Form 8866, look-back interest for income-forecast property      | none: `compute()` throws                | `isArray`, `f8866s`   |

## Rules found in the code

- `calculateSection453aInterest` counts only qualifying obligations
  (non-dealer, sale price over $150,000, nonfarm real property, or nonfarm
  business/investment personal property from 1989 on). Each origin year needs
  a workpaper whose aggregate face equals the qualifying inventory and whose
  applicable percentage is `(face − 5,000,000) / face`. Interest =
  unrecognized gain × maximum rate for its character (37/20/25/28%) ×
  percentage × `underpayment_rate` (`z.literal(0.07)`), rounded once.
- `tax_year_end` is `z.literal("2025-12-31")`: the schema is year-bound.
- Exporters re-run the calculation: `assertSection453aSchedule2Line`
  (`2025/domains/taxes/other/section453a_reconciliation.ts`, called by the
  MeF and PDF Schedule 2) requires the retained workpaper, matches the seller
  SSN to the filer and the filed line 15 to the recomputed amount.
- `f453a_interest/f453a_interest.fixture.ts` (`twoObligation453aFixture`) is shared with that
  domain test and `2025/mef/xsd_validation.test.ts`.
- Schedule 2 line 14 (§453(l)(3) dealer interest) has no input node and
  `schedule2` throws on any nonzero value.
- `f8697`/`f8866` interest belongs on Schedule 2 line 17n or a separate refund
  claim; both are also export-blocked in
  `2025/return-processing/attachment_coverage.ts`.

## Verify

- `bun test ./forms/f1040/nodes/inputs/taxes/interest --timeout=1800000`
- `bun test ./forms/f1040/2025/domains/taxes/other/section453a_reconciliation.test.ts --timeout=1800000`

Section map: [../AGENTS.md](../AGENTS.md). Research:
[docs/ty2025/domains/taxes/interest/](../../../../../../docs/ty2025/domains/taxes/interest/).

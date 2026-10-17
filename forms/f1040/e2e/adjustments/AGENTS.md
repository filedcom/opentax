# Adjustments — E2E return contracts

Whole-return tests for the health adjustment forms; no E2E exists yet for
educator expenses, Form 1098-E, 2106, 3903, SEP or IRA (Form 3903's export
block is proven in `../workflows/unregistered_attachment_export.test.ts`).
Section map: [../../nodes/inputs/adjustments/AGENTS.md](../../nodes/inputs/adjustments/AGENTS.md).

| File | Proves |
| --- | --- |
| [health/form7206/form7206_2025.test.ts](health/form7206/form7206_2025.test.ts) | Schedule C/SE → Form 7206 → Schedule 1 line 17 → MeF/PDF |
| [health/form8853/](health/form8853/form8853_medicare_2025.test.ts) (5 files) | Archer contributions, Medicare Advantage MSA (sole and joint), exceptions, partial medical use → Schedule 1/2, Form 5329, XSD, PDF |
| [health/hsa_carryover.test.ts](health/hsa_carryover.test.ts) | HSA prior excess reaches Form 8889, Form 5329 and Schedule 2 once |

## Conventions verified here

- Tests drive the core runtime directly:
  `execute(buildExecutionPlan(registry), registry, input, { taxYear: 2025, formType: "f1040" })`,
  then the MeF/PDF builders; input is the `start`
  shape (`general`, `w2`, `form8853`, …).
- Every file except `hsa_carryover.test.ts` validates the bundle with
  `xmllint` against the private Return1040.xsd
  (`.state/research/docs/IMF_Series_2025v5.4/`); those tests fail without
  it (36 of 51 here).
- `form7206_2025.test.ts` writes its packet to
  `.state/research/ty2025-form7206-full-return.{xml,pdf}`.
- The HSA test sits at `health/` level, not in a `form8889/` folder.

## Verify

- `bun test --timeout=1800000 forms/f1040/e2e/adjustments`

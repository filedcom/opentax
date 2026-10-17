# Adjustments — computed forms

Three computed forms in `health/`, each a routing target and a singleton
CLI input ([`2025/inputs.ts`](../../../../2025/inputs.ts)). Section map:
[../../../inputs/adjustments/AGENTS.md](../../../inputs/adjustments/AGENTS.md).

| Node | Fed by | Split modules |
| --- | --- | --- |
| [`form7206`](health/form7206/index.ts) | `schedule_c`, `schedule_f`, `schedule_se`, `sep_retirement` | `single_source.ts` (one-plan schema + calculator), `independent_owner.ts`, `policy_records.ts`, `pub974_worksheets.ts`, `pub974_attribution.ts` |
| [`form8853`](health/form8853/index.ts) | `w2` (box 12 code R) | `archer_contributions.ts`, `archer_distributions.ts`, `medicare_distributions.ts`, `ltc.ts`, `archer_activity.ts`, `distribution_activity.ts` |
| [`form8889`](health/form8889/index.ts) | `w2` (box 12 code W) | `employer_code2_evidence_schema.ts`, `employer_return_evidence_schema.ts`, `employer_postyear_evidence_schema.ts` |

## Conventions verified here

- Print fields reach MeF/PDF through a self-output row
  (`{ nodeType: this.nodeType, fields }`) that replaces the pending slice;
  `form8853` emits it only when `hasForm8853Activity`, `form7206` only on a
  filing route. `form8853` derives its scalars from the ledgers and throws
  when a supplied scalar disagrees.
- Feeders import `index.ts` only as a routing target. Schemas and
  calculators are shared through split modules: Schedule 1 imports Form
  8853's ledger schemas, `form8995`/`schedule1a` import
  `health/form7206/single_source.ts` and `independent_owner.ts`, `form8962`
  imports `pub974_attribution.ts`. Keep those free of node imports
  ([import-cycle review](../../../../../../docs/ty2025/domains/adjustments/health/form7206/ty2025-form7206-schema-import-cycle-review.md));
  `form7206` alone declares `outputNodes` as a getter.
- `health/form7206/policy_records.fixture.ts` is also used by
  `2025/pdf/review_fixtures.ts` and Deductions fixtures.

## Verify

- `bun test --timeout=1800000 forms/f1040/nodes/intermediate/forms/adjustments`;
  `bun run check:structure`

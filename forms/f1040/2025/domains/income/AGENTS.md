# Income — TY2025 source reconciliation

Guards, staged runners, fixtures and return tests for Income forms, grouped
`business/`, `foreign/`, `investments/`, `other/`, `rental-passthrough/`,
`retirement/`, `wages/`. Which node, serializer and rule file each folder
belongs to: [section map](../../../nodes/inputs/income/AGENTS.md).

## Conventions here

- Who calls the guards: per-1099 owner checks (`*_owner_reconciliation.ts`
  for 1099-DIV/INT/OID/G/MISC/NEC/PATR, `investments/line7a_source_reconciliation.ts`,
  `wages/line1h_source.ts`) are imported by the Form 1040 serializers in
  `../../mef/forms/general/return-assembly/f1040.ts` and the PDF twin;
  whole-return checks (`schedule-b/schedule_b_interest_reconciliation.ts`,
  `tax_exempt_interest_reconciliation.ts`, `ira1099r_income_reconciliation.ts`,
  `ssa_benefits_reconciliation.ts`, `wages/line1b_household_wages.ts`, …) by
  `../../mef/builder.ts` and `../../pdf/builder.ts`; form-specific ones by that
  form's serializer. `2025/index.ts` calls
  `assertNoRepeatedBrokerSaleSources`,
  `assertPassiveSCorpLossCalculationInputs` and `applyForm8621QefRefigure`.
- Some folders hold another group's form: `business/trust-k1/` and
  `business/passive_s_corp_loss_*.ts` serve the rental-passthrough K-1 nodes;
  `business/personal_property_rental_source.ts` serves `other/`; the
  1099-INT/DIV/OID/B folders sit under `investments/`, the business 1099s
  under `business/`.
- `business/form172/form172_modified_income.ts` and
  `form172_projected_return.ts` define TaxNodes (an `agi_aggregator`
  override and a retained `start`); both are baselined in
  `scripts/testing/structure-baseline.json`. Don't add more.
- Many return tests export MeF XML and validate it against the private
  `.state/research/docs/IMF_Series_2025v5.4/.../Return1040.xsd`. Without it
  some throw `Missing verification prerequisite` and others fail an
  `assertEquals` on xmllint's "failed to load external entity" warning;
  both mean "not verified", not a regression.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/domains/income/<group>`
- `bun run test:unit` (type-checks this tree; does not run these tests).
- `bun run bench --form f1040 --year 2025` when a guard or runner can change
  a computed line.

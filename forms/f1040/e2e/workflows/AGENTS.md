# forms/f1040/e2e/workflows

Whole-return contracts that belong to no single section: line totals,
export gates and XSD conformance. Parent: [../AGENTS.md](../AGENTS.md).

## Files

- `return.test.ts`, `scenarios.test.ts` — complete returns through
  `buildExecutionPlan`/`execute`, asserting Form 1040 lines. Their header
  comments explain pending semantics: values deposited both upstream and by
  `f1040`'s assembly become arrays; read `line24_total_tax`,
  `line33_total_payments`, `line35a_refund`, `line37_amount_owed` (always
  scalar) or the intermediate node's slice.
- `general_direct_deposit.test.ts` — refund account fields and
  `assertGeneral1040DepositSource`.
- `source_only_export.test.ts`, `unregistered_attachment_export.test.ts` —
  inputs with no registered native document must fail
  `assertAttachmentCoverage` or `buildMefXml`, never vanish from MeF.
- `xsd_validation.test.ts` — `xmllint` against the private 2025v5.4
  `Return1040.xsd`; `source_only_export.test.ts` has two XSD cases too.

## Traps

- XSD cases use `test.skipIf(!xsdAvailable)` on
  `.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd`;
  a skip is not a pass — report it as unverified.
- A section-specific contract goes under `../<section>/<group>/<form>/`, not here.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/e2e/workflows/`
- `bun test --timeout=1800000 ./forms/f1040/e2e/workflows/general_direct_deposit.test.ts`
  for a quick check.

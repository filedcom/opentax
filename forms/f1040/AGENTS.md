# forms/f1040/

Form 1040 (individual return): shared tax nodes plus each tax year's wiring,
source reconciliation and MeF/PDF projections. Form-agnostic engine code
belongs in `core/`; return persistence and commands in `cli/`.

## Layout

- `nodes/` — every `TaxNode`, shared across years; see [nodes/AGENTS.md](nodes/AGENTS.md).
- `2025/index.ts` — the public `f1040_2025` `FormDefinition` that
  `catalog.ts` maps as `"f1040:2025"`.
- `2025/registry.ts` — `registry`: node type → node, the map the executor
  resolves (`registry[nodeType]`).
- `2025/inputs.ts` — `inputNodes`: which nodes the CLI accepts and with
  which schema (`inputSchema` or `itemSchema` + `isArray`, optional
  `inputKey`).
- `2025/config.ts` — `F1040_2025_CONFIG` (`formType`, `taxYear`,
  `mefSchemaVersion: "2025v5.4"`). Tax constants are in `nodes/config/`.
- `2025/return-processing/` — `start.ts` (`buildStartNode(inputNodes)`, the
  composite input node) and pending/prepared-return wiring.
- `2025/domains/` — year-specific source reconciliation, by section.
- `2025/mef/`, `2025/pdf/` — native XML and printed-form projections,
  PDF field dumps, review fixtures.
- `mef/` — shared MeF header, filer and XML helpers.
- `validation/` — business rules (`rules/`) and `field_registry.ts`.
- `e2e/` — whole-return contracts by section; see [e2e/AGENTS.md](e2e/AGENTS.md).
- `shared/` — whole-dollar and printable-field helpers.
- `FORM.md` — form policy read by the `tax-build`, `tax-fix` and
  `tax-status` skills; keep it current.

## Rules

- A `TaxNode` under `2025/` fails `check:structure` (placement), except
  `2025/return-processing/start.ts`. Three legacy nodes under `2025/domains/`
  are baselined in `scripts/testing/structure-baseline.json`; move, don't add.
- Every node class must be in `2025/registry.ts`, keyed by its `nodeType`
  (not-in-registry, registry-key), and every registered node must be in
  `inputNodes` or be some node's `outputNodes` target (unreachable).
- Year-dependent numbers come from `CONFIG_BY_YEAR[ctx.taxYear]`
  (`nodes/config/`), not literals in `compute()`.
- Benchmark cases live in `benchmark/cases/f1040/<year>/`, not here.

## Verify

- `bun run check:structure`, `bun run test:unit`, `bun run check:sandbox`
- `bun run check:cases` after changing an input schema
- `bun run bench --form f1040 --year 2025` and `bun run check:oracle`
- `bun test <changed folder> --timeout=1800000` for node and projection tests
  (`test:unit` does not run them).

## Read next

- [nodes/AGENTS.md](nodes/AGENTS.md), [2025/AGENTS.md](2025/AGENTS.md), [mef/AGENTS.md](mef/AGENTS.md), [validation/AGENTS.md](validation/AGENTS.md)
- [FORM.md](FORM.md)
- [2025/domains/README.md](2025/domains/README.md), [2025/return-processing/README.md](2025/return-processing/README.md)
- [2025/mef/forms/README.md](2025/mef/forms/README.md), [2025/pdf/forms/README.md](2025/pdf/forms/README.md)
- [validation/rules/README.md](validation/rules/README.md), [e2e/AGENTS.md](e2e/AGENTS.md)

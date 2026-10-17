# forms/f1040/2025

Tax year 2025 of Form 1040: the wiring that turns the shared nodes in
`../nodes/` into the `f1040:2025` `FormDefinition` registered in `catalog.ts`,
plus the year's source reconciliation and MeF/PDF projections. A `TaxNode` class
does not belong here (`check:structure` requires nodes under
`forms/f1040/nodes/<role>/...`); tax-rate constants live in
`../nodes/config/2025.ts`, not in `config.ts`.

## Layout
- `index.ts` — public year entrypoint; exports `f1040_2025` with
  `executeReturn` (source-level guards from `domains/`, then
  `return-processing/staged_source_return.ts` and the Form 8621 QEF refigure;
  Form 8990 takes a bounded two-pass route), `prepareReturn` (MeF bundle and
  PDF renderer), `buildMefXml`, `buildPdfBytes`, `buildPending`.
- `config.ts` — `F1040_2025_CONFIG`: `formType`, `taxYear`, `mefSchemaVersion`
  (`"2025v5.4"`; `mef/builder.ts` rejects any other version).
- `inputs.ts` — `inputNodes: InputNodeEntry[]`, the public CLI input surface.
  Each entry is `{ node, itemSchema, isArray: true }` or
  `{ node, inputSchema, isArray: false }`; `inputKey` overrides the public key
  (default `node.nodeType`), so one node can take several keyed inputs.
- `registry.ts` — `registry: NodeRegistry`, keyed by node type, with the
  generated `start` node from `buildStartNode(inputNodes)`.
- `return-processing/` — the composite `start` node and whole-return staging.
- `domains/` — year-specific source reconciliation by return section.
- `mef/` — native MeF XML serializers and bundle; `pdf/` — printed IRS PDFs.

## Rules
- A new source document needs an `inputs.ts` entry and its node in
  `registry.ts`; `buildInputSchema` (in `return-processing/start.ts`) throws on
  a duplicate public key, and `check:structure` fails on a node class in no
  registry, a registry key that is not its `nodeType`, or a registered node
  that is neither a CLI input nor a routing target.
- `executeReturn` is the only execution entrypoint (`FormDefinition` in
  `core/types/form-definition.ts`); put new whole-return staging in
  `return-processing/` or a `domains/` runner and call it from here.
- Import the shared nodes by relative path (`../nodes/...`); keep the import
  groups in `registry.ts` (Inputs, Intermediates, Outputs; `start` first).
- Folders: tax groups are kebab-case, form folders and files snake_case, under
  the seven sections general/income/adjustments/deductions/credits/taxes/payments,
  mirrored in `domains/`, `mef/forms/`, `pdf/forms/` and `pdf/reviews/`.

## Verify
- `bun run check:structure` after touching `inputs.ts` or `registry.ts`.
- `bun run test:unit` (resolves and type-checks every module; it runs no test
  under `forms/`).
- `bun run bench --form f1040 --year 2025` and `bun run check:oracle` when
  computed lines can change.
- Targeted: `bun test ./forms/f1040/2025/<path>.test.ts --timeout=1800000`.

## Read next
- [domains/AGENTS.md](./domains/AGENTS.md), [mef/AGENTS.md](./mef/AGENTS.md),
  [pdf/AGENTS.md](./pdf/AGENTS.md),
  [return-processing/AGENTS.md](./return-processing/AGENTS.md)
- [../../../docs/architecture/STRUCTURE.md](../../../docs/architecture/STRUCTURE.md)
- [../../../docs/architecture/repository-organization.md](../../../docs/architecture/repository-organization.md)
- [../nodes/config/2025.ts](../nodes/config/2025.ts) — TY2025 constants

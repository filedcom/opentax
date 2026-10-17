# forms/f1040/nodes/outputs/

Final line assembly: the two terminal nodes whose fields are the computed
Form 1040 and Schedule 1 lines that `return get` and the benchmark read.
Calculations belong upstream in `../intermediate/`; MeF/PDF rendering of
these lines belongs in `../../2025/mef/` and `../../2025/pdf/`.

## Layout

- `general/return-assembly/f1040/` — node type `f1040`: `index.ts`,
  `index.test.ts`, `schedule_r_limit.test.ts`.
- `general/return-assembly/schedule1/` — node type `schedule1`: `index.ts`,
  `index.test.ts`, `research/context.md`.
- `general/README.md` — links to the canonical MeF assemblies.

## Rules

- Both nodes are terminal: `outputNodes = new OutputNodes([])`, and
  `compute()` returns a self-output
  (`{ nodeType: this.nodeType, fields: assembled }`), which the executor
  treats as the node's finalized value.
- Assemble, don't compute: a line here sums or copies fields routed from
  intermediate nodes; new tax logic goes into a form or worksheet node that
  routes into these.
- `f1040` field names are the keys `benchmark/run_benchmark.ts` scores
  against `correct.json` (`line24_total_tax`, `line35a_refund`,
  `line37_amount_owed`); renaming one breaks scoring.
- `f1040` breaks the `form<number>` convention for computed forms; don't
  rename it or copy the pattern.

## Verify

- `bun test forms/f1040/nodes/outputs --timeout=1800000`
- `bun run check:structure`
- `bun run bench --form f1040 --year 2025` and `bun run check:oracle`

## Read next

- [../AGENTS.md](../AGENTS.md)
- [../intermediate/AGENTS.md](../intermediate/AGENTS.md)
- [general/README.md](general/README.md)
- [../../../../benchmark/AGENTS.md](../../../../benchmark/AGENTS.md)

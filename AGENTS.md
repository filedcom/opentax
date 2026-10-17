# opentax

A federal tax engine: validated source documents in, computed return lines out,
as a graph of pure nodes. Two CLIs, kept apart:

- `cli/main.ts` is the product, compiled to the `opentax` binary users run.
- The harness is what you use while building it and is never shipped:
  `bun run check:structure` (nodes placed, registered, reachable),
  `bun run check:cases` (benchmark cases fit their node schemas and cite a
  publication), `bun run check:sandbox` (the binary reaches the network only
  through restricted fetch), `bun run bench` (engine output against IRS ground
  truth), `bun run test:unit` (module graph, type check and typed tests),
  `bun run test:forms` (node, export and return-processing tests),
  `bun run check:mef` (sample returns build MeF XML and pass the IRS rules) and
  `bun run check:cli` (complete returns work end to end through the CLI).

## Before a pull request

A change ships with proof, not a description of it:

- `bun run check:structure`, `bun run check:sandbox`, `bun run test:unit`,
  `bun run test:forms`, `bun run check:mef` and `bun run check:cli` pass.
- `bun run bench --form <form> --year <year>` passes for every form:year the
  change touches, and `bun run check:oracle` passes: an expected value changes
  only with a publication cited in that product's `ledger.json`.
- The pull request says what was not verified and why.

The layout the checks enforce, and which check owns each rule, is in
`docs/architecture/STRUCTURE.md`.

## Nodes

- Input shapes are Zod schemas; infer their types, never redeclare them. Finite
  domain codes are an exported enum used with `z.nativeEnum`, not `z.string()`.
- `compute()` is composed from small pure functions: no mutation, no state,
  early returns. Route only through `outputNodes = new OutputNodes([...])`.
- Never weaken a type to fix a compile error (`as any`,
  `Record<string, unknown>` over a schema, a widened parameter); fix the caller
  or the test.
- File order: imports, enums, item schema, input schema, type aliases, pure
  helpers, node class, singleton export.

## Benchmark truth

Every expected value in `benchmark/cases/**/correct.json` comes from the IRS
publication cited in its `source`, never from the engine. A failing case is
fixed in the engine or escalated with the citation; cases are not edited to
pass.

## Repository workflow

- Keep one ongoing pull request for this work and push subsequent changes to its
  branch; after it merges, branch the next one from the latest `origin/main`
  with the `codex/` prefix, preserving unrelated local edits.
- Merge only when the user has authorized it and the pull request's checks and
  conflicts are resolved.

Autonomous build and fix loops are skills under `.claude/skills/`.

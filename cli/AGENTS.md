# cli/

The product: `cli/main.ts` is compiled to the `opentax` binary
(`bun run compile`). Only argument parsing, return persistence and
export/IO belong here; tax computation lives in `forms/`, the engine in `core/`,
and developer tooling in `scripts/` and `benchmark/` (never shipped).

## Layout
- `main.ts` — entry: installs the network policy, parses flags with
  `@std/cli` `parseArgs`, dispatches `COMMANDS` (`<cmd> <sub>`) and `TOP_LEVEL`
  (`version`, `update`). Returns live under `./.state/returns` (`RETURNS_DIR`).
- `network.ts` — `ALLOWED_HOSTS` (`www.irs.gov`, `api.github.com`,
  `github.com`) and `restrictedFetch`, which rejects any non-HTTPS or
  unlisted host with `NetworkPolicyError`.
- `version.ts` — `VERSION` (`"dev"` in source, replaced by CI before compile)
  and `GITHUB_REPO` for release lookups.
- `commands/` — one module per command group (`return`, `form`, `node`,
  `graph`, `export`, `validate`, `version`, `form8886-otsa`); `help.ts` holds
  `CommandDef`/`ParsedArgs`.
- `store/` — `return.json` persistence and guarded workpaper/ledger archives.
- `utils/zod-doc.ts` — renders a node's Zod input schema for `node inspect`.

## Rules
- The binary cannot spawn processes, load native code, open sockets or `eval`:
  `bun run check:sandbox` (`scripts/testing/sandbox.ts`) walks every module
  `cli/main.ts` reaches, dependencies included, and fails on `child_process`,
  `net`, `http(s)`, `tls`, `dns`, `worker_threads`, `vm`, `bun:ffi`,
  `Bun.spawn`, `Bun.$`, `new Function`, `eval` or a non-literal `import()`.
- Network goes only through global `fetch`; a new host is a change to
  `ALLOWED_HOSTS`, and its test is `cli/network.test.ts`.
- Use `node:` built-ins directly (`node:fs/promises`, `node:path`,
  `node:process`). `scripts/support/sys.ts` is for tests and scripts only; it
  imports `node:child_process`, so a product import of it fails
  `check:sandbox`.
- A new command needs a `COMMANDS` entry in `main.ts`; a new flag also needs
  its field in `ParsedArgs` (`commands/help.ts`) and, if it takes a value, its
  name in the `parseArgs` `string` list in `main.ts`.
- Command functions return data or throw (return commands take `baseDir`);
  `main.ts`'s `run()` prints JSON and turns a throw into `Error: …`, exit 1.
- `update` renames the downloaded release over `process.execPath`; from
  source that path is the `bun` runtime, so `update` exits 1 when `VERSION`
  is `"dev"`. Keep that guard.
- Forms are looked up through `catalog.ts` (`"<form>:<year>"`); don't import a
  year's `FormDefinition` directly in a new command.
- File names are kebab-case; tests sit beside their module as `<name>.test.ts`.

## Verify
- `bun run check:sandbox` after any change here or to anything `main.ts`
  imports.
- `bun run test:unit` covers `cli/utils/` and `cli/network.test.ts` only.
- `bun test --timeout=1800000 cli/commands/` and
  `bun test --timeout=1800000 cli/store/` for the rest (full suite only).
- `bun run tax <cmd> <sub> …` runs the CLI from source; `bun run compile`
  builds `./opentax`.

## Read next
- [store/AGENTS.md](store/AGENTS.md)
- [../core/AGENTS.md](../core/AGENTS.md)
- [../scripts/testing/README.md](../scripts/testing/README.md) — the harness and what each check proves
- [../docs/architecture/STRUCTURE.md](../docs/architecture/STRUCTURE.md)

# scripts

Development, research and release tooling. Nothing here is reachable from
`cli/main.ts` or shipped in the `opentax` binary; product code never imports
from `scripts/`. Group index: [README.md](./README.md).

## Layout
- `testing/` — the harness (structure, oracle, sandbox checks, test runner);
  see [testing/AGENTS.md](./testing/AGENTS.md).
- `research/` — TY2025 filled-PDF review: `plan-`, `generate-`,
  `check-ty2025-pdf-review.ts` plus `ty2025-pdf-review-*.ts` contracts with
  tests; `inspect-pdf-fields.ts` (AcroForm fields vs PDF descriptors);
  `audit-joint-submission-rules.ts`; `ty2026/*.py` (corpus download, inventory
  and PDF-field generators writing under `docs/ty2026/`).
- `maintenance/` — `parse-rules.ts` generates
  `forms/f1040/validation/rules/` from the IRS MeF business-rules CSV, using
  `rule-paths.ts` for each rule group's folder; `*4972*-oracle.py` are
  independent Decimal source oracles.
- `release/` — `smoke-release-binary.ts <asset> <version> [transcript]`
  (`.github/workflows/release.yml`) and `smoke-issue77.ts` scenarios it runs.
- `site/` — `site-stats.ts` (`.github/workflows/pages.yml`).
- `support/sys.ts` — file and process helpers (`Command`, `makeTempDir`,
  `stat`, …) on `node:` built-ins, for tests, fixtures and scripts only.

## Rules
- Tests sit beside their source as `*.test.ts`; `scripts/support/` and
  `scripts/testing/` tests are in `bun run test:unit`, the rest only in the
  full `bun run test`.
- Never import `scripts/support/sys.ts` (it uses `node:child_process`) from
  product code under `cli/`, `core/` or `forms/` outside tests and fixtures;
  `bun run check:sandbox` fails if the binary's module graph reaches it.
- Review packets hold full return data: the generator writes them only to a
  new caller-chosen directory with private permissions
  (`ty2025-pdf-review-private-files.ts`); other research output goes under the
  git-ignored `.state/research/`. Neither is committed.
- An oracle here is independent of the engine: it recomputes from the IRS
  form, never imports engine code to derive expected values.
- Keep [README.md](./README.md) in step when adding or moving a group.

## Verify
- `bun run test:unit` (covers `support/` and `testing/`).
- `bun test ./scripts/<group>/<file>.test.ts --timeout=1800000` for any other
  test here.
- `bun run check:sandbox`

## Read next
- [README.md](./README.md)
- [testing/AGENTS.md](./testing/AGENTS.md), [testing/README.md](./testing/README.md)
- [../docs/architecture/STRUCTURE.md](../docs/architecture/STRUCTURE.md)

# Repository tools

Tools used while building and releasing the engine; none of this ships in the
`opentax` binary. Files are grouped by purpose, and tests stay beside the
source they verify.

| Group | Contents |
| --- | --- |
| [testing](./testing/README.md) | The harness: structure, oracle and sandbox checks, and the test runner behind `test`, `test:unit`, `test:harness` and `test:preflight` |
| [research](./research/) | TY2025 filled-PDF review plan, generation and audit (`*-ty2025-pdf-review.ts` with their contracts and tests), AcroForm field inspection, joint-submission rule audit, and `ty2026/` Python generators for the TY2026 corpus and inventories |
| [maintenance](./maintenance/) | MeF business-rule generation (`parse-rules.ts`, `rule-paths.ts`) and independent Python Decimal oracles for Form 4972 |
| [release](./release/) | Smoke checks of a compiled release binary (`smoke-release-binary.ts`, run by the release workflow) and the Issue 77 CLI scenarios it replays |
| [site](./site/) | `site-stats.ts`: keeps node and input counts on the static site in step with the registry (run by the Pages workflow) |
| [support](./support/) | `sys.ts`: file and process helpers for tests, fixtures and scripts only; product code uses `node:` directly |

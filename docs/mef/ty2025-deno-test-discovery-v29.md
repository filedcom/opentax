# TY2025 full-test discovery correction

The immutable V29 `deno task test` at `1596091cfc` ended with exit 1 during
TypeScript checking, before test execution. Its status and exact log remain at
`/tmp/opentax-full-regression-source-v29-oct6.status` and
`/tmp/opentax-deno-task-test-source-v29-oct6.log` (SHA-256
`87257a278f0ac5118967a49d11e17b626a3f08d3145d4d36d5788f1f3fb9f96c`).
The log has 1,186 discovered `Check` paths. Two were private saved research
copies under `.state/research`; the other 1,184 were registered repository
tests. All 25 reported errors arose in the copied
`.state/research/7203-prior-copy-worker-final-oct6/035-debt-note.test.ts`,
whose relative imports no longer had their original directory context. The
other private copy was `.state/research/schedule-c-12-review.test.ts`.

Deno's [test discovery documentation](https://docs.deno.com/runtime/reference/cli/test/)
provides `test.exclude` for collection before typechecking. The `deno.json`
change excludes only `.state/research/`, which stores retained review artifacts
rather than registered tests. It does not alter the `deno task test` command,
permissions, typechecking, test definitions, or assertions. The V29 research
test bytes were copied hash-for-hash into the isolated verification checkout;
the originals and V29 result were not changed.

The post-change discovery/typecheck uses the exact task with `--no-run`:
`deno task test --no-run`. This is an inventory/typecheck gate only. A separate
full `deno task test` run remains required to establish a passing regression
batch. Its output and discovery comparison are retained at
`/tmp/opentax-deno-test-discovery-after-oct6.log` and
`/tmp/opentax-deno-test-discovery-comparison-oct6.json`.

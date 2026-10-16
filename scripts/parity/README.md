# Runtime parity

The record that the Deno-to-Bun migration changed no behaviour. The golden set
was captured under Deno before anything moved; every later step is compared
against it. It records what the CLI prints, not what the IRS says; truth stays in
`benchmark/cases/**/correct.json`. A difference from this set is a migration
bug, never a reason to re-record it.

| Path                                     | What                                                                | Recorded with                                             |
| ---------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------- |
| `golden/cases/<form>/<year>/<case>.json` | every CLI call per benchmark case: argv, exit code, stdout, stderr  | Deno 2.9.7, `cli/main.ts` from source, Linux x64          |
| `golden/cases/index.json`                | case list with step counts and SHA-256 of each case file            | same                                                      |
| `golden/smoke/opentax-linux-x64.json`    | every call the release smoke scenarios make, plus the PDF's SHA-256 | Deno 2.9.7 `deno compile` with the release flags, `dev`   |
| `golden/smoke/<asset>.json`              | the same, per release platform, each on its own runner              | Release workflow dry run 38963876459, version `0.0.0-dev` |
| `golden/tests/full-suite.json`           | the outcome of every test case in all 1,485 test modules            | Deno 2.9.7, harness permissions, `--no-check`             |

Each case runs `return create`, one `form add` per input form, `return get`,
`return validate` and `return export --type mef`, in a fresh working directory.
Only three things are masked: the random return ID, the temporary directory, and
the MeF `<ReturnTs>` clock (only when it has its expected shape). Rejections are
recorded too: the 28 cases in `benchmark/cases/baseline.json` fail `form add`,
and benchmark returns lack the filer identity MeF export needs.

The per-platform smoke recordings differ from the local one in two known ways:
CI binaries print `Update available: 0.0.0-dev → <latest>` on stderr (a `dev`
build never checks), and Windows writes `\` in the one output path. Otherwise
all five are identical, PDF bytes included.

## Compare

```sh
# Engine from source: byte-identical, or a migration bug
bun scripts/parity/capture.ts /tmp/candidate -- bun cli/main.ts
diff -r scripts/parity/golden/cases /tmp/candidate

# A compiled binary through the release smoke scenarios
bun scripts/release/smoke-release-binary.ts ./opentax dev /tmp/smoke.json
diff scripts/parity/golden/smoke/opentax-linux-x64.json /tmp/smoke.json

# Every test, by name, against the Deno outcome
bun test --parallel --timeout=1800000 --reporter=junit \
  --reporter-outfile=/tmp/junit.xml $(git ls-files '*test.ts' | sed 's|^|./|')
bun scripts/parity/compare-tests.ts /tmp/junit.xml
```

## Result under Bun 1.4.2

- **Cases:** all 133 replay byte-identical from source, before and after the
  network policy was installed.
- **Binary:** the linux-x64 `bun build --compile` binary's smoke transcript is
  byte-identical to the Deno binary's, all 291 calls and the PDF's SHA-256.
- **Tests:** 14,486 cases. The only changed outcomes are 209 tests that failed
  under Deno because they read an environment variable outside the harness
  `--allow-env` list: 208 now pass, and 1 reaches the missing research documents
  like 940 others. Ignored tests stay 694 and the 141 other failures are the
  same tests. Three tests are new (`cli/network.test.ts`,
  `scripts/testing/sandbox.test.ts`). Four tests keep their outcome but are
  filed under a different module: a test file that imports another test file
  runs its tests, and Deno reports them under the defining file, Bun under the
  importing one (likewise the four `form8995a_sstb_*.test.ts` modules, whose
  tests Deno reported under their shared helper).

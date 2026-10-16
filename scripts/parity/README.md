# Runtime parity

The golden set every later step of the Deno-to-Bun migration is compared
against. It records what the CLI prints, not what the IRS says; truth stays in
`benchmark/cases/**/correct.json`. A difference from this set is a migration
bug, never a reason to re-record it.

| Path                                     | What                                                                | Recorded with                                    |
| ---------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------ |
| `golden/cases/<form>/<year>/<case>.json` | every CLI call per benchmark case: argv, exit code, stdout, stderr  | Deno 2.9.7, `cli/main.ts` from source, Linux x64 |
| `golden/cases/index.json`                | case list with step counts and SHA-256 of each case file            | same                                             |
| `golden/smoke/opentax-linux-x64.json`    | every call the release smoke scenarios make, plus the PDF's SHA-256 | Deno 2.9.7 `deno compile` release flags, `dev`   |

`golden/tests/full-suite.json` is the outcome of every test case in all 1,485
test modules under Deno 2.9.7 with the harness's permissions and `--no-check`,
in an environment without `.state/research` docs: 12,499 passed, 694 ignored,
940 failed for missing research docs, 209 failed reading an environment variable
outside the allow-list (`NotCapable`), 141 failed otherwise. Deno reports a test
under the file that calls `Deno.test`, so the four `form8995a_sstb_*.test.ts`
modules appear under `form8995a_sstb_service_checks.ts`. A later runner is
compared test by test against this file, not by totals.

Each case runs `return create`, one `form add` per input form, `return get`,
`return validate` and `return export --type mef`, in a fresh working directory.
Only three things are masked: the random return ID, the temporary directory, and
the MeF `<ReturnTs>` clock (only when it has its expected shape). Rejections are
recorded too: the 28 cases in `benchmark/cases/baseline.json` fail `form add`,
and benchmark returns lack the filer identity MeF export needs.

## Compare

```sh
# Engine from source on the candidate runtime
<runtime> scripts/parity/capture.ts /tmp/candidate -- <command that runs cli/main.ts>
diff -r scripts/parity/golden/cases /tmp/candidate

# A compiled binary through the release smoke scenarios
<runtime> scripts/release/smoke-release-binary.ts ./opentax dev /tmp/smoke.json
diff scripts/parity/golden/smoke/opentax-linux-x64.json /tmp/smoke.json
```

The other files in `golden/smoke/` come from the dry-run release workflow (run
38963876459, Deno 2.x, version `0.0.0-dev`), one per platform, each smoke-tested
on its own runner; `opentax-linux-x64.ci.json` is the same platform as the local
file. They differ from the local recording in only two known ways: CI binaries
print `Update available: 0.0.0-dev → <latest>` on stderr (a `dev` build never
checks), and Windows writes `\` in the one output path. Otherwise all five are
identical, PDF bytes included.

`capture.ts` uses only `node:` built-ins, so the same file runs under Deno and
Bun. The release workflow uploads a `smoke-transcript-<asset>` artifact per
platform; a dry run of it on the last Deno commit gives the other four
platforms' references (versioned `0.0.0-dev` there, `dev` locally).

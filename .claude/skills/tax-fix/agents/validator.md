# Validator Agent

You are a benchmark validator. Run the benchmark for one form:year and return structured results.

## Your Input

- `form` (e.g. `f1040`), `year` (e.g. `2025`) and the cases dir `benchmark/cases/{form}/{year}/`

## Run the Benchmark

```bash
bun run bench --form {form} --year {year} --json 2>&1
```

The command exits 1 whenever any case fails; that is expected, so parse the
output regardless of the exit code.

## Extract the JSON Result

The last line of stdout will be a JSON object. Parse it:
```json
{ "total": 105, "skipped": 0, "pass": 75, "fail": 30, "failing": ["54-single-w2-k1-...", ...], "failures": [...] }
```

`failures` carries each failing case's `lineFailures`, `unsupportedChecks` and
`errors` (and a `baselined` list, when present, names cases skipped under
`benchmark/cases/baseline.json`); include them when the orchestrator asks why a case fails. If there is
no JSON line, the run stopped before scoring (for example, an invalid case
input): report that error message instead of a result.

## Return Your Result

Output exactly this structure so the orchestrator can parse it:

```
VALIDATOR_RESULT: {"total":N,"pass":N,"fail":N,"failing":["case-name",...]}
```

Nothing else on the VALIDATOR_RESULT line — pure JSON after the prefix.

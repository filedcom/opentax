# Validator Agent

You are a benchmark validator. Run the 1040 benchmark and return structured results.

## Run the Benchmark

```bash
deno run --allow-read --allow-write --allow-run taxcalcbench/run_benchmark.ts --json 2>&1
```

## Extract the JSON Result

The last line of stdout will be a JSON object. Parse it:
```json
{ "total": 97, "pass": 75, "fail": 22, "failing": ["54-single-w2-k1-...", ...] }
```

## Return Your Result

Output exactly this structure so the orchestrator can parse it:

```
VALIDATOR_RESULT: {"total":N,"pass":N,"fail":N,"failing":["case-name",...]}
```

Nothing else on the VALIDATOR_RESULT line — pure JSON after the prefix.

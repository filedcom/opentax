# Case Writer Agent

You turn one raw IRS-sourced scenario into a benchmark case: an `input.json`
the engine can run and a `correct.json` with the publication's values.

## Input

- The raw case (description, source, year, inputs, correct values)
- Its case number and the cases directory `benchmark/cases/{form}/{year}/`

## 1. Name

`{NN}-{filing-status}-{key-forms}`, at most five segments, e.g.
`138-mfj-w2-ssa-1099r`.

## 2. input.json

Follow `docs/architecture/STRUCTURE.md` and an existing case such as
`benchmark/cases/f1040/2025/04-single-w2-unemployment/input.json`: a `start`
entry carrying `general` (filing status, fictional names and dates of birth,
dependents), then one entry per source document, each a single item.
`bun cli/main.ts node list` gives the node types and
`bun cli/main.ts node inspect --node_type <type>` their fields.

## 3. correct.json

Carry `case`, `scenario`, `year` and the full `source` (publication, exercise
or example, page). In `correct`, include only values the publication states.
`line24_total_tax`, `line35a_refund` and `line37_amount_owed` are required.
Only the keys in `SUMMARY_FIELDS` and `RAW_FIELDS` of
`benchmark/run_benchmark.ts` are scored; any other numeric key fails the case
as unmapped, so leave it out.

## 4. Check

Run `bun run check:cases` and fix each field it reports. Refund and amount
owed cannot both be nonzero.

## Output

```
Created: benchmark/cases/{form}/{year}/{name}/
  input.json:   N forms (start, w2, ...)
  correct.json: line24_total_tax=..., line35a_refund=..., line37_amount_owed=...
  Source: <citation>
```

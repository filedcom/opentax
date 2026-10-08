# benchmark

Accuracy benchmark for the `tax` engine — 133 archived TY2025 scenarios and
expected values. The harness does not establish independent IRS ground truth or
current source-contract validity; each oracle needs its own reviewed provenance.
Passes when every valid engine output is within $5 of the correct value for
total tax, refund, and amount owed.

For folder layout and file formats, see
[STRUCTURE.md](../docs/architecture/STRUCTURE.md).

## Cases

133 scenarios covering the common return types:

| Range | Filing status | Key features tested                                                                                                                                      |
| ----- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01–10 | Single        | W-2 only, high income, unemployment, interest, capital gains, Schedule C, student loan, senior, two employers                                            |
| 11–17 | MFJ           | Both W-2, children/CTC, unemployment, dividends, Schedule C + QBI, retirement + SSA, excess SS tax                                                       |
| 18–20 | HOH           | Child/CTC, EITC, dependent care credit                                                                                                                   |
| 21–31 | Mixed         | Additional Medicare Tax, ACTC, LTCG 0% bracket, blind filer, senior + SE income                                                                          |
| 32–97 | Extended      | Schedule C loss, 1099-R, AOTC, marketplace/1095-A, educator expense, estimated tax, EITC no children, 401(k), tips, QBI, K-1, SSA, NIIT, multiple 1099-R |

**Pass criteria:** engine value within $5 of the correct value for:

- `line24_total_tax`
- `line35a_refund`
- `line37_amount_owed`

## How to run

```bash
# Full benchmark
cd benchmark && deno run --allow-read --allow-write --allow-run run_benchmark.ts

# Single case
deno run --allow-read --allow-write --allow-run run_case.ts cases/f1040/2025/02-single-w2-basic/

# Regenerate all output.json
deno run --allow-read --allow-write --allow-run run_all.ts
```

## Adding a new case

Use `/tax-cases` (Claude Code skill) to generate IRS-sourced cases
automatically, or create `cases/{form}/{year}/NN-description/input.json` and
`correct.json` manually following the formats in
[STRUCTURE.md](../docs/architecture/STRUCTURE.md).

## Verification boundary

Discovery rejects incomplete or empty case inventories. Subprocess failures and
malformed CLI output are case errors, and the full denominator remains in the
report. Failed comparisons or case errors return a nonzero process status. The
existing $5 comparison tolerance remains explicit; a benchmark pass does not
prove MeF/XSD/PDF acceptance, independent tax correctness, or IRS acceptance.

Use the year configuration and cited IRS authorities for current tax parameters
rather than duplicating a tax table in this harness guide.

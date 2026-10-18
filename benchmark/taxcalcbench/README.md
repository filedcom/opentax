# TaxCalcBench (TY2025)

[TaxCalcBench](https://github.com/column-tax/tax-calc-bench) by Column Tax,
MIT licensed (`LICENSE.upstream`), pinned at commit
`52673a56c50cc78251f35f3dded9f3f6fbad2490`. Only its TY2025 set is used: 50
cases, 10 federal (`ty25-us-*`, scored on 19 Form 1040 lines) and 10 each for
CA, IL, NY and VA (scored on that state's main form). Inputs are PDFs plus
`remaining_data.json`; answers are `output.xml`.

The cases (30 MB of PDFs) are not vendored. `fetch.ts` sparse-fetches them at
the pinned commit into `~/.cache/opentax-taxcalcbench/`, outside the checkout, together with upstream's
published Claude Opus 5.5 no-tool outputs, and checks that `spec.json` still
matches upstream. `spec.json` holds upstream's prompt fragments and scored
labels/XPaths, extracted from `ty25_prompt.py` and `ty25_scoring.py`.

## Running

The test takers are agents, not this script. `bench:llm` costs nothing itself.

```bash
bun run bench:llm prepare --out /tmp/tcb [--cases ty25-us-001,ty25-us-002]
# per case and arm, give an agent manifest.json's `a` or `b` instruction and
# save its reply to /tmp/tcb/results/<a|b>/<case>.json, plus optional
# <case>.meta.json: {"cliCalls": n, "errors": [...], "excluded": "reason"}
bun run bench:llm score --out /tmp/tcb
bun run bench:llm score --out /tmp/tcb --reference   # upstream's Opus 5.5 outputs
```

- `prepare` writes each case's prompt: upstream's prompt verbatim, then the
  PDFs as `pdftotext -layout` text (agents get no attachments), then a request
  to answer as JSON keyed by the scored labels. Arm A may only read that file.
  Arm B also gets a work dir with the input files and an `opentax` wrapper that
  runs a freshly compiled binary in that dir with its own `HOME`. `--out` must
  be outside the checkout; answers stay in the fetch cache.
- `score` reproduces upstream's evaluator: strict is exact equality per line,
  lenient within $5, a missing or repeated line reads as 0. `--reference`
  reproduces upstream's published Opus 5.5 `ultrathink` row (40% strict, 50%
  lenient, 83.63% / 87.31% by line) on all 50 cases.

opentax computes federal returns only, so on the 40 state cases it can help
with federal inputs (AGI and the like) but not the state form itself.

## Results: federal TY2025 (10 cases), Claude Opus 5.5 as subagent test takers

| arm | engine | strict | lenient (±$5) | lines exact | median CLI calls |
|---|---|---|---|---|---|
| A: Claude alone | n/a | 5/10 | 8/10 | 94.2% | n/a |
| B: Claude + opentax | v2.0.14 | 7/10 | 8/10 | 94.2% | 46 |
| B: Claude + opentax | main 1e145173 (`node template`) | 7/10 | 9/10 | 94.2% | 44 |

Remaining misses on main 1e145173:
- us-010: line 19 (Schedule R not claimed).
- us-002: no input for a net qualified disaster loss added to the standard deduction.
- us-003: the Schedule 1-A senior deduction and Form 8606 were figured by hand, with a $2 rounding difference.

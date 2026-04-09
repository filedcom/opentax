---
name: import-testcases
description: Convert testcases/cases/ into anonymized taxcalcbench benchmark cases with PII scrubbed
---

# Import Test Cases to TaxCalcBench

Convert test cases from `testcases/cases/` (UUID-named directories) into anonymized, deduplicated benchmark cases in `taxcalcbench/cases/`.

## When to Use

When new CCH or other ground-truth test cases have been added to `testcases/cases/` and need to be imported into the taxcalcbench benchmark suite.

## How to Run

```bash
python3 testcases/convert_to_bench.py
```

## What the Script Does

1. **Reads** all UUID directories from `testcases/cases/` (each has `input.json` + `correct.json`)
2. **Deduplicates** by MD5 hash of input+correct JSON content
3. **Anonymizes all PII** — names, addresses, SSNs, EINs, employer/payer/partnership names
4. **Transforms** into taxcalcbench format with descriptive directory names
5. **Writes** to `taxcalcbench/cases/` starting at the next available case number

## PII Replacement Rules

| Field | Replacement |
|-------|-------------|
| Taxpayer | John James |
| Spouse | Sarah James |
| Dependents | Amy James, Hubert James, Chloe James, Maria James, Shawn James |
| Address | Springfield, IL 62701 |
| SSNs/TINs | XXX-XX-XXXX |
| Employers | ACME INDUSTRIES INC, SUMMIT CONSULTING LLC, HORIZON SERVICES CORP, PACIFIC TRADING CO, ATLAS FINANCIAL GROUP |
| Payers | FIRST NATIONAL BANK, LIBERTY INVESTMENTS LLC, HERITAGE FINANCIAL SERVICES, PIONEER TRUST COMPANY, GATEWAY SECURITIES INC, COMMONWEALTH ADVISORS |
| Partnerships | OAK VENTURES LLP, MAPLE HOLDINGS LLP, CEDAR INVESTMENTS LLP, BIRCH CAPITAL LLP, ELM PARTNERS LLP |
| EINs | Sequential fakes: 11-1000001, 12-1000002, ... |

## Output Format

Each case directory is named `NN-{filing_status}-{form-types}` (e.g. `54-single-w2-k1-1099r-1099int-1099div-1099b`).

### `input.json` — Anonymized engine input
Same structure as the original but with all PII replaced. Used by `run_case.ts` to execute through the engine.

### `correct.json` — TaxCalcBench format
```json
{
  "case": "54-single-w2-k1-1099r-1099int-1099div-1099b",
  "scenario": "Single filer with W-2 wage income, K-1 partnership income, ...",
  "year": 2025,
  "inputs": { "filing_status": "single", "wages": 102200, "interest": 19237, ... },
  "correct": { "line9_total_income": 919315, "line11_agi": 906333, ... }
}
```

The `inputs` summary is derived from forms:
- W-2 → wages, fed_withheld
- 1099-INT → interest
- 1099-DIV → ordinary_dividends, qualified_dividends
- 1099-R → pension, fed_withheld
- 1099-B → ltcg (proceeds - cost_basis + adjustment)
- SSA-1099 → ssa_gross
- 1040-ES → estimated_tax_payments
- K-1 → schedule_c_net (box1), interest (box5), dividends (box6a/6b)

## After Running

1. Verify no original PII leaked: `grep -ri "original_name" taxcalcbench/cases/5* taxcalcbench/cases/6*`
2. Run the benchmark: `deno run run_benchmark.ts` or `deno run run_all.ts`
3. Check that 1099-B description fields don't contain identifying brokerage info

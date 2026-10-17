# Case Writer Agent

You convert a raw IRS-sourced scenario into a benchmark case: an `input.json` the engine can run and a `correct.json` with IRS-authoritative values.

## Your Input

- Raw case object (from irs-cases-raw.json): description, source, year, inputs, correct values
- Case number (e.g. 135)
- Cases directory: `benchmark/cases/{form}/{year}/` (e.g. `benchmark/cases/f1040/2025/`)

## Step 1 — Name the Case Directory

Format: `{number}-{filing-status}-{key-forms}`

Examples:
- `135-single-w2-interest`
- `136-mfj-w2-ssa-1099r`
- `137-hoh-w2-eitc-ctc`

Use the filing status and the primary income forms present. Keep it short (max 5 segments).

Create the directory: `benchmark/cases/{form}/{year}/{name}/`

## Step 2 — Write input.json

Map the raw inputs to engine node types. Follow the exact format of existing cases (read `benchmark/cases/f1040/2025/02-single-w2-basic/input.json` as a reference, and `grep -l '"node_type": "<type>"' benchmark/cases/f1040/2025/*/input.json` for a case that already uses a node type). Each `forms[]` entry is one `form add`: for a repeatable document (W-2, each 1099) add one entry per document whose `data` is a single item.

```json
{
  "year": 2025,
  "scenario": "[description from raw case]",
  "source": "[IRS citation from raw case]",
  "forms": [
    {
      "node_type": "start",
      "data": {
        "general": {
          "filing_status": "single|mfj|mfs|hoh|qss",
          "taxpayer_first_name": "...",
          "taxpayer_last_name": "...",
          "taxpayer_dob": "YYYY-MM-DD"
        }
      }
    },
    ... additional forms ...
  ]
}
```

### Node type mapping

The schema is the authority, not this table: run
`bun run tax node inspect --node_type <type>` (for a repeatable document, its
`items:` are the fields of one entry). Schemas are strict — unknown fields are
rejected and many source documents require reviewed-copy references — so copy
an existing valid case where one exists.

| Raw input | node_type | Example fields |
|-----------|-----------|----------------|
| W-2 | `w2` | box1_wages, box2_fed_withheld, box3_ss_wages, box4_ss_withheld, box5_medicare_wages, box6_medicare_withheld |
| 1099-INT | `f1099int` | payer_name, box1 |
| 1099-DIV | `f1099div` | see `node inspect` |
| 1099-G (unemployment) | `f1099g` | box_1_unemployment |
| SSA-1099 | `ssa1099` | box5_net_benefits |
| 1099-R | `f1099r` | box1_gross_distribution, box2a_taxable_amount, box7_distribution_code |
| 1099-NEC | `f1099nec` | payer_name, payer_tin, box1_nec |
| 1099-B | `f1099b` | see `node inspect` (part A/B/C/D/E) |
| Schedule C | `schedule_c` | see `node inspect` |
| K-1 partnership | `k1_partnership` | see `node inspect` |
| 1095-A | `f1095a` | issuer_name, monthly_premiums, monthly_slcsps, … |
| Form 2441 | `f2441` | qualifying_person_count, qualifying_expenses_paid, earned_income_taxpayer, earned_income_spouse |
| Form 8863 | `f8863` | see `node inspect` |
| Form 1040-ES | `f1040es` | payment_q1 … payment_q4 |
| Schedule A | `schedule_a` | Only if itemizing |
| Educator expenses | `educator_expenses` | expenses |
| Student loan interest | `f1098e` | box1_student_loan_interest |
| IRA deduction | `ira_deduction_worksheet` | ira_contribution, active_participant, … |

Filing status, taxpayer and dependents go in the `start` entry's `general`
object, as in the example above.

For dependents, add to the `general` node:
```json
"dependents": [
  { "first_name": "...", "last_name": "...", "dob": "YYYY-MM-DD", "relationship": "child", "months_in_home": 12 }
]
```

Use a plausible but fictional name and DOB for the taxpayer (the IRS exercises use fictional people). Use the state from the exercise if given, otherwise use a no-income-tax state (e.g. TX, FL, WA).

## Step 3 — Write correct.json

Only include fields the IRS publication explicitly provides. Do not calculate or infer any values.

```json
{
  "case": "[directory name]",
  "scenario": "[description]",
  "year": 2025,
  "source": "[full IRS citation: pub name, exercise number, page]",
  "correct": {
    "line11_agi": 32500,
    "line15_taxable_income": 17500,
    "line24_total_tax": 1763,
    "line33_total_payments": 5815,
    "line35a_refund": 4052,
    "line37_amount_owed": 0
  }
}
```

**Required fields** (must always be present — these are what the benchmark checks):
- `line24_total_tax`
- `line35a_refund` (0 if amount owed)
- `line37_amount_owed` (0 if refund)

**Optional fields** (include only if IRS states them explicitly):
- `line11_agi`
- `line15_taxable_income`
- `line33_total_payments`

## Step 4 — Verify

Check that:
1. `bun run check:cases` passes. It validates every node_type and field against the node schema the CLI applies; fix each reported field until it passes. The table above is a starting point; `bun run tax node inspect --node_type <type>` and the schemas wired in `forms/{form}/{year}/inputs.ts` are the authority.
2. `correct.json` has all three required fields
3. `source` field is present and specific (pub name + exercise/page)
4. The numbers in `correct.json` are consistent with each other (refund + owed can't both be nonzero; total_payments − total_tax should roughly equal refund)

## Output

Report:
```
Created: benchmark/cases/f1040/2025/135-single-w2-interest/
  input.json:   3 forms (start, w2, f1099int)
  correct.json: line24_total_tax=1763, line35a_refund=4052, line37_amount_owed=0
  Source: IRS VITA Pub 4491 TY2025, Exercise 2, p. 34
```

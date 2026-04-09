# @filed/tax-engine

Open-source IRS Form 1040 tax engine built for AI agents.

Works with the AI apps you already use — **Claude, ChatGPT, Gemini** — desktop or web. Download one file, wire it in, and just ask the AI to do your taxes. It feeds in your W-2s and 1099s and hands back a finished 1040.

> Covers Form 1040 (TY2025) today. Additional forms and state returns coming.

---

## Install (5 minutes, no technical knowledge needed)

**Step 1 — Download the file for your computer:**

| My computer is... | Download |
|---|---|
| Mac with Apple chip (M1/M2/M3/M4) | [`tax-macos-arm64`](https://github.com/filed-app/tax-engine/releases/latest/download/tax-macos-arm64) |
| Mac with Intel chip | [`tax-macos-x64`](https://github.com/filed-app/tax-engine/releases/latest/download/tax-macos-x64) |
| Windows PC | [`tax-windows-x64.exe`](https://github.com/filed-app/tax-engine/releases/latest/download/tax-windows-x64.exe) |
| Linux | [`tax-linux-x64`](https://github.com/filed-app/tax-engine/releases/latest/download/tax-linux-x64) |

Not sure which Mac you have? Apple menu → About This Mac. If it says "Apple M..." you want the Apple chip version.

**Step 2 — On Mac/Linux, make it runnable.** Open Terminal and run:

```bash
chmod +x ~/Downloads/tax-macos-arm64
```

**Step 3 — Wire it into your AI app** (see below).

That's it. No other software to install.

---

## How it works

You tell the AI what's on your tax documents. The AI calls the tax engine in the background, runs the IRS math, and shows you the finished return — refund or amount owed, every line filled in.

```
W-2 → wages, withholding
1099-INT → interest income        ↘
1099-DIV → dividends               → Form 1040 → Schedule 1 → … → refund / amount owed
Schedule C → self-employment       ↗
```

---

## Use with AI assistants

Once the binary is downloaded, connect it to your AI app of choice.

---

### Claude Desktop (via MCP)

MCP lets Claude call the tax engine as a built-in tool — Claude just handles everything, no copy-pasting required.

**1.** Download the binary (step 1 above) and move it somewhere easy, like `/usr/local/bin/tax`.

**2.** Open Claude Desktop → Settings → Developer → Edit Config. Add:

```json
{
  "mcpServers": {
    "tax": {
      "command": "/usr/local/bin/tax",
      "args": ["mcp"]
    }
  }
}
```

**3.** Save and restart Claude Desktop. You'll see a hammer icon in the chat — the tax engine is live.

**4.** Just ask:

> **"I have a W-2 with $95,000 in wages and $14,200 withheld. I also have a 1099-INT for $380 in interest. Single filer, no dependents. Prepare my 2025 federal return."**

Claude creates the return, adds all the forms, runs the math, validates it, and shows you the finished 1040 — no commands, no copying.

---

### Claude.ai (web) or Claude Code

Paste this into the chat — Claude will download and run the binary itself:

```
Download the tax engine from:
https://github.com/filed-app/tax-engine/releases/latest/download/tax-macos-arm64

Then prepare a 2025 federal tax return. I'm single.
My W-2: $85,000 wages, $12,000 withheld.
1099-INT: $420 interest from Chase.
Show me the finished 1040.
```

Claude Code handles the download, permissions, and all the CLI calls. You just read the result.

---

### ChatGPT (web or desktop)

ChatGPT can use the tax engine via its computer use or code interpreter capabilities. Or wire it up programmatically:

```python
import subprocess, json

TAX_BIN = "/usr/local/bin/tax"  # path to the downloaded binary

def call_tax(args: list[str]) -> dict:
    result = subprocess.run([TAX_BIN] + args, capture_output=True, text=True)
    return json.loads(result.stdout)

tools = [
    {
        "type": "function",
        "function": {
            "name": "tax_return_create",
            "description": "Create a new tax return for a given year",
            "parameters": {
                "type": "object",
                "properties": {"year": {"type": "integer"}},
                "required": ["year"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "tax_form_add",
            "description": "Add a tax document (W-2, 1099, etc.) to a return",
            "parameters": {
                "type": "object",
                "properties": {
                    "returnId": {"type": "string"},
                    "node_type": {"type": "string"},
                    "data": {"type": "object"}
                },
                "required": ["returnId", "node_type", "data"]
            }
        }
    }
]
```

---

### Gemini (web or API)

Same pattern — download the binary, point Gemini at it:

```python
import google.generativeai as genai
import subprocess, json

TAX_BIN = "/usr/local/bin/tax"

def run_tax(args: list) -> str:
    result = subprocess.run([TAX_BIN] + args, capture_output=True, text=True)
    return result.stdout

model = genai.GenerativeModel(model_name="gemini-1.5-pro", tools=[run_tax])

response = model.generate_content(
    "I have a W-2 for $78,000 wages and $11,000 withheld. "
    "I'm single. Compute my 2025 federal tax return."
)
```

Or open Gemini in a browser, paste the binary download URL, and ask it to run your taxes using it — Gemini's code execution sandbox can fetch and run the binary directly.

---

## Example prompts

These work with any AI assistant wired to the engine:

**Simple W-2 filer**

> "Prepare a 2025 federal tax return. I'm single. My W-2 shows $72,000 in box 1 and $9,800 in box 2. No other income or deductions."

**Married filing jointly with children**

> "MFJ return for 2025. Two W-2s: $105,000/$15,000 withheld and $38,000/$4,500 withheld. Two kids ages 6 and 10. Compute the return and tell me the refund."

**Self-employed**

> "I'm single and self-employed. Schedule C shows $92,000 gross and $31,000 in business expenses. I paid $4,000 in estimated taxes. What do I owe?"

**Retirement income**

> "I'm 68, filing single. SSA-1099 shows $24,000 in social security benefits. 1099-R shows a $15,000 distribution from my IRA (distribution code 7). Compute my taxable income and total tax."

**Investment income**

> "MFJ, AGI around $180,000 before investments. 1099-DIV: $4,200 qualified dividends, $800 ordinary. 1099-B: $12,000 long-term capital gains. One W-2 each: $90k and $85k. Run the full return."

**After the return is computed, ask:**

> "What is my effective tax rate?"
> "Am I subject to the net investment income tax?"
> "Validate the return and tell me if there are any errors."
> "Export the return as IRS MeF XML."

---

## Manual CLI usage

Requires [Deno](https://deno.land).

```bash
# 1. Create a return
deno task tax return create --year 2025
# → { "returnId": "abc-123" }

# 2. Add taxpayer info (filing status, dependents)
deno task tax form add --returnId abc-123 --node_type general \
  '{"filing_status": "single"}'

# 3. Add income documents
deno task tax form add --returnId abc-123 --node_type w2 \
  '{"box1_wages": 85000, "box2_fed_withheld": 12000}'

deno task tax form add --returnId abc-123 --node_type f1099int \
  '{"payer_name": "Chase Bank", "box1_interest": 420}'

# 4. Compute the return — prints every line of the 1040
deno task tax return get --returnId abc-123

# 5. Validate against MeF business rules
deno task tax return validate --returnId abc-123

# 6. Export as IRS MeF XML (ready for e-file)
deno task tax return export --returnId abc-123 --type mef > return.xml
```

### Introspection

```bash
# What fields does a node expect?
deno task tax node inspect --node_type w2

# See the full dependency graph from any node
deno task tax node graph --node_type start

# List all 184 registered nodes
deno task tax node list
```

---

## CLI reference

### Returns

| Command                                               | Description                           |
| ----------------------------------------------------- | ------------------------------------- |
| `return create --year N`                              | Create a new return, returns UUID     |
| `return get --returnId ID`                            | Execute and print all computed values |
| `return validate --returnId ID [--format text\|json]` | Run MeF business rules validation     |
| `return export --returnId ID --type mef [--force]`    | Generate IRS MeF XML to stdout        |

### Forms

| Command                                          | Description                              |
| ------------------------------------------------ | ---------------------------------------- |
| `form add --returnId ID --node_type TYPE 'JSON'` | Add an input (W-2, 1099, schedule, etc.) |
| `form list --returnId ID [--node_type TYPE]`     | List all entries in a return             |
| `form get --returnId ID --entryId ID`            | Get a specific entry                     |
| `form update --returnId ID --entryId ID 'JSON'`  | Update an entry                          |
| `form delete --returnId ID --entryId ID`         | Delete an entry                          |

### Nodes

| Command                                            | Description                        |
| -------------------------------------------------- | ---------------------------------- |
| `node list`                                        | List all 184 registered nodes      |
| `node inspect --node_type TYPE`                    | Show input schema and output nodes |
| `node inspect --node_type TYPE --json`             | Same, as JSON                      |
| `node graph --node_type TYPE [--depth N] [--json]` | Mermaid or JSON dependency graph   |

---

## Supported input nodes (TY2025)

131 input nodes covering the full range of 1040 source documents.

### Income

| Node type   | Form                                      |
| ----------- | ----------------------------------------- |
| `w2`        | W-2 Wage & Tax Statement                  |
| `w2g`       | W-2G Gambling Winnings                    |
| `ssa1099`   | SSA-1099 Social Security Benefits         |
| `rrb1099r`  | RRB-1099-R Railroad Retirement            |
| `f1099int`  | 1099-INT Interest Income                  |
| `f1099div`  | 1099-DIV Dividends                        |
| `f1099nec`  | 1099-NEC Non-Employee Compensation        |
| `f1099g`    | 1099-G Government Payments / Unemployment |
| `f1099b`    | 1099-B Broker Proceeds                    |
| `f1099r`    | 1099-R Pensions & Distributions           |
| `f1099oid`  | 1099-OID Original Issue Discount          |
| `f1099patr` | 1099-PATR Patronage Dividends             |
| `f1099m`    | 1099-MOD Mortgage Debt Cancellation       |
| `f1099c`    | 1099-C Cancellation of Debt               |
| `f1099k`    | 1099-K Payment Settlements                |
| `f1095a`    | 1095-A Marketplace Insurance              |
| `fec`       | Foreign Employer Compensation             |

### Schedules

| Node type        | Form                                   |
| ---------------- | -------------------------------------- |
| `schedule_a`     | Schedule A Itemized Deductions         |
| `schedule_c`     | Schedule C Business Income             |
| `schedule_e`     | Schedule E Rental/Royalty/Partnership  |
| `schedule_f`     | Schedule F Farm Income                 |
| `schedule_h`     | Schedule H Household Employment        |
| `schedule_j`     | Schedule J Farm Income Averaging       |
| `schedule_r`     | Schedule R Credit for Elderly/Disabled |
| `k1_partnership` | Schedule K-1 (Form 1065)               |
| `k1_s_corp`      | Schedule K-1 (Form 1120-S)             |
| `k1_trust`       | Schedule K-1 (Form 1041)               |

### Deductions & Adjustments

| Node type                 | Form                                 |
| ------------------------- | ------------------------------------ |
| `f1098`                   | 1098 Mortgage Interest               |
| `f1098e`                  | 1098-E Student Loan Interest         |
| `f2106`                   | Form 2106 Employee Business Expenses |
| `educator_expenses`       | Educator Expenses                    |
| `sep_retirement`          | SEP/SIMPLE/Keogh Contributions       |
| `ira_deduction_worksheet` | IRA Deduction Worksheet              |
| `sales_tax_deduction`     | State/Local Sales Tax Deduction      |
| `ltc_premium`             | Long-Term Care Premium               |
| `qsehra`                  | QSEHRA Reimbursements                |
| `depletion`               | Depletion Deduction                  |
| `nol_carryforward`        | Net Operating Loss Carryforward      |
| `ppp_forgiveness`         | PPP Loan Forgiveness                 |
| `clergy`                  | Clergy Housing Allowance             |

### Credits

| Node type | Form                                   |
| --------- | -------------------------------------- |
| `f2441`   | Form 2441 Dependent Care Credit        |
| `f8812`   | Form 8812 Child Tax Credit / ACTC      |
| `f8863`   | Form 8863 Education Credits            |
| `f5695`   | Form 5695 Residential Energy Credit    |
| `f8396`   | Form 8396 Mortgage Interest Credit     |
| `f3800`   | Form 3800 General Business Credit      |
| `f8936`   | Form 8936 Clean Vehicle Credit         |
| `f8941`   | Form 8941 Small Employer Health Credit |

### Capital Transactions

| Node type  | Form                                   |
| ---------- | -------------------------------------- |
| `f8949`    | Form 8949 Capital Gains/Losses         |
| `f4835`    | Form 4835 Farm Rental Income           |
| `form4797` | Form 4797 Sale of Business Property    |
| `form6252` | Form 6252 Installment Sale             |
| `form6781` | Form 6781 Gains/Losses §1256 Contracts |
| `form8824` | Form 8824 Like-Kind Exchange           |

### Other

| Node type         | Form                                          |
| ----------------- | --------------------------------------------- |
| `general`         | Taxpayer identity, filing status & dependents |
| `preparer`        | Paid Preparer Information                     |
| `f1040es`         | Form 1040-ES Estimated Tax Payments           |
| `f2210`           | Form 2210 Underpayment Penalty                |
| `f8283`           | Form 8283 Non-Cash Charitable Contributions   |
| `f8332`           | Form 8332 Release of Dependency Claim         |
| `f8379`           | Form 8379 Injured Spouse Allocation           |
| `f8621`           | Form 8621 PFIC Annual Report                  |
| `f8938`           | Form 8938 Foreign Financial Assets            |
| `f8958`           | Form 8958 Community Property Allocation       |
| `f9465`           | Form 9465 Installment Agreement               |
| `f114`            | FinCEN 114 (FBAR)                             |
| `f1310`           | Form 1310 Deceased Taxpayer Refund            |
| `household_wages` | Household Employee Wages                      |
| `auto_expense`    | Vehicle/Auto Business Expense                 |
| `lump_sum_ss`     | Lump-Sum Social Security Election             |
| `qbi_aggregation` | QBI Aggregation Election                      |

---

## Validation

`return validate` runs the MeF business rules engine and reports:

- **Error** — must be corrected before filing
- **Warning** — likely mistake, confirm before filing
- **Info** — informational diagnostic

```bash
deno task tax return validate --returnId abc-123
deno task tax return validate --returnId abc-123 --format json
```

---

## Export

MeF XML export conforms to IRS 2025v5.2 schema.

```bash
deno task tax return export --returnId abc-123 --type mef
```

---

## Development

```bash
# Run all tests
deno task test

# Run accuracy benchmark (97 TY2025 scenarios)
cd benchmark && deno run --allow-read --allow-write --allow-run run_benchmark.ts

# Run a single case
cd benchmark && deno run --allow-read --allow-write --allow-run run_benchmark.ts --form cases/02-single-w2-basic/
```

### Benchmark harness

The harness tracks benchmark accuracy and drives autonomous bug-fixing sessions.

```
benchmark/harness/
  state.json     # Active task state: current pass/fail counts, root causes, phase
  progress.md    # Append-only log of harness runs and outcomes
```

**97 TY2025 scenarios** covering single, MFJ, HOH filers with W-2, 1099-R, SSA, Schedule C, K-1, capital gains, credits, and estimated tax payments. Pass criterion: engine within ±$5 of correct value for `line24_total_tax`, `line35a_refund`, and `line37_amount_owed`.

**Current accuracy: 94/97 passing.** The 3 remaining failures involve SSA + 1099-B combinations (cases 67, 91, 95) — likely NIIT/AMT mismatch.

#### Claude Code skills (in-repo)

If you're using Claude Code, three skills automate harness work:

| Skill | Purpose |
|-------|---------|
| `/tax-status` | Print current pass/fail, root causes, and recent activity |
| `/tax-fix` | Autonomous bug-fixing loop: runs benchmark, diagnoses failures, patches nodes, iterates until pass rate improves or stalls |
| `/tax-build` | Build a new form node end-to-end: research → ground truth → implementation → benchmark |

### Adding a node

- Define a Zod schema, infer types from it — never duplicate
- `compute()` is a pure function: no state, no mutations
- Use `OutputNodes` for type-safe routing to downstream nodes
- Break logic into small named pure helpers, compose in `compute()`

See `CLAUDE.md` for full conventions. See [`benchmark/STRUCTURE.md`](benchmark/STRUCTURE.md) for benchmark case format.

---

## License

MIT

# @filed/tax-engine

A type-safe, graph-based tax return computation engine for IRS Form 1040 (2025). Models tax filing as a directed acyclic graph (DAG) of pure computation nodes — each node transforms validated inputs into typed outputs that flow downstream.

## Architecture

Three-tier node hierarchy:

1. **Input nodes** — capture user-facing form data (W-2, 1099-s, schedules, general taxpayer info)
2. **Intermediate nodes** — perform form-specific calculations (worksheets, phase-outs, credits)
3. **Output nodes** — collect final computed values (Form 1040, Schedules 1–3)

Execution runs a topological sort over the DAG (Kahn's algorithm), then processes each node in order. Outputs accumulate in a pending dict with smart merging — multiple upstream sources for the same field are auto-merged into arrays.

## Quickstart

Requires [Deno](https://deno.land).

```bash
# Create a new return
deno task tax return create --year 2025
# { returnId: "abc-123" }

# Add a W-2
deno task tax form add --returnId abc-123 --node_type w2 \
  '{"box1_wages": 85000, "box2_fed_withheld": 12000}'

# Compute and view result
deno task tax return get --returnId abc-123

# Validate against MeF business rules
deno task tax return validate --returnId abc-123

# Export as IRS MeF XML
deno task tax return export --returnId abc-123 --type mef > return.xml

# Visualize the dependency graph
deno task tax node graph --node_type w2 --depth 3
```

## CLI Commands

Run `deno task tax --help` for the full reference, or `deno task tax <command> --help` for a specific group.

### Returns

| Command | Description |
|---|---|
| `return create --year N` | Create a new return, returns UUID |
| `return get --returnId ID` | Execute the plan and print computed values |
| `return validate --returnId ID [--format text\|json]` | Validate against MeF business rules |
| `return export --returnId ID --type mef [--force]` | Generate IRS MeF XML to stdout |

### Forms

| Command | Description |
|---|---|
| `form add --returnId ID --node_type TYPE 'JSON'` | Add an input (W-2, 1099, schedule, etc.) |
| `form list --returnId ID [--node_type TYPE]` | List all entries in a return |
| `form get --returnId ID --entryId ID` | Get a specific entry by ID |
| `form update --returnId ID --entryId ID 'JSON'` | Update an entry's data |
| `form delete --returnId ID --entryId ID` | Delete an entry |

### Introspection

| Command | Description |
|---|---|
| `node list` | List all 184 registered nodes |
| `node inspect --node_type TYPE` | Show a node's input schema and output nodes |
| `node inspect --node_type TYPE --json` | Same, as structured JSON |
| `node graph --node_type TYPE [--depth N] [--json]` | Mermaid or JSON dependency graph |

```bash
# What fields does the W-2 node expect?
deno task tax node inspect --node_type w2

# What does the full graph look like from start?
deno task tax node graph --node_type start

# List every registered node
deno task tax node list
```

## Supported Input Nodes (2025)

131 input nodes covering the full range of 1040 source documents.

### Income

| Node type | Form |
|---|---|
| `w2` | W-2 Wage & Tax Statement |
| `w2g` | W-2G Gambling Winnings |
| `ssa1099` | SSA-1099 Social Security Benefits |
| `rrb1099r` | RRB-1099-R Railroad Retirement |
| `f1099int` | 1099-INT Interest Income |
| `f1099div` | 1099-DIV Dividends |
| `f1099nec` | 1099-NEC Non-Employee Compensation |
| `f1099g` | 1099-G Government Payments / Unemployment |
| `f1099b` | 1099-B Broker Proceeds |
| `f1099r` | 1099-R Pensions & Distributions |
| `f1099oid` | 1099-OID Original Issue Discount |
| `f1099patr` | 1099-PATR Patronage Dividends |
| `f1099m` | 1099-MOD Mortgage Debt Cancellation |
| `f1099c` | 1099-C Cancellation of Debt |
| `f1099k` | 1099-K Payment Settlements |
| `f1095a` | 1095-A Marketplace Insurance |
| `fec` | Foreign Employer Compensation |

### Schedules

| Node type | Form |
|---|---|
| `schedule_a` | Schedule A Itemized Deductions |
| `schedule_c` | Schedule C Business Income |
| `schedule_e` | Schedule E Rental/Royalty/Partnership |
| `schedule_f` | Schedule F Farm Income |
| `schedule_h` | Schedule H Household Employment |
| `schedule_j` | Schedule J Farm Income Averaging |
| `schedule_r` | Schedule R Credit for Elderly/Disabled |
| `k1_partnership` | Schedule K-1 (Form 1065) |
| `k1_s_corp` | Schedule K-1 (Form 1120-S) |
| `k1_trust` | Schedule K-1 (Form 1041) |

### Deductions & Adjustments

| Node type | Form |
|---|---|
| `f1098` | 1098 Mortgage Interest |
| `f1098e` | 1098-E Student Loan Interest |
| `f2106` | Form 2106 Employee Business Expenses |
| `educator_expenses` | Educator Expenses |
| `sep_retirement` | SEP/SIMPLE/Keogh Contributions |
| `ira_deduction_worksheet` | IRA Deduction Worksheet |
| `sales_tax_deduction` | State/Local Sales Tax Deduction |
| `ltc_premium` | Long-Term Care Premium |
| `qsehra` | QSEHRA Reimbursements |
| `depletion` | Depletion Deduction |
| `nol_carryforward` | Net Operating Loss Carryforward |
| `ppp_forgiveness` | PPP Loan Forgiveness |
| `clergy` | Clergy Housing Allowance |

### Credits

| Node type | Form |
|---|---|
| `f2441` | Form 2441 Dependent Care Credit |
| `f8812` | Form 8812 Child Tax Credit / ACTC |
| `f8863` | Form 8863 Education Credits |
| `f5695` | Form 5695 Residential Energy Credit |
| `f8396` | Form 8396 Mortgage Interest Credit |
| `f3800` | Form 3800 General Business Credit |
| `f3468` | Form 3468 Investment Credit |
| `f5884` | Form 5884 Work Opportunity Credit |
| `f5884` | Form 5884 Work Opportunity Credit |
| `f6478` | Form 6478 Biofuel Producer Credit |
| `f6765` | Form 6765 R&D Credit |
| `f7207` | Form 7207 Advanced Mfg Production Credit |
| `f8082` | Form 8082 Pass-Through Adjustment |
| `f8834` | Form 8834 Electric Vehicle Credit |
| `f8835` | Form 8835 Renewable Electricity Credit |
| `f8864` | Form 8864 Biodiesel Credit |
| `f8874` | Form 8874 New Markets Tax Credit |
| `f8881` | Form 8881 Small Employer Pension Credit |
| `f8882` | Form 8882 Employer Child Care Credit |
| `f8896` | Form 8896 Low Sulfur Diesel Credit |
| `f8903` | Form 8903 Domestic Production Activities |
| `f8908` | Form 8908 Energy Efficient Home Credit |
| `f8936` | Form 8936 Clean Vehicle Credit |
| `f8941` | Form 8941 Small Employer Health Credit |

### Capital Transactions

| Node type | Form |
|---|---|
| `f8949` | Form 8949 Capital Gains/Losses |
| `f4835` | Form 4835 Farm Rental Income |
| `form4797` | Form 4797 Sale of Business Property |
| `form6252` | Form 6252 Installment Sale |
| `form6781` | Form 6781 Gains/Losses §1256 Contracts |
| `form8824` | Form 8824 Like-Kind Exchange |

### Other / Administrative

| Node type | Form |
|---|---|
| `general` | Taxpayer identity, filing status & dependents |
| `preparer` | Paid Preparer Information |
| `f1040es` | Form 1040-ES Estimated Tax Payments |
| `f2210` | Form 2210 Underpayment Penalty |
| `f2439` | Form 2439 Undistributed Long-Term Gains |
| `f4136` | Form 4136 Credit for Federal Tax on Fuels |
| `f8283` | Form 8283 Non-Cash Charitable Contributions |
| `f8288` | Form 8288 FIRPTA Withholding |
| `f8332` | Form 8332 Release of Dependency Claim |
| `f8379` | Form 8379 Injured Spouse Allocation |
| `f8621` | Form 8621 PFIC Annual Report |
| `f8697` | Form 8697 Interest on Lookback Method |
| `f8801` | Form 8801 Prior Year Minimum Tax Credit |
| `f8805` | Form 8805 Foreign Partner's Tax |
| `f8820` | Form 8820 Orphan Drug Credit |
| `f8822` | Form 8822 Change of Address |
| `f8826` | Form 8826 Disabled Access Credit |
| `f8828` | Form 8828 Mortgage Subsidy Recapture |
| `f8833` | Form 8833 Treaty-Based Return Position |
| `f8840` | Form 8840 Closer Connection Exception |
| `f8843` | Form 8843 Exempt Individual Statement |
| `f8844` | Form 8844 Empowerment Zone Credit |
| `f8854` | Form 8854 Expatriation |
| `f8859` | Form 8859 DC First-Time Homebuyer Credit |
| `f8862` | Form 8862 Reclaim EIC After Disallowance |
| `f8866` | Form 8866 Interest on Lookback (Long-Term) |
| `f8873` | Form 8873 Extraterritorial Income Exclusion |
| `f8888` | Form 8888 Refund to Multiple Accounts |
| `f8911` | Form 8911 Alternative Fuel Vehicle Credit |
| `f8912` | Form 8912 Credit to Holders of Tax Credit Bonds |
| `f8915d` | Form 8915-D Disaster Retirement Distributions |
| `f8915f` | Form 8915-F Qualified Disaster Distributions |
| `f8917` | Form 8917 Tuition and Fees Deduction |
| `f8938` | Form 8938 Foreign Financial Assets |
| `f8958` | Form 8958 Community Property Allocation |
| `f8965` | Form 8965 Health Coverage Exemptions |
| `f8978` | Form 8978 Partner's Additional Tax |
| `f8994` | Form 8994 Employer Credit for Paid Leave |
| `f8997` | Form 8997 Initial/Annual Statement of QOF |
| `f911` | Form 911 Taxpayer Advocate Request |
| `f9465` | Form 9465 Installment Agreement |
| `f965` | Form 965 Deferred Foreign Income |
| `f970` | Form 970 IRA Rollover |
| `f114` | FinCEN 114 (FBAR) |
| `f1310` | Form 1310 Deceased Taxpayer Refund |
| `f14039` | Form 14039 Identity Theft Affidavit |
| `f56` | Form 56 Fiduciary Relationship Notice |
| `f59e` | Form 59-E |
| `f3115` | Form 3115 Change in Accounting Method |
| `f3903` | Form 3903 Moving Expenses |
| `f4255` | Form 4255 Recapture of Investment Credit |
| `f4852` | Form 4852 Substitute W-2 |
| `f4970` | Form 4970 Tax on Accumulation Distribution |
| `f5405` | Form 5405 Homebuyer Credit Repayment |
| `f5471` | Form 5471 Foreign Corporation Information |
| `f8594` | Form 8594 Asset Acquisition Statement |
| `f8609` | Form 8609 Low-Income Housing Tax Credit |
| `f8611` | Form 8611 Recapture of Low-Income Housing |
| `f2120` | Form 2120 Multiple Support Declaration |
| `f843` | Form 843 Claim for Refund |
| `household_wages` | Household Employee Wages |
| `auto_expense` | Vehicle/Auto Business Expense |
| `lump_sum_ss` | Lump-Sum Social Security Election |
| `qbi_aggregation` | QBI Aggregation Election |

## Validation

`return validate` runs the full MeF business rules engine against a computed return and reports:

- **Error** — return must be corrected before filing
- **Warning** — likely mistake, confirm before filing  
- **Info** — informational diagnostic

```bash
deno task tax return validate --returnId abc-123
deno task tax return validate --returnId abc-123 --format json
```

## Export

MeF (Modernized e-File) XML export conforms to IRS 2025v5.2 schema. The builder assembles a `<Return>` with Form 1040 and Schedule 1 from computed pending values.

```bash
deno task tax return export --returnId abc-123 --type mef
```

## Development

```bash
# Run all tests
deno task test

# Run CLI tests only
deno task test:cli
```

### CLI structure

```
cli/
├── main.ts              # Entry point + command registry
├── commands/            # Command handlers + CLI framework types
│   ├── help.ts          # CommandDef types, printHelp
│   ├── form.ts          # form add/list/get/update/delete
│   ├── graph.ts         # graph view
│   ├── node.ts          # node list, node inspect
│   ├── return.ts        # return create/get
│   ├── export.ts        # return export
│   └── validate.ts      # return validate (MeF business rules)
├── store/               # Persistence (return.json read/write)
│   ├── store.ts
│   └── types.ts
└── utils/               # Generic utilities
    └── zod-doc.ts       # Zod schema → human-readable text
```

### Adding a node

All nodes follow the same shape:

```
forms/f1040/nodes/inputs/<name>/
  index.ts        # Node class + singleton export
  index.test.ts   # Tests
```

Key conventions (see `CLAUDE.md` for full details):

- Define a Zod schema, infer types from it — never duplicate
- `compute()` is a pure function: no state, no mutations, no side effects
- Use `OutputNodes` for type-safe routing to downstream nodes
- Break logic into small named pure helpers, compose in `compute()`

## Benchmark

[taxcalcbench](taxcalcbench/) is an accuracy benchmark — 51 TY2025 scenarios with independently computed correct values.

```bash
cd taxcalcbench
deno run --allow-read --allow-write --allow-run run_benchmark.ts
```

51 scenarios cover single, MFJ, MFS, HOH, QSS filing statuses with W-2, Schedule C/E/F, retirement distributions, Social Security taxability, capital gains, EITC, QBI, AMT, and more.

Pass criteria: engine value within $5 of ground truth for `line24_total_tax`, `line35a_refund`, and `line37_amount_owed`.

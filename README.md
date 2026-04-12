# OpenTax

Fully open-source federal tax software. Single binary. Runs on macOS, Linux, and Windows.

Built and maintained by AI agents using official IRS publications as the sole source of truth.

> Covers Form 1040 (TY2025) today. Additional forms and state returns coming.

---

## Why

Tax software shouldn't require an account, an internet connection, or trust in a black box. OpenTax is a single executable you download and run. The tax logic is open for anyone to read, audit, and verify against IRS instructions.

The entire codebase -- every form, every calculation, every validation rule -- is built and maintained by AI agents working directly from IRS publications (Pub 17, Pub 4491, MeF schemas, form instructions). No human-transcribed tax tables. No proprietary rule engines. Just code you can read, traced to the IRS source it implements.

---

## Install

One command. No runtime, no installer, no dependencies.

```bash
curl -fsSL https://raw.githubusercontent.com/filedcom/opentax/main/install.sh | sh
```

This detects your OS and architecture, downloads the right binary, and puts it in your PATH.

Or download manually:

| Platform | Download |
|---|---|
| Mac (Apple Silicon) | [`opentax-macos-arm64`](https://github.com/filedcom/opentax/releases/latest/download/opentax-macos-arm64) |
| Mac (Intel) | [`opentax-macos-x64`](https://github.com/filedcom/opentax/releases/latest/download/opentax-macos-x64) |
| Windows | [`opentax-windows-x64.exe`](https://github.com/filedcom/opentax/releases/latest/download/opentax-windows-x64.exe) |
| Linux (x64) | [`opentax-linux-x64`](https://github.com/filedcom/opentax/releases/latest/download/opentax-linux-x64) |
| Linux (ARM) | [`opentax-linux-arm64`](https://github.com/filedcom/opentax/releases/latest/download/opentax-linux-arm64) |

---

## Staying up to date

OpenTax tells you when a new version is available:

```
$ opentax return get --returnId abc-123
{ ... }

Update available: 0.1.0 → 0.2.0. Run `opentax update` to upgrade.
```

To update:

```bash
opentax update
```

That's it. The binary replaces itself with the latest release.

Check your current version anytime:

```bash
opentax version
```

---

## Usage

### Prepare a tax return

```bash
# 1. Create a return
opentax return create --year 2025
# → { "returnId": "abc-123" }

# 2. Set filing status
opentax form add --returnId abc-123 --node_type general \
  '{"filing_status": "single"}'

# 3. Add your W-2
opentax form add --returnId abc-123 --node_type w2 \
  '{"box1_wages": 85000, "box2_fed_withheld": 12000}'

# 4. Add a 1099
opentax form add --returnId abc-123 --node_type f1099int \
  '{"payer_name": "Chase Bank", "box1_interest": 420}'

# 5. Compute -- prints every line of the 1040
opentax return get --returnId abc-123
```

### Validate and export

```bash
# Check against IRS MeF business rules
opentax return validate --returnId abc-123

# Export as IRS MeF XML (ready for e-file)
opentax return export --returnId abc-123 --type mef > return.xml

# Export as filled PDF
opentax return export --returnId abc-123 --type pdf
```

### Manage form entries

```bash
# List everything in a return
opentax form list --returnId abc-123

# List just W-2s
opentax form list --returnId abc-123 --node_type w2

# Update a form entry
opentax form update --returnId abc-123 --entryId w2_01 \
  '{"box1_wages": 90000, "box2_fed_withheld": 13000}'

# Delete a form entry
opentax form delete --returnId abc-123 --entryId w2_01
```

### Inspect the engine

```bash
# What fields does a W-2 expect?
opentax node inspect --node_type w2

# Full dependency graph from any node
opentax node graph --node_type f1040

# List all registered nodes
opentax node list
```

---

## Use with AI agents

AI agents are good at using CLIs. Here's how an agent can use OpenTax to prepare a return:

```bash
# 1. Create a return
opentax return create --year 2025
# → { "returnId": "abc-123" }

# 2. Add taxpayer info and documents
opentax form add --returnId abc-123 --node_type general '{"filing_status": "single"}'
opentax form add --returnId abc-123 --node_type w2 '{"box1_wages": 95000, "box2_fed_withheld": 14200}'

# 3. Compute the return
opentax return get --returnId abc-123

# 4. Validate and export
opentax return validate --returnId abc-123
opentax return export --returnId abc-123 --type mef > return.xml
```

Every command reads and writes JSON. An agent can inspect any node's expected input schema with `opentax node inspect --node_type w2 --json`, so it knows exactly what fields to provide. No special integration needed -- just shell access to the binary.

---

## Supported forms (TY2025)

131 input nodes covering the full range of 1040 source documents -- W-2s, 1099s, all major schedules, credits, capital transactions, and more.

See [`catalog.ts`](catalog.ts) for the complete list of supported nodes and their schemas. Or from the CLI:

```bash
opentax node list
```

---

## How it's built

The engine is a directed graph of **nodes**. Each node is a pure function: validated input in, typed output out. No state, no side effects.

- Schemas defined with Zod, types inferred (never duplicated)
- Immutable data throughout -- no mutation anywhere
- Type-safe output routing between nodes enforced at compile time
- 133 real-world benchmark scenarios

AI agents maintain the codebase: reading IRS instructions, writing node implementations, generating test cases from official IRS exercises, and fixing regressions -- all traced back to the authoritative IRS source.

---

## Development

Requires [Deno](https://deno.land).

```bash
# Run tests
deno task test

# Run accuracy benchmark
deno task bench

# Run the CLI in dev mode
deno task tax return create --year 2025
```

### Contributing with Claude Code

The repo includes four skills that automate the full development lifecycle. Open the project in [Claude Code](https://claude.ai/code) and invoke them with `/skill-name`.

#### `/tax-status` -- See what's passing and what's broken

Run this first. Shows pass/fail counts, pending root causes, and build phase for every form.

```
/tax-status
```

#### `/tax-fix [form:year]` -- Fix a broken form

Autonomous bug-fixing loop. Reads failing benchmark cases, clusters them by root cause, spawns parallel fixer agents, validates, and commits any net-positive improvements. Loops until all cases pass or progress stalls.

```
/tax-fix f1040:2025
```

#### `/tax-cases [source]` -- Add new benchmark cases

Sources test cases from IRS publications (VITA exercises, Pub 17, MeF test packages). Run `/tax-fix` after to see how the engine performs on the new cases.

```
/tax-cases vita                            # VITA Pub 4491 training exercises
/tax-cases pub17                           # Publication 17 worked examples
/tax-cases "senior with SSA and 1099-R"    # free-form scenario
```

#### `/tax-build [form-number]` -- Build a new form from scratch

End-to-end form builder. Researches IRS instructions, extracts ground truth, builds all nodes section by section, then runs a validate + fix loop until >= 95% of benchmark cases pass. Resumes if interrupted.

```
/tax-build 1120
```

#### Typical workflows

**Adding a new form:**
```
/tax-cases f1120:2025 vita    # source benchmark cases first
/tax-build 1120               # build nodes, iterate until >= 95% pass
/tax-status                   # confirm it's green
```

**Fixing a regression:**
```
/tax-status                   # find what's failing and why
/tax-fix f1040:2025           # autonomous fix loop
```

**Expanding test coverage:**
```
/tax-cases pub17              # pull new IRS examples
/tax-fix f1040:2025           # fix loop against expanded case set
```

---

## License

MIT

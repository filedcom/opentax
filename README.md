# Filed OpenTax

<p align="center">
  <img src="icon.svg" width="128" height="128" alt="Filed OpenTax">
</p>

Fully open-source federal tax software. Single binary. Runs on macOS, Linux, and Windows.

Built and maintained by AI agents using official IRS publications as the sole source of truth.

> Covers Form 1040 (TY2025) today. Additional forms and state returns coming.

---

## Why

Professional tax software is closed source and is a critical piece of software for taxpayers and professionals. It was expensive to build and keep updated since it required manual updates to the codebase every time the rules changed.

With AI agents, the cost of building and maintaining tax software has dropped drastically. It only makes sense that we use them to build and maintain our tax software in the open. This project aims to be the first truly open-source and up-to-date tax software that can work for everyone.

The software is designed for the AI era -- designed to be run by AI agents more than humans. AI agents are proficient with CLI tools. This tax software is a single binary CLI that an AI agent can download and run. Everything is stored locally, keeping the software truly open, secure, and accessible.

---

## Use with AI agents

Copy-paste this into Claude Desktop app:

```
Load the skill here using curl or equivalent:
https://raw.githubusercontent.com/filedcom/opentax/main/skills/opentax/SKILL.md

Then run the onboarding flow.
```

### Claude Code

If you use [Claude Code](https://claude.ai/code), install OpenTax as a plugin so the skill is always available:

1. Add the marketplace:

```
/plugin marketplace add filedcom/opentax
```

2. Install the plugin:

```
/plugin install opentax@opentax
```

3. Use the skills:

```
/opentax:opentax         # guided onboarding -- picks the right skill for you
/opentax:tax-preparer    # prepare a return from scratch
/opentax:tax-reviewer    # audit a completed return against source docs
```

---

## Install CLI

One command. No runtime, no installer, no dependencies.

```bash
curl -fsSL https://raw.githubusercontent.com/filedcom/opentax/main/install.sh | sh
```

This detects your OS and architecture, downloads the right binary, and puts it in your PATH.

Or download manually:

| Platform            | Download                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Mac (Apple Silicon) | [`opentax-macos-arm64`](https://github.com/filedcom/opentax/releases/latest/download/opentax-macos-arm64)         |
| Mac (Intel)         | [`opentax-macos-x64`](https://github.com/filedcom/opentax/releases/latest/download/opentax-macos-x64)             |
| Windows             | [`opentax-windows-x64.exe`](https://github.com/filedcom/opentax/releases/latest/download/opentax-windows-x64.exe) |
| Linux (x64)         | [`opentax-linux-x64`](https://github.com/filedcom/opentax/releases/latest/download/opentax-linux-x64)             |
| Linux (ARM)         | [`opentax-linux-arm64`](https://github.com/filedcom/opentax/releases/latest/download/opentax-linux-arm64)         |

---

## Example: single W-2 filer

```bash
$ opentax return create --year 2025
{ "returnId": "a1b2c3" }

$ opentax form add --returnId a1b2c3 --node_type general '{"filing_status": "single"}'
{ "id": "general_01", "nodeType": "general" }

$ opentax form add --returnId a1b2c3 --node_type w2 '{"box1_wages": 55000, "box2_fed_withheld": 5200}'
{ "id": "w2_01", "nodeType": "w2" }

$ opentax return get --returnId a1b2c3
```

```json
{
  "returnId": "a1b2c3",
  "year": 2025,
  "summary": {
    "line1z_total_wages": 55000,
    "line9_total_income": 55000,
    "line11_agi": 55000,
    "line15_taxable_income": 39250,
    "line24_total_tax": 4471.5,
    "line33_total_payments": 5200,
    "line35a_refund": 728.5
  },
  "lines": {
    "filing_status": "single",
    "line1a_wages": 55000,
    "line12a_standard_deduction": 15750,
    "line15_taxable_income": 39250,
    "line16_income_tax": 4471.5,
    "line24_total_tax": 4471.5,
    "line25a_w2_withheld": 5200,
    "line33_total_payments": 5200,
    "line34_overpayment": 728.5,
    "line35a_refund": 728.5
  }
}
```

$55,000 in wages, $15,750 standard deduction, $39,250 taxable income, $4,471.50 tax, $728.50 refund. Every line traces back to the IRS instructions.

---

## More commands

```bash
# Validate against IRS MeF business rules
opentax return validate --returnId a1b2c3

# Export as IRS MeF XML (ready for e-file)
opentax return export --returnId a1b2c3 --type mef > return.xml

# List entries in a return
opentax form list --returnId a1b2c3

# Update or delete a form entry
opentax form update --returnId a1b2c3 --entryId w2_01 '{"box1_wages": 60000, "box2_fed_withheld": 5800}'
opentax form delete --returnId a1b2c3 --entryId w2_01

# Inspect what fields a node expects
opentax node inspect --node_type w2

# List all registered nodes
opentax node list
```

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

# Filed Open Tax Engine

<p align="center">
  <img src="icon.svg" width="128" height="128" alt="Filed Open Tax Engine">
</p>

**[opentax.filed.com](https://opentax.filed.com)** - Fully open-source federal tax calculation engine. Single binary. Runs on macOS, Linux, and Windows.

> **Note:** This engine calculates taxes accurately for use by AI agents and developers. For filing your taxes, visit [irs.gov](https://irs.gov).

Built and maintained by AI agents using official IRS publications as the sole source of truth.

> Covers Form 1040 for TY2025, with TY2026 Form 1040 and Form 4868 started. Additional forms and state returns coming.

---

## Why

- Professional tax calculation engines are closed source, expensive, and built for humans — making it hard for AI agents to reliably use one as a calculator
- AI agents have drastically reduced the cost of building and maintaining a tax engine. It only makes sense to do it in the open
- This project aims to be the first truly open-source, up-to-date tax calculation engine that works for everyone

**Designed for the AI era:**

- Built to be run by AI agents more than humans
- Single binary CLI that AI agents can download and run instantly
- Everything stored locally. Open, secure, and accessible

Inspired by Andrej Karpathy's [autoresearch](https://github.com/karpathy/autoresearch), an autonomous loop where AI agents modify code, measure results, and keep only improvements. OpenTax applies the same idea to tax calculation: agents read IRS instructions, write implementations, generate test cases, and fix regressions in a continuous loop.

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
/opentax:opentax         # guided onboarding, picks the right skill for you
/opentax:tax-preparer    # prepare a return from scratch
/opentax:tax-reviewer    # audit a completed return against source docs
```

---

## Install CLI

One command. No runtime, no installer, no dependencies.

```bash
curl -fsSL https://raw.githubusercontent.com/filedcom/opentax/main/install.sh | sh
```

- Detects your OS and architecture automatically
- Downloads the right binary and puts it in your PATH

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
    "line24_total_tax": 4475,
    "line33_total_payments": 5200,
    "line35a_refund": 725
  },
  "lines": {
    "filing_status": "single",
    "line1a_wages": 55000,
    "line12a_standard_deduction": 15750,
    "line15_taxable_income": 39250,
    "line16_income_tax": 4475,
    "line24_total_tax": 4475,
    "line25a_w2_withheld": 5200,
    "line33_total_payments": 5200,
    "line34_overpayment": 725,
    "line35a_refund": 725
  },
  "warnings": []
}
```

$55,000 in wages, $15,750 standard deduction, $39,250 taxable income, $4,475 tax
from the Tax Table, $725 refund. The output is abridged; it also lists the forms
computed and any carryforwards. Returns are stored under `./.state/returns`.

---

## More commands

```bash
# Inspect what fields a node expects, or list every registered node
opentax node inspect --node_type w2
opentax node list

# Print the JSON form add takes for a source document or input (--full adds optional fields)
opentax node template --document 1099-int
opentax node template w2 --full
opentax node template --list-documents

# List, update or delete form entries
opentax form list --returnId a1b2c3
opentax form update --returnId a1b2c3 --entryId w2_01 '{"box1_wages": 60000, "box2_fed_withheld": 5800}'
opentax form delete --returnId a1b2c3 --entryId w2_01

# Run the IRS MeF business rules offline
opentax return validate --returnId a1b2c3

# Add a PDF filed with the return, under the file name its inputs use
# (--description when the form needs a specific MeF attachment description)
opentax return attach --returnId a1b2c3 --file ./policy.pdf --name 2025-leave-policy.pdf
# Add a retained source copy (kept, not transmitted) under the reference its inputs use
opentax return attach --returnId a1b2c3 --file ./notice.pdf --reference "2023 CTC notice copy"

# Export as MeF XML, a filled IRS PDF, or a Pub 4164 submission ZIP
opentax return export --returnId a1b2c3 --type mef > return.xml
opentax return export --returnId a1b2c3 --type pdf --output return.pdf
opentax return export --returnId a1b2c3 --type mef-submission --efin 123456 --software-id 25000000

# Form 4868 extension (TY2026)
opentax return create --year 2026 --form f4868
```

The submission ZIP (`manifest/`, `xml/`, `attachment/`, named by its Submission
ID) needs the originator EFIN, the IRS-assigned Software ID and a reviewed
residency JSON (default `returns/<id>/residency-review.json`). It includes the
PDFs from the return's `attachments/` folder and the retained copies from
`retained/` that its inputs name; a missing file is reported with the path it
belongs at.

Run `opentax <command> --help` for every flag.

---

## Export, validation and filing

- `return get` works on partial returns; check its `warnings` before relying on
  amounts. Export also needs the filer's identity (SSN and name).
- `return validate` and export run the IRS MeF business rules offline. A clean
  run is not IRS acceptance. It also lists, as `OPENTAX_HINT` alerts, claims the
  entered facts point to but the return does not make (the same hints
  `return get` puts in `warnings`); they never block filing.
- Export blocks on every calculation diagnostic. `--force` overrides only
  reject-level business rules; `--draft` produces visibly labeled diagnostic
  output (a DRAFT comment in XML, a watermark on each PDF page). In the API,
  `ExportExecutionError` carries calculation diagnostics and
  `ExportRejectedError` carries rule rejects.
- Shell redirection can leave an empty file on failure; check the exit status.
- The CLI does not validate against the IRS XSDs; the harness does when the
  schemas are installed in [`irs/`](./irs/README.md).
- Returns stay local. Uploading source documents to a hosted assistant
  discloses them to that provider.

MeF A2A transmission (`opentax mef`) and the current MeF readiness are in
[docs/mef](./docs/mef/README.md).

---

## Staying up to date

OpenTax tells you when a new version is available:

```
$ opentax return get --returnId abc-123
{ ... }

Update available: 0.1.0 → 0.2.0. Run `opentax update` to upgrade.
```

`opentax update` replaces the binary with the latest release; `opentax version`
shows the current one.

---

## Supported forms

| Form      | Year | Inputs                                                                           |
| --------- | ---- | -------------------------------------------------------------------------------- |
| Form 1040 | 2025 | 195 input nodes: W-2s, 1099s, schedules, credits, capital transactions and more  |
| Form 1040 | 2026 | `general`, `w2`, `f8888`; other inputs are refused until their TY2026 rules land |
| Form 4868 | 2026 | Extension request                                                                |

[`catalog.ts`](./catalog.ts) lists the form definitions; `opentax node list` and
`opentax node inspect` show every node and its schema.

---

## How it's built

The engine is a directed graph of **nodes**. Each node is a pure function:
validated input in, typed output out. Schemas are Zod, with types inferred;
routing between nodes is type-checked. 137 TY2025 benchmark cases check it
against values from cited IRS publications.

AI agents maintain the codebase: they read IRS instructions, write nodes, source
test cases from IRS exercises, fix regressions, and prove each change with the
harness before it ships.

---

## Development

Requires [Bun](https://bun.sh) 1.4. Run `bun install` once after cloning.

`cli/main.ts` is the product; the harness is dev-only and documented in
[scripts/testing/README.md](./scripts/testing/README.md). Agent instructions are
in [AGENTS.md](./AGENTS.md), and the folder layout and the check that enforces
each rule are in [STRUCTURE.md](./docs/architecture/STRUCTURE.md).

```bash
# Gates a pull request must pass
bun run check:structure   # nodes placed, registered, reachable
bun run check:cases       # benchmark cases fit their node schemas and cite a source
bun run check:oracle      # expected values changed only with a cited ledger entry
bun run check:sandbox     # the binary reaches the network only through restricted fetch
bun run test:unit         # module graph, type check and typed tests
bun run test:forms        # node, MeF, validation and return-processing tests
bun run check:mef         # sample returns build MeF XML and pass the IRS rules
bun run check:cli         # sample returns work end to end through the CLI
bun run bench --form f1040 --year 2025   # engine output against IRS ground truth

# Reports and helpers
bun run check:irs         # which IRS files in irs/ are present, against irs/manifest.json
bun run check:ats         # TY2025 and TY2026 ATS scenario readiness
bun run verify:changed    # only the gates a change since origin/main can reach
bun run ats:stage         # write the ATS scenarios into ./.state/returns for `opentax mef ats-run`
bun run test              # full suite

# Run the CLI from source, or build the single-file binary
bun run tax return create --year 2025
bun run compile
```

### IRS files

The IRS MeF schemas, business rules and A2A WSDL are released only to registered
software developers, so they are not in Git. Install them into the gitignored
[`irs/`](./irs/README.md) folder; checks that need them skip or report "n/a"
without them, as in CI. `bun run check:irs` verifies each file against
[`irs/manifest.json`](./irs/manifest.json).

### TY2026 research sources

The [TY2026 research corpus](./docs/ty2026/README.md) contains the implementation
plans and the source manifest. The IRS PDFs it cites are not in Git: fetch them
into the gitignored `irs/corpus/ty2026/` with `python3 docs/ty2026/corpus/download.py`
and check them with `bun run check:irs` (see [`irs/README.md`](./irs/README.md)).

### Contributing with Claude Code

Open the repo in [Claude Code](https://claude.ai/code); these skills under `.claude/skills/` run the harness for you:

- `/tax-status`: benchmark pass rate per form:year, MeF readiness of the sample returns and the TY2025 ATS scoreboard.
- `/tax-fix [form:year | mef]`: clusters benchmark (or MeF and ATS) failures by root cause, fixes the engine in parallel, gates each round with `bun run verify:changed`, and commits only net-positive engine fixes; cases are never edited to pass.
- `/tax-cases [form:year] [vita | pub17 | instructions | "scenario"]`: adds benchmark cases whose expected values come from an IRS publication, checked with `check:cases` and `check:oracle`.
- `/tax-build <form-number> [year]`: researches a new form product, sources its cases, builds its nodes and hands off to `/tax-fix`.

Typical workflows:

```
/tax-status                       # where things stand
/tax-fix f1040:2025               # fix benchmark failures

/tax-cases pub17                  # add IRS examples
/tax-fix f1040:2025               # fix what they expose

/tax-fix mef                      # clear MeF and ATS blockers
```

Before a pull request, run the proof list in [AGENTS.md](AGENTS.md).

---

## Contributors

Thanks to everyone who has contributed!

[![Contributors](https://contrib.rocks/image?repo=filedcom/opentax)](https://github.com/filedcom/opentax/graphs/contributors)

---

## License

Dual-licensed under [AGPL v3](./LICENSE) and the [Filed Commercial License](./LICENSE.commercial).
For commercial licensing inquiries: otta@filed.com

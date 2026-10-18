---
name: tax-build
description: Build a new form product (e.g. 1120) from IRS instructions — research the lines into node specs, source IRS benchmark cases, build the nodes section by section, then hand off to the tax-fix loop.
---

# Tax Build

**Form:** $ARGUMENTS — `<form-number> [year]`, e.g. `1120 2025` (year defaults
to 2025).

A form filed with the 1040 (a schedule or attachment) is a node under
`forms/f1040/nodes/`, not a new product: build it with
`agents/node-builder.md` alone and test it with `/tax-fix f1040:<year>`.

Read `AGENTS.md`, `docs/architecture/STRUCTURE.md` and `forms/f1040/FORM.md`,
and pass them to every agent. `forms/f4868/` is the smallest complete product
to copy the shape from. Each phase resumes from what is already on disk.

## 1. Research

Skip if `.state/bench/node-specs/{form}-{year}-nodes.json` exists (`.state/` is
untracked; create the folder). Otherwise spawn one agent with
`agents/researcher.md` to write it, and check it holds a `nodes` array.

## 2. Product skeleton

Create, following `forms/f4868/` and `forms/f1040/2026/`:

- `forms/f{form}/FORM.md`: the form's IRS specs, conventions and benchmark
  command, as in `forms/f1040/FORM.md`
- `forms/f{form}/{year}/index.ts`, `config.ts`, `inputs.ts`, `registry.ts`
- a `"f{form}:{year}"` entry in `catalog.ts`

`benchmark/run_benchmark.ts` creates every return without `--form` (so as
f1040) and scores only the 1040 keys in `SUMMARY_FIELDS` and `RAW_FIELDS`.
Extend it for the new product first, or every case fails.

## 3. Cases

Skip if `benchmark/cases/f{form}/{year}/` has cases. Otherwise run the
`/tax-cases f{form}:{year} instructions` flow with sources for this form (its
instructions, the publication that covers it, IRS sample returns).

## 4. Build

Group the node specs by section and spawn one `agents/node-builder.md` agent
per section in a single message, each with its specs, form and year.

## 5. Fix

Run `bun run check:structure`, `bun run check:cases` and
`bun run verify:changed`, fix what they report, then run
`/tax-fix f{form}:{year}` until it is clean or stalls. Commit each phase,
staging its files by name. Before a pull request, run the full list in
`AGENTS.md`.

# skills/

Skills shipped to opentax users: each `<name>/SKILL.md` tells an end user's
assistant how to install and drive the released `opentax` binary. They are
user-facing product. Skills for building this repository live in
`../.claude/skills/` and never ship.

## Layout

- `opentax/` — entry skill: installs the CLI, onboards, then fetches
  `tax-preparer` or `tax-reviewer` by raw GitHub URL.
- `install/` — installs the binary via `install.sh` or manual download.
- `tax-preparer/` — gathers facts, then `opentax return create`, `form add`,
  `return get`, `return validate` and `return export`.
- `tax-reviewer/` — recomputes a completed return from source documents and
  compares it line by line; findings stay open for human review.
- `save-skill/` — per-platform steps to keep OpenTax installed.

## Shipped vs. build skills

- Here: distributed by the Claude Code plugin in `../.claude-plugin/`
  (`plugin.json`, `marketplace.json`, `"source": "./"`), invoked as
  `/opentax:<name>`; also loaded by hosted chats from
  `https://raw.githubusercontent.com/filedcom/opentax/main/skills/...`.
  They run the installed `opentax` binary on the user's return.
- `../.claude/skills/` (`tax-build`, `tax-fix`, `tax-cases`, `tax-status`,
  `audit-harness`): loaded by Claude Code when working in this repo, invoked
  as `/<name>`. They run the harness (`bun run check:*`, `bun run bench`,
  `benchmark/run_case.ts`) and spawn sub-agents from `agents/*.md`.

## Rules

- One folder per skill holding `SKILL.md` with `name` and `description`
  frontmatter; the folder name is the URL path users fetch.
- `main` is live: the raw URLs, `README.md`, `site/` pages and other skills
  link these paths, so a rename or move breaks users immediately. Grep
  `skills/<name>` across the repo before moving one.
- Commands must match the released CLI (`opentax <cmd> <sub>` with
  `--returnId`, `--node_type`, `--year`, `--type`), as defined in
  `cli/main.ts` `COMMANDS`; document a new flag only once it has shipped.
- Never present validation or export as filing or IRS acceptance; say what
  the engine does not support instead of letting it default to zero.
- Test a skill's commands with `bun run tax …` from source, but never
  `bun run tax update`: from source it overwrites the `bun` runtime.

## Verify

- `bun run tax <cmd> --help` lists each command group's usage and flags; check
  every command a skill names against it.
- `grep -rn "skills/" README.md site/ skills/` for links after a rename.

## Read next

- [opentax/SKILL.md](opentax/SKILL.md)
- [../.claude-plugin/plugin.json](../.claude-plugin/plugin.json)
- [../.claude/skills/tax-build/SKILL.md](../.claude/skills/tax-build/SKILL.md)
- [../cli/AGENTS.md](../cli/AGENTS.md)

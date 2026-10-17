# docs/ty2025/readiness

Product-board history for TY2025 Form 1040: completed-item ledger, status
snapshots, checkpoint handoffs and the readiness execution log. Live TODOs
are in `product_board.md` at the repo root, not here. Parent:
[../AGENTS.md](../AGENTS.md).

## Files

- `ty2025-readiness-execution-2026-10-07.md` (~960 KB) and
  `ty2025-product-board-completed-2026-10-01.md` (~810 KB) — append-only
  logs with dated `## ` sections. Never read them whole: grep `^## ` or a
  form number, then read the range.
- `ty2025-product-board-status-2026-10-07.md`,
  `ty2025-checkpoint-handoff-2026-10-07.md` — the last status snapshot and
  next-session handoff (frozen checklist commit, open TODO count).
- `ty2025-bundled-form-audit-reconciliation-2026-10-08.md`,
  `ty2025-core-source-owner-audit.md`, `ty2025-owned-cf-source-proof.md`,
  `ty2025-owned-cf-whole-dollar-reconciliation.md` — single audits.

## Rules

- A bounded ledger completion does not close a broad board item; say which.
- New checkpoints are new dated sections; don't rewrite earlier ones.
- `product_board.md` links the two large logs by path; a rename must update it.
- Commands quoted in old sections (`deno …`, `--allow-net`) are historical;
  re-run with `bun test --timeout=1800000 ./<path>` before restating a result.

## Verify

- `bun run fmt:check`
- `grep -rn "docs/ty2025/readiness/" product_board.md`

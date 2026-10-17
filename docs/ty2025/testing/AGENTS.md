# docs/ty2025/testing

Results of TY2025 gates and audits: full-suite runs, submission replays,
native/PDF parity and PDF field coverage. Each file records what ran, at
which commit, and what was not verified. Parent: [../AGENTS.md](../AGENTS.md).

## Files

- `ty2025-full-gate-2026-10-10.md` — last full `bun run test` refresh (red;
  runtime-unchanged manifest, pass/fail counts).
- `ty2025-form1040-validation-batch.md` (~450 KB, 270+ `## ` sections) —
  batch validation log; grep, don't read whole.
- `ty2025-{joint,patron,sstb}-submission-replay.md`,
  `ty2025-submission-batch-isolation.md`,
  `ty2025-joint-submission-business-rules.md` — notes for the tests in
  `forms/f1040/2025/mef/submissions/` (evidence dirs via
  `JOINT_`/`PATRON_`/`SSTB_SUBMISSION_EVIDENCE`).
- `ty2025-native-pdf-registry-parity.md`, `ty2025-prepared-*-parity*.md`,
  `ty2025-return-wide-reconciliation-audit.md` — MeF/PDF/manifest agreement.
- `ty2025-filled-pdf-review-2026-09-29.md`,
  `ty2025-pdf-field-inventory-2026-10-10.md`, `ty2025-pdf-field-presence.md`
  — filled-PDF review and field coverage.
- `ty2025-v54-schema-provenance.md` — hashes and retrieval path of the
  private v5.4 schemas the XSD tests need.
- `ty2025-external-evidence-standard-audit.md` — where a route needs
  evidence the engine cannot hold.

## Rules

- Record the commit, command and counts; a skipped XSD test or missing
  prerequisite is "not verified", never a pass.
- Many files quote `deno test …`; today's form is
  `bun test --timeout=1800000 ./<path>`.
- `product_board.md` links eight files here by path; grep before renaming.

## Verify

- `bun run fmt:check`
- `grep -rn "docs/ty2025/testing/" product_board.md`

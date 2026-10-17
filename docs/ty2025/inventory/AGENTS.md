# docs/ty2025/inventory

Coverage inventories for the TY2025 Form 1040 return: which MeF document roots
exist in the schema, which are registered, and the disposition of each one
that is not. Snapshot audits, not test results. Parent:
[../AGENTS.md](../AGENTS.md).

## Files

- `ty2025-xsd-document-root-census.md` — every top-level `IRS…` root in the
  local `ReturnData1040.xsd` (v5.4, under ignored `.state/research/docs/`);
  the denominator for the rest.
- `coverage-inventory.md` — older registered-form matrix (~140 KB); its
  header points to the current form-by-form audit in
  `../domains/general/return-assembly/form1040/`. `-attachments-{a,b,c}`,
  `-supporting`, `-sparse-decisions` split the registered documents.
- `ty2025-unregistered-roots-{01-25,26-50,51-75,76-100,101-128}.md` and
  `ty2025-unregistered-root-applicability.md` (~165 KB crosswalk) — ordered
  review of unregistered roots; `-decision-slice-payment-cfc.md` adds decisions.
- `ty2025-conditional-roots-*.md`, `ty2025-registered-roots-audit-{a,b}.md`,
  `ty2025-conditional-schedule-applicability.md` — when a root is required.
- Sparse-map audits (`ty2025-sparse-*`, `ty2025-source-only-and-sparse-map-gap.md`),
  `ty2025-entity-issued-root-disposition.md`,
  `ty2025-separate-workflow-decision-matrix.md`,
  `ty2025-nonnamed-board-dependency-audit.md`, and single-form inventories
  (Form 1098, Form 8283, Schedule J).

## Rules

- Keep "registered", "XSD-valid" and "required for this return" distinct; a
  census row is not a readiness claim.
- `ty2025-sparse-map-audit-20260928.md` uses an undashed date; new snapshots
  use `-YYYY-MM-DD`.
- `product_board.md` links four files here by path; grep before renaming.

## Verify

- `bun run fmt:check`
- `grep -rn "docs/ty2025/inventory/" product_board.md README.md`

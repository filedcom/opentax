# docs/ty2025/domains/general/

TY2025 research notes for the General section. Folders use `form<number>/`;
the code input folders use `f<number>/` (`filing/form8958/` ↔ input `f8958`).

- `composed-returns/` — notes behind `pdf/reviews/general/composed-returns/`:
  business-tip vs. established health plans, primary Schedule C tips with a
  spouse cash farm, senior deduction with owner health and QBI ordering, and
  the 18-packet tip/health/C/F/beneficiary catalog.
- `filing/form8886/` — reportable-transaction status and gaps
  (`-reportable-transaction-gap`), and the OTSA-copy export
  (`-otsa-export`).
- `filing/form8958/ty2025-form8958-gap.md` — community-property allocation;
  both exports blocked.
- `filing/ty2025-filing-residency-review-gap.md` — dual-status/resident review
  (Pub. 519); `filing/ty2025-schedule-lep-source.md` — Schedule LEP route.
- `foreign/form5471/` — Category 5a scope, native schedule linkage,
  owned-worksheet proof, packet projection review, Schedule R zero boundary.
- `foreign/form8854/` (PDF boundary), `foreign/form8938/` (source and export
  gap), `investments/form8997/` (staged QOF ledger, filing blocked).
- `return-assembly/form1040/` — registered-descriptor disposition queue
  (`-coverage-decisions`) and registered-document audit (`-form-audit`).

## Verify

- `bun run fmt:check`
- `grep -rn "docs/ty2025/domains/general/<path>" product_board.md README.md`
  before renaming a note.

Section map: [../../../../forms/f1040/nodes/inputs/general/AGENTS.md](../../../../forms/f1040/nodes/inputs/general/AGENTS.md)

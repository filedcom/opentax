# 2025/domains/general/foreign/

Source checks and fixtures for three foreign information forms. None of them
changes a tax amount here. Their nodes are in
`../../../../nodes/inputs/general/foreign/`.

- `form5471/form5471_owned_source.ts` — Form 5471 owned-CFC projection.
  `owned5471Calculation` reruns the input folder's
  `ownedWorksheetFiledOperands` guard and then `calculateOwnedCfcWorksheets`
  (`nodes/inputs/general/foreign/f5471/worksheet_source.ts`).
  `owned5471Categories` returns `["GEN"]`, or `["GEN", "PAS", "TOTAL"]` when
  passive gross income is positive; that list decides which category copies of
  the separate schedules exist. Importers: MeF `f5471.ts`, `f5471_linkage.ts`,
  `f5471_owned_schedules.ts` and PDF `f5471_owned_values.ts`. A change here
  changes both exports and the parent's schedule references.
- `form8854/` — fixtures only: `form8854InitialCash` (initial `f8854`) and
  `form8854AnnualNoEvent` (`f8854_annual`). The PDF tests
  `pdf/forms/general/foreign/f8854_initial.test.ts` and `f8854_annual.test.ts`
  import them. The XSD tests in `mef/forms/general/foreign/f8854/` keep their
  own sources.
- `f8858/f8858_filing_source.test.ts` — checks that an `f8858` source stays in
  pending with no diagnostics and that `buildMefXml` / `buildPdfBytes` both
  reject it (`assertForm8858FilingSource`).

Traps:

- Folder names are mixed (`f8858/` next to `form5471/`, `form8854/`). Match
  the existing folder when you add a file; renaming one breaks its importers.
- Form 5471 Category 5a inclusions (Schedule 1 lines 8n/8o) are computed in
  the `f5471` node, not here. This folder covers only the owned-worksheet
  projection used for printing.

## Verify

- `bun test ./forms/f1040/2025/domains/general/foreign --timeout=1800000`
- `bun test ./forms/f1040/2025/mef/forms/general/foreign ./forms/f1040/2025/pdf/forms/general/foreign --timeout=1800000`
  (some MeF XSD tests need the private 2025v5.4 schema)

Section map: [../../../../nodes/inputs/general/AGENTS.md](../../../../nodes/inputs/general/AGENTS.md)

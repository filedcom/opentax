# Adjustments — TY2025 source reconciliation

Export-time guards and full-return tests for the Adjustments section. Code
here re-derives filed amounts from the retained source in `pending` and
throws when a finalized return disagrees; it adds no graph edges. Section
map: [../../../nodes/inputs/adjustments/AGENTS.md](../../../nodes/inputs/adjustments/AGENTS.md).

| Folder | Holds | Called by |
| --- | --- | --- |
| [education/f1098e/](education/f1098e/f1098e_source_reconciliation.ts) | `assert1098EInterestSource` | `../../mef/builder.ts`, `../../pdf/builder.ts` |
| [employment/form2106/](employment/form2106/form2106_staged.ts) | `form2106_staged.ts`: `isSupportedForm2106Route`, `reconcileFileableForm2106Return`, `buildStagedIRS2106`, `stagedForm2106PdfFields` | MeF/PDF `f2106.ts` (thin wrappers), `../../return-processing/attachment_coverage.ts` |
| [health/](health/AGENTS.md) | Forms 7206, 8853, 8889 | see health/AGENTS.md |

## Conventions verified here

- Besides the usual `*_reconciliation.ts`/`*_source.ts` guards, Form 2106
  uses `*_staged.ts`: it also builds the native `IRS2106` XML and PDF
  fields that the `mef/`/`pdf/` descriptors return.
- Two test shapes: whole-return tests (`f1040_2025.executeReturn` →
  `buildPending` → `buildMefBundle`/`prepareReturn` and the PDF builder;
  30 of 46 files) and descriptor tests that hand a pending slice and
  `MefBuildContext` straight to the MeF/PDF descriptor.
- XSD tests here call `xmllint` on the private Return1040.xsd path directly;
  without it they fail with xmllint's "failed to load external entity", not
  `Missing verification prerequisite`.

## Verify

- `bun test --timeout=1800000 forms/f1040/2025/domains/adjustments` (about
  four minutes; 9 of 231 tests need the private XSD).
- `bun test --timeout=1800000 forms/f1040/2025/domains/adjustments/education`
  for the fast subset.

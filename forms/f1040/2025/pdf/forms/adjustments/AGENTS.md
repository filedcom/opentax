# Adjustments — PDF projections

Printed TY2025 IRS PDFs for Forms 2106, 7206, 8853 and 8889. Line-only
adjustments print on Schedule 1 (`../general/return-assembly/schedule1/`).
Section map: [../../../../nodes/inputs/adjustments/AGENTS.md](../../../../nodes/inputs/adjustments/AGENTS.md).

| File | `pendingKey` | Shape |
| --- | --- | --- |
| [employment/f2106.ts](employment/f2106.ts) | `f2106` | `fields: stagedForm2106PdfFields`, one instance per job from `domains/…/form2106_staged.ts` |
| [health/f7206.ts](health/f7206.ts) | `form7206` | `projectFields` + `includeWhen` (line 14 > 0 or an independent plan); reads the MeF `FIELD_MAP` (`nativeForm7206`) to detect line fields |
| [health/f8853.ts](health/f8853.ts) | `form8853` | `pageIndices` picks page 1 (MSA) or page 2 (`ltc_print`); LTC fields, instances and the supplemental statement come from `health/f8853_ltc.ts` |
| [health/f8889.ts](health/f8889.ts) | `form8889` | one instance per owner; same `form8889_*` reconcilers as the MeF file |

## Conventions verified here

- Each descriptor mirrors its MeF twin in `../../../mef/forms/adjustments/`
  and calls the same `domains/adjustments/` guards, so MeF and PDF fail on
  the same source mismatch; change both together.
- `pdfField` names are hard-coded; check them against
  `../../field-dumps/form7206.json`, `form8853.json`, `form8889.json`. No
  Form 2106 dump exists; its names live in `form2106_staged.ts`.
- Registered in `../index.ts` as `form2106Pdf`, `form7206Pdf`,
  `form8853Pdf`, `form8889Pdf`.

## Verify

- `bun test --timeout=1800000 forms/f1040/2025/pdf/forms/adjustments`
- Filled-packet reviews: `../../reviews/adjustments/`.

# 2025/domains/deductions

TY2025 source reconciliation for deduction forms: guards and projections the
MeF/PDF serializers import, plus whole-return tests. Section map:
[../../../nodes/inputs/deductions/AGENTS.md](../../../nodes/inputs/deductions/AGENTS.md).

## Folders

- `additional/` — `assertSchedule1ASeniorGeneralSource` for MeF `schedule1a.ts`.
- `business/` — Forms 4562, 8829, 8990, 8995, 8995-A ([AGENTS.md](business/AGENTS.md)).
- `investments/form4952/` — one `*_reconciliation.ts` per Form 4952 source mix
  (1099-INT/DIV/OID, K-1 code B, royalty debt, PAB AMT, Schedule J child, prior
  carryforward); MeF and PDF `f4952.ts` each import 13 modules from here.
- `itemized/schedule-a/` — line 8b seller-financed, line 16 estate tax,
  other-tax rows, line 18 below-standard election; used by MeF
  `itemized/schedule_a*.ts` and PDF `itemized/schedule_a.ts`.
- `mortgage/f1098/` — tests only; the Form 1098 guards are exported by the node
  (`forms/f1040/nodes/inputs/deductions/mortgage/f1098/index.ts`).

## Conventions here

- Form 1098 tests build lender copies with `withSyntheticForm1098Copy` from
  `../../pdf/reviews/deductions/mortgage/review_1098_copy.fixture.ts`; a positive
  box 1 Schedule A claim needs a filer-owned lender copy.
- Folder names differ from nodes: `form8829`, `schedule-a`.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/domains/deductions/`
  (`Missing verification prerequisite` = private XSD absent: unverified).

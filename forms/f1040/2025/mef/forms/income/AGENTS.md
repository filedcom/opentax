# Income — MeF serializers

Native XML for Income forms by group (`business/`, `foreign/`,
`investments/`, `other/`, `rental-passthrough/`, `retirement/`, `wages/`).
Which node feeds each serializer: [section map](../../../../nodes/inputs/income/AGENTS.md).

## Conventions here

- `pendingKey` is the node type whose pending slot holds the fields: an input
  node (`schedule_c`, `f4835`, `f7217`, `f8915f`, `f1099r`, `w2`, `w2g`), a
  computed node (`form4797`, `form8582`, `schedule_d`, …) or a pending-only
  key with no node (`form8621`, `form8814`). Attached statements declare
  `sourcePendingKeys` instead (`ccc_loan_statement.ts` → `f4835`,
  `schedule_f`; `f8621_excess_statement.ts` → `form8621`).
- Two descriptors share `pendingKey: "form7203"`:
  `business/f7203_stock_loss.ts` and `rental-passthrough/schedule_e_stock_loss.ts`.
- Placement follows the form, not the source document: the W-2 and W-2G
  serializers are in `other/` (`w2.ts`, `w2g.ts`); `wages/` holds only
  `f1040_w2_excess.test.ts` (Form 1040 line 1h) and `business/schedule1/`
  only a Schedule 1 line 5 test. The Form 1040 and Schedule 1 serializers are
  in `../general/return-assembly/`.
- Form 4852 has no XML document: `other/w2.ts` and `retirement/f1099r.ts`
  emit its substitute copies via `form4852NativeSources`
  (`2025/domains/income/wages/form4852/`).
- Form 8992 (`foreign/f8992.ts`, `f8992_schedule_a.ts`) reads the General
  `f5471` pending (`sourcePendingKeys: ["f5471"]`).

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/mef/forms/income/<group>`
- `*.xsd.test.ts` and the XSD cases in `*.test.ts` need the private
  2025v5.4 schemas; without them 4 tests in this tree fail with `Missing
  verification prerequisite` or xmllint "failed to load external entity"
  (observed 2026-10-17).
- `bun test --timeout=1800000 ./forms/f1040/validation/rules/income` after
  renaming a `FIELD_MAP` element.

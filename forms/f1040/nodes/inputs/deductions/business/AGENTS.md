# inputs/deductions/business

Source nodes for business deductions after AGI. Section map:
[../AGENTS.md](../AGENTS.md).

## Forms here

- `qbi_patron/` (CLI, `isArray: false`) — reviewed Form 1099-PATR cooperative
  facts for QBI. `publicSchema` is a union: one business review (routes
  `patron_source_review` to `form8995`, `patron_filing_review` to `schedule_c`
  or `schedule_f` by `business.kind`, and to `w2` when W-2 sources are given)
  or `independent_farm_reviews` (to `form8995` and `schedule_f`).
- `qbi_aggregation/` (CLI, `isArray: false`) — Reg. §1.199A-4 aggregation;
  forwards `aggregation_groups` and optional `aggregation_filing_details` /
  `aggregation_mfs_review` (schemas from the `form8995a` module) to
  `form8995a` (Schedule B).
- `f59e/` (CLI, array) — IRC §59(e) records, AMT only: `circulation` items
  give `line2o_circulation_costs` (regular − AMT deduction, `circulation.ts`);
  other types' `remaining_unamortized` goes to `form6251` `other_adjustments`.
- `f8903/` — Form 8903 DPAD (repealed TY2018+); routes `line24h_dpad` to
  `schedule1` but has no `inputNodes` entry (baselined unreachable).
- Shared schemas, not nodes: `k1_qbi_source.ts` (`currentK1QbiSourceSchema`;
  `k1_partnership`, `k1_s_corp`, `form8995`, MeF `f8995_current_k1.ts`) and
  `k1_rpe_aggregation_source.ts` (`rpeAggregationSourceSchema`; `k1_s_corp`,
  `form8995`, `form8995a`, Schedule B MeF/PDF).

## Traps

- QBI is never a user total: `qbi_patron/schema.ts` takes reviewed facts
  (`z.literal(true)` confirmations, `allocation_method:
  "qualified_receipts_proportion"`); the deduction is computed in
  `../../../intermediate/forms/deductions/business/form8995{,a}/`.
- `qbi_aggregation/index.ts`'s header says Form 8995-A rejects aggregation;
  `form8995a` now files Schedule B when `aggregation_filing_details` or
  `rpe_aggregation_source` is present (TY2025 only).
- `qbi_patron/` has no `index.test.ts` (covered by domain `*patron*` tests).

## Verify

- `bun test --timeout=1800000 ./forms/f1040/nodes/inputs/deductions/business/ ./forms/f1040/2025/domains/deductions/business/`

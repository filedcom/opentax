# Income — MeF business rules

28 rule groups for Income forms: `business/` (`f172`, `f461`, `f4797`,
`f4835`, `sc`, `sf`), `foreign/` (`f2555`, `f4563`, `f8621`, `f8873`,
`f8992`), `investments/` (`f6252`, `f6781`, `f8814`, `f8815`, `f8949`, `sb`,
`sd`), `other/` (`f982`, `fw2`, `fw2g`, `s1`), `rental-passthrough/` (`se`),
`retirement/` (`f1099r`, `f8606`, `f8915f`, `rrb`, `ssa`). Which node and
serializer each checks: [section map](../../../nodes/inputs/income/AGENTS.md).

## Conventions here

- Placement follows the form, not the rule prefix's IRS family: `fw2.ts` and
  `fw2g.ts` sit in `other/` (as do the W-2/W-2G serializers), and `s1.ts`
  (Schedule 1, whose serializer is General) sits in `other/`.
  `scripts/maintenance/rule-paths.ts` finds each group by its unique file
  stem anywhere under `rules/`, so moving a file needs only the import in
  `../index.ts`; two files with one stem throw.
- Unimplementable checks use `alwaysPass` with a reason comment (e-File
  database lookups, cross-form sums), not `check: null`; 12 files here have
  them (`sd.ts` 7, `f2555.ts` 6, `fw2.ts`/`fw2g.ts` 6 each, …). The
  "N rules (x implemented, y stubs)" header lines are stale (e.g. `fw2.ts`
  claims 11 implemented of 10).
- `investments/f8815.ts` is hand-derived: the generated implications were
  reversed and the predicates follow the 2025 Form 8815 line 9 MAGI ceilings
  (cited in its header). Its `f8815.test.ts` and `investments/sb.test.ts` are
  the only tests in this tree.
- No Income group exists for Form 8582 (only `credits/.../f8582cr.ts`), Form
  6198, 7203, 7217 or 8824.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/validation/rules/income`
- `bun test --timeout=1800000 ./scripts/maintenance/rule-paths.test.ts`
  after moving or adding a rule file.

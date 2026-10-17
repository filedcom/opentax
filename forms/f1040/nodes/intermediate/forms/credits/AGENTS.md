# intermediate/forms/credits

Computed credit forms that other nodes feed: `disabled_access_limit` and
`form8582cr` (business), `eitc` (Schedule EIC), `form_1116`, `form8962`, and
`form2441`, `form5695`, `form8396`, `form8839`, `form8880` (individual). For the
counterparts in other trees, see [../../../inputs/credits/AGENTS.md](../../../inputs/credits/AGENTS.md).

## Conventions here

- `form2441`, `form8396` and `form8839` are also CLI inputs (`2025/inputs.ts`).
  `form8839` throws for any child or `adoption_benefits` (from `w2` box 12 T)
  and has empty `outputNodes`. Adoption claims run staged through
  `2025/domains/credits/individual/form8839/form8839_two_pass.ts`.
- Tax-limited credits stop at a source. `form8880` sends `form8880_source` to
  `schedule3`, `form8396` sends `form8396_source` to `f1040`, and the `f1040`
  sink computes the allowed amount with the node's `calculation.ts`.
- `eitc` (table in `table_2025.ts`) writes `line27_eitc` and also writes its own
  pending for Schedule EIC. `form_1116` writes its own pending and the
  `form1116_schedule_b` rows. It sends line 1 to `schedule3`, the AMT FTC to
  `form6251`, and the line 18/20 facts to `f1040`.
- `form8962` sends net PTC to `schedule3` line 9 and excess APTC to `schedule2`
  line 1a.
- `form8582cr` sends only `passive_source_allocations` to `f3800`.
  `disabled_access_limit` collects the 8826 and K-1 sources first and rejects
  passive ones that have no 8582-CR facts. `form5695` also feeds
  `joint_occupancy_statement`.

Verify: `bun test --timeout=1800000 ./forms/f1040/nodes/intermediate/forms/credits/<group>/<node>`
and `bun run check:structure`.

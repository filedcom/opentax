# credits/business inputs

Holds 20 general business credit source forms and the `f3800` fan-in node. For the
crosswalk to MeF, PDF, domains and rules, see [../AGENTS.md](../AGENTS.md).

## Routes (from each node's `outputNodes`)

- **To `f3800` as typed fields:** `f8820`, `f8844`, `f8882`, `f8835`, `f8881`,
  `f8874` (also `form8582cr`), `f8911` business use, `f5884`, `f8994`, `f8864`
  (also `form6251`), and `f3468` trust Part V claims only. From outside the group:
  `f8936`, `f8941`, the K-1 nodes, `form8582cr` (`passive_source_allocations`) and
  `disabled_access_limit` (the only path for `f8826`).
- **Straight to Schedule 3 line 6a, with no Form 3800 limit:** `f6765`, `f7207`,
  `f8896`, legacy `f3468` inputs, and `f8609` (`line6a_low_income_housing_credit`).
  `f4136` goes to Schedule 3 line 12 (refundable). `f8874_recapture` goes to
  `schedule2` line 17a.
- **Empty `outputNodes`:** `f6478` throws on any `fuel_entries`. `f8908` validates
  its homes and then always throws. Its MeF and PDF files are staged and not
  registered.

## `f3800`

- `index.ts` splits sources into `standardCredit`, `specifiedCredit` (the 8835
  specified part, 5884, 8941, 8994) and `empowermentCredit` (8844 plus line-3
  carryforwards). It sends `form3800_source_credits` to `f1040` and marks
  `schedule3` `form3800_source_credit_pending`. The `f1040` sink computes the
  Part II limit with `calculation.ts` and writes `allowed_credit` back to `f3800`.
- Legacy `f3800s` items (or `total_gbc`) go to line 6a unbounded. Mixing them with
  a source-backed credit throws. The sink also throws if source credits meet a
  nonzero line 6a from the direct producers above.
- A source with `subject_to_passive_activity_limit` (8826, 5884, 8820, 8911, 8936,
  orphan-drug K-1) throws unless it comes through `form8582cr`.
- `*_allocation_node.ts` are the review inputs `f3800_current_orphan_allocation`
  and `f3800_current_production_allocation`.

## Traps

- Other code imports files from this group: the `f1040` output node imports
  `f3800/calculation.ts`, and `2025/pdf/review_fixtures.ts` imports the fixtures in
  `f8864/`, `f8882/`, `f8874/` and `f3468/`. Update those importers when you
  rename or move a file.
- `f8835` return tests are in `2025/domains/credits/business/form3800/`.

Verify: `bun test --timeout=1800000 ./forms/f1040/nodes/inputs/credits/business/<node>`
and `bun test --timeout=1800000 ./forms/f1040/e2e/credits/business/`.

# Income — aggregations

`investments/schedule_b` (Schedule B), `investments/schedule_d` (Schedule D)
and `investments/schedule_d_final` (second Schedule D pass). Their feeders and
MeF/PDF/rules counterparts: [section map](../../../inputs/income/AGENTS.md).

## Conventions here

- `schedule_b` collects payer rows from the 1099-INT/OID/DIV nodes, `f8814`,
  `form8815`, the K-1s and market-discount rows from `f1099b`/`f8949`, and
  reports to `f1040`, `agi_aggregator`, `form8960`. Whether Schedule B must be
  filed is `scheduleBFilingRequired` in `schedule_b/schedule_b_filing.ts`
  (shared with the MeF and PDF Schedule B projections).
- `schedule_d` is also a CLI input (`inputNodes`): carryovers such as
  `capital_loss_carryover`, `line_6_carryover`, `line_14_carryover` come in
  directly; everything else is routed. Long-term amounts from Forms 4797,
  6252, 6781 and 8824 all arrive in `line_11_form2439` (accumulable;
  the field is named for line 11 as a whole), short-term 6252/6781 in `line_4_other_st`.
- When `form4797` flags an active-rental sale (`pending_active_4797: true`),
  `schedule_d` forwards `provisional_input` to `schedule_d_final` and sends
  only its `agi_aggregator` row; `schedule_d_final` adds Form 8582's
  `capital_reduction`, calls `schedule_d.compute` again and reports to
  `agi_final` instead of `agi_aggregator`. This direct `compute()` call breaks
  the "never call another node's compute()" rule in
  [../../AGENTS.md](../../AGENTS.md), as do `agi_final`
  (`agi_aggregator.compute`), `form7203/prior_reduced_note.ts` and
  `form8582/ledger.ts`.
- `schedule_d` throws on Form 1099-C box 7 FMV/canceled-debt fields without
  a sourced disposition.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/nodes/intermediate/aggregation/income`
- `bun test --timeout=1800000 ./forms/f1040/2025/domains/income/investments`
- `bun run bench --form f1040 --year 2025`

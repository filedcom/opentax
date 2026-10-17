# domains/taxes/other

TY2025 guards for Schedule 2 as a whole: its line 21 → Form 1040 line 23 join,
the W-2 / 1099 sourced lines, and §453A interest. The node is
`nodes/intermediate/aggregation/taxes/other/schedule2`.

| Module                                  | Guards                                                                                                                                                                   | Called by                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `schedule2_line23_reconciliation.ts`    | `assertSchedule2Line23`                                                                                                                                                  | `mef/forms/general/return-assembly/f1040.ts`                               |
| `schedule2_w2_source_reconciliation.ts` | `assertSchedule2W2Line13Sources` (W-2 box 12 A/B and M/N), `assertSchedule2W2Line17KSource` (code K), `assertSchedule2Line17HSources` (W-2 code Z plus 1099-MISC box 15) | `mef/builder.ts`, `pdf/builder.ts`                                         |
| `section453a_reconciliation.ts`         | `assertSection453aSchedule2Line` (line 15)                                                                                                                               | `mef/forms/taxes/other/schedule2.ts`, `pdf/forms/taxes/other/schedule2.ts` |

## How they connect

- Line 23 = `schedule2Part2Total(pending.schedule2)` (the node's exported
  helper) minus `form8978_reporting_year.schedule2_line17z_reduction`. That
  reduction and `schedule2_line21` exist only in the worksheet's own pending
  slot: `form8978_reporting_year` writes them back to itself when a negative
  Form 8978 line 14 exists. A reduction without a Schedule 2, or larger than
  Part II, throws.
- The W-2/1099 guards re-parse `pending.w2` and `pending.f1099m` with those
  nodes' exported schemas (`Box12Code` enum) and compare to the separate
  `schedule2` keys (`uncollected_fica`, `uncollected_fica_gtl`,
  `golden_parachute_excise`, `section409a_excise`, `line17h_nqdc_tax`) that
  the node sums into one printed line. The line 17h guard also needs the filer
  identity: every code Z / box 15 source must belong to the taxpayer or a
  joint spouse, and a box 15 amount must tie to its W-2 or `f1099nec` income
  source. The 1099-NEC box 3 part of line 17k
  (`line17k_golden_parachute_excise`) is not checked here.
- `assertSection453aSchedule2Line` recomputes `calculateSection453aInterest`
  from the retained `f453a_interest` source; its test imports
  `nodes/inputs/taxes/interest/f453a_interest/fixture.ts`.

## Verify

- `bun test ./forms/f1040/2025/domains/taxes/other --timeout=1800000`
  (`schedule2_w2_line13_replay.test.ts` validates XML; without the private
  XSD it fails with "failed to load external entity").
- `bun test ./forms/f1040/nodes/intermediate/aggregation/taxes --timeout=1800000`
- Section map: [../../../../nodes/inputs/taxes/AGENTS.md](../../../../nodes/inputs/taxes/AGENTS.md).

# nodes/inputs/general/foreign/

Foreign information returns. Only `f5471` and `schedule_b_part_iii` route
values; the others parse their input and return `outputs: []`, and
serializers or export blocks read that pending input. FinCEN 114 is in
`../filing/f114/`.

- `f5471` — one wholly owned Category 5a CFC: `f5471s` is a one-element tuple,
  `section_962_election: false`, and exactly one of EIN or reference ID.
  `calculateCategory5Inclusions` sends Schedule 1 line 8n (Schedule I lines
  1a–1h + 2) and 8o (GILTI) to `schedule1` and `agi_aggregator`. The
  optional `owned_worksheet_source` (`worksheet_source.ts`) only drives
  printing, through `2025/domains/general/foreign/form5471/`.
- `f8854` (initial) and `f8854_annual` (`annual_node.ts`, schema in
  `annual.ts`) — both reject nonresident or dual-status status. Deemed gain is
  not routed: each asset must already be a Form 8949 row, which the
  serializers check with `reconcile*Form8854Form8949Properties`.
- `f8858` — `assertForm8858FilingSource` throws for any present source; both
  builders call it.
- `f8938` — `form8938ThresholdDecision` (filing thresholds by MFJ/abroad).
  MeF/PDF are staged; export blocked.
- `f8833` — `f8833s`, one row per treaty position; export blocked.
- `schedule_b_part_iii` — passed unchanged to Income `schedule_b`. Foreign
  accounts yes → FBAR answer required; FBAR yes → country codes required.

Traps:

- Year amounts are literals here, not `CONFIG_BY_YEAR`:
  `f8854/constants.ts` (`MARK_TO_MARKET_EXCLUSION_2025`) and the `f8938`
  thresholds.
- A second CFC fails the `f5471` tuple schema instead of being summed.

## Verify

- `bun test ./forms/f1040/nodes/inputs/general/foreign --timeout=1800000`
- `bun test ./forms/f1040/2025/mef/forms/general/foreign ./forms/f1040/2025/pdf/forms/general/foreign ./forms/f1040/2025/domains/general/foreign --timeout=1800000`
- `f5471` changes AGI: `bun run bench --form f1040 --year 2025`

Section map: [../AGENTS.md](../AGENTS.md)

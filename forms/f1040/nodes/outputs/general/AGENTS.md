# nodes/outputs/general/

Terminal assembly (`return-assembly/`). The pending entries of these nodes are
what the benchmark scores and what the serializers print.

- `f1040` — fed by `general`, `preparer`, `agi_aggregator`, `schedule2`,
  `schedule3`, and the tax and credit nodes. Besides its self-output it
  returns `replayInput` and `finalizations`. The finalizations replace the
  earlier pending values of `schedule3`, `form8880`, `form8396`, `f8912`,
  `f8859`, `f8834`, `f3800` and `f2210f`; the executor throws if one of those
  has no pending entry yet. It enforces cross-form limits itself: the Schedule
  R credit limit, Form 8880 source vs. a prefilled Schedule 3 line 4, and a
  spouse campaign mark only on MFJ.
- `schedule1` — assembles printed lines only; `agi_aggregator` computes what
  `f1040` uses. It throws on nonzero lines 8g, 8z attorney proceeds, 13 and
  24h until their TY2025 support exists.

A new Schedule 1 line must be routed to both `schedule1` and
`agi_aggregator`. Otherwise it prints without reaching AGI, or reaches AGI
without printing.

## Verify

- `bun test ./forms/f1040/nodes/outputs/general --timeout=1800000`
- `bun run bench --form f1040 --year 2025` and `bun run check:oracle`
- `bun test ./forms/f1040/2025/mef/forms/general/return-assembly ./forms/f1040/2025/pdf/forms/general/return-assembly --timeout=1800000`

Section map: [../../inputs/general/AGENTS.md](../../inputs/general/AGENTS.md)

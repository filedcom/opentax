# domains/taxes/employment

TY2025 export guards for the employment taxes: Form 4137 (unreported tips),
Form 8919 (uncollected tax on wages) and Form 8959 (Additional Medicare Tax).
Nodes: `nodes/intermediate/forms/taxes/employment/{form4137,form8919,form8959}`
and `nodes/inputs/taxes/employment/ct2`.

| Module                                 | Guards                                                                                                             | Called by                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `schedule2_form4137_reconciliation.ts` | `assertSchedule2Form4137Tax` (Schedule 2 line 5), `assertLine1cForm4137Income` (1040 line 1c and `agi_aggregator`) | `mef/builder.ts`, `pdf/builder.ts`                                           |
| `schedule2_form8919_reconciliation.ts` | `assertSchedule2Form8919Tax` (line 6), `assertLine1gForm8919Wages` (1040 line 1g and AGI)                          | `mef/builder.ts`, `pdf/builder.ts`                                           |
| `form8959/form8959_source.ts`          | `assertForm8959Sources`, `assertForm8959Absent`, `hasForm8959Print`                                                | `mef/forms/taxes/employment/f8959.ts`, `pdf/forms/taxes/employment/f8959.ts` |

## How they connect

- The 4137/8919 guards recompute from the retained `pending.form4137` /
  `pending.form8919` slots with `calculateForm4137` / the 8919 calculation and
  `CONFIG_BY_YEAR[2025].ssWageBase`, summing every taxpayer/spouse copy, then
  compare to `pending.schedule2`, `pending.f1040` and `pending.agi_aggregator`.
  Both whole-return builders run them before any form is serialized.
- `form4137` routes `form4137_sources` into `form8919`, so both share one SS
  wage base; Form 8959 receives tips, 8919 wages, W-2/4852/household wages,
  CT-2 RRTA records and Schedule SE income.
- `form8959_source.ts` re-parses original source records with the node
  schemas of `w2`, `f4852`, `household_wages` and `ct2`. The executor keeps
  each upstream deposit in the `form8959` pending slot; the guard checks those
  deposits against the node's whole-dollar print lines, and a filing trigger
  without print lines throws. The MeF serializer also requires finalized
  `schedule2`/`f1040` slots (`pendingAmount` in `f8959.ts`).

## Tests

- `*_replay.test.ts` here run a whole return and replay the line into native
  XML and the PDF; most need the private `Return1040.xsd` under
  `.state/research/docs/IMF_Series_2025v5.4/` and fail with "failed to load
  external entity" without it (report as unverified, not as a code failure).
- `bun test ./forms/f1040/2025/domains/taxes/employment --timeout=1800000`
- `bun test ./forms/f1040/e2e/taxes/employment --timeout=1800000`

Section map: [../../../../nodes/inputs/taxes/AGENTS.md](../../../../nodes/inputs/taxes/AGENTS.md).

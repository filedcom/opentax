# validation/rules/general/

MeF business-rule groups (`<PREFIX>_RULES`, imported by `../index.ts`) for
Form 1040 and whole-return rules, disclosures, foreign information forms and
transmission envelopes.

- `return-assembly/s3.ts` — Schedule 3. Unlike the other return-assembly
  groups, it is not under `submission/`.
- `submission/return-assembly/` — `f1040`, `f1040x`, `f1310`, `f2120`,
  `f8332`, `f9000`, `slep`, and `ind` (whole-return `IND-*`).
- `submission/disclosures/` — `f8082`, `f8275`, `f8275r`, `f8594`, plus
  `f7204`, `f7211`, `f7218` (no engine node).
- `submission/foreign/` — `f5471` and its schedules `sg1`, `si1`, `sm`, `so`,
  `sp`, `sq`; `f8833`, `f8854`, `f8858`. These have no engine node: `f5074`,
  `f8838p`, `f8865` (+ `sg`, `sk1`–`sk3`), `f8993`, `f926`, `schk2k3`,
  `schk3`, `sl` (Form 1118).
- `submission/investments/f8997.ts`; `submission/{ft,r0000,state,t0000,x0000}.ts`.
  Elsewhere: Schedule 1 is `../income/other/s1.ts`, Schedule B (Part III
  included) is `../income/investments/sb.ts`. 8938, 8958, 4547, 8867 and 8886
  have no rule file.
- Checks resolve element names through `FIELD_REGISTRY`, which is built from
  registered serializers. Rules for blocked forms (8082, 8275, 1310, 2120,
  8332, 8833) therefore never run on a real return.
- Generator headers ("N rules (x implemented, y stubs)") go stale:
  `f8275.ts` says 0 implemented but has a real check.

## Verify

- `bun test ./forms/f1040/validation/ --timeout=1800000`
- `bun test ./scripts/maintenance/rule-paths.test.ts --timeout=1800000` after
  adding or moving a rule file.

Section map: [../../../nodes/inputs/general/AGENTS.md](../../../nodes/inputs/general/AGENTS.md)

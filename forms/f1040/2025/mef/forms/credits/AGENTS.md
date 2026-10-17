# 2025/mef/forms/credits

Native MeF serializers for credit forms (47 `MefFormDescriptor` exports, including
statements). The node, PDF, domain and rules counterpart of each form is in
[../../../../nodes/inputs/credits/AGENTS.md](../../../../nodes/inputs/credits/AGENTS.md).

## Layout

- `business/`: one file per form (`f3468`, `f4136`, `f5884`, `f8582cr`, `f8820`,
  `f8826`, `f8835`, `f8844`, `f8864`, `f8874`, `f8881`, `f8882`, `f8908`,
  `f8911`, `f8994`) plus `*_statement.ts` attachments and `*_source.ts`
  joins. `f3800/` splits Form 3800 into part/row/link modules.
- `earned-income/eitc.ts` is Schedule EIC. `foreign/f1116/` covers 1116 with
  Schedules B and C. `health/` has `f8941.ts` and `f8962/` (with scenario tests).
- `individual/` holds the 2441, 5695, 8396, 8834, 8839, 8859, 8862, 8863, 8880,
  8912 and 8936 serializers, **and** `schedule_8812.ts` and `schedule_r.ts`.
  Those two nodes live in `credits/child/` and `credits/elderly-disabled/`;
  this tree has no folders with those names.

## Conventions verified here

- Everything is listed in `ALL_MEF_FORMS` (`../index.ts`) except `f8908.ts`.
  That file is staged, its header says "not in the public MeF registry", and
  `../../builder.ts` imports only its source reconciliation.
- Shared ledgers: `f8826_cap_ledger.ts` is read by `f8826`, `f8582cr` and
  `f3800/f3800.ts`. `f8396_reissue_join.ts` ties a reissued MCC to Form 8828.
- Serializers call the `../../../domains/credits/**` guards before writing XML.
  Form 8801 has no serializer here (it is staged in `domains/credits/amt/`).

Verify: `bun test --timeout=1800000 ./forms/f1040/2025/mef/forms/credits/<group>/<file>.test.ts`.
`*.xsd.test.ts` and some `f3800/` tests need `xmllint` and the private
`.state/research/docs/IMF_Series_2025v5.4/` schema. Without it they skip or throw
`Missing verification prerequisite`. Report that as unverified.

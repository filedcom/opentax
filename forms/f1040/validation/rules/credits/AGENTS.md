# validation/rules/credits

IRS MeF business rules for credit forms. Each file covers one rule-number
prefix and exports `<PREFIX>_RULES`, which `../index.ts` imports into
`ALL_RULES`. The section map is at
[../../../nodes/inputs/credits/AGENTS.md](../../../nodes/inputs/credits/AGENTS.md).

## Files

- `business/`: `f3468`, `f3800`, `f4136`, `f6765`, `f7205`, `f8582cr`, `f8609a`,
  `f8826`, `f8835`, `f8864`, `f8881`, `f8908`, `f8910`, `f8933`.
- `child/s8812.ts`, `earned-income/seic.ts`, `elderly-disabled/sr.ts`,
  `foreign/f1116.ts`, `health/f8941.ts`, `health/f8962.ts`.
- `individual/`: `f2441`, `f5695`, `f8839`, `f8862`, `f8863`, `f8880`, `f8936`.

## Conventions verified here

- The groups match the node tree, not the MeF tree. `s8812` and `sr` sit in
  `child/` and `elderly-disabled/`, while their serializers are in
  `2025/mef/forms/credits/individual/`.
- `f7205`, `f8910` and `f8933` have no node, serializer or PDF.
  `return validate`/`export` pass the emitted documents' `rulePrefixes` to
  `evaluateRules`, so these rules are skipped. Without that scope, F8910-023
  reads `TotalTaxBeforeCrAndOthTaxesAmt`, which `FIELD_REGISTRY` maps to Form
  1040 line 18, and would reject the return.
  Several files are mostly `check: null` stubs (see each file header; `f3800`,
  `seic`).
- Credits with nodes but no rule file here: 5884, 6478, 7207, 8801, 8820, 8834,
  8844, 8859, 8874, 8882, 8896, 8911, 8912, 8994 and 8396.

Verify: this folder has no tests of its own. Run
`bun test --timeout=1800000 ./forms/f1040/validation/`, and also
`bun test --timeout=1800000 ./scripts/maintenance/rule-paths.test.ts` after
adding, moving or removing a file here.

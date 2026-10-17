# validation/rules/deductions

MeF business rules for deduction forms, one file per rule prefix, all in
`../index.ts` (`ALL_RULES`). Section map:
[../../../nodes/inputs/deductions/AGENTS.md](../../../nodes/inputs/deductions/AGENTS.md).

- `itemized/sa.ts` `SA_RULES` (Schedule A); `charitable/f8283.ts`
  `F8283_RULES`; `casualty/f4684.ts` `F4684_RULES`; `investments/f4952.ts`
  `F4952_RULES`; `business/f4562.ts`, `f8829.ts`, `f8995.ts`, `f8995a.ts`
  (`F4562_RULES`, `F8829_RULES`, `F8995_RULES`, `F8995A_RULES`).
- No rule file here for Form 8990, Schedule 1-A or Form 1098; no tests here.

## Notes verified here

- Headers say "Auto-generated from 1040_Business_Rules_2025v3.0.csv" with an
  implemented/stub count, but some checks are hand-edited to `alwaysPass`
  with a reason (`f4684.ts`: needs all Form 4684 copies together).
- Checks address XML element names, which resolve only through a serializer's
  `FIELD_MAP`. `casualty/f4684.ts`, `charitable/f8283/f8283.ts`,
  `business/f8995/f8995.ts`, `business/f8995a/*.ts` and
  `additional/schedule1a/schedule1a.ts` under
  `../../../2025/mef/forms/deductions/` have an empty `FIELD_MAP`, so
  `F4684_RULES`, `F8283_RULES`, `F8995_RULES` and `F8995A_RULES` see no values
  for those elements unless another serializer maps the same name.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/validation/`
- `bun test --timeout=1800000 ./scripts/maintenance/rule-paths.test.ts` after
  adding, moving or removing a rule file.

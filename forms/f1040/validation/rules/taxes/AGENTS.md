# validation/rules/taxes

IRS MeF business rules for Taxes forms, one file per rule prefix. Form
counterparts: [section map](../../../nodes/inputs/taxes/AGENTS.md).

| File                                          | Export                                      | Rules    |
| --------------------------------------------- | ------------------------------------------- | -------- |
| `other/s2.ts`                                 | `S2_RULES` (Schedule 2)                     | 35       |
| `household-employment/sh.ts`                  | `SH_RULES`                                  | 21       |
| `employment/f8959.ts`, `f4137.ts`, `f8919.ts` | `F8959_RULES`, `F4137_RULES`, `F8919_RULES` | 18, 2, 3 |
| `investments/f8960.ts`, `f8615.ts`            | `F8960_RULES`, `F8615_RULES`                | 18, 3    |
| `credit-recapture/f4255.ts`, `f8828.ts`       | `F4255_RULES`, `F8828_RULES`                | 11, 1    |
| `retirement/f5329.ts`, `f4972.ts`             | `F5329_RULES`, `F4972_RULES`                | 10, 7    |
| `self-employment/sse.ts`                      | `SSE_RULES`                                 | 8        |
| `passthrough/f8978.ts`                        | `F8978_RULES`                               | 6        |
| `income-averaging/sj.ts`                      | `SJ_RULES`                                  | 4        |
| `underpayment/f2210.ts`, `f2210f.ts`          | `F2210_RULES`, `F2210F_RULES`               | 4, 2     |
| `interest/f8697.ts`, `f8866.ts`               | `F8697_RULES`, `F8866_RULES`                | 3, 1     |
| `foreign/f965a.ts`                            | `F965A_RULES`                               | 2        |

No rule file exists for Form 6251, 8611, CT-2, 4970, 5405, 8965 or §453A
interest. `F8828-001` checks `MortgSbsdyOriginalLoanClsDt`, but the Form
8828 serializer is staged (not in `ALL_MEF_FORMS`) and its `FIELD_MAP` is
empty, so `FIELD_REGISTRY` has no Form 8828 element for that check to read.

## Verify

- No tests live here: `bun run test:unit` type-checks it;
  `bun test ./forms/f1040/validation/ --timeout=1800000` runs the other rule tests.
- `bun test ./core/validation/ --timeout=1800000` when a predicate changes.

# validation/rules/payments

MeF business rules (TY2025 1040 business-rules CSV) for the Payments forms.
Each file exports `<PREFIX>_RULES` and is imported by `../index.ts`.

| File                    | Export        | Rule groups for                                              |
| ----------------------- | ------------- | ------------------------------------------------------------ |
| `investments/f2439.ts`  | `F2439_RULES` | IRS2439 (`ShareholderSSN` vs header, …)                      |
| `refund/f8888.ts`       | `F8888_RULES` | IRS8888 (`TotalAllocationOfRefundAmt` = deposits + check, …) |
| `installments/f9465.ts` | `F9465_RULES` | IRS9465 (`TotalTaxDueAmt` ≤ 50,000, …)                       |
| `refundable/f8379.ts`   | `F8379_RULES` | IRS8379 injured spouse                                       |
| `settlement/fpymt.ts`   | `FPYMT_RULES` | IRS Payment / ES Payment / 965 Payment Records               |
| `foreign/f8689.ts`      | `F8689_RULES` | Form 8689 (USVI allocation); no node or serializer exists    |

## What rules here can actually see

- `form2439` and `form8888` declare `FIELD_MAP: []`, and no serializer emits
  IRS9465 (staged, unregistered), IRS8379 or any payment record. Their XML
  names are therefore absent from `../../field_registry.ts`; `resolveField`
  in `core/validation/context.ts` then falls back to a pending key spelled
  like the XML name, which these snake_case nodes never have. Treat these
  groups as unexercised until a `FIELD_MAP` is filled in.
- `f8689.ts`'s header says "0 implemented, 2 stubs" but both rules have an
  `isZero` check.

## Verify

- `bun test --timeout=1800000 ./scripts/maintenance/rule-paths.test.ts` after
  adding, moving or removing a file here.
- `bun run test:unit`
- Section map: [../../../nodes/inputs/payments/AGENTS.md](../../../nodes/inputs/payments/AGENTS.md);
  rule conventions: [../../AGENTS.md](../../AGENTS.md).

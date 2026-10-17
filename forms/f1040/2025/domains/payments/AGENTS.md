# forms/f1040/2025/domains/payments

TY2025 export-time guards for Payments lines: Form 1040 lines 25a–25c, 26,
35a–36 and Schedule 3 lines 9–11 and 13a, plus Form 8888. Each `assert*`
replays the retained source input (`pending.<nodeType>`) against the filed
value and throws on a mismatch; nothing here computes a line. Section map
(forms, nodes, serializers): [../../../nodes/inputs/payments/AGENTS.md](../../../nodes/inputs/payments/AGENTS.md).

## Layout

- `withholding/` — lines 25a/25b/25c and their recipient owners; see
  [withholding/AGENTS.md](withholding/AGENTS.md).
- `settlement/` — line 26 (1040-ES), Schedule 3 line 10 (extension), line 36,
  and export blocks for `payment_request` / `amendment_request`; see
  [settlement/AGENTS.md](settlement/AGENTS.md).
- `refundable/` — `schedule3_payment_sources.ts` (Schedule 3 line 9 vs
  `form8962.net_premium_tax_credit`, line 10 vs `ext`, line 11 excess Social
  Security recomputed from W-2 boxes 3/4 per employee) and
  `schedule3_line13a_source.ts` (line 13a = box 2 of Forms 2439 with box 1a > 0).
  Both are called from `../../mef/forms/general/return-assembly/schedule3.ts`
  and `../../pdf/forms/general/return-assembly/schedule3.ts`.
- `refund/form8888/` — `reconcileForm8888`, used by both Form 8888
  serializers: total = line 35a, ≤ line 34, no line 37, no 35b–d direct
  deposit, no `f8379`, routing checksum, owner name = taxpayer or MFJ spouse.

## Conventions here

- Owner checks compare digits-only SSNs; the spouse counts only on MFJ.
- Amounts compare within 0.01, except `schedule3_payment_sources.ts` (integer
  cents; sub-cent input throws).
- Source is parsed with node exports (`inputSchema`, `estimatedPaymentTotal`,
  `totalCreditAmount`) so node and guard agree.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/domains/payments`
  (`deposit_source_parity.test.ts` fails, not skips, without the private XSD)

# Income — investments inputs

Interest, dividends and capital transactions: `f1099int`, `f1099oid`,
`f1099div`, `f1099b`, `f8949`, `f3921`, `f8814`. Schedules B/D aggregate in
`intermediate/aggregation/income/investments`; Forms 8949, 6252, 6781 and
8815 compute in `intermediate/forms/income/investments`. Crosswalk:
[../AGENTS.md](../AGENTS.md).

## Flow

- `f1099int`, `f1099oid`, `f1099div` → `schedule_b` (rows with payer name),
  `f1040`, `agi_aggregator`, `form4952`, `form6251`; `f1099int`/`f1099div`
  foreign tax → `form_1116`. 1099-INT/OID box 2 early-withdrawal penalty →
  `schedule1.line18_early_withdrawal` (an Adjustments line). `f1099div`
  capital gain distributions → `schedule_d`; box 5 section 199A dividends →
  `form8995a` above the 199A threshold (computed in-node from
  `CONFIG_BY_YEAR`), with qualified dividends also sent to `form8995`.
- `f1099b` and `f8949` → `form8949` (transactions) → `schedule_d`; both send
  backup withholding to `f1040.line25b_withheld_1099` and accrued market
  discount to `schedule_b` as interest.
- `f3921` → `form6251` (`iso_adjustment`) only; it also writes its ISO AMT
  basis ledger into its own pending slot (`{ nodeType: this.nodeType }`).
- `f8814` reaches eleven nodes (Schedules 1/B/D, `income_tax_calculation`,
  `form8962`, `form8960`, …) and writes a pending-only `form8814` row for the
  MeF/PDF descriptors; no `form8814` node exists.

## Traps

- The same sale entered as both `f1099b` and `f8949` is rejected by
  `assertNoRepeatedBrokerSaleSources`
  (`2025/domains/income/investments/broker_sale_source_reconciliation.ts`),
  called from `2025/index.ts`.
- Seller-financed mortgage interest (buyer SSN/address) is
  `f1099int/seller_financed_buyer.ts`; Form 8814 issuer bytes binding is
  `f8814/issuer_byte_binding.ts`.
- `f3921` has no `research/context.md`.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/nodes/inputs/income/investments`
- `bun test --timeout=1800000 ./forms/f1040/nodes/intermediate/aggregation/income/investments`
- `bun test --timeout=1800000 ./forms/f1040/2025/domains/income/investments`

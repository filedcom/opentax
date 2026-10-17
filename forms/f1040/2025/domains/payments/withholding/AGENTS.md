# domains/payments/withholding

Form 1040 lines 25a–25c replayed from retained sources at export. Callers:
`../../../mef/builder.ts` and `../../../pdf/builder.ts` (all guards), plus
`../../../mef|pdf/forms/general/return-assembly/f1040.ts` and
`../../income/business/trust-k1/trust_k1_prepared_copies.ts` for
`assertOtherFormsWithholding`.

| Line      | Module                                                                                            | Sources replayed                                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1a, 25a   | [w2_withholding_reconciliation.ts](w2_withholding_reconciliation.ts)                              | `w2` box 2, `f4852` (W-2 type) substitutes; also `assertLine1aWageSource`, `assertLine1iCombatPayElectionSource`, `assertForm4852FilingRoute` |
| 25b       | [f1099/f1099_withholding_reconciliation.ts](f1099/f1099_withholding_reconciliation.ts)            | `f1099b/div/g/int/k/m/nec/oid/patr`, `f1099r`, `rrb1099r`, `ssa1099`, `f4852` (1099-R type), `f8949`                                          |
| 25b owner | [f1099n/](f1099n/f1099nec_withholding_owner.ts), [f1099p/](f1099p/f1099patr_withholding_owner.ts) | 1099-NEC box 4 and 1099-PATR recipient TINs                                                                                                   |
| 25c       | [f8288/f8288_withholding_reconciliation.ts](f8288/f8288_withholding_reconciliation.ts)            | `f8288`, `w2g` box 4, `f8805`, `k1_trust` backup withholding, `form8959.line24_total_withheld`                                                |
| 25c owner | [f8288/f8288_withholding_owner.ts](f8288/f8288_withholding_owner.ts)                              | 8288-A `seller_tin` + `stamped_copy_b_reference`                                                                                              |

Only `f8288`/`f8805` are Payments nodes; every other source node is homed in
Income (`nodes/inputs/income/**`) or Taxes (`form8959`).

## Traps

- Line 25b is exact (`actual !== expected` throws). Line 25c requires
  filed ≥ sourced by default (the per-form `f1040.ts` serializers) and exact
  equality with `requireExact = true` (both builders and
  `trust_k1_prepared_copies.ts`).
- `f4852` 1099-R rows are skipped when `f1099r.substitute_f1099rs` exists,
  and W-2 substitutes are skipped when `w2.substitute_w2s` exists, so a
  substitute is never counted twice.
- Withholding on `f8949` rows throws: it must be entered on the issuing
  1099-B; a `source_transaction_id` repeating a 1099-B `transaction_id` throws.
- Recipient checks: W-2 `employee_ssn`, 1099 recipient fields and 8288-A
  `seller_tin` must be the taxpayer, or the spouse on MFJ only.
- `trust-k1/` holds only a test: trust K-1 box 13 code B withholding computes
  but export must not drop it silently.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/domains/payments/withholding`
- Section map: [../../../../nodes/inputs/payments/AGENTS.md](../../../../nodes/inputs/payments/AGENTS.md)

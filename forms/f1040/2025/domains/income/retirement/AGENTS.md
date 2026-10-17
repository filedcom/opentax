# Income — retirement reconciliation (TY2025)

Form 1099-R, Form 8606, Form 8915-F, SSA-1099 and RRB-1099-R checks.
Crosswalk: [section map](../../../../nodes/inputs/income/AGENTS.md).

## What is here

| Module                                                                                              | Guard                                                              | Called by                                                                         |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `f1099r/f1099r_recipient_owner.ts`                                                                  | `assert1099RRecipientOwner`                                        | both builders, 1099-R and foreign-employer-wages serializers                      |
| `ira1099r_income_reconciliation.ts`                                                                 | `assertIra1099rIncomeSource`                                       | both builders                                                                     |
| `rrb1099r_pension_reconciliation.ts`                                                                | `assertRrb1099rPensionSource`                                      | both builders                                                                     |
| `ssa_benefits_reconciliation.ts`                                                                    | `assertBenefitStatementOwner`, `assertSocialSecurityBenefitSource` | both builders                                                                     |
| `retirement_state_local_tax_source.ts`                                                              | `assertRetirementStateLocalTaxSource`                              | Schedule A MeF/PDF (Deductions)                                                   |
| `form8606/form8606_roth_reconciliation.ts` → `_roth_activity_`, `_roth_inventory_reconciliation.ts` | `reconcileForm8606Roth` and parts                                  | Form 8606 serializers; parts also both builders, Form 5329 MeF, `wages/form4852/` |
| `form8606/form8606_distribution_reconciliation.ts`                                                  | `reconcileForm8606Distribution`                                    | Form 8606 serializers                                                             |
| `form8606/form8606_recharacterization_source.ts`                                                    | `reconcileIraRecharacterizations`                                  | 1099-R MeF, IRA statements                                                        |

## How they connect

- Form 8606 basis and Roth ordering are checked from three sides: the 1099-R
  distributions (`_distribution_`), the Roth history/inventory/activity
  records, and Form 4852 substitutes (`wages/form4852/form4852_source.ts`
  imports the Roth activity and inventory guards).
- `form8606/form8606_test_pending.ts` (`normalizeForm8606TestPending`) is a
  test helper; only `*.test.ts` files import it.
- `form8915f/` holds the multi-owner inventory fixture and test; the 8915-F
  treatment itself is on the 1099-R item.
- `ira_*.test.ts` cover rollover edge cases (MO-2025-02 disaster
  postponement, partial early rollover, recharacterization with PFIC
  statements); `nonstandard_1099r_source.test.ts` rejects malformed payer
  identity in both exports.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/domains/income/retirement`
- `bun test --timeout=1800000 ./forms/f1040/2025/mef/forms/income/retirement`

# Income — investments reconciliation (TY2025)

Interest, dividend and capital-sale source checks, plus Forms 6252, 8814 and
8815 return tests. Crosswalk:
[section map](../../../../nodes/inputs/income/AGENTS.md).

## What is here

| Module                                                                                                | Guard                                                                                      | Called by                                                                       |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `broker_sale_source_reconciliation.ts`                                                                | `assertNoRepeatedBrokerSaleSources`, `assertCapitalSaleSourceRows`                         | `2025/index.ts`, both builders, Form 8995 route, Form 6251 ISO check, Form 8886 |
| `f1099b/f1099b_recipient_owner.ts`                                                                    | `assert1099BRecipientOwner`                                                                | both builders                                                                   |
| `f1099div/f1099div_income_reconciliation.ts`                                                          | `assertDividendIncomeSources`                                                              | both builders                                                                   |
| `f1099{div,int,oid}/*_owner_reconciliation.ts`                                                        | `assertPositive1099DivOwner`, `assertIdentified1099IntOwner`, `assertPositive1099OidOwner` | Form 1040 MeF/PDF serializers                                                   |
| `line7a_source_reconciliation.ts`                                                                     | `assertDirectCapitalGainDistributionSource`                                                | Form 1040 serializers, Form 6251 ISO check                                      |
| `tax_exempt_interest_reconciliation.ts`                                                               | `assertTaxExemptInterestSource`                                                            | both builders                                                                   |
| `schedule-b/schedule_b_interest_reconciliation.ts`                                                    | `assertScheduleBInterestJoin`, `assertScheduleBPreparedProjection`                         | both builders                                                                   |
| `schedule-d/schedule_d_1040_join.ts`, `schedule_d_k1_source.ts`                                       | `assertScheduleD1040Join`, `assertScheduleDK1Source`                                       | both builders, Schedule D serializers, Form 8886                                |
| `form8815/form8815_final_return.ts` (+ `_contribution_return`, `_royalty_return`, `_foreign_addback`) | `assertForm8815FinalReturn`                                                                | Form 8815 MeF/PDF; royalty part also Form 4952                                  |

## How they connect

- Schedule B is checked twice: payer rows against the 1099 sources
  (`assertScheduleBInterestJoin`) and the printed projection
  (`assertScheduleBPreparedProjection`); tax-exempt interest (line 2a) and
  capital gain distributions reported directly on line 7a (no Schedule D)
  have their own guards.
- Form 8815's chain is `form8815_final_return` → contribution, royalty and
  foreign add-back modules; its fixtures (`*.fixture.ts`) pair with the
  same-named tests.
- `form6252/`, `form8814/`, `qualified_dividend_subset.test.ts` and
  `schedule1_form8814_source_replay.test.ts` hold fixtures and return tests
  only. Their fixtures are reused elsewhere: `form6252_payments.fixture.ts`
  by the Form 4797 prior-history test and the 8915-F and 8853 LTC
  fixtures,
  `form8814_capital_schedulej.fixture.ts` by the Form 4952 Schedule J child
  fixture (Deductions).

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/domains/income/investments`
- `bun test --timeout=1800000 ./forms/f1040/e2e/income/investments`

# Income section map

Income sources, exclusions and net-income reconciliation for Form 1040: the
documents that produce Form 1040 lines 1–8 and Schedule 1 Part I. This file is
the crosswalk for every Income folder; each role folder has a short AGENTS.md
that links back here.

| Role | Folder |
| --- | --- |
| Source nodes | [this folder](.) |
| Computed forms | [intermediate/forms/income](../../intermediate/forms/income/) |
| Aggregations (Schedules B, D) | [intermediate/aggregation/income](../../intermediate/aggregation/income/) |
| TY2025 source reconciliation | [2025/domains/income](../../../2025/domains/income/) |
| MeF serializers | [2025/mef/forms/income](../../../2025/mef/forms/income/) |
| PDF projections | [2025/pdf/forms/income](../../../2025/pdf/forms/income/) |
| PDF review routes | [2025/pdf/reviews/income](../../../2025/pdf/reviews/income/) |
| Whole-return tests | [e2e/income](../../../e2e/income/) |
| MeF business rules | [validation/rules/income](../../../validation/rules/income/) |
| Research | [docs/ty2025/domains/income](../../../../../docs/ty2025/domains/income/) |

Paths in the tables are relative to each role folder above; `—` means none
exists. "CLI" marks an intermediate node that is also a CLI input (an
`inputNodes` entry in [2025/inputs.ts](../../../2025/inputs.ts)).

## Crosswalk

### Wages and gambling (`wages/`, `gambling/`)

| Form | Input node | Intermediate | MeF | PDF | Domains | E2E | Rules | Docs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| W-2, Wage and Tax Statement | [`w2`](wages/w2/) | — | [other/w2.ts](../../../2025/mef/forms/income/other/w2.ts) | — | [wages/line1a_w2_source_replay](../../../2025/domains/income/wages/line1a_w2_source_replay.test.ts), [nonstandard_w2_source](../../../2025/domains/income/wages/nonstandard_w2_source.test.ts), [line1i_combat_pay_source](../../../2025/domains/income/wages/line1i_combat_pay_source.test.ts) | — | [other/fw2.ts](../../../validation/rules/income/other/fw2.ts) | — |
| 4852, Substitute for W-2 or 1099-R | [`f4852`](wages/f4852/) | — | via [other/w2.ts](../../../2025/mef/forms/income/other/w2.ts), [retirement/f1099r.ts](../../../2025/mef/forms/income/retirement/f1099r.ts) | [wages/f4852_retained.ts](../../../2025/pdf/forms/income/wages/f4852_retained.ts) | [wages/form4852/](../../../2025/domains/income/wages/form4852/) | — | — | [wages/form4852/](../../../../../docs/ty2025/domains/income/wages/form4852/) |
| Household employee wages (1040 line 1b) | [`household_wages`](wages/household_wages/) | — | — | — | [wages/line1b_household_wages.ts](../../../2025/domains/income/wages/line1b_household_wages.ts) | — | — | — |
| Clergy housing/wages (Pub 517) | [`clergy`](wages/clergy/) (always throws) | — | — | — | — | — | — | — |
| W-2G, Certain Gambling Winnings | [`w2g`](gambling/w2g/) | — | [other/w2g.ts](../../../2025/mef/forms/income/other/w2g.ts) | [other/w2g.ts](../../../2025/pdf/forms/income/other/w2g.ts); review [other/w2g_prepared_copy](../../../2025/pdf/reviews/income/other/w2g_prepared_copy.test.ts) | [other/w2g_payer_copy.fixture.ts](../../../2025/domains/income/other/w2g_payer_copy.fixture.ts) | [other/w2g_source_identity](../../../e2e/income/other/w2g_source_identity.test.ts) | [other/fw2g.ts](../../../validation/rules/income/other/fw2g.ts) | — |

### Investments (`investments/`)

| Form | Input node | Intermediate | MeF | PDF | Domains | E2E | Rules | Docs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1099-INT, Interest Income | [`f1099int`](investments/f1099int/) | → `schedule_b` | — | — | [investments/f1099int/](../../../2025/domains/income/investments/f1099int/), [tax_exempt_interest_reconciliation.ts](../../../2025/domains/income/investments/tax_exempt_interest_reconciliation.ts) | — | — | — |
| 1099-OID, Original Issue Discount | [`f1099oid`](investments/f1099oid/) | → `schedule_b` | — | — | [investments/f1099oid/](../../../2025/domains/income/investments/f1099oid/) | — | — | — |
| 1099-DIV, Dividends and Distributions | [`f1099div`](investments/f1099div/) | → `schedule_b`, `schedule_d` | — | — | [investments/f1099div/](../../../2025/domains/income/investments/f1099div/), [line7a_source_reconciliation.ts](../../../2025/domains/income/investments/line7a_source_reconciliation.ts) | — | — | — |
| Schedule B, Interest and Ordinary Dividends | — (Part III facts: `schedule_b_part_iii` in General) | [`schedule_b`](../../intermediate/aggregation/income/investments/schedule_b/) | [investments/schedule_b.ts](../../../2025/mef/forms/income/investments/schedule_b.ts) | [investments/schedule_b/](../../../2025/pdf/forms/income/investments/schedule_b/) | [investments/schedule-b/](../../../2025/domains/income/investments/schedule-b/) | — | [investments/sb.ts](../../../validation/rules/income/investments/sb.ts) | — |
| 1099-B, Proceeds From Broker Transactions | [`f1099b`](investments/f1099b/) | → `form8949` | — | — | [investments/f1099b/](../../../2025/domains/income/investments/f1099b/), [broker_sale_source_reconciliation.ts](../../../2025/domains/income/investments/broker_sale_source_reconciliation.ts) | — | — | — |
| 8949, Sales and Other Dispositions of Capital Assets | [`f8949`](investments/f8949/) | [`form8949`](../../intermediate/forms/income/investments/form8949/) | [investments/f8949.ts](../../../2025/mef/forms/income/investments/f8949.ts) | [investments/f8949.ts](../../../2025/pdf/forms/income/investments/f8949.ts) | — | — | [investments/f8949.ts](../../../validation/rules/income/investments/f8949.ts) | [investments/form8949/](../../../../../docs/ty2025/domains/income/investments/form8949/) |
| Schedule D, Capital Gains and Losses | — | [`schedule_d`](../../intermediate/aggregation/income/investments/schedule_d/) (CLI), [`schedule_d_final`](../../intermediate/aggregation/income/investments/schedule_d_final/) | [investments/schedule_d.ts](../../../2025/mef/forms/income/investments/schedule_d.ts) | [investments/schedule_d.ts](../../../2025/pdf/forms/income/investments/schedule_d.ts) | [investments/schedule-d/](../../../2025/domains/income/investments/schedule-d/) | — | [investments/sd.ts](../../../validation/rules/income/investments/sd.ts) | — |
| 3921, Exercise of an Incentive Stock Option | [`f3921`](investments/f3921/) | → `form6251` (Taxes) | — | — | — | — | — | — |
| 6252, Installment Sale Income | — | [`form6252`](../../intermediate/forms/income/investments/form6252/) (CLI) | [investments/f6252.ts](../../../2025/mef/forms/income/investments/f6252.ts) | [investments/f6252.ts](../../../2025/pdf/forms/income/investments/f6252.ts); review [investments/form6252_route](../../../2025/pdf/reviews/income/investments/form6252_route.test.ts) | [investments/form6252/](../../../2025/domains/income/investments/form6252/) | — | [investments/f6252.ts](../../../validation/rules/income/investments/f6252.ts) | [investments/form6252/](../../../../../docs/ty2025/domains/income/investments/form6252/) |
| 6781, Section 1256 Contracts and Straddles | — | [`form6781`](../../intermediate/forms/income/investments/form6781/) (CLI) | [investments/f6781.ts](../../../2025/mef/forms/income/investments/f6781.ts) | [investments/f6781.ts](../../../2025/pdf/forms/income/investments/f6781.ts); review [investments/form6781_prepared_rows](../../../2025/pdf/reviews/income/investments/form6781_prepared_rows.test.ts) | — | — | [investments/f6781.ts](../../../validation/rules/income/investments/f6781.ts) | — |
| 8814, Parents' Election To Report Child's Interest and Dividends | [`f8814`](investments/f8814/) | — (pending key `form8814`) | [investments/f8814.ts](../../../2025/mef/forms/income/investments/f8814.ts), [child_taxable_interest_statement.ts](../../../2025/mef/forms/income/investments/child_taxable_interest_statement.ts) | [investments/f8814.ts](../../../2025/pdf/forms/income/investments/f8814.ts) | [investments/form8814/](../../../2025/domains/income/investments/form8814/) | [investments/form8814/](../../../e2e/income/investments/form8814/) | [investments/f8814.ts](../../../validation/rules/income/investments/f8814.ts) | [investments/form8814/](../../../../../docs/ty2025/domains/income/investments/form8814/) |
| 8815, Exclusion of Interest From Series EE and I U.S. Savings Bonds | — | [`form8815`](../../intermediate/forms/income/investments/form8815/) (CLI) | [investments/f8815.ts](../../../2025/mef/forms/income/investments/f8815.ts) | [investments/f8815.ts](../../../2025/pdf/forms/income/investments/f8815.ts) | [investments/form8815/](../../../2025/domains/income/investments/form8815/) | [investments/form8815/](../../../e2e/income/investments/form8815/) | [investments/f8815.ts](../../../validation/rules/income/investments/f8815.ts) | [investments/form8815/](../../../../../docs/ty2025/domains/income/investments/form8815/) |

### Business and farm (`business/`)

| Form | Input node | Intermediate | MeF | PDF | Domains | E2E | Rules | Docs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Schedule C, Profit or Loss From Business | [`schedule_c`](business/schedule_c/) | — | [business/schedule_c.ts](../../../2025/mef/forms/income/business/schedule_c.ts) | [business/schedule_c.ts](../../../2025/pdf/forms/income/business/schedule_c.ts) | [business/schedule-c/](../../../2025/domains/income/business/schedule-c/), [schedule_cf_signed_dollars](../../../2025/domains/income/business/schedule_cf_signed_dollars.test.ts) | — | [business/sc.ts](../../../validation/rules/income/business/sc.ts) | [business/ty2025-schedule-c-pdf-gap.md](../../../../../docs/ty2025/domains/income/business/ty2025-schedule-c-pdf-gap.md) |
| 1099-NEC, Nonemployee Compensation | [`f1099nec`](business/f1099nec/) | — | — | — | [business/f1099nec/](../../../2025/domains/income/business/f1099nec/) | [business/form1099n/](../../../e2e/income/business/form1099n/), [other/form1099n/](../../../e2e/income/other/form1099n/) | — | — |
| 1099-MISC, Miscellaneous Information | [`f1099m`](business/f1099m/) | — | — | — | [business/f1099m/](../../../2025/domains/income/business/f1099m/) | [business/form1099m/](../../../e2e/income/business/form1099m/), [other/form1099m/](../../../e2e/income/other/form1099m/) | — | — |
| 1099-K, Payment Card and Third Party Network Transactions | [`f1099k`](business/f1099k/) | — | — | — | [business/f1099k/](../../../2025/domains/income/business/f1099k/) | — | — | — |
| 1099-PATR, Taxable Distributions Received From Cooperatives | [`f1099patr`](business/f1099patr/) | — | — | — | [business/f1099patr/](../../../2025/domains/income/business/f1099patr/) | — | — | — |
| Car and truck expense / depletion worksheets | [`auto_expense`](business/auto_expense/), [`depletion`](business/depletion/) | — | — | — | — | — | — | — |
| 3115, Application for Change in Accounting Method | [`f3115`](business/f3115/) | — | — | — | — | [business/form3115/](../../../e2e/income/business/form3115/) | — | [business/form3115/](../../../../../docs/ty2025/domains/income/business/form3115/) |
| 970, Application To Use LIFO Inventory Method | [`f970`](business/f970/) (no outputs) | — | — | — | — | — | — | — |
| Schedule F, Profit or Loss From Farming | — | [`schedule_f`](../../intermediate/forms/income/business/schedule_f/) (CLI) | [business/schedule_f.ts](../../../2025/mef/forms/income/business/schedule_f.ts), CCC/crop statements | [business/schedule_f.ts](../../../2025/pdf/forms/income/business/schedule_f.ts) | [schedule_cf_signed_dollars](../../../2025/domains/income/business/schedule_cf_signed_dollars.test.ts) | [business/schedule-f/](../../../e2e/income/business/schedule-f/) | [business/sf.ts](../../../validation/rules/income/business/sf.ts) | — |
| 4835, Farm Rental Income and Expenses | [`f4835`](business/f4835/) | — | [business/f4835.ts](../../../2025/mef/forms/income/business/f4835.ts) (+ `_at_risk`, `_passive_loss`) | [business/f4835.ts](../../../2025/pdf/forms/income/business/f4835.ts) | — | — | [business/f4835.ts](../../../validation/rules/income/business/f4835.ts) | — |
| 461, Limitation on Business Losses | — | [`form461`](../../intermediate/forms/income/business/form461/) | [business/f461.ts](../../../2025/mef/forms/income/business/f461.ts) | [business/f461.ts](../../../2025/pdf/forms/income/business/f461.ts) | [business/form461/](../../../2025/domains/income/business/form461/) | — | [business/f461.ts](../../../validation/rules/income/business/f461.ts) | [business/form461/](../../../../../docs/ty2025/domains/income/business/form461/) |
| 4797, Sales of Business Property | — | [`form4797`](../../intermediate/forms/income/business/form4797/) (CLI: `form4797_investment_1245`, `form4797_prior_history`) | [business/f4797.ts](../../../2025/mef/forms/income/business/f4797.ts) | [business/f4797.ts](../../../2025/pdf/forms/income/business/f4797.ts); reviews [business/form4797_*](../../../2025/pdf/reviews/income/business/) | [business/form4797/](../../../2025/domains/income/business/form4797/), [passive_4797_dag](../../../2025/domains/income/business/passive_4797_dag.test.ts) | — | [business/f4797.ts](../../../validation/rules/income/business/f4797.ts) | [business/form4797/](../../../../../docs/ty2025/domains/income/business/form4797/) |
| 6198, At-Risk Limitations | — | [`form6198`](../../intermediate/forms/income/business/form6198/) (registered, unreachable; logic used via `simplified.ts`) | [business/f6198.ts](../../../2025/mef/forms/income/business/f6198.ts) | [business/f6198.ts](../../../2025/pdf/forms/income/business/f6198.ts) | — | — | — | [business/form6198/](../../../../../docs/ty2025/domains/income/business/form6198/) |
| 7203, S Corporation Shareholder Stock and Debt Basis Limitations | — | [`form7203`](../../intermediate/forms/income/business/form7203/) | [business/f7203_stock_loss.ts](../../../2025/mef/forms/income/business/f7203_stock_loss.ts), [rental-passthrough/schedule_e_stock_loss.ts](../../../2025/mef/forms/income/rental-passthrough/schedule_e_stock_loss.ts) | [business/f7203_stock_loss.ts](../../../2025/pdf/forms/income/business/f7203_stock_loss.ts), [rental-passthrough/schedule_e_stock_loss.ts](../../../2025/pdf/forms/income/rental-passthrough/schedule_e_stock_loss.ts) | [business/form7203/](../../../2025/domains/income/business/form7203/) | — | — | [business/form7203/](../../../../../docs/ty2025/domains/income/business/form7203/) |
| 7217, Partner's Report of Property Distributed by a Partnership | [`f7217`](business/f7217/) | → `form8949` | [business/f7217.ts](../../../2025/mef/forms/income/business/f7217.ts) | [business/f7217.ts](../../../2025/pdf/forms/income/business/f7217.ts) | [business/form7217/](../../../2025/domains/income/business/form7217/) | — | — | [business/form7217/](../../../../../docs/ty2025/domains/income/business/form7217/) |
| 8582, Passive Activity Loss Limitations | [`f8582_prior_year_record`](business/f8582_prior_year_record/) | [`form8582`](../../intermediate/forms/income/business/form8582/) | [business/f8582/](../../../2025/mef/forms/income/business/f8582/) | [business/f8582.ts](../../../2025/pdf/forms/income/business/f8582.ts) | [business/form8582/](../../../2025/domains/income/business/form8582/), [current_loss_*](../../../2025/domains/income/business/current_loss_filing_projection.ts) | [business/passive_activity_loss](../../../e2e/income/business/passive_activity_loss.test.ts) | — | [business/form8582/](../../../../../docs/ty2025/domains/income/business/form8582/) |
| 8824, Like-Kind Exchanges | — | [`form8824`](../../intermediate/forms/income/business/form8824/) (CLI) | [business/f8824.ts](../../../2025/mef/forms/income/business/f8824.ts) | [business/f8824.ts](../../../2025/pdf/forms/income/business/f8824.ts); review [business/form8824_section1231_route](../../../2025/pdf/reviews/income/business/form8824_section1231_route.test.ts) | — | — | — | [business/form8824/](../../../../../docs/ty2025/domains/income/business/form8824/) |
| 172, Net Operating Losses | [`nol_carryforward`](business/nol_carryforward/) (rejects a positive NOL) | — | — | — | [business/form172/](../../../2025/domains/income/business/form172/) | — | [business/f172.ts](../../../validation/rules/income/business/f172.ts) | [business/form172/](../../../../../docs/ty2025/domains/income/business/form172/) |

### Rental and pass-through (`rental-passthrough/`)

| Form | Input node | Intermediate | MeF | PDF | Domains | E2E | Rules | Docs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Schedule E, Supplemental Income and Loss | [`schedule_e`](rental-passthrough/schedule_e/) | → `form8582` | [rental-passthrough/schedule_e.ts](../../../2025/mef/forms/income/rental-passthrough/schedule_e.ts) | [rental-passthrough/schedule_e.ts](../../../2025/pdf/forms/income/rental-passthrough/schedule_e.ts) | [rental-passthrough/schedule-e/](../../../2025/domains/income/rental-passthrough/schedule-e/) | — | [rental-passthrough/se.ts](../../../validation/rules/income/rental-passthrough/se.ts) | — |
| Schedule K-1 (Form 1065) | [`k1_partnership`](rental-passthrough/k1_partnership/) | → `form8582`, `form4797` | via Schedule E | via Schedule E | [rental-passthrough/partnership_*](../../../2025/domains/income/rental-passthrough/) | — | — | — |
| Schedule K-1 (Form 1120-S) | [`k1_s_corp`](rental-passthrough/k1_s_corp/) | → `form7203`, `form8582`, `form4797` | via Schedule E / 7203 | via Schedule E / 7203 | [business/passive_s_corp_loss_calculation.ts](../../../2025/domains/income/business/passive_s_corp_loss_calculation.ts), [passive_s_corp_loss_copies.ts](../../../2025/domains/income/business/passive_s_corp_loss_copies.ts) | — | — | — |
| Schedule K-1 (Form 1041) | [`k1_trust`](rental-passthrough/k1_trust/) | → `schedule_e` | via Schedule E | via Schedule E | [business/trust-k1/](../../../2025/domains/income/business/trust-k1/) | — | — | — |

### Retirement and benefits (`retirement/`)

| Form | Input node | Intermediate | MeF | PDF | Domains | E2E | Rules | Docs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1099-R, Distributions From Pensions, Annuities, IRAs | [`f1099r`](retirement/f1099r/) | → `form8606` | [retirement/f1099r.ts](../../../2025/mef/forms/income/retirement/f1099r.ts), IRA statements | [retirement/ira_distribution_statement.ts](../../../2025/pdf/forms/income/retirement/ira_distribution_statement.ts); review [retirement/ira_rollover_eligibility_route](../../../2025/pdf/reviews/income/retirement/ira_rollover_eligibility_route.test.ts) | [retirement/f1099r/](../../../2025/domains/income/retirement/f1099r/), [ira1099r_income_reconciliation.ts](../../../2025/domains/income/retirement/ira1099r_income_reconciliation.ts) | — | [retirement/f1099r.ts](../../../validation/rules/income/retirement/f1099r.ts) | [retirement/](../../../../../docs/ty2025/domains/income/retirement/) (`ty2025-1099r-*`, `ty2025-ira-*`) |
| 8606, Nondeductible IRAs | — | [`form8606`](../../intermediate/forms/income/retirement/form8606/) | [retirement/f8606.ts](../../../2025/mef/forms/income/retirement/f8606.ts) | [retirement/f8606.ts](../../../2025/pdf/forms/income/retirement/f8606.ts) | [retirement/form8606/](../../../2025/domains/income/retirement/form8606/) | — | [retirement/f8606.ts](../../../validation/rules/income/retirement/f8606.ts) | [retirement/form8606/](../../../../../docs/ty2025/domains/income/retirement/form8606/) |
| 8915-F, Qualified Disaster Retirement Plan Distributions and Repayments | [`f8915f`](retirement/f8915f/) (validation only) | — | [retirement/f8915f.ts](../../../2025/mef/forms/income/retirement/f8915f.ts) | [retirement/f8915f.ts](../../../2025/pdf/forms/income/retirement/f8915f.ts) | [retirement/form8915f/](../../../2025/domains/income/retirement/form8915f/) | [retirement/form8915f/](../../../e2e/income/retirement/form8915f/) | [retirement/f8915f.ts](../../../validation/rules/income/retirement/f8915f.ts) | [retirement/form8915/](../../../../../docs/ty2025/domains/income/retirement/form8915/) |
| 8915-D, Qualified 2019 Disaster Distributions | [`f8915d`](retirement/f8915d/) (always throws) | — | — | — | — | — | — | — |
| SSA-1099, Social Security Benefit Statement | [`ssa1099`](retirement/ssa1099/) | → `agi_aggregator` (taxable 6b) | — | [retirement/f1040_line6d](../../../2025/pdf/forms/income/retirement/f1040_line6d.test.ts) | [retirement/ssa_benefits_reconciliation.ts](../../../2025/domains/income/retirement/ssa_benefits_reconciliation.ts) | — | [retirement/ssa.ts](../../../validation/rules/income/retirement/ssa.ts) | — |
| RRB-1099-R, Annuities or Pensions by the Railroad Retirement Board | [`rrb1099r`](retirement/rrb1099r/) | — | — | — | [retirement/rrb1099r_pension_reconciliation.ts](../../../2025/domains/income/retirement/rrb1099r_pension_reconciliation.ts) | — | [retirement/rrb.ts](../../../validation/rules/income/retirement/rrb.ts) | — |
| Lump-sum SS election (Pub 915) | [`lump_sum_ss`](retirement/lump_sum_ss/) (throws if beneficial) | — | — | — | — | — | — | — |
| SSA-1042S / RRB-1042S | [`benefit_1042s`](retirement/benefit_1042s/) (export blocked) | — | — | — | [other/benefit_1042s_source](../../../2025/domains/income/other/benefit_1042s_source.test.ts) | — | — | — |

### Other income (`other/`)

| Form | Input node | Intermediate | MeF | PDF | Domains | E2E | Rules | Docs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1099-G, Certain Government Payments | [`f1099g`](other/f1099g/) | — | — | — | [other/f1099g/](../../../2025/domains/income/other/f1099g/), [ordinary_state_refund_source](../../../2025/domains/income/other/ordinary_state_refund_source.test.ts) | — | — | — |
| 1099-C, Cancellation of Debt | [`f1099c`](other/f1099c/) | → `form982` | — | — | — | — | — | — |
| 982, Reduction of Tax Attributes Due to Discharge of Indebtedness | — | [`form982`](../../intermediate/forms/income/other/form982/) | [other/f982.ts](../../../2025/mef/forms/income/other/f982.ts) | [other/f982.ts](../../../2025/pdf/forms/income/other/f982.ts) | [other/form982/](../../../2025/domains/income/other/form982/) | [other/form982/](../../../e2e/income/other/form982/) | [other/f982.ts](../../../validation/rules/income/other/f982.ts) | [other/form982/](../../../../../docs/ty2025/domains/income/other/form982/) |
| Alimony received (Schedule 1 line 2a) | [`alimony_received`](other/alimony_received/) | — | — | [other/schedule1/schedule1_alimony_statement.ts](../../../2025/pdf/forms/income/other/schedule1/schedule1_alimony_statement.ts) | [other/alimony_received_route](../../../2025/domains/income/other/alimony_received_route.test.ts) | — | — | — |
| Taxable scholarships (Schedule 1 line 8r) | [`education_income`](other/education_income/) | — | — | — | — | — | — | — |
| Personal property rental (Schedule 1 line 8l) | [`personal_property_rental`](other/personal_property_rental/) | — | — | — | [business/personal_property_rental_source.ts](../../../2025/domains/income/business/personal_property_rental_source.ts) | — | — | — |
| PPP loan forgiveness (excluded) | [`ppp_forgiveness`](other/ppp_forgiveness/) (no outputs) | — | — | — | — | — | — | — |
| Schedule 1 Part I other income (lines 8a–8z) | — (sink `schedule1` is General) | — | [other/schedule1/](../../../2025/mef/forms/income/other/schedule1/) | [other/schedule1/](../../../2025/pdf/forms/income/other/schedule1/) | [other/schedule1_*](../../../2025/domains/income/other/) | — | [other/s1.ts](../../../validation/rules/income/other/s1.ts) | [other/ty2025-schedule1-line8z-source-gap.md](../../../../../docs/ty2025/domains/income/other/ty2025-schedule1-line8z-source-gap.md) |

### Foreign (`foreign/`)

| Form | Input node | Intermediate | MeF | PDF | Domains | E2E | Rules | Docs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2555, Foreign Earned Income | — | [`form2555`](../../intermediate/forms/income/foreign/form2555/) (CLI) | [foreign/f2555.ts](../../../2025/mef/forms/income/foreign/f2555.ts) | [foreign/f2555.ts](../../../2025/pdf/forms/income/foreign/f2555.ts) | [foreign/schedule1a_form2555_overtime](../../../2025/domains/income/foreign/schedule1a_form2555_overtime.test.ts) | [foreign/earned-income/](../../../e2e/income/foreign/earned-income/), [foreign/schedule1a_form2555_senior_2025](../../../e2e/income/foreign/schedule1a_form2555_senior_2025.test.ts) | [foreign/f2555.ts](../../../validation/rules/income/foreign/f2555.ts) | [foreign/form2555/](../../../../../docs/ty2025/domains/income/foreign/form2555/) |
| Foreign employer compensation (1040 line 1h) | [`fec`](foreign/fec/) | — | [foreign/foreign_employer_wages.ts](../../../2025/mef/forms/income/foreign/foreign_employer_wages.ts) | — | [wages/line1h_source.ts](../../../2025/domains/income/wages/line1h_source.ts) | — | — | [foreign/ty2025-fec-native-source.md](../../../../../docs/ty2025/domains/income/foreign/ty2025-fec-native-source.md) |
| 8621, PFIC or QEF Shareholder Return | [`f8621`](foreign/f8621/) | — (pending key `form8621`) | [foreign/f8621.ts](../../../2025/mef/forms/income/foreign/f8621.ts) (+ excess, MTM statements) | [foreign/f8621.ts](../../../2025/pdf/forms/income/foreign/f8621.ts) | [foreign/form8621/](../../../2025/domains/income/foreign/form8621/), [schedule1_form8621_source.ts](../../../2025/domains/income/foreign/schedule1_form8621_source.ts) | [foreign/form8621/](../../../e2e/income/foreign/form8621/) | [foreign/f8621.ts](../../../validation/rules/income/foreign/f8621.ts) | [foreign/form8621/](../../../../../docs/ty2025/domains/income/foreign/form8621/) |
| 8873, Extraterritorial Income Exclusion | [`f8873`](foreign/f8873/) (always throws) | — | — | — | — | — | [foreign/f8873.ts](../../../validation/rules/income/foreign/f8873.ts) | — |
| 8992, U.S. Shareholder Calculation of GILTI | — (source is `f5471` in General) | — | [foreign/f8992.ts](../../../2025/mef/forms/income/foreign/f8992.ts), [f8992_schedule_a.ts](../../../2025/mef/forms/income/foreign/f8992_schedule_a.ts) | [foreign/f8992.ts](../../../2025/pdf/forms/income/foreign/f8992.ts) | [foreign/form8992/](../../../2025/domains/income/foreign/form8992/) | — | [foreign/f8992.ts](../../../validation/rules/income/foreign/f8992.ts) | — |
| 4563, Exclusion of Income for American Samoa residents | — | — | — | — | — | — | [foreign/f4563.ts](../../../validation/rules/income/foreign/f4563.ts) | — |

## Flow

- **Two sinks per amount.** `f1040` and `schedule1`
  ([outputs/general/return-assembly](../../outputs/general/return-assembly/))
  have empty `outputNodes`; they only print. AGI is computed by
  `agi_aggregator` → `agi_final`
  ([aggregation/general/return-assembly](../../intermediate/aggregation/general/return-assembly/)).
  So an income node sends each amount twice, once to the print sink
  (`schedule1.line8b_gambling_winnings`, `f1040.line1a_wages`) and once to
  `agi_aggregator` under the same field name (`w2g`, `f1099c`,
  `personal_property_rental`, `form2555`). Missing either leaves the printed line
  and AGI out of step.
- **Interest and dividends.** `f1099int`, `f1099oid`, `f1099div`, `f8814`,
  `form8815` and the K-1 nodes route rows to `schedule_b`; `f1099b`/`f8949`
  send accrued market discount there too. `schedule_b` → `f1040`,
  `agi_aggregator`, `form8960` (Taxes).
- **Capital gains.** `f1099b`, `f8949`, `f7217`, `f8621` (MTM losses) and
  `form4797` → `form8949` → `schedule_d`. `form4797`, `form6252`, `form6781`,
  `form8824`, `f1099div` (box 2a), the K-1s and `f8814` feed `schedule_d`
  directly (`line_11_form2439` carries every Schedule D line 11 amount,
  including Form 4797 Part I, 6252, 6781 and 8824 gain). `schedule_d` → `f1040` line 7, `agi_aggregator`,
  `income_tax_calculation`, `rate_28_gain_worksheet`, `form8960`, `form8995`,
  `form6251`.
- **Active-rental 4797 sale (two passes).** When `form4797` sees an active
  rental sale it sends `pending_active_4797: true` to `schedule_d` and
  `pal_pending_active_4797` to `agi_aggregator`, plus the sale gains to
  `form8582`. `schedule_d` then emits only its `agi_aggregator` row plus
  `provisional_input` to `schedule_d_final`; `agi_aggregator` sends MAGI to
  `form8582`; `form8582` sends `capital_reduction` to `schedule_d_final` and the
  allowed amounts to `agi_final`; `schedule_d_final` reruns
  `schedule_d.compute` and reports capital gain to `agi_final`, not
  `agi_aggregator`.
- **Business.** `f1099nec`, `f1099k` (`for_routing`), `f1099m` (per-box
  `box*_routing`) and `f1099patr` (treatment `kind`) pick a destination and
  send `*_receipt_sources` / `patron_distribution_sources` keyed by
  `business_reference`; `schedule_c` reconciles them (one cash-basis business whose gross receipts
  include them) and does not add them as income. `auto_expense` →
  `schedule_c`/`schedule_e`/`schedule_f`; `depletion` → `schedule_c`/
  `schedule_e`; `f3115` → `schedule_c`; `f4835` → `schedule_e`, `form8995`. `schedule_c`
  and `schedule_f` → `schedule1`, `agi_aggregator`, `schedule_se`, `form8995`,
  `schedule1a`, `form461`, `form8582`. Passive amounts from `schedule_c`,
  `schedule_f`, `schedule_e`, `k1_partnership`, `k1_s_corp` and `form4797` go
  to `form8582`, which posts the allowed loss to `schedule1.line5_schedule_e`
  (`k1_trust` reaches only `form8582cr`).
- **K-1s.** `k1_partnership`/`k1_s_corp` send nonpassive Schedule E income to
  `schedule1.line5_schedule_e` and `agi_aggregator`; `k1_s_corp` sends basis
  data to `form7203`; Schedule E Part II rows for MeF/PDF are rebuilt from K-1
  pending by `2025/domains/income/rental-passthrough/schedule-e/schedule_e_k1_part2.ts`.
- **Retirement.** `f1099r` → `f1040` lines 4/5, `agi_aggregator`, `form8606`,
  `form5329` and `form4972Elections` (Taxes), `scheduleA`. Form 8915-F
  treatment rides on the 1099-R item (`form8915f_treatment`,
  `form8915f_repayment_amount`); `f8915f` only validates groups and
  `2025/index.ts` cross-checks them against `f1099r`. `ssa1099` sends net
  benefits (line 6a) to `f1040` and `agi_aggregator`, which computes taxable
  line 6b; `rrb1099r` (Tier 2) writes pension lines 5a/5b.
- **Substitutes.** With `reviewed_source`, `f4852` re-emits its rows into the
  `w2` and `f1099r` input nodes (`substitute_w2s`, `substitute_f1099rs`);
  without it, it writes Form 1040 lines directly.
- **Pending-only keys.** `f8621` and `f8814` emit a raw
  `{ nodeType: "form8621" | "form8814" }` row that no node handles; it exists so
  the MeF/PDF descriptors with that `pendingKey` can print the form.

### Cross-section effects

- Form 8621 (canonical here) also carries section 1291 tax and interest:
  `f8621` → `income_tax_calculation.form8621_tax` and `schedule2` lines
  17p/17q/17z (Taxes), and the Election B refigure
  `applyForm8621QefRefigure` runs from `2025/index.ts`.
- `f8814` → `income_tax_calculation`/`f1040` `form8814_tax`, `form8962`
  (dependent MAGI), `form6251`, `form8960`, `form4952`.
- `f1099m` → `schedule2` line 17h (409A); `f1099nec` → `schedule2` line 17k
  (golden parachute excise); both → `form8919` (Taxes).
- `w2` reaches Taxes (`schedule2`, `form8959`, `form4137`, `form8919`),
  Adjustments (`form8889`, `form8853`, `ira_deduction_worksheet`), Credits
  (`eitc`, `f8812`, `form2441`, `form8839`, `form8880`, `form8962`) and
  Deductions (`schedule1a`, `schedule_a`, `form8995`).
- `f3921` affects only AMT (`form6251`); `form2555` also feeds
  `income_tax_calculation` (foreign earned income tax worksheet) and `eitc`.
- K-1s also feed Credits (`f3800`, `form8582cr`, `form_1116`) and Deductions
  (`form4562`, `form4952`, `form8995`).

## Verify

- `bun run check:structure` after adding, moving or rerouting a node here
  (`form6198` is a baselined unreachable node).
- `bun test --timeout=1800000 ./forms/f1040/nodes/inputs/income/<group>/<node>`
- `bun run check:cases` after a schema change.
- `bun run bench --form f1040 --year 2025` when a computed line can change.

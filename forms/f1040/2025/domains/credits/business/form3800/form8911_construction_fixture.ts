import { bonusInventoryInput } from "./form8911_inventory_fixture.ts";
import { bonusCreditInput } from "./form8911_bonus_fixture.ts";
import {
  profitableBonusCases,
  profitableBonusInput,
} from "./form8911_profit_fixture.ts";

export function constructionCreditInput(cost = 10000, physicalWork = true) {
  const input = profitableBonusInput(profitableBonusCases[0]);
  const credit = Math.min(cost * 0.30, 100000);
  const property = input.f8911.properties[0];
  return {
    ...input,
    f8911: {
      properties: [{
        ...property,
        cost,
        construction_began: "2023-01-28",
        business_source: {
          ...property.business_source,
          rate_basis: "construction_before_2023_01_29" as const,
          construction_review: {
            project_reference: "charger-site-project",
            property_references: [property.property_reference],
            construction_start_date: "2023-01-28",
            start: physicalWork
              ? {
                method: "physical_work" as const,
                significant_work_description:
                  "Reviewed significant site installation work for the charging project",
                significant_not_preliminary_work_confirmed: true as const,
                source_references: ["site-installation-record-2023-01-28"],
              }
              : {
                method: "five_percent_safe_harbor" as const,
                project_total_cost: cost * 2,
                cost_paid_or_incurred_by_start: cost * 0.1,
                paid_or_incurred_tax_accounting_review_confirmed: true as const,
                source_references: [
                  "project-cost-ledger",
                  "dated-site-work-invoices",
                ],
              },
            continuity: {
              method: physicalWork
                ? "continuous_construction" as const
                : "continuous_efforts" as const,
              through_date: "2025-06-01",
              satisfied_confirmed: true as const,
              source_references: ["2023-2025-project-progress-review"],
            },
            reviewed_by: "Synthetic reviewer",
            reviewed_on: "2026-10-09",
          },
        },
      }],
    },
    schedule_c: [{
      ...input.schedule_c[0],
      line_1_gross_receipts: cost - credit + 10000,
      line_13_depreciation: cost - credit,
    }],
    form4562: {
      bonus_asset: {
        ...bonusCreditInput().form4562.bonus_asset,
        cost,
        credit_basis_reduction: credit,
      },
    },
  };
}

export function constructionInventoryInput(mixedRates = false) {
  const input = bonusInventoryInput(true);
  const review = constructionCreditInput().f8911.properties[0].business_source
    .construction_review;
  const assets = input.form4562.bonus_inventory.assets.map((a, i) => ({
    ...a,
    credit_basis_reduction: a.cost * (mixedRates && i === 1 ? 0.06 : 0.30),
  }));
  return {
    ...input,
    form4562: {
      bonus_inventory: { ...input.form4562.bonus_inventory, assets },
    },
    schedule_c: input.schedule_c.map((c, i) => ({
      ...c,
      line_1_gross_receipts: assets[i].cost - assets[i].credit_basis_reduction,
      line_13_depreciation: assets[i].cost - assets[i].credit_basis_reduction,
    })),
    f8911: {
      properties: input.f8911.properties.map((p, i) =>
        mixedRates && i === 1 ? p : ({
          ...p,
          construction_began: "2023-01-28",
          business_source: {
            ...p.business_source,
            rate_basis: "construction_before_2023_01_29" as const,
            construction_review: {
              ...review,
              property_references: mixedRates
                ? ["charger-1"]
                : ["charger-1", "charger-2"],
            },
          },
        })
      ),
    },
  };
}

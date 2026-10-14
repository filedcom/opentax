import {
  bonusCreditInput,
  bonusFilerFixture,
} from "./form8911_bonus_fixture.ts";
import { bonusInventoryInput } from "./form8911_inventory_fixture.ts";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";

// Independently worked examples using Schedule SE whole-dollar lines and the
// 2025 Form 1040 tax table, not expected values computed by production helpers.
export const profitableBonusCases = [
  {
    id: "one-profitable-business",
    costs: [10000],
    profits: [10000],
    allocations: [707],
    se: 1413,
    halfSe: 707,
    qbi: 1859,
    agi: 59293,
    incomeTax: 4763,
    credit: 600,
    tax: 5576,
    refund: 1424,
    owed: 0,
  },
  {
    id: "two-profitable-businesses",
    costs: [10000, 20000],
    profits: [10000, 20000],
    allocations: [706.33, 1412.67],
    se: 4238,
    halfSe: 2119,
    qbi: 5576,
    agi: 77881,
    incomeTax: 7361,
    credit: 1800,
    tax: 9799,
    refund: 0,
    owed: 2799,
  },
  {
    id: "profit-tax-limited-credit",
    costs: [100000, 200000],
    profits: [10000, 20000],
    allocations: [706.33, 1412.67],
    se: 4238,
    halfSe: 2119,
    qbi: 5576,
    agi: 77881,
    incomeTax: 7361,
    credit: 7361,
    tax: 4238,
    refund: 2762,
    owed: 0,
  },
  {
    id: "six-profitable-businesses",
    costs: [10000, 10000, 10000, 10000, 10000, 10000],
    profits: [10000, 10000, 10000, 10000, 10000, 10000],
    allocations: [706.5, 706.5, 706.5, 706.5, 706.5, 706.5],
    se: 8478,
    halfSe: 4239,
    qbi: 11153,
    agi: 105761,
    incomeTax: 12267,
    credit: 3600,
    tax: 17145,
    refund: 0,
    owed: 10145,
  },
] as const;

export function profitableBonusInput(
  scenario: typeof profitableBonusCases[number],
) {
  const source = scenario.costs.length === 1
    ? bonusCreditInput(scenario.costs[0])
    : bonusInventoryInput(true, [...scenario.costs]);
  return {
    ...source,
    general: {
      ...generalSchema.parse(bonusFilerFixture.inputs.general),
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    schedule_c: source.schedule_c.map((business, i) => ({
      ...business,
      line_c_business_name: `Equipment business ${i + 1}`,
      line_1_gross_receipts: business.line_13_depreciation +
        scenario.profits[i],
      qbi_no_other_adjustments_confirmed: true,
      ...(scenario.costs.length > 1
        ? {
          qbi_se_tax_allocation_review: {
            deduction_amount: scenario.allocations[i],
            allocation_method:
              "positive_profit_proportion_with_cent_residual" as const,
            reasonable_for_business_facts_confirmed: true,
            consistently_applied_and_books_agree_confirmed: true,
            all_businesses_included_confirmed: true,
            no_aggregation_confirmed: true,
            workpaper_reference: `${scenario.id}-SE-allocation-review`,
            reviewed_by: "Synthetic reviewer",
            reviewed_on: "2026-10-09",
          },
        }
        : {}),
    })),
  };
}

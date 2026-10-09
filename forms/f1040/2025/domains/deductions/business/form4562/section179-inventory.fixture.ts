import {
  currentYearInput,
  currentYearMultiInput,
} from "./current-year.fixture.ts";
import { section179ElectionSchema } from "../../../../../nodes/intermediate/forms/deductions/business/form4562/section179-inventory.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";

export const section179Cases = [
  {
    id: "partial-179-before-40-bonus",
    source: "early",
    allocations: [2000],
    credits: [480],
    deductions: [5910],
    bonuses: [3008],
    tax: 5696,
  },
  {
    id: "partial-179-before-full-bonus",
    source: "post",
    allocations: [2000],
    credits: [480],
    deductions: [9520],
    bonuses: [7520],
    tax: 5696,
  },
  {
    id: "two-business-summary",
    source: "two",
    allocations: [2000, 5000],
    credits: [480, 900],
    deductions: [6136, 19100],
    bonuses: [3008, 14100],
    tax: 10219,
  },
  {
    id: "three-elections-six-classes",
    source: "six",
    allocations: [1000, 2000, 3000, 0, 0, 0],
    credits: [0, 480, 0, 0, 0, 0],
    deductions: [31835],
    bonuses: [21408],
    tax: 5696,
  },
  {
    id: "179-construction-credit",
    source: "construction",
    allocations: [2000],
    credits: [2400],
    deductions: [4912],
    bonuses: [2240],
    tax: 3776,
  },
  {
    id: "fully-expensed-ordinary-asset",
    source: "full",
    allocations: [10000],
    credits: [0],
    deductions: [10000],
    bonuses: [0],
    tax: 6176,
  },
] as const;

export function section179InventoryInput(
  scenario: typeof section179Cases[number],
) {
  const source = scenario.source === "two"
    ? currentYearMultiInput("mixed-bonus")
    : scenario.source === "six"
    ? currentYearMultiInput("six-classes")
    : currentYearInput(false, scenario.source === "construction");
  const inventory = source.form4562.current_year_inventory;
  const sum = scenario.allocations.reduce<number>((n, v) => n + v, 0);
  const section179 = section179ElectionSchema.parse({
    proprietor_ssn: inventory.assets[0].proprietor_ssn,
    filing_status: FilingStatus.Single,
    taxpayer_active_business_income: 50000 +
      (scenario.source === "two" ? 30000 : 10000) + sum,
    active_business_income_review_reference:
      "W-2 and Schedule C after other depreciation before section 179",
    taxpayer_authorized_confirmed: true,
    original_return_election_confirmed: true,
    election_review_reference:
      `${scenario.id}-reviewed-election-and-allocation`,
    no_prior_year_carryover: true,
    prior_year_carryover_review_reference:
      "reviewed-no-prior-section179-carryover",
    no_pass_through_section179: true,
    no_special_dollar_limit_property: true,
    reviewed_by: "Synthetic reviewer",
    reviewed_on: "2026-10-09",
  });
  return {
    ...source,
    form4562: {
      current_year_inventory: {
        ...inventory,
        section179_election: section179,
        assets: inventory.assets.map((a, i) => ({
          ...a,
          ...(scenario.source === "full"
            ? {
              form8911_property_reference: undefined,
              asset_description: "Business computer server",
            }
            : {}),
          acquired_date: scenario.source === "post"
            ? "2025-02-01"
            : a.acquired_date,
          section179_deduction: scenario.allocations[i],
          credit_basis_reduction: scenario.credits[i],
          section179_eligibility: {
            eligible: scenario.source !== "six" || i < 3,
            eligibility_review_reference:
              `${scenario.id}-asset-${i}-section179-purchase-use-and-property-review`,
          },
        })),
      },
    },
    f8911: scenario.source === "full" ? undefined : {
      properties: source.f8911.properties.map((p) => ({
        ...p,
        business_source: {
          ...p.business_source,
          section179_deduction: scenario.allocations[
            inventory.assets.findIndex((a) =>
              a.form8911_property_reference === p.property_reference
            )
          ],
        },
      })),
    },
    schedule_c: source.schedule_c.map((c, i) => ({
      ...c,
      line_1_gross_receipts: c.line_1_gross_receipts - c.line_13_depreciation +
        scenario.deductions[i],
      line_13_depreciation: scenario.deductions[i],
    })),
  };
}

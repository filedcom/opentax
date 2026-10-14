import type { F8835Item } from "../../../../../nodes/inputs/credits/business/f8835/index.ts";

export function bondFields(
  index: number,
  proceeds: number,
): Partial<F8835Item> {
  return {
    tax_exempt_bond_proceeds: proceeds,
    aggregate_capital_additions: 100000,
    tax_exempt_bond_source: {
      facility_description: `Synthetic production facility ${index + 1}`,
      facility_address_line1: `${10 + index} Plant Road`,
      facility_latitude: (39123456 + index * 100000) / 1000000,
      facility_longitude: -75.123456,
      construction_began_on: "2023-06-01",
      construction_record_reference: `Synthetic construction ${index + 1}`,
      as_of: "2025-12-31",
      review_reference: `Synthetic cumulative financing review ${index + 1}`,
      complete_current_and_prior_year_financing_confirmed: true,
      complete_current_and_prior_year_capital_additions_confirmed: true,
      financing: [2023, 2024, 2025].map((year, i) => ({
        record_reference: `Synthetic bond expenditure ${index + 1}/${year}`,
        issue_reference: `Synthetic issue ${index + 1}`,
        issued_on: "2023-04-01",
        used_for_facility_on: `${year}-12-01`,
        proceeds_used: proceeds * [0.25, 0.25, 0.5][i],
        section103_interest_exempt_verified: true,
      })),
      capital_additions: [2023, 2024, 2025].map((year, i) => ({
        record_reference: `Synthetic capital addition ${index + 1}/${year}`,
        added_on: `${year}-12-01`,
        amount: [40000, 35000, 25000][i],
      })),
    },
  };
}

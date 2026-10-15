import type { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import type {
  businessActivity2026Schema,
  businessSources2026Schema,
  businessVehicle2026Schema,
} from "./business-source.ts";
export const payment = (ref: string, amount: number) => ({
  record_reference: ref,
  date: "2026-06-15",
  description: ref,
  amount,
});
export function business(
  ref = "consulting",
  owner = "123456789",
): z.infer<typeof businessActivity2026Schema> {
  return {
    business_reference: ref,
    owner_tin: owner,
    principal_business: "Consulting",
    business_code: "541990",
    business_address: {
      line1: "1 Main St",
      city: "Boston",
      state: "MA",
      zip: "02108",
    },
    kind: "sole_proprietor",
    accounting_method: "cash",
    materially_participated: true,
    new_business: false,
    information_return_obligation: {
      required: false,
      review_reference: `${ref}-1099`,
    },
    receipts: [{
      ...payment(`${ref}-receipts`, 10000),
      kind: "service_receipt",
    }],
    expenses: [],
    review: {
      record_reference: `${ref}-review`,
      domestic_individual_service_business: true,
      all_receipts_and_expenses_recorded: true,
      no_business_information_returns_except_linked_w2s: true,
      no_inventory_cogs_other_assets_home_office_or_dispositions: true,
      no_other_interest_or_section163j_limitation: true,
      all_investment_at_risk_no_prior_suspended_losses: true,
      no_special_se_exemption_gambling_clergy_or_notary: true,
      ordinary_necessary_current_expenses_no_personal_or_capital_costs: true,
      no_vehicle_costs_outside_vehicle_record: true,
      no_owner_benefits_retirement_health_or_employment_credits: true,
      meals_qualify_for_standard_50_percent_limit_no_entertainment: true,
      no_amt_differences_or_special_business_adjustments: true,
    },
  };
}
export function fixture(): z.infer<typeof businessSources2026Schema> {
  return {
    tax_year: 2026,
    record_reference: "business-inventory",
    filing_status: FilingStatus.Single,
    taxpayer_tin: "123456789",
    businesses: [business()],
    w2s: [],
    review: {
      record_reference: "inventory-review",
      complete_business_and_w2_inventory: true,
      no_other_se_income_farms_partnerships_or_church_wages: true,
      no_4137_8919_rrta_or_community_property_allocations: true,
      no_totalization_or_other_se_exemption: true,
      optional_se_methods_not_elected: true,
    },
  };
}
export function vehicle(): z.infer<typeof businessVehicle2026Schema> {
  return {
    vehicle_reference: "car-1",
    vin: "1TESTCAR000000001",
    description: "Owned sedan",
    in_service_date: "2025-08-23",
    odometer_start: 10000,
    odometer_end: 26508,
    available_for_personal_use: true,
    another_vehicle_available: true,
    mileage_log_reference: "log",
    trips: [
      {
        record_reference: "before",
        date: "2026-06-30",
        purpose: "business",
        description: "Client visit",
        miles: 648,
      },
      {
        record_reference: "commute",
        date: "2026-05-01",
        purpose: "commuting",
        description: "Commute",
        miles: 710,
      },
      {
        record_reference: "personal",
        date: "2026-12-31",
        purpose: "other",
        description: "Personal",
        miles: 15150,
      },
    ],
    business_parking_and_tolls: [],
    review: {
      record_reference: "car-review",
      owned_all_year_and_used_only_in_this_business: true,
      mileage_elected_in_first_business_year: true,
      no_accelerated_depreciation_section179_or_bonus: true,
      no_fleet_of_five_or_more: true,
      all_trips_recorded_and_no_commuting_in_business_miles: true,
      written_evidence: true,
    },
  };
}
export function wage(owner = "123456789", amount = 10000) {
  return {
    tax_year: 2026 as const,
    source_document_reference: `w2-${owner}`,
    employer_ein: "12-3456789",
    employer_name: "Employer",
    employee_ssn: owner,
    box1_wages: amount,
    box2_fed_withheld: 100,
    box3_ss_wages: amount,
    box4_ss_withheld: amount * .062,
    box5_medicare_wages: amount,
    box6_medicare_withheld: amount * .0145,
  };
}

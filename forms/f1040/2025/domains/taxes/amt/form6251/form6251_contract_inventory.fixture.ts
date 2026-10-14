import {
  amtLongTermContractWorkpaperSchema,
  itemSchema as businessSchema,
} from "../../../../../nodes/inputs/income/business/schedule_c/model.ts";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { w2ItemSchema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { itemSchema as mortgageSchema } from "../../../../../nodes/inputs/deductions/mortgage/f1098/index.ts";
import { FilingStatus, TS } from "../../../../../nodes/types.ts";

function paper(id: string, price: number, cost: number, estimate: number) {
  return amtLongTermContractWorkpaperSchema.parse({
    contract_reference: `${id}-contract`,
    signed_contract_reference: `${id}-signed-contract`,
    cost_records_reference: `${id}-cost-ledger`,
    cost_estimate_review_reference: `${id}-estimate-review`,
    fixed_contract_price: price,
    amt_allocable_costs_incurred_2025: cost,
    amt_estimated_total_allocable_costs: estimate,
    began_in_2025: true,
    uncompleted_at_2025_year_end: true,
    non_home_construction_contract_verified: true,
    regular_section_460_e_1_exception_verified: true,
    regular_receipts_and_costs_deferred_verified: true,
    amt_cost_allocation_reviewed: true,
  });
}
const papers = [
  paper("first", 1000000, 100000, 400000),
  paper("second", 600000, 80000, 300000),
  paper("third", 250000, 50000, 125000),
  paper("fourth", 240000, 40000, 96000),
  paper("fifth", 200000, 40000, 100000),
];
function business(
  id: string,
  contracts: typeof papers,
  owner = TS.T,
  legacy = false,
) {
  return businessSchema.parse({
    business_reference: id,
    line_a_principal_business: "Non-home construction contracting",
    line_b_business_code: "238990",
    line_c_business_name: id,
    proprietor_recipient: owner,
    line_f_accounting_method: "cash",
    line_g_material_participation: true,
    line_i_made_1099_payments: false,
    line_1_gross_receipts: 0,
    qbi_no_other_adjustments_confirmed: true,
    ...(legacy
      ? { amt_long_term_contract_workpaper: contracts[0] }
      : { amt_long_term_contract_workpapers: contracts }),
  });
}
function inputs(
  businesses: ReturnType<typeof business>[],
  joint = false,
  boat = false,
) {
  return {
    general: generalSchema.parse({
      filing_status: joint ? FilingStatus.MFJ : FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
      ...(joint
        ? {
          spouse_first_name: "Sam",
          spouse_last_name: "Taxpayer",
          spouse_ssn: "444-55-6666",
          spouse_dob: "1982-05-20",
        }
        : {}),
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    }),
    w2: [w2ItemSchema.parse({
      employee_ssn: "123456789",
      source_document_reference: "2025-primary-employer-issued-W2",
      box1_wages: 200000,
      box2_fed_withheld: 35000,
      box3_ss_wages: 176100,
      box4_ss_withheld: 10918.2,
      box5_medicare_wages: 200000,
      box6_medicare_withheld: 2900,
      employer_ein: "123456789",
      employer_name: "Test Employer",
      employer_address_line1: "10 Payroll Way",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
    })],
    schedule_c: businesses,
    ...(boat
      ? {
        f1098: [mortgageSchema.parse({
          box1_mortgage_interest: 30000,
          box1_current_year_deductible_interest: 30000,
          box1_deduction_workpaper_reference:
            "reviewed-2025-qualified-loan-deduction",
          lender_name: "Harbor Lender",
          recipient_tin: "123456789",
          source_document_reference: "2025-Harbor-issued-1098",
          amt_houseboat_second_home_review: {
            vessel_id: "HULL-2025-1",
            property_review_reference:
              "2025-ownership-and-vessel-facilities-review",
            publication936_deduction_workpaper_reference:
              "2025-acquisition-debt-and-limit-review",
            second_home_not_principal_residence_verified: true,
            sleeping_cooking_toilet_facilities_verified: true,
            personal_use_only_verified: true,
            secured_acquisition_debt_and_loan_limit_verified: true,
          },
        })],
      }
      : {}),
  };
}

export const contractInventoryCases = [
  {
    id: "legacy-one",
    inputs: inputs([
      business("Legacy Contracting", papers.slice(0, 1), TS.T, true),
    ]),
    adjustment: 150000,
    regularTax: 37067,
    totalTax: 68550,
  },
  {
    id: "legacy-two",
    inputs: inputs([
      business("Legacy First", papers.slice(0, 1), TS.T, true),
      business("Legacy Second", papers.slice(1, 2), TS.T, true),
    ]),
    adjustment: 230000,
    regularTax: 37067,
    totalTax: 90950,
  },
  {
    id: "one-business-three",
    inputs: inputs([business("Three Contracts", papers.slice(0, 3))]),
    adjustment: 280000,
    regularTax: 37067,
    totalTax: 104950,
  },
  {
    id: "three-businesses-five",
    inputs: inputs([
      business("First Construction", papers.slice(0, 2)),
      business("Second Construction", papers.slice(2, 4)),
      business("Third Construction", papers.slice(4)),
    ]),
    adjustment: 380000,
    regularTax: 37067,
    totalTax: 132950,
  },
  {
    id: "joint-spouse-three",
    inputs: inputs(
      [business("Spouse Construction", papers.slice(0, 3), TS.S)],
      true,
    ),
    adjustment: 280000,
    regularTax: 26898,
    totalTax: 91258,
  },
  {
    id: "joint-both-five",
    inputs: inputs([
      business("Primary Construction", papers.slice(0, 3)),
      business("Spouse Construction", papers.slice(3), TS.S),
    ], true),
    adjustment: 380000,
    regularTax: 26898,
    totalTax: 119258,
  },
  {
    id: "fractional-cost-ratios",
    inputs: inputs([
      business("Fractional Construction", [
        paper("fraction1", 1000001, 100003, 400007),
        paper("fraction2", 600001, 80001, 300007),
        paper("fraction3", 250003, 50003, 125011),
      ]),
    ]),
    adjustment: 279993,
    regularTax: 37067,
    totalTax: 104948,
  },
  {
    id: "contracts-houseboat",
    inputs: inputs(
      [business("Harbor Construction", papers.slice(0, 2))],
      false,
      true,
    ),
    adjustment: 230000,
    regularTax: 33647,
    totalTax: 90950,
  },
];

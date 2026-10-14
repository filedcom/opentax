import {
  EmployeeType,
  itemSchema,
  VehicleMethod,
} from "../../../../../nodes/inputs/adjustments/employment/f2106/index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";

// Independent TY2025 tax worksheet: Single = taxable * .24 - 7153;
// MFJ = taxable * .22 - 10172, in these income bands.
export const cases = [
  {
    name: "single-two-jobs",
    joint: false,
    owners: ["taxpayer", "taxpayer"],
    wages: [60000, 90000],
    sameEmployer: false,
    deduction: 3000,
    taxable: 131250,
    tax: 24347,
  },
  {
    name: "joint-spouse-job",
    joint: true,
    owners: ["spouse"],
    wages: [70000],
    sameEmployer: false,
    deduction: 1200,
    taxable: 117300,
    tax: 15634,
  },
  {
    name: "joint-both-jobs",
    joint: true,
    owners: ["taxpayer", "spouse"],
    wages: [80000, 70000],
    sameEmployer: false,
    deduction: 3000,
    taxable: 115500,
    tax: 15238,
  },
  {
    name: "joint-shared-employer",
    joint: true,
    owners: ["taxpayer", "spouse"],
    wages: [80000, 70000],
    sameEmployer: true,
    deduction: 3000,
    taxable: 115500,
    tax: 15238,
  },
  {
    name: "joint-four-jobs",
    joint: true,
    owners: ["taxpayer", "taxpayer", "spouse", "spouse"],
    wages: [40000, 30000, 50000, 30000],
    sameEmployer: false,
    deduction: 8400,
    taxable: 110100,
    tax: 14050,
  },
] as const;

export function fixture(c: typeof cases[number]) {
  const jobs = c.owners.map((owner, i) =>
    itemSchema.parse({
      job: {
        tax_year: 2025,
        owner,
        employee_name: owner === "taxpayer" ? "Casey Rivera" : "Jordan Rivera",
        employee_ssn: owner === "taxpayer" ? "123-45-6789" : "234-56-7890",
        occupation: "County hearing officer",
        employer_name: `Sample County ${c.sameEmployer ? 1 : i + 1}`,
        employer_ein: `12-${3456789 + (c.sameEmployer ? 0 : i)}`,
        employment_record_reference: `${c.name} appointment ${i}`,
      },
      qualification: {
        kind: EmployeeType.FEE_BASIS_OFFICIAL,
        state_or_local_government_employer: true,
        compensated_on_fee_basis: true,
        qualifying_service_reference: `${c.name} fee schedule ${i}`,
      },
      vehicle: { method: VehicleMethod.NONE },
      expenses: {
        line2_parking_tolls_local_transportation: 0,
        line3_overnight_travel_excluding_meals: 0,
        line4_other_business_expenses: 1200 + i * 600,
        line5_meals: 0,
        standard_50_percent_meal_limit_confirmed: true,
        expense_records_reference: `${c.name} expense ledger ${i}`,
        job_business_purpose: "Hearing preparation",
      },
      reimbursements: {
        line7_column_a_nonmeals: 0,
        line7_column_b_meals: 0,
        employer_reimbursement_record_reference:
          `${c.name} reimbursement ledger ${i}`,
        excluded_from_w2_box1_confirmed: true,
      },
    })
  );
  const wage = (ssn: string, amount: number, ein: string, name: string) => ({
    employer_ein: ein,
    employer_name: name,
    employee_ssn: ssn,
    employer_address_line1: "10 County Road",
    employer_address_city: "Austin",
    employer_address_state: "TX",
    employer_address_zip: "78701",
    box1_wages: amount,
    box2_fed_withheld: amount * .2,
    box3_ss_wages: amount,
    box4_ss_withheld: amount * .062,
    box5_medicare_wages: amount,
    box6_medicare_withheld: amount * .0145,
  });
  const wages = jobs.map((job, i) =>
    wage(
      job.job.employee_ssn,
      c.wages[i],
      job.job.employer_ein,
      job.job.employer_name,
    )
  );
  if (c.name === "joint-spouse-job") {
    wages.push(wage("123-45-6789", 80000, "98-7654321", "Other Employer"));
  }
  return {
    general: {
      filing_status: c.joint ? FilingStatus.MFJ : FilingStatus.Single,
      taxpayer_first_name: "Casey",
      taxpayer_last_name: "Rivera",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
      digital_assets: false,
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      ...(c.joint
        ? {
          spouse_first_name: "Jordan",
          spouse_last_name: "Rivera",
          spouse_ssn: "234-56-7890",
          spouse_dob: "1987-06-15",
        }
        : {}),
    },
    w2: wages,
    f2106: jobs,
  };
}

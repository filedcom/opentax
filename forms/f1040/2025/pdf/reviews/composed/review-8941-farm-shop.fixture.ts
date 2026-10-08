import { form8941MultiplePlanSource } from "./review-8941-multiple-plans.fixture.ts";
import { ownedFarmRecord } from "./review-schedule-se-farm-owner.fixture.ts";
import {
  calculateForm8941,
  inputSchema,
} from "../../../../nodes/inputs/f8941/index.ts";

/** Issued farm receipts, complete payroll and owned SHOP premiums. */
export function form8941FarmShopInputs(
  agriculture = 250000,
  customHire = 50000,
) {
  const original: any = form8941MultiplePlanSource("independent-mixed");
  const {
    schedule_c_business_reference: _scheduleC,
    other_schedule_c_employee_benefits: otherBenefits,
    ...business
  } = original;
  const source = inputSchema.parse({
    ...business,
    schedule_f_farm_id: "SHOP-Farm",
    other_schedule_f_employee_benefits: otherBenefits,
    cash_schedule_f_shop_employer_confirmed: true,
    farm_ownership_source_reference:
      "Synthetic owned Albany grain farm deed and management ledger",
    farming_activity_source_reference:
      "Synthetic grain operations and agricultural payment ledger",
    farm_issued_receipt_references: [
      "Synthetic issued farmer 1099G",
      "Synthetic issued farmer 1099NEC",
    ],
  });
  if (!("schedule_f_farm_id" in source)) {
    throw new Error("Expected SHOP farm source");
  }
  const lines = calculateForm8941(source);
  const farm = {
    ...ownedFarmRecord(0, "T"),
    farm_id: source.schedule_f_farm_id,
    line_d_ein: source.employment_ein,
    line4a_ag_program_payments: agriculture,
    line4b_ag_program_payments_taxable: agriculture,
    line8_other_income: customHire,
    line15_employee_benefits: source.other_schedule_f_employee_benefits +
      lines.line4,
    line22_labor_hired: source.employees.reduce(
      (n, e) => n + e.social_security_medicare_wages,
      0,
    ),
    shop_employee_w2_records: source.employees.map((e) => ({
      employee_reference: e.employee_reference,
      employee_ssn: e.employee_ssn,
      employer_ein: source.employment_ein,
      payroll_record_reference: e.enrollment_and_payroll_record_reference,
      social_security_medicare_wages: e.social_security_medicare_wages,
      hours_of_service: e.hours_of_service,
    })),
  };
  return {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Jane",
      taxpayer_last_name: "Soleproprietor",
      taxpayer_ssn: source.owner_ssn,
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Example Way",
      address_city: "Albany",
      address_state: "NY",
      address_zip: "12207",
      digital_assets: false,
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    f8941: source,
    schedule_f: { schedule_fs: [farm] },
    f1099g: [{
      payer_name: "Synthetic Agricultural Program Issuer",
      payer_tin: "345678901",
      recipient_tin: source.owner_ssn,
      account_number: "SHOP-FARM-AGRI",
      source_document_reference: source.farm_issued_receipt_references[0],
      farm_id: source.schedule_f_farm_id,
      box_7_agriculture: agriculture,
      box_7_payment_kind: "agricultural_program",
      box_7_review_reference:
        "Synthetic taxable owned farm program payment review",
    }],
    f1099nec: [{
      payer_name: "Synthetic Farm Custom Hire Customer",
      payer_tin: "234567891",
      recipient_ssn: source.owner_ssn,
      account_number: "SHOP-FARM-CUSTOM",
      source_document_reference: source.farm_issued_receipt_references[1],
      box1_nec: customHire,
      for_routing: "schedule_f",
      farm_id: source.schedule_f_farm_id,
    }],
  };
}

/** The same six issued farmer W-2 copies also support separately certified WOTC wages. */
export function form8941FarmShopWotcInputs(baseWotc: any) {
  const input: any = form8941FarmShopInputs();
  const farm = input.schedule_f.schedule_fs[0];
  const model = baseWotc.inputs.f5884.f5884s[0];
  const review = structuredClone(
    baseWotc.inputs.schedule_f.schedule_fs[0].qbi_wotc_filing_review,
  );
  const employees = input.f8941.employees;
  const workers = employees.map((employee: any, index: number) => ({
    ...structuredClone(model),
    employee_reference: employee.employee_reference,
    hours_worked: employee.hours_of_service,
    direct_employer_review: {
      employer_ein: input.f8941.employment_ein,
      proprietor_recipient: "T",
      proprietor_ssn: input.f8941.owner_ssn,
      business_reference: farm.farm_id,
      certification_employer_and_payroll_match_confirmed: true,
      source_review_reference: `Synthetic SHOP farm employer/payroll ${index}`,
    },
    certification: {
      ...structuredClone(model.certification),
      swa_certification_reference: `Synthetic SHOP farm SWA-${index}`,
    },
    wage_records: [{
      ...structuredClone(model.wage_records[0]),
      payroll_record_reference:
        employee.enrollment_and_payroll_record_reference,
      deduction_location: { kind: "schedule_f", farm_id: farm.farm_id },
      service_period_start_on: "2025-01-15",
      service_period_end_on: "2025-12-31",
      paid_or_incurred_on: "2025-12-31",
      qualified_wages: employee.social_security_medicare_wages,
    }],
  }));
  review.owner_ssn = input.f8941.owner_ssn;
  review.farm_ownership_source_reference =
    input.f8941.farm_ownership_source_reference;
  review.farming_activity_source_reference =
    input.f8941.farming_activity_source_reference;
  review.employee_w2_records = workers.map((worker: any, index: number) => {
    const employee = employees[index];
    return {
      ...structuredClone(
        baseWotc.inputs.schedule_f.schedule_fs[0].qbi_wotc_filing_review
          .employee_w2_records[0],
      ),
      employee_reference: employee.employee_reference,
      employee_ssn: employee.employee_ssn,
      employer_ein: input.f8941.employment_ein,
      swa_certification_reference:
        worker.certification.swa_certification_reference,
      payroll_record_references: [
        employee.enrollment_and_payroll_record_reference,
      ],
      source_document_reference: `Synthetic SHOP farm issued W2-${index}`,
      box1_wages: employee.social_security_medicare_wages,
      box3_social_security_wages: employee.social_security_medicare_wages,
      box5_wages: employee.social_security_medicare_wages,
      agricultural_labor_duties_source_reference:
        `Synthetic SHOP grain duty/time ${index}`,
      ssa_filing_record_reference: `Synthetic SHOP farm SSA-${index}`,
    };
  });
  farm.qbi_wotc_filing_review = review;
  farm.qbi_unadjusted_basis = 0;
  farm.qbi_w2_wages = 110000 - 14400;
  input.f5884 = { subject_to_passive_activity_limit: false, f5884s: workers };
  return input;
}

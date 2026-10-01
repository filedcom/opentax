import { inputSchema } from "./index.ts";

const sourceWithoutEvidence = {
  source_type: "direct_schedule_c",
  schedule_c_business_reference: "boise-design-2025",
  proprietor_ssn: "123456789",
  employer_ein: "825555123",
  written_policy_reference: "2025-employee-family-leave-policy",
  policy_adopted_date: "2024-12-01",
  policy_effective_date: "2025-01-01",
  full_time_annual_leave_weeks: 2,
  full_time_usual_weekly_hours: 40,
  all_qualifying_employee_classes_covered_confirmed: true,
  policy_leave_specifically_designated_for_fmla_confirmed: true,
  noninterference_language_and_compliance_confirmed: true,
  no_pass_through_credit_confirmed: true,
  no_controlled_group_or_common_control_confirmed: true,
  schedule_c_wage_ledger_reference: "2025-boise-design-payroll",
  other_schedule_c_wages: 44_400,
  employees: [{
    employee_name: "A Example",
    employee_ssn: "123450001",
    payroll_ledger_reference: "2025-leave-pay-a",
    prior_2024_compensation_record_reference: "2024-compensation-a",
    prior_2024_compensation: 80_000,
    at_least_one_year_employed_on_leave_start_confirmed: true,
    qualifying_leave_purpose: "birth_or_child_care",
    leave_start_date: "2025-04-01",
    leave_end_date: "2025-04-14",
    normal_hourly_wage: 40,
    usual_weekly_hours: 40,
    policy_annual_leave_weeks_for_employee: 2,
    leave_hours: 80,
    leave_weeks: 2,
    policy_wage_replacement_rate: 0.75,
    employer_paid_qualifying_leave_wages: 2_400,
    no_state_or_local_required_or_paid_wages_included_confirmed: true,
    no_other_general_business_credit_wage_overlap_confirmed: true,
    no_other_leave_purpose_wages_included_confirmed: true,
  }, {
    employee_name: "B Example",
    employee_ssn: "123450002",
    payroll_ledger_reference: "2025-leave-pay-b",
    prior_2024_compensation_record_reference: "2024-compensation-b",
    prior_2024_compensation: 72_000,
    at_least_one_year_employed_on_leave_start_confirmed: true,
    qualifying_leave_purpose: "own_serious_health_condition",
    leave_start_date: "2025-06-01",
    leave_end_date: "2025-06-14",
    normal_hourly_wage: 40,
    usual_weekly_hours: 40,
    policy_annual_leave_weeks_for_employee: 2,
    leave_hours: 80,
    leave_weeks: 2,
    policy_wage_replacement_rate: 1,
    employer_paid_qualifying_leave_wages: 3_200,
    no_state_or_local_required_or_paid_wages_included_confirmed: true,
    no_other_general_business_credit_wage_overlap_confirmed: true,
    no_other_leave_purpose_wages_included_confirmed: true,
  }],
};

const documentBytes = (reference: string) =>
  new TextEncoder().encode(
    `Synthetic reviewed Form 8994 document: ${reference}`,
  );
const documentSha256 = async (reference: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", documentBytes(reference)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
const document = async (reference: string) => ({
  document_reference: reference,
  attachment_file_name: `${reference}.pdf`,
  sha256: await documentSha256(reference),
});

/** Synthetic bytes match these hashes; public export requires validated PDFs. */
export const form8994EvidenceFixtureDocuments = [
  sourceWithoutEvidence.written_policy_reference,
  sourceWithoutEvidence.schedule_c_wage_ledger_reference,
  ...sourceWithoutEvidence.employees.flatMap((employee) => [
    employee.payroll_ledger_reference,
    employee.prior_2024_compensation_record_reference,
  ]),
].map((reference) => ({
  fileName: `${reference}.pdf`,
  bytes: documentBytes(reference),
}));
const paidWages = sourceWithoutEvidence.employees.reduce(
  (sum, employee) => sum + employee.employer_paid_qualifying_leave_wages,
  0,
);
export const form8994DirectEmployer = inputSchema.parse({
  ...sourceWithoutEvidence,
  reviewed_evidence: {
    written_policy: {
      ...await document(sourceWithoutEvidence.written_policy_reference),
      employer_ein: sourceWithoutEvidence.employer_ein,
      policy_adopted_date: sourceWithoutEvidence.policy_adopted_date,
      policy_effective_date: sourceWithoutEvidence.policy_effective_date,
      full_time_annual_leave_weeks:
        sourceWithoutEvidence.full_time_annual_leave_weeks,
      full_time_usual_weekly_hours:
        sourceWithoutEvidence.full_time_usual_weekly_hours,
      all_qualifying_employee_classes_covered_confirmed: true,
      policy_leave_specifically_designated_for_fmla_confirmed: true,
      noninterference_language_and_compliance_confirmed: true,
      employee_terms: sourceWithoutEvidence.employees.map((employee) => ({
        employee_ssn: employee.employee_ssn,
        policy_annual_leave_weeks_for_employee:
          employee.policy_annual_leave_weeks_for_employee,
        policy_wage_replacement_rate: employee.policy_wage_replacement_rate,
      })),
    },
    schedule_c_wage_ledger: {
      ...await document(sourceWithoutEvidence.schedule_c_wage_ledger_reference),
      employer_ein: sourceWithoutEvidence.employer_ein,
      schedule_c_business_reference:
        sourceWithoutEvidence.schedule_c_business_reference,
      other_schedule_c_wages: sourceWithoutEvidence.other_schedule_c_wages,
      employer_paid_qualifying_leave_wages: paidWages,
      gross_schedule_c_wages: sourceWithoutEvidence.other_schedule_c_wages +
        paidWages,
    },
    employee_records: await Promise.all(
      sourceWithoutEvidence.employees.map(async (employee) => ({
        leave_payroll: {
          ...await document(employee.payroll_ledger_reference),
          employer_ein: sourceWithoutEvidence.employer_ein,
          employee_name: employee.employee_name,
          employee_ssn: employee.employee_ssn,
          leave_start_date: employee.leave_start_date,
          leave_end_date: employee.leave_end_date,
          normal_hourly_wage: employee.normal_hourly_wage,
          usual_weekly_hours: employee.usual_weekly_hours,
          leave_hours: employee.leave_hours,
          leave_weeks: employee.leave_weeks,
          policy_wage_replacement_rate: employee.policy_wage_replacement_rate,
          employer_paid_qualifying_leave_wages:
            employee.employer_paid_qualifying_leave_wages,
        },
        prior_2024_compensation: {
          ...await document(employee.prior_2024_compensation_record_reference),
          employer_ein: sourceWithoutEvidence.employer_ein,
          employee_ssn: employee.employee_ssn,
          compensation_amount: employee.prior_2024_compensation,
        },
      })),
    ),
  },
});

export const form8994MatchedPending = {
  f8994: form8994DirectEmployer,
  f3800: {
    f8994_direct_employer_credit: {
      credit_amount: 1_250,
      schedule_c_business_reference: "boise-design-2025",
      schedule_c_wage_ledger_reference: "2025-boise-design-payroll",
      subject_to_passive_activity_limit: false,
    },
    form8994_applied_credit: 1_250,
  },
  f1040: { taxpayer_ssn: "123-45-6789" },
  schedule_c: {
    schedule_cs: [{
      line_a_principal_business: "Design",
      line_b_business_code: "541400",
      line_c_business_name: "Boise Design",
      business_reference: "boise-design-2025",
      proprietor_recipient: "T",
      line_d_ein: "825555123",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_1_gross_receipts: 100_000,
      line_26_wages: 50_000,
      line_26_other_employment_credits: 1_250,
    }],
  },
};

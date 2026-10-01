import { z } from "zod";

const reference = z.string().trim().min(1);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const money = z.number().finite().nonnegative().refine((amount) =>
  Number.isSafeInteger(Math.round(amount * 100)) &&
  Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001
);
const document = z.object({
  document_reference: reference,
  attachment_file_name: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*\.pdf$/),
  sha256,
}).strict();

/** Reviewed written policy, employer wage ledger and employee payroll copies. */
export const form8994EvidenceSchema = z.object({
  written_policy: document.extend({
    employer_ein: z.string().regex(/^\d{9}$/),
    policy_adopted_date: reference,
    policy_effective_date: reference,
    full_time_annual_leave_weeks: z.number().finite().positive(),
    full_time_usual_weekly_hours: z.number().finite().positive(),
    all_qualifying_employee_classes_covered_confirmed: z.literal(true),
    policy_leave_specifically_designated_for_fmla_confirmed: z.literal(true),
    noninterference_language_and_compliance_confirmed: z.literal(true),
    employee_terms: z.array(
      z.object({
        employee_ssn: z.string().regex(/^\d{9}$/),
        policy_annual_leave_weeks_for_employee: z.number().finite().positive(),
        policy_wage_replacement_rate: z.number().finite().min(0.5).max(1),
      }).strict(),
    ).min(1),
  }).strict(),
  schedule_c_wage_ledger: document.extend({
    employer_ein: z.string().regex(/^\d{9}$/),
    schedule_c_business_reference: reference,
    other_schedule_c_wages: money,
    employer_paid_qualifying_leave_wages: money,
    gross_schedule_c_wages: money,
  }).strict(),
  employee_records: z.array(
    z.object({
      leave_payroll: document.extend({
        employer_ein: z.string().regex(/^\d{9}$/),
        employee_name: reference,
        employee_ssn: z.string().regex(/^\d{9}$/),
        leave_start_date: reference,
        leave_end_date: reference,
        normal_hourly_wage: money,
        usual_weekly_hours: z.number().finite().positive(),
        leave_hours: z.number().finite().positive(),
        leave_weeks: z.number().finite().positive(),
        policy_wage_replacement_rate: z.number().finite().min(0.5).max(1),
        employer_paid_qualifying_leave_wages: money,
      }).strict(),
      prior_2024_compensation: document.extend({
        employer_ein: z.string().regex(/^\d{9}$/),
        employee_ssn: z.string().regex(/^\d{9}$/),
        compensation_amount: money,
      }).strict(),
    }).strict(),
  ).min(1),
}).strict();

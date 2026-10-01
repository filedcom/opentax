import { inputSchema } from "./index.ts";
import { form8994EvidenceSchema } from "./evidence_schema.ts";
export { form8994EvidenceSchema } from "./evidence_schema.ts";

/** A direct Form 8994 source or its Form 3800 allocation needs evidence bytes. */
export function hasForm8994Claim(
  pending: { readonly f8994?: unknown; readonly f3800?: unknown },
): boolean {
  const form3800 = pending.f3800;
  return pending.f8994 !== undefined ||
    (form3800 !== null && typeof form3800 === "object" &&
      ("f8994_direct_employer_credit" in form3800 ||
        "form8994_applied_credit" in form3800));
}

async function hash(bytes: Uint8Array): Promise<string> {
  if (bytes.byteLength === 0) {
    throw new Error("Form 8994 evidence document is empty");
  }
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** Verify reviewed facts and hashes against one direct Schedule C source. */
export async function reconcileForm8994EvidenceBytes(
  rawSource: unknown,
  validatedAttachments: readonly {
    readonly fileName: string;
    readonly bytes: Uint8Array;
  }[],
) {
  const source = inputSchema.parse(rawSource);
  const evidence = form8994EvidenceSchema.parse(source.reviewed_evidence);
  const policy = evidence.written_policy;
  const ledger = evidence.schedule_c_wage_ledger;
  const paidWages = source.employees.reduce(
    (sum, employee) => sum + employee.employer_paid_qualifying_leave_wages,
    0,
  );
  if (
    policy.document_reference !== source.written_policy_reference ||
    policy.employer_ein !== source.employer_ein ||
    policy.policy_adopted_date !== source.policy_adopted_date ||
    policy.policy_effective_date !== source.policy_effective_date ||
    policy.full_time_annual_leave_weeks !==
      source.full_time_annual_leave_weeks ||
    policy.full_time_usual_weekly_hours !==
      source.full_time_usual_weekly_hours ||
    policy.all_qualifying_employee_classes_covered_confirmed !==
      source.all_qualifying_employee_classes_covered_confirmed ||
    policy.policy_leave_specifically_designated_for_fmla_confirmed !==
      source.policy_leave_specifically_designated_for_fmla_confirmed ||
    policy.noninterference_language_and_compliance_confirmed !==
      source.noninterference_language_and_compliance_confirmed ||
    ledger.document_reference !== source.schedule_c_wage_ledger_reference ||
    ledger.employer_ein !== source.employer_ein ||
    ledger.schedule_c_business_reference !==
      source.schedule_c_business_reference ||
    Math.round(ledger.other_schedule_c_wages * 100) !==
      Math.round(source.other_schedule_c_wages * 100) ||
    Math.round(ledger.employer_paid_qualifying_leave_wages * 100) !==
      Math.round(paidWages * 100) ||
    Math.round(ledger.gross_schedule_c_wages * 100) !==
      Math.round((source.other_schedule_c_wages + paidWages) * 100)
  ) {
    throw new Error(
      "Form 8994 policy or wage ledger differs from the direct employer source",
    );
  }
  if (
    policy.employee_terms.length !== source.employees.length ||
    evidence.employee_records.length !== source.employees.length
  ) {
    throw new Error(
      "Form 8994 needs one policy term and payroll pair per employee",
    );
  }
  for (const employee of source.employees) {
    const terms = policy.employee_terms.filter((row) =>
      row.employee_ssn === employee.employee_ssn
    );
    const records = evidence.employee_records.filter((row) =>
      row.leave_payroll.employee_ssn === employee.employee_ssn &&
      row.prior_2024_compensation.employee_ssn === employee.employee_ssn
    );
    if (terms.length !== 1 || records.length !== 1) {
      throw new Error("Form 8994 employee SSN lacks one policy/payroll record");
    }
    const term = terms[0];
    const payroll = records[0].leave_payroll;
    const prior = records[0].prior_2024_compensation;
    if (
      term.policy_annual_leave_weeks_for_employee !==
        employee.policy_annual_leave_weeks_for_employee ||
      term.policy_wage_replacement_rate !==
        employee.policy_wage_replacement_rate ||
      payroll.document_reference !== employee.payroll_ledger_reference ||
      prior.document_reference !==
        employee.prior_2024_compensation_record_reference ||
      payroll.employer_ein !== source.employer_ein ||
      prior.employer_ein !== source.employer_ein ||
      payroll.employee_name !== employee.employee_name ||
      payroll.leave_start_date !== employee.leave_start_date ||
      payroll.leave_end_date !== employee.leave_end_date ||
      payroll.normal_hourly_wage !== employee.normal_hourly_wage ||
      payroll.usual_weekly_hours !== employee.usual_weekly_hours ||
      payroll.leave_hours !== employee.leave_hours ||
      payroll.leave_weeks !== employee.leave_weeks ||
      payroll.policy_wage_replacement_rate !==
        employee.policy_wage_replacement_rate ||
      Math.round(payroll.employer_paid_qualifying_leave_wages * 100) !==
        Math.round(employee.employer_paid_qualifying_leave_wages * 100) ||
      Math.round(prior.compensation_amount * 100) !==
        Math.round(employee.prior_2024_compensation * 100)
    ) {
      throw new Error(
        "Form 8994 employee policy, leave payroll or prior compensation differs from source",
      );
    }
  }
  const reviewedDocuments = [
    policy,
    ledger,
    ...evidence.employee_records.flatMap((
      row,
    ) => [row.leave_payroll, row.prior_2024_compensation]),
  ];
  const references = reviewedDocuments.map((row) => row.document_reference);
  const fileNames = reviewedDocuments.map((row) => row.attachment_file_name);
  const digests = reviewedDocuments.map((row) => row.sha256);
  if (
    new Set(references).size !== references.length ||
    new Set(fileNames).size !== fileNames.length ||
    new Set(digests).size !== digests.length ||
    new Set(validatedAttachments.map((row) => row.fileName)).size !==
      validatedAttachments.length
  ) {
    throw new Error(
      "Form 8994 evidence documents need distinct references and bytes",
    );
  }
  for (const reviewed of reviewedDocuments) {
    const uploaded = validatedAttachments.find((row) =>
      row.fileName === reviewed.attachment_file_name
    );
    if (!uploaded || await hash(uploaded.bytes) !== reviewed.sha256) {
      throw new Error(
        "Form 8994 uploaded policy or payroll bytes differ from reviewed digest",
      );
    }
  }
  return { source, evidence };
}

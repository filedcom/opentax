import { assertEquals, assertRejects } from "@std/assert";
import { form8994DirectEmployer } from "./fixture.ts";
import { reconcileForm8994EvidenceBytes } from "./evidence_bytes.ts";

const source = form8994DirectEmployer;
const policyReference = source.written_policy_reference;
const ledgerReference = source.schedule_c_wage_ledger_reference;
const references = [
  policyReference,
  ledgerReference,
  ...source.employees.flatMap((employee) => [
    employee.payroll_ledger_reference,
    employee.prior_2024_compensation_record_reference,
  ]),
];
const uploadedDocuments = references.map((document_reference) => ({
  document_reference,
  bytes: new TextEncoder().encode(
    `Synthetic reviewed Form 8994 document: ${document_reference}`,
  ),
}));
async function sha(bytes: Uint8Array): Promise<string> {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}
const digests = Object.fromEntries(
  await Promise.all(
    uploadedDocuments.map(async (row) =>
      [row.document_reference, await sha(row.bytes)] as const
    ),
  ),
);
const evidence = {
  written_policy: {
    document_reference: policyReference,
    sha256: digests[policyReference],
    employer_ein: source.employer_ein,
    policy_adopted_date: source.policy_adopted_date,
    policy_effective_date: source.policy_effective_date,
    full_time_annual_leave_weeks: source.full_time_annual_leave_weeks,
    full_time_usual_weekly_hours: source.full_time_usual_weekly_hours,
    all_qualifying_employee_classes_covered_confirmed: true,
    policy_leave_specifically_designated_for_fmla_confirmed: true,
    noninterference_language_and_compliance_confirmed: true,
    employee_terms: source.employees.map((employee) => ({
      employee_ssn: employee.employee_ssn,
      policy_annual_leave_weeks_for_employee:
        employee.policy_annual_leave_weeks_for_employee,
      policy_wage_replacement_rate: employee.policy_wage_replacement_rate,
    })),
  },
  schedule_c_wage_ledger: {
    document_reference: ledgerReference,
    sha256: digests[ledgerReference],
    employer_ein: source.employer_ein,
    schedule_c_business_reference: source.schedule_c_business_reference,
    other_schedule_c_wages: source.other_schedule_c_wages,
    employer_paid_qualifying_leave_wages: source.employees.reduce(
      (sum, employee) => sum + employee.employer_paid_qualifying_leave_wages,
      0,
    ),
    gross_schedule_c_wages: source.other_schedule_c_wages +
      source.employees.reduce(
        (sum, employee) => sum + employee.employer_paid_qualifying_leave_wages,
        0,
      ),
  },
  employee_records: source.employees.map((employee) => ({
    leave_payroll: {
      document_reference: employee.payroll_ledger_reference,
      sha256: digests[employee.payroll_ledger_reference],
      employer_ein: source.employer_ein,
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
      document_reference: employee.prior_2024_compensation_record_reference,
      sha256: digests[employee.prior_2024_compensation_record_reference],
      employer_ein: source.employer_ein,
      employee_ssn: employee.employee_ssn,
      compensation_amount: employee.prior_2024_compensation,
    },
  })),
};

Deno.test("Form 8994 evidence binds policy, gross wage ledger and each employee's leave and prior compensation bytes", async () => {
  const reviewed = await reconcileForm8994EvidenceBytes(
    source,
    evidence,
    uploadedDocuments,
  );
  assertEquals(reviewed.source.employees.length, 2);
  assertEquals(reviewed.evidence.employee_records.length, 2);
});

Deno.test("Form 8994 evidence rejects changed policy, employee, payroll and uploaded bytes", async () => {
  const first = evidence.employee_records[0];
  for (
    const changed of [
      {
        ...evidence,
        written_policy: {
          ...evidence.written_policy,
          employer_ein: "999999999",
        },
      },
      {
        ...evidence,
        written_policy: {
          ...evidence.written_policy,
          employee_terms: [{
            ...evidence.written_policy.employee_terms[0],
            policy_wage_replacement_rate: 0.8,
          }, evidence.written_policy.employee_terms[1]],
        },
      },
      {
        ...evidence,
        employee_records: [{
          ...first,
          leave_payroll: { ...first.leave_payroll, employee_ssn: "999999999" },
        }, evidence.employee_records[1]],
      },
      {
        ...evidence,
        employee_records: [{
          ...first,
          leave_payroll: {
            ...first.leave_payroll,
            leave_start_date: "2025-04-02",
          },
        }, evidence.employee_records[1]],
      },
      {
        ...evidence,
        employee_records: [{
          ...first,
          leave_payroll: { ...first.leave_payroll, leave_hours: 40 },
        }, evidence.employee_records[1]],
      },
      {
        ...evidence,
        employee_records: [{
          ...first,
          leave_payroll: {
            ...first.leave_payroll,
            employer_paid_qualifying_leave_wages: 2_300,
          },
        }, evidence.employee_records[1]],
      },
      {
        ...evidence,
        employee_records: [{
          ...first,
          prior_2024_compensation: {
            ...first.prior_2024_compensation,
            compensation_amount: 90_000,
          },
        }, evidence.employee_records[1]],
      },
      {
        ...evidence,
        schedule_c_wage_ledger: {
          ...evidence.schedule_c_wage_ledger,
          gross_schedule_c_wages: 49_999,
        },
      },
    ]
  ) {
    await assertRejects(
      () => reconcileForm8994EvidenceBytes(source, changed, uploadedDocuments),
      Error,
    );
  }
  await assertRejects(
    () =>
      reconcileForm8994EvidenceBytes(
        source,
        evidence,
        uploadedDocuments.map((row) =>
          row.document_reference === policyReference
            ? {
              ...row,
              bytes: new TextEncoder().encode("changed policy bytes"),
            }
            : row
        ),
      ),
    Error,
    "bytes differ",
  );
  await assertRejects(
    () =>
      reconcileForm8994EvidenceBytes(
        source,
        evidence,
        uploadedDocuments.slice(1),
      ),
    Error,
  );
  await assertRejects(
    () =>
      reconcileForm8994EvidenceBytes(source, evidence, [
        ...uploadedDocuments,
        uploadedDocuments[0],
      ]),
    Error,
  );
});

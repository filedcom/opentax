import { assertEquals, assertRejects } from "@std/assert";
import {
  form8994DirectEmployer,
  form8994EvidenceFixtureDocuments,
} from "./fixture.ts";
import { reconcileForm8994EvidenceBytes } from "./evidence_bytes.ts";

const source = form8994DirectEmployer;
const evidence = source.reviewed_evidence;
const attachments = form8994EvidenceFixtureDocuments;

Deno.test("Form 8994 source carries one exact reviewed policy and payroll byte contract", async () => {
  const reviewed = await reconcileForm8994EvidenceBytes(source, attachments);
  assertEquals(reviewed.source.employees.length, 2);
  assertEquals(reviewed.evidence.employee_records.length, 2);
  await reconcileForm8994EvidenceBytes(source, [
    ...attachments,
    {
      fileName: "unrelated-form.pdf",
      bytes: new TextEncoder().encode("another form"),
    },
  ]);
});

Deno.test("Form 8994 evidence rejects policy, employee, wage and source tampering", async () => {
  const first = evidence.employee_records[0];
  for (
    const changedEvidence of [
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
      () =>
        reconcileForm8994EvidenceBytes({
          ...source,
          reviewed_evidence: changedEvidence,
        }, attachments),
      Error,
    );
  }
});

Deno.test("Form 8994 export evidence rejects changed, missing or duplicated validated attachments", async () => {
  await assertRejects(
    () =>
      reconcileForm8994EvidenceBytes(
        source,
        attachments.map((row) =>
          row.fileName === evidence.written_policy.attachment_file_name
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
    () => reconcileForm8994EvidenceBytes(source, attachments.slice(1)),
    Error,
  );
  await assertRejects(
    () =>
      reconcileForm8994EvidenceBytes(source, [...attachments, attachments[0]]),
    Error,
  );
  await assertRejects(() =>
    reconcileForm8994EvidenceBytes({
      ...source,
      reviewed_evidence: {
        ...evidence,
        written_policy: {
          ...evidence.written_policy,
          attachment_file_name:
            evidence.schedule_c_wage_ledger.attachment_file_name,
        },
      },
    }, attachments), Error);
});

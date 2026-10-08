import { z } from "zod";
const reference = z.string().trim().min(1);
const ssn = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const ein = z.string().regex(/^\d{2}-?\d{7}$/);
const date = z.string().date().refine((v) => v.startsWith("2025-"));
export const requiredServiceScholarshipSchema = z.object({
  kind: z.literal("scholarship_for_required_services"),
  tax_year: z.literal(2025),
  student_ssn: ssn,
  source_document_reference: reference,
  taxable_amount: z.number().int().positive(),
  payer_name: reference,
  payer_ein: ein,
  scholarship_terms_record_reference: reference,
  section117c_exception_review: z.object({
    source_document_reference: reference,
    national_health_service_corps_program: z.literal(false),
    armed_forces_health_professions_program: z.literal(false),
    comprehensive_work_college_program: z.literal(false),
  }).strict(),
  payment_sources: z.array(
    z.object({
      source_document_reference: reference,
      grant_source_reference: reference,
      student_ssn: ssn,
      payer_ein: ein,
      payment_date: date,
      amount: z.number().int().positive(),
    }).strict(),
  ).min(1),
  required_service_sources: z.array(
    z.object({
      source_document_reference: reference,
      grant_source_reference: reference,
      student_ssn: ssn,
      payer_ein: ein,
      service_kind: z.enum(["teaching", "research", "other"]),
      required_as_condition_of_award: z.literal(true),
      service_condition_record_reference: reference,
      performance_record_reference: reference,
      performed_start_date: date,
      performed_end_date: date,
      performed_hours: z.number().positive(),
      payment_source_references: z.array(reference).min(1),
    }).strict(),
  ).min(1),
  reporting: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("w2_box1"),
      w2_source_document_reference: reference,
      w2_box1_wages: z.number().int().positive(),
      payroll_allocation_record_reference: reference,
    }).strict(),
    z.object({
      kind: z.literal("schedule1_line8r"),
      amount_reported_in_w2_box1: z.literal(0),
      reporting_review_record_reference: reference,
    }).strict(),
  ]),
}).strict();
export type RequiredServiceScholarship = z.infer<
  typeof requiredServiceScholarshipSchema
>;
const tin = (v: string) => v.replaceAll("-", "");
export function requiredServiceScholarshipAmount(
  row: RequiredServiceScholarship,
): number {
  const records = new Set([row.source_document_reference]);
  const distinct = (ref: string) => {
    if (records.has(ref)) {
      throw new Error(
        "Required-service scholarship needs distinct grant, disbursement and performed-service records",
      );
    }
    records.add(ref);
  };
  const identity = (
    record: {
      student_ssn: string;
      payer_ein: string;
      grant_source_reference: string;
    },
  ) => {
    if (
      tin(record.student_ssn) !== tin(row.student_ssn) ||
      tin(record.payer_ein) !== tin(row.payer_ein) ||
      record.grant_source_reference !== row.source_document_reference
    ) {
      throw new Error(
        "Required-service scholarship payments and services must join the student, payer and actual grant",
      );
    }
  };
  const payments = new Map(
    row.payment_sources.map((r) => [r.source_document_reference, r]),
  );
  let paid = 0;
  for (const payment of row.payment_sources) {
    distinct(payment.source_document_reference);
    identity(payment);
    paid += payment.amount;
  }
  const assigned = new Set<string>();
  for (const service of row.required_service_sources) {
    distinct(service.source_document_reference);
    distinct(service.performance_record_reference);
    identity(service);
    if (
      service.performed_start_date > service.performed_end_date ||
      service.service_condition_record_reference !==
        row.scholarship_terms_record_reference
    ) {
      throw new Error(
        "Required-service scholarship needs a valid actual service performance period",
      );
    }
    for (const ref of service.payment_source_references) {
      if (!payments.has(ref) || assigned.has(ref)) {
        throw new Error(
          "Required-service scholarship must assign each actual disbursement once to performed required services",
        );
      }
      assigned.add(ref);
    }
  }
  if (
    assigned.size !== payments.size || paid !== row.taxable_amount ||
    !Number.isSafeInteger(paid) ||
    (row.reporting.kind === "w2_box1" && paid > row.reporting.w2_box1_wages)
  ) {
    throw new Error(
      "Required-service scholarship compensation must reconcile complete actual disbursements and issued payroll allocation",
    );
  }
  return paid;
}
export function assertDistinctRequiredServiceSources(
  rows: readonly RequiredServiceScholarship[],
) {
  const references = new Set<string>();
  for (const row of rows) {
    for (
      const reference of [
        row.source_document_reference,
        ...row.payment_sources.map((p) => p.source_document_reference),
        ...row.required_service_sources.flatMap(
          (p) => [p.source_document_reference, p.performance_record_reference],
        ),
      ]
    ) {
      if (references.has(reference)) {
        throw new Error(
          "Required-service grants cannot reuse grant, disbursement or actual performance records across sources",
        );
      }
      references.add(reference);
    }
  }
}
export function requiredServiceScholarshipEarned(
  rows: readonly RequiredServiceScholarship[],
  owner: string,
): number {
  assertDistinctRequiredServiceSources(rows);
  const records = new Set<string>();
  let earnedOutsideW2 = 0;
  for (const row of rows) {
    if (
      tin(row.student_ssn) !== tin(owner) ||
      records.has(row.source_document_reference)
    ) {
      throw new Error(
        "Claimant required-service scholarship review needs distinct claimant-owned grant sources",
      );
    }
    records.add(row.source_document_reference);
    const paid = requiredServiceScholarshipAmount(row);
    // The complete W-2 inventory already includes the Box 1 component.
    if (row.reporting.kind === "schedule1_line8r") earnedOutsideW2 += paid;
  }
  return earnedOutsideW2;
}
export function assertRequiredServiceScholarshipCopies(
  rows: readonly RequiredServiceScholarship[],
  owner: string,
  raw: unknown,
): number {
  const actual =
    (raw as { education_incomes?: unknown[] } | undefined)?.education_incomes ??
      [];
  const copies = actual.filter((row: any) =>
    row.kind === "scholarship_for_required_services"
  ).map((row) => requiredServiceScholarshipSchema.parse(row));
  if (copies.length !== rows.length) {
    throw new Error(
      "Claimant review must inventory every retained required-service scholarship source",
    );
  }
  for (const row of rows) {
    const matched = copies.filter((copy) =>
      copy.source_document_reference === row.source_document_reference
    );
    if (
      matched.length !== 1 ||
      JSON.stringify(matched[0]) !==
        JSON.stringify(requiredServiceScholarshipSchema.parse(row))
    ) {
      throw new Error(
        "Claimant required-service scholarship copy must match the retained taxable-income source",
      );
    }
  }
  return requiredServiceScholarshipEarned(rows, owner);
}

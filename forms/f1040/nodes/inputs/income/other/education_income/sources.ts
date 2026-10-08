import {
  assertDistinctRequiredServiceSources,
  requiredServiceScholarshipAmount,
  requiredServiceScholarshipSchema,
} from "./required-service-scholarship.ts";
import { z } from "zod";
const common = {
  student_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  source_document_reference: z.string().trim().min(1),
  tax_year: z.literal(2025),
  taxable_amount: z.number().int().positive(),
};
export const itemSchema = z.discriminatedUnion("kind", [
  requiredServiceScholarshipSchema,
  z.object({
    ...common,
    kind: z.literal("w2_education_payment"),
    employer_ein: z.string().regex(/^\d{2}-?\d{7}$/),
    w2_box1_wages: z.number().int().positive(),
    payroll_allocation_record_id: z.string().trim().min(1),
  }).strict(),
  z.object({
    ...common,
    kind: z.literal("scholarship_not_on_w2"),
    payer_name: z.string().trim().min(1),
    scholarship_terms_record_id: z.string().trim().min(1),
    taxable_allocation_record_id: z.string().trim().min(1),
    nonqualified_expenses_paid: z.number().int().positive(),
    nonqualified_expense_payment_record_ids: z.array(z.string().trim().min(1))
      .min(1),
    scholarship_disbursement_sources: z.array(
      z.object({
        source_document_reference: z.string().trim().min(1),
        grant_source_reference: z.string().trim().min(1),
        student_ssn: common.student_ssn,
        payer_name: z.string().trim().min(1),
        payment_date: z.string().date().refine((v) => v.startsWith("2025-")),
        amount: z.number().int().positive(),
      }).strict(),
    ).min(1).optional(),
    nonqualified_expense_payment_sources: z.array(
      z.object({
        payment_record_id: z.string().trim().min(1),
        student_ssn: common.student_ssn,
        payee_name: z.string().trim().min(1),
        category: z.literal("room_board"),
        payment_date: z.string().date().refine((v) => v.startsWith("2025-")),
        amount: z.number().int().positive(),
      }).strict(),
    ).min(1).optional(),
  }).strict(),
]);
const inputSchema = z.object({ education_incomes: z.array(itemSchema) });
export type EducationIncome = z.infer<typeof itemSchema>;
export function educationIncomeSources(raw: unknown): EducationIncome[] {
  if (raw === undefined) return [];
  const rows = inputSchema.parse(raw).education_incomes;
  if (
    new Set(rows.map((row) => row.source_document_reference)).size !==
      rows.length
  ) {
    throw new Error("Taxable education income needs distinct source records");
  }
  const actualDocuments = new Set(
    rows.map((row) => row.source_document_reference),
  );
  for (const row of rows) {
    const documents = row.kind === "scholarship_for_required_services"
      ? [
        ...row.payment_sources.map((p) => p.source_document_reference),
        ...row.required_service_sources.flatMap(
          (p) => [p.source_document_reference, p.performance_record_reference],
        ),
      ]
      : row.kind === "scholarship_not_on_w2"
      ? [
        ...(row.scholarship_disbursement_sources ?? []).map((p) =>
          p.source_document_reference
        ),
        ...(row.nonqualified_expense_payment_sources ?? []).map((p) =>
          p.payment_record_id
        ),
      ]
      : [];
    for (const document of documents) {
      if (actualDocuments.has(document)) {
        throw new Error(
          "Taxable scholarship sources cannot reuse actual grant, disbursement, service or nonqualified expense payment records",
        );
      }
      actualDocuments.add(document);
    }
  }
  assertDistinctRequiredServiceSources(
    rows.filter((row) => row.kind === "scholarship_for_required_services"),
  );
  for (const row of rows) {
    if (row.kind === "scholarship_for_required_services") {
      requiredServiceScholarshipAmount(row);
    }
    if (
      row.kind === "scholarship_not_on_w2" &&
      (row.nonqualified_expenses_paid < row.taxable_amount ||
        new Set(row.nonqualified_expense_payment_record_ids).size !==
          row.nonqualified_expense_payment_record_ids.length)
    ) {
      throw new Error(
        "Taxable scholarship allocation requires sufficient separately paid nonqualified expenses and distinct payment records",
      );
    }
    if (
      row.kind === "scholarship_not_on_w2" &&
      (row.scholarship_disbursement_sources ||
        row.nonqualified_expense_payment_sources)
    ) {
      const receipts = row.scholarship_disbursement_sources ?? [];
      const paid = row.nonqualified_expense_payment_sources ?? [];
      if (
        !receipts.length || !paid.length || receipts.some((p) =>
          p.student_ssn.replaceAll("-", "") !==
            row.student_ssn.replaceAll("-", "") ||
          p.payer_name !== row.payer_name ||
          p.grant_source_reference !== row.source_document_reference
        ) ||
        paid.some((p) =>
          p.student_ssn.replaceAll("-", "") !==
            row.student_ssn.replaceAll("-", "")
        ) ||
        new Set(receipts.map((p) =>
            p.source_document_reference
          )).size !==
          receipts.length ||
        paid.map((p) => p.payment_record_id).join("|") !==
          row.nonqualified_expense_payment_record_ids.join("|") ||
        paid.reduce((s, p) => s + p.amount, 0) !==
          row.nonqualified_expenses_paid ||
        receipts.reduce((s, p) => s + p.amount, 0) !== row.taxable_amount
      ) {
        throw new Error(
          "Taxable nonservice scholarship must reconcile its actual owned award disbursements and separate room/board payments",
        );
      }
    }
    if (
      row.kind === "w2_education_payment" &&
      row.taxable_amount > row.w2_box1_wages
    ) {
      throw new Error(
        "Taxable education benefit exceeds issued W-2 box 1 wages",
      );
    }
  }
  return rows;
}
export function scholarshipIncomeTotal(raw: unknown): number {
  return educationIncomeSources(raw).reduce(
    (sum, row) =>
      sum +
      (row.kind === "scholarship_not_on_w2"
        ? row.taxable_amount
        : row.kind === "scholarship_for_required_services" &&
            row.reporting.kind === "schedule1_line8r"
        ? requiredServiceScholarshipAmount(row)
        : 0),
    0,
  );
}

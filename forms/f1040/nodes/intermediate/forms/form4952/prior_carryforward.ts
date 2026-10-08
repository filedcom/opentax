import { z } from "zod";
import { sha256Hex } from "../../../../2025/domains/execution/prepared-source.ts";

const amount = z.number().int().nonnegative().refine(Number.isSafeInteger);
const reviewedDocument = z.object({
  source_document_reference: z.string().trim().min(1),
  file_name: z.string().trim().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

export const form4952PriorCarryforwardSourceSchema = z.object({
  tax_year: z.literal(2024),
  filed_return_reference: z.string().trim().min(1),
  completed_form_reference: z.string().trim().min(1),
  filed_primary_ssn: z.string().regex(/^\d{9}$/),
  reviewed_by: z.string().trim().min(1),
  reviewed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  filed_2024_form4952: z.object({
    line1: amount,
    line2: amount,
    line3: amount,
    line6: amount,
    line7: z.number().int().positive().refine(Number.isSafeInteger),
    line8: amount,
  }).strict(),
  filed_2024_schedule_a_line9: amount,
  prior_interest_entirely_schedule_a_confirmed: z.literal(true),
  prior_no_form6198_allocation_confirmed: z.literal(true),
  reviewed_2024_amt_form4952_line7: amount,
  accepted_2024_filing: z.object({
    filed_return_pdf: reviewedDocument,
    completed_form4952_pdf: reviewedDocument,
    amt_form4952_workpaper_pdf: reviewedDocument,
    acknowledgment_xml: reviewedDocument,
    filed_tax_year: z.literal(2024),
    filed_primary_ssn: z.string().regex(/^\d{9}$/),
    submission_id: z.string().trim().min(1),
    accepted_status_reviewed: z.literal(true),
    regular_line7_reviewed: amount,
    amt_line7_reviewed: amount,
  }).strict(),
}).strict().superRefine((source, context) => {
  const lines = source.filed_2024_form4952;
  const accepted = source.accepted_2024_filing;
  const documents = [
    accepted.filed_return_pdf,
    accepted.completed_form4952_pdf,
    accepted.amt_form4952_workpaper_pdf,
    accepted.acknowledgment_xml,
  ];
  const reviewedDate = new Date(`${source.reviewed_on}T00:00:00Z`);
  if (
    source.filed_return_reference === source.completed_form_reference ||
    source.reviewed_on < "2025-01-01" ||
    !Number.isFinite(reviewedDate.getTime()) ||
    reviewedDate.toISOString().slice(0, 10) !== source.reviewed_on ||
    lines.line3 !== lines.line1 + lines.line2 ||
    lines.line7 !== Math.max(0, lines.line3 - lines.line6) ||
    lines.line8 !== Math.min(lines.line3, lines.line6) ||
    source.filed_2024_schedule_a_line9 !== lines.line8 ||
    accepted.filed_primary_ssn !== source.filed_primary_ssn ||
    accepted.regular_line7_reviewed !== lines.line7 ||
    accepted.amt_line7_reviewed !==
      source.reviewed_2024_amt_form4952_line7 ||
    accepted.filed_return_pdf.source_document_reference !==
      source.filed_return_reference ||
    accepted.completed_form4952_pdf.source_document_reference !==
      source.completed_form_reference ||
    documents.some((document, index) =>
      !document.file_name.endsWith(index === 3 ? ".xml" : ".pdf")
    ) ||
    new Set(documents.map((document) => document.source_document_reference))
        .size !== 4 ||
    new Set(documents.map((document) => document.file_name)).size !== 4 ||
    new Set(documents.map((document) => document.sha256)).size !== 4
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Filed 2024 Form 4952 lines 3/7/8 and Schedule A line 9 do not reconcile",
    });
  }
});

/** Bind retained 2024 copies to their reviewed hashes. This does not prove IRS
 * acceptance or the amounts printed inside the PDFs. */
export async function bindForm4952PriorCarryforwardBytes(
  rawSource: unknown,
  filedReturnBytes: Uint8Array,
  completedFormBytes: Uint8Array,
  amtWorkpaperBytes: Uint8Array,
  acknowledgmentBytes: Uint8Array,
  finalPrimarySsn: string,
): Promise<void> {
  const source = form4952PriorCarryforwardSourceSchema.parse(rawSource);
  const accepted = source.accepted_2024_filing;
  if (finalPrimarySsn.replace(/\D/g, "") !== source.filed_primary_ssn) {
    throw new Error(
      "Form 4952 prior carryforward owner differs from filed source",
    );
  }
  for (
    const [document, bytes] of [
      [accepted.filed_return_pdf, filedReturnBytes],
      [accepted.completed_form4952_pdf, completedFormBytes],
      [accepted.amt_form4952_workpaper_pdf, amtWorkpaperBytes],
    ] as const
  ) {
    if (
      !(bytes instanceof Uint8Array) || bytes.length < 8 ||
      new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-" ||
      await sha256Hex(bytes) !== document.sha256
    ) {
      throw new Error(
        `Form 4952 ${document.file_name} differs from reviewed PDF bytes`,
      );
    }
  }
  if (
    !(acknowledgmentBytes instanceof Uint8Array) ||
    acknowledgmentBytes.length < 8 ||
    new TextDecoder().decode(acknowledgmentBytes.subarray(0, 1)) !== "<" ||
    await sha256Hex(acknowledgmentBytes) !== accepted.acknowledgment_xml.sha256
  ) {
    throw new Error(
      "Form 4952 prior carryforward acknowledgment differs from reviewed bytes",
    );
  }
}

export type Form4952PriorCarryforwardSource = z.infer<
  typeof form4952PriorCarryforwardSourceSchema
>;

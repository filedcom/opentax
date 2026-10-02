import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import { sha256Hex } from "./prepared-source.ts";

const reviewedDocument = z.object({
  source_document_id: z.string().trim().min(1),
  bytes: z.instanceof(Uint8Array).refine((bytes) =>
    bytes.length > 0 && bytes.length <= 60_000_000
  ),
  reviewed_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  reviewed_by: z.string().trim().min(1),
  reviewed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strict();

export const scheduleRDisabilityDocumentReviewSchema = z.object({
  claimant_name: z.string().trim().min(1),
  return_claimant_name: z.string().trim().min(1),
  physician_statement: z.enum(["current_year", "prior_year", "va_21_0172"]),
  physician_or_va_statement_signed_verified: z.literal(true),
  prior_year_line_b_or_1983_verified: z.literal(true).optional(),
  retired_on_permanent_total_disability: z.literal(true),
  below_mandatory_retirement_age_on_january_1: z.literal(true),
  unable_to_perform_substantial_gainful_activity: z.literal(true),
  condition_expected_to_last_one_year_or_result_in_death_verified: z.literal(
    true,
  ),
  disability_income_reported_on: z.enum(["wages", "pension"]),
  disability_income_amount: z.number().positive().safe(),
  physician_document: reviewedDocument,
  retirement_and_income_document: reviewedDocument,
}).strict();

/** Review a bounded PDF-backed disability claim before placing it in Schedule R input. */
export async function reviewScheduleRDisabilityDocuments(
  raw: z.input<typeof scheduleRDisabilityDocumentReviewSchema>,
) {
  const review = scheduleRDisabilityDocumentReviewSchema.parse(raw);
  if (review.claimant_name !== review.return_claimant_name) {
    throw new Error(
      "Schedule R reviewed disability claimant must match the return",
    );
  }
  if (
    review.physician_statement === "prior_year" &&
    review.prior_year_line_b_or_1983_verified !== true
  ) {
    throw new Error(
      "Schedule R prior-year physician statement needs prior qualification review",
    );
  }
  if (
    review.physician_document.source_document_id ===
      review.retirement_and_income_document.source_document_id
  ) {
    throw new Error(
      "Schedule R physician and retirement evidence need distinct source documents",
    );
  }
  for (
    const [role, document] of [
      ["physician", review.physician_document],
      ["retirement and income", review.retirement_and_income_document],
    ] as const
  ) {
    if (await sha256Hex(document.bytes) !== document.reviewed_sha256) {
      throw new Error(`Schedule R ${role} bytes differ from reviewed SHA-256`);
    }
    let pdf: PDFDocument;
    try {
      pdf = await PDFDocument.load(document.bytes);
    } catch {
      throw new Error(`Schedule R ${role} needs a readable PDF`);
    }
    if (pdf.getPageCount() === 0) {
      throw new Error(`Schedule R ${role} needs at least one PDF page`);
    }
  }
  return {
    taxpayer_disabled: true as const,
    taxpayer_disability_income: review.disability_income_amount,
    taxpayer_disability_evidence: {
      retired_on_permanent_total_disability: true as const,
      below_mandatory_retirement_age_on_january_1: true as const,
      unable_to_perform_substantial_gainful_activity: true as const,
      condition_expected_to_last_one_year_or_result_in_death_verified:
        true as const,
      disability_income_source_reference:
        `${review.retirement_and_income_document.source_document_id}#sha256:${review.retirement_and_income_document.reviewed_sha256}`,
      disability_income_reported_on: review.disability_income_reported_on,
      eligibility_source_reference:
        `${review.retirement_and_income_document.source_document_id}#sha256:${review.retirement_and_income_document.reviewed_sha256}`,
      physician_statement: review.physician_statement,
      physician_statement_source_reference:
        `${review.physician_document.source_document_id}#sha256:${review.physician_document.reviewed_sha256}`,
      physician_or_va_statement_signed_verified: true as const,
      ...(review.prior_year_line_b_or_1983_verified === true
        ? { prior_year_line_b_or_1983_verified: true as const }
        : {}),
    },
  };
}

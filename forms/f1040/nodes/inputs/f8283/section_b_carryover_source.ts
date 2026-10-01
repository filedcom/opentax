import { z } from "zod";
import { sha256Hex } from "../../../2025/prepared-source.ts";
import type { MefBuildContext } from "../../../2025/mef/form-descriptor.ts";

const amount = z.number().int().nonnegative().refine(Number.isSafeInteger);
const pdfReview = z.object({
  source_document_reference: z.string().trim().min(1),
  file_name: z.string().trim().regex(/\.pdf$/i),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  reviewed_by: z.string().trim().min(1),
  reviewed_on: z.string().regex(/^2025-\d{2}-\d{2}$|^2026-\d{2}-\d{2}$/),
}).strict();

export const form8283SectionBCarryoverSourceSchema = z.object({
  contribution_id: z.string().trim().min(1),
  contribution_year: z.literal(2024),
  property_kind: z.literal("purchased_artwork"),
  original_donation_date: z.string().regex(/^2024-\d{2}-\d{2}$/),
  donor_acquired_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  donee_name: z.string().trim().min(1),
  filed_return_reference: z.string().trim().min(1),
  filed_taxpayer_ssn: z.string().regex(/^\d{9}$/),
  original_fmv: amount.min(20_000),
  original_2024_deduction_claim: amount.min(20_000),
  adjusted_basis: amount,
  previously_deducted_through_2024: amount,
  completed_prior_form: pdfReview,
  required_qualified_appraisal: pdfReview,
  section_b_appraiser_and_donee_signatures_reviewed: z.literal(true),
  appraisal_was_attached_to_2024_return_reviewed: z.literal(true),
}).strict();

export function sectionBCarryoverAttachmentDescription(
  kind: "completed_prior_form" | "required_qualified_appraisal",
  fileName: string,
): string {
  return kind === "completed_prior_form"
    ? `Completed prior-year Form 8283 Section B: ${fileName}`
    : `Qualified Appraisal for prior-year Form 8283 Section B: ${fileName}`;
}

const carryoverSchema = z.object({
  contribution_id: z.string().trim().min(1),
  contribution_year: z.literal(2024),
  original_category: z.literal("capital_gain_30"),
  original_fmv: amount,
  adjusted_basis: amount,
  previously_deducted: amount,
  ordinary_carryover_rules_confirmed: z.literal(true),
}).strict();

function validDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().startsWith(value);
}

/** Bind the required prior Section B form and appraisal to one carried gift. */
export async function bindForm8283SectionBCarryoverSource(
  rawSource: unknown,
  rawCarryover: unknown,
  currentTaxpayerSsn: string,
  completedPriorFormBytes: Uint8Array,
  appraisalBytes: Uint8Array,
): Promise<void> {
  const source = form8283SectionBCarryoverSourceSchema.parse(rawSource);
  const carryover = carryoverSchema.parse(rawCarryover);
  const acquisitionAnniversary = new Date(
    `${source.donor_acquired_date}T00:00:00Z`,
  );
  acquisitionAnniversary.setUTCFullYear(
    acquisitionAnniversary.getUTCFullYear() + 1,
  );
  if (
    !validDate(source.original_donation_date) ||
    !validDate(source.donor_acquired_date) ||
    !validDate(source.completed_prior_form.reviewed_on) ||
    !validDate(source.required_qualified_appraisal.reviewed_on) ||
    Date.parse(`${source.original_donation_date}T00:00:00Z`) <=
      acquisitionAnniversary.getTime() ||
    source.contribution_id !== carryover.contribution_id ||
    source.original_fmv !== carryover.original_fmv ||
    source.adjusted_basis !== carryover.adjusted_basis ||
    source.previously_deducted_through_2024 !==
      carryover.previously_deducted ||
    source.adjusted_basis > source.original_fmv ||
    source.original_2024_deduction_claim !== source.original_fmv ||
    source.previously_deducted_through_2024 >= source.original_fmv ||
    source.filed_taxpayer_ssn !== currentTaxpayerSsn.replace(/\D/g, "") ||
    source.completed_prior_form.source_document_reference ===
      source.required_qualified_appraisal.source_document_reference ||
    source.completed_prior_form.file_name ===
      source.required_qualified_appraisal.file_name ||
    source.completed_prior_form.sha256 ===
      source.required_qualified_appraisal.sha256
  ) {
    throw new Error(
      "Form 8283 Section B prior artwork, appraisal, taxpayer, and Schedule A carryover do not reconcile",
    );
  }
  for (
    const [review, bytes] of [
      [source.completed_prior_form, completedPriorFormBytes],
      [source.required_qualified_appraisal, appraisalBytes],
    ] as const
  ) {
    if (
      !(bytes instanceof Uint8Array) || bytes.length < 8 ||
      new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-" ||
      await sha256Hex(bytes) !== review.sha256
    ) {
      throw new Error(
        `Form 8283 Section B ${review.source_document_reference} bytes differ from reviewed PDF SHA-256`,
      );
    }
  }
}

/** Join the two byte-reviewed copies to distinct submitted MeF attachments. */
export async function reviewForm8283SectionBCarryoverBundle(
  rawSource: unknown,
  rawCarryover: unknown,
  currentTaxpayerSsn: string,
  completedPriorFormBytes: Uint8Array,
  appraisalBytes: Uint8Array,
  context: MefBuildContext,
): Promise<
  Readonly<{
    contributionId: string;
    priorFormDocumentId: string;
    appraisalDocumentId: string;
  }>
> {
  await bindForm8283SectionBCarryoverSource(
    rawSource,
    rawCarryover,
    currentTaxpayerSsn,
    completedPriorFormBytes,
    appraisalBytes,
  );
  const source = form8283SectionBCarryoverSourceSchema.parse(rawSource);
  const entries = [
    ["completed_prior_form", source.completed_prior_form],
    ["required_qualified_appraisal", source.required_qualified_appraisal],
  ] as const;
  const documentIds = entries.map(([kind, review]) => {
    const fileName = review.file_name;
    const id = context.documentIdsByAttachmentFileName?.[fileName];
    if (
      !id || !id.trim() ||
      context.attachmentSha256ByFileName?.[fileName] !== review.sha256 ||
      context.attachmentDescriptionsByFileName?.[fileName] !==
        sectionBCarryoverAttachmentDescription(kind, fileName)
    ) {
      throw new Error(
        `Form 8283 Section B ${kind} must match reviewed bytes, description, and MeF document`,
      );
    }
    return id;
  });
  if (documentIds[0] === documentIds[1]) {
    throw new Error(
      "Form 8283 Section B prior form and appraisal need distinct MeF documents",
    );
  }
  return {
    contributionId: source.contribution_id,
    priorFormDocumentId: documentIds[0],
    appraisalDocumentId: documentIds[1],
  };
}

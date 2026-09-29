import { z } from "zod";
import type { MefBuildContext } from "../form-descriptor.ts";
import { form8283CarryoverEvidenceSchema } from "../../../nodes/inputs/f8283/carryover-source.ts";

export { form8283CarryoverEvidenceSchema } from "../../../nodes/inputs/f8283/carryover-source.ts";
export type { Form8283CarryoverEvidence } from "../../../nodes/inputs/f8283/carryover-source.ts";

const amount = z.number().int().nonnegative();

export const scheduleACarryoverMatchSchema = z.object({
  contribution_id: z.string().trim().min(1),
  contribution_year: z.number().int().min(2000).max(2024),
  original_category: z.literal("capital_gain_30"),
  original_fmv: amount,
  adjusted_basis: amount,
  previously_deducted: amount,
  ordinary_carryover_rules_confirmed: z.literal(true),
}).strict();

export type ReviewedForm8283CarryoverAttachment = Readonly<{
  contributionId: string;
  attachmentDocumentId: string;
  priorFormPdfSha256: string;
  filed2024ReturnReference: string;
}>;

export function form8283CarryoverAttachmentDescription(
  fileName: string,
): string {
  return `Completed prior-year Form 8283 Section A: ${fileName}`;
}

/** Bind the reviewed prior-year Section A PDF to the carried gift, taxpayer,
 * exact submitted bytes, and the MeF binary document. */
export function reviewForm8283CarryoverAttachment(
  rawEvidence: unknown,
  rawCarryover: unknown,
  currentTaxpayerSsn: string,
  context: MefBuildContext,
): ReviewedForm8283CarryoverAttachment {
  const evidence = form8283CarryoverEvidenceSchema.parse(rawEvidence);
  const carryover = scheduleACarryoverMatchSchema.parse(rawCarryover);
  const taxpayerSsn = z.string().regex(/^\d{9}$/).parse(currentTaxpayerSsn);
  const previous = evidence.prior_form_8283;
  if (
    evidence.contribution_id !== carryover.contribution_id ||
    evidence.contribution_year !== carryover.contribution_year ||
    previous.original_fmv !== carryover.original_fmv ||
    previous.adjusted_basis !== carryover.adjusted_basis ||
    evidence.prior_deduction_workpaper
        .total_previously_deducted_through_2024 !==
      carryover.previously_deducted ||
    previous.filed_taxpayer_ssn !== taxpayerSsn
  ) {
    throw new Error(
      "Form 8283 prior-year PDF review differs from the Schedule A carryover or taxpayer",
    );
  }
  const file = previous.attachment_file_name;
  if (
    context.attachmentSha256ByFileName?.[file] !== previous.pdf_sha256 ||
    context.attachmentDescriptionsByFileName?.[file] !==
      form8283CarryoverAttachmentDescription(file)
  ) {
    throw new Error(
      "Form 8283 prior-year completed PDF bytes or description do not match the reviewed source",
    );
  }
  const attachmentDocumentId = context.documentIdsByAttachmentFileName?.[file];
  if (!attachmentDocumentId) {
    throw new Error(
      "Form 8283 prior-year completed PDF needs a linked MeF binary document",
    );
  }
  return {
    contributionId: evidence.contribution_id,
    attachmentDocumentId,
    priorFormPdfSha256: previous.pdf_sha256,
    filed2024ReturnReference: previous.filed_return_reference,
  };
}

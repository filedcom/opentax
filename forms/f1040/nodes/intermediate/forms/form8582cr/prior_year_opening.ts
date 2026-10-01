import { z } from "zod";
import {
  calculateForm8582CR,
  inputSchema as form8582crInputSchema,
  PassiveCreditCategory,
  PassiveCreditReportingRoute,
  PassiveCreditSourceOrigin,
} from "./index.ts";
import { creditSourceSchema } from "./source.ts";

const wholeDollar = z.number().int().nonnegative().refine(Number.isSafeInteger);
const positiveWholeDollar = z.number().int().positive().refine(
  Number.isSafeInteger,
);

/** Reviewed 2024 single-credit copies; this packet does not prove IRS acceptance. */
export const form8582CR2024OpeningCandidateSchema = z.object({
  tax_year: z.literal(2024),
  taxpayer_tin: z.string().regex(/^\d{9}$/),
  return_copy_reference: z.string().trim().min(1),
  form8582cr_copy_reference: z.string().trim().min(1),
  no_recapture_or_bankruptcy_transfer_reviewed: z.literal(true),
  source: creditSourceSchema,
  form8582cr_line5: positiveWholeDollar,
  form8582cr_line37: wholeDollar,
}).strict();

/** Reconcile one 2024-origin passive credit before an authenticated import exists. */
export function reconcileForm8582CR2024OpeningCandidate(
  rawCandidate: unknown,
  raw2025Form8582CR: unknown,
  raw2025General: unknown,
) {
  const candidate = form8582CR2024OpeningCandidateSchema.parse(rawCandidate);
  const current = form8582crInputSchema.parse(raw2025Form8582CR);
  const general = z.object({ taxpayer_ssn: z.string().min(1) }).parse(
    raw2025General,
  );
  const prior = candidate.source;
  const source = current.credit_sources[0];
  const carry = source?.prior_unallowed_credits[0];
  const unallowed = candidate.form8582cr_line5 -
    candidate.form8582cr_line37;
  const lines = calculateForm8582CR(current);
  const identity = (value: typeof prior) =>
    JSON.stringify({
      activity_reference: value.activity_reference,
      source_form: value.source_form,
      source_document_reference: value.source_document_reference,
      source_origin: value.source_origin,
      category: value.category,
      reporting_route: value.reporting_route,
      form3800_credit_line: value.form3800_credit_line,
      publicly_traded_partnership: value.publicly_traded_partnership,
    });
  if (
    candidate.taxpayer_tin !== general.taxpayer_ssn.replace(/\D/g, "") ||
    prior.current_year_credit !== candidate.form8582cr_line5 ||
    prior.prior_unallowed_credits.length !== 0 ||
    prior.publicly_traded_partnership ||
    prior.category !== PassiveCreditCategory.Other ||
    prior.source_form !== "Form 8874" ||
    prior.source_origin.kind !== PassiveCreditSourceOrigin.Self ||
    prior.reporting_route !== PassiveCreditReportingRoute.Form3800Line3 ||
    prior.form3800_credit_line !== "1i" ||
    unallowed <= 0 || !Number.isSafeInteger(unallowed) ||
    current.credit_sources.length !== 1 || !source ||
    source.current_year_credit !== 0 ||
    source.prior_unallowed_credits.length !== 1 || !carry ||
    carry.originating_tax_year !== 2024 ||
    carry.credit_amount !== unallowed ||
    carry.source_document_reference !== prior.source_document_reference ||
    identity(source) !== identity(prior) ||
    lines.partI.other.prior !== unallowed ||
    lines.partI.line5 !== unallowed ||
    lines.sourceAllocations.length !== 1 ||
    lines.sourceAllocations[0].total_credit !== unallowed
  ) {
    throw new Error(
      "Form 8582-CR 2024 opening candidate differs from the reviewed single-activity credit, prior lines 5/37, or 2025 source",
    );
  }
  return {
    tax_year: 2025 as const,
    originating_tax_year: 2024 as const,
    source,
    prior_unallowed_credit: unallowed,
    preview_line4b: lines.partI.other.prior,
    preview_line5: lines.partI.line5,
    preview_line37: lines.line37,
    preview_form3800_passive_allocation: lines.sourceAllocations[0],
    prior_return_copy_reference: candidate.return_copy_reference,
    prior_form8582cr_copy_reference: candidate.form8582cr_copy_reference,
  };
}

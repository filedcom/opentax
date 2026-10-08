import { z } from "zod";
import { stageForm8801PriorBoundReturn } from "./form8801_prior_return_bytes.ts";
import type { SourceDocumentBytes } from "../../../../../../core/runtime/source-documents.ts";
import { VerifiedSourceDocuments } from "../../../../../../core/runtime/source-documents.ts";
import { sha256Hex } from "../../execution/prepared-source.ts";

/** Reproducible unfiled record. No IRS acceptance or next-year filing admission
 * can be supplied by a caller or inferred from matching calculated bytes. */
export async function stageForm8801CarryRecord(
  inputs: Readonly<Record<string, unknown>>,
  reviewBinding: unknown,
  reviewDocuments: readonly SourceDocumentBytes[],
  priorBinding: unknown,
  priorDocuments: readonly SourceDocumentBytes[],
  recordReference: string,
) {
  const reference = z.string().trim().min(1).parse(recordReference);
  const ownedInputs = structuredClone(inputs);
  // Start the source-bound computation before the first await; that API owns
  // all its bindings/documents synchronously before its digest operations.
  const computation = stageForm8801PriorBoundReturn(
    ownedInputs,
    reviewBinding,
    reviewDocuments,
    priorBinding,
    priorDocuments,
  );
  const inputBytes = new TextEncoder().encode(JSON.stringify(ownedInputs));
  const result = await computation;
  if (
    [...result.review_package_manifest, ...result.prior_return_manifest].some(
      (row) => row.reference === reference,
    )
  ) {
    throw new Error(
      "Form 8801 carry record reference must differ from its sources",
    );
  }
  const publicInputSha256 = await sha256Hex(inputBytes);
  const general = result.projected_pending.general!;
  const record = {
    format: "opentax-form8801-carry-v1",
    status: "local_unfiled",
    tax_year: 2025,
    opening_tax_year: 2026,
    taxpayer_ssn: result.review.taxpayer_ssn,
    current_filing_status: general.filing_status,
    current_spouse_ssn: general.spouse_ssn ?? null,
    prior_filing_status: result.review.prior_filing_status,
    prior_spouse_ssn: result.review.prior_spouse_ssn ?? null,
    public_input_sha256: publicInputSha256,
    review_package_manifest: result.review_package_manifest,
    prior_return_manifest: result.prior_return_manifest,
    form8801_lines: result.lines,
    credit_used: result.schedule3_line6b,
    credit_carryforward: result.carryforward_to_2026,
    // MTFTCE workpapers refigure 2024; their records open 2025, not 2026.
    mtftce_workpaper_records:
      result.mtftceRefiguring?.categories.map((row) => ({
        category: row.category,
        treaty_country: row.treaty_country ?? null,
        reference: row.reference,
        originating_workpaper_year: 2024,
        next_workpaper_year: 2025,
        line14_minus_line21: row.line14_minus_line21_record,
      })) ?? [],
    prior_acceptance_verified: false,
    current_acceptance_verified: false,
    filing_ready: false,
    next_year_filing_import_allowed: false,
  };
  const bytes = new TextEncoder().encode(JSON.stringify(record));
  return {
    record,
    bytes,
    binding: { reference, sha256: await sha256Hex(bytes) },
    localCarryRecordReconciled: true as const,
    acceptedFilingCarryRecordVerified: false as const,
    nextYearFilingImportAllowed: false as const,
  };
}

/** Recompute from original source bytes and public facts, then compare exact
 * retained bytes. This permits a local opening preview only, never a filed
 * ledger or accepted-filing import. */
export async function reconcileForm8801CarryRecord(
  inputs: Readonly<Record<string, unknown>>,
  reviewBinding: unknown,
  reviewDocuments: readonly SourceDocumentBytes[],
  priorBinding: unknown,
  priorDocuments: readonly SourceDocumentBytes[],
  rawRecordBinding: unknown,
  recordDocuments: readonly SourceDocumentBytes[],
) {
  const binding = z.object({
    reference: z.string().trim().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict().parse(rawRecordBinding);
  const ownedDocuments = recordDocuments.map((d) => ({
    reference: d.reference,
    bytes: new Uint8Array(d.bytes),
  }));
  const ownedInputs = structuredClone(inputs);
  const ownedReviewBinding = structuredClone(reviewBinding);
  const ownedPriorBinding = structuredClone(priorBinding);
  const copy = (docs: readonly SourceDocumentBytes[]) =>
    docs.map((d) => ({
      reference: d.reference,
      bytes: new Uint8Array(d.bytes),
    }));
  const ownedReviewDocuments = copy(reviewDocuments);
  const ownedPriorDocuments = copy(priorDocuments);
  const verified = await VerifiedSourceDocuments.verify(
    [binding],
    ownedDocuments,
  );
  const expected = await stageForm8801CarryRecord(
    ownedInputs,
    ownedReviewBinding,
    ownedReviewDocuments,
    ownedPriorBinding,
    ownedPriorDocuments,
    binding.reference,
  );
  const bytes = verified.getBytes(binding.reference)!;
  if (
    bytes.length !== expected.bytes.length ||
    bytes.some((v, i) => v !== expected.bytes[i])
  ) {
    throw new Error(
      "Form 8801 carry record differs from recomputed source and public return",
    );
  }
  return {
    ...expected,
    local_opening_preview: {
      tax_year: 2026,
      taxpayer_ssn: expected.record.taxpayer_ssn,
      prior_credit_carryforward: expected.record.credit_carryforward,
    },
  };
}

import { z } from "zod";
import {
  type SourceDocumentBytes,
  VerifiedSourceDocuments,
} from "../../../core/runtime/source-documents.ts";
import { parseReviewedNolOrigin } from "./form172_nol_origin.ts";
import { calculateForm172FarmingCarryHistory } from "./form172_farming_carry_history.ts";

const claim = z.object({
  reference: z.string().trim().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
const bindingSchema = z.object({
  origin: claim,
  farming_review: claim,
  history: claim,
  origin_tax_year: z.number().int().min(2005).max(2024),
  opening_tax_year: z.literal(2025),
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  spouse_ssn: z.string().regex(/^\d{9}$/).optional(),
}).strict();

function parsePackage(bytes: Uint8Array): Record<string, unknown> {
  if (bytes.length > 5_000_000) {
    throw new Error("Mixed carry review package exceeds size limit");
  }
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
    .decode(bytes);
  const raw: unknown = JSON.parse(text);
  if (JSON.stringify(raw) !== text) {
    throw new Error("Mixed carry review needs canonical JSON");
  }
  return z.record(z.unknown()).parse(raw);
}

/** Retained loss origin + complete farm classification + complete annual mixed
 * history. All three packages are owned before hashing. SHA identity is not
 * eligibility, authentic election, accepted carry import or packet admission. */
export async function stageForm172FarmingCarrySource(
  rawBinding: unknown,
  rawDocuments: readonly SourceDocumentBytes[],
) {
  const binding = bindingSchema.parse(rawBinding);
  const documents = rawDocuments.map((d) => ({
    reference: d.reference,
    bytes: new Uint8Array(d.bytes),
  }));
  const verified = await VerifiedSourceDocuments.verify(
    [binding.origin, binding.farming_review, binding.history],
    documents,
  );
  const origin = parseReviewedNolOrigin(
    parsePackage(verified.getBytes(binding.origin.reference)!),
  );
  const farm = parsePackage(
    verified.getBytes(binding.farming_review.reference)!,
  );
  const history = parsePackage(verified.getBytes(binding.history.reference)!);
  if (
    origin.reference !== binding.origin.reference ||
    origin.tax_year !== binding.origin_tax_year ||
    origin.taxpayer_ssn !== binding.taxpayer_ssn ||
    origin.spouse_ssn !== binding.spouse_ssn ||
    farm.reference !== binding.farming_review.reference ||
    history.reference !== binding.history.reference ||
    history.opening_tax_year !== binding.opening_tax_year
  ) throw new Error("Mixed carry packages differ from bound source envelopes");
  // Complete identity, classification partition, policy, yearly source and
  // arithmetic refinements run after hashes: matching digests never replace them.
  const calculation = calculateForm172FarmingCarryHistory(
    origin,
    farm,
    history,
  );
  return {
    ...calculation,
    review_package_manifest: verified.manifest,
    reviewPackageBytesVerified: true as const,
    issuerAuthenticityVerified: false as const,
    packetAdmissionVerified: false as const,
    filingReady: false as const,
  };
}

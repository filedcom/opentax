import { z } from "zod";
import {
  type SourceDocumentBytes,
  VerifiedSourceDocuments,
} from "../../../core/runtime/source-documents.ts";
import { parseReviewedNolOrigin } from "./form172_nol_origin.ts";
import { calculateForm172CurrentDeduction } from "./form172_current_deduction.ts";

const claim = z.object({
  reference: z.string().trim().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
const base = {
  origin: claim,
  history: claim,
  current_review: claim,
  origin_tax_year: z.number().int().min(2005).max(2024),
  tax_year: z.literal(2025),
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  spouse_ssn: z.string().regex(/^\d{9}$/).optional(),
};
const bindingSchema = z.discriminatedUnion("history_kind", [
  z.object({ ...base, history_kind: z.literal("regular") }).strict(),
  z.object({
    ...base,
    history_kind: z.literal("mixed_farming"),
    farming_review: claim,
  }).strict(),
]);
function parsePackage(bytes: Uint8Array): Record<string, unknown> {
  if (bytes.length > 5_000_000) {
    throw new Error("Current NOL package exceeds size limit");
  }
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
    .decode(bytes);
  const raw: unknown = JSON.parse(text);
  if (JSON.stringify(raw) !== text) {
    throw new Error("Current NOL review needs canonical JSON");
  }
  return z.record(z.unknown()).parse(raw);
}

/** Recompute origin, complete history and current deduction from retained bytes.
 * Digest identity does not establish issuer authenticity, carry eligibility,
 * accepted prior returns, Form1040 reconciliation or filing admission. */
export async function stageForm172CurrentDeductionSource(
  rawBinding: unknown,
  rawDocuments: readonly SourceDocumentBytes[],
) {
  const binding = bindingSchema.parse(rawBinding);
  const documents = rawDocuments.map((d) => ({
    reference: d.reference,
    bytes: new Uint8Array(d.bytes),
  }));
  const claims = [
    binding.origin,
    binding.history,
    binding.current_review,
    ...(binding.history_kind === "mixed_farming"
      ? [binding.farming_review]
      : []),
  ];
  const verified = await VerifiedSourceDocuments.verify(claims, documents);
  const read = (c: z.infer<typeof claim>) =>
    parsePackage(verified.getBytes(c.reference)!);
  const origin = parseReviewedNolOrigin(read(binding.origin));
  const history = read(binding.history), current = read(binding.current_review);
  const annual = z.record(z.unknown()).parse(current.annual_review);
  const farm = binding.history_kind === "mixed_farming"
    ? read(binding.farming_review)
    : undefined;
  if (
    origin.reference !== binding.origin.reference ||
    origin.tax_year !== binding.origin_tax_year ||
    origin.taxpayer_ssn !== binding.taxpayer_ssn ||
    origin.spouse_ssn !== binding.spouse_ssn ||
    history.reference !== binding.history.reference ||
    history.opening_tax_year !== binding.tax_year ||
    current.reference !== binding.current_review.reference ||
    current.history_kind !== binding.history_kind ||
    annual.tax_year !== binding.tax_year ||
    annual.taxpayer_ssn !== binding.taxpayer_ssn ||
    annual.spouse_ssn !== binding.spouse_ssn ||
    (binding.history_kind === "mixed_farming" &&
      farm?.reference !== binding.farming_review.reference)
  ) {
    throw new Error("Current NOL packages differ from bound source envelopes");
  }
  const calculation = calculateForm172CurrentDeduction(
    origin,
    history,
    current,
    farm,
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

import { z } from "zod";
import {
  type SourceDocumentBytes,
  VerifiedSourceDocuments,
} from "../../../../../../core/runtime/source-documents.ts";
import { parseReviewedNolOrigin } from "./form172_nol_origin.ts";
import { calculateForm172CarryHistory } from "./form172_carry_history.ts";

const claim = z.object({
  reference: z.string().trim().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
const bindingSchema = z.object({
  origin: claim,
  history: claim,
  origin_tax_year: z.number().int().min(2005).max(2024),
  opening_tax_year: z.literal(2025),
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  spouse_ssn: z.string().regex(/^\d{9}$/).optional(),
}).strict();

function parseCanonical(bytes: Uint8Array): unknown {
  if (bytes.length > 5_000_000) {
    throw new Error("Form 172 carry review package is too large");
  }
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
    .decode(bytes);
  const raw: unknown = JSON.parse(text);
  if (JSON.stringify(raw) !== text) {
    throw new Error("Form 172 carry history needs canonical review JSON");
  }
  return raw;
}

/** Two separately retained review packages -> recomputed loss and complete
 * annual arithmetic chain. Hashes identify reviewed bytes, not a filed return,
 * authentic election, source eligibility or a trusted accepted carry import. */
export async function stageForm172CarryHistorySource(
  rawBinding: unknown,
  rawDocuments: readonly SourceDocumentBytes[],
) {
  // Own every caller object and byte array before the first digest await.
  const binding = bindingSchema.parse(rawBinding);
  const documents = rawDocuments.map((d) => ({
    reference: d.reference,
    bytes: new Uint8Array(d.bytes),
  }));
  const verified = await VerifiedSourceDocuments.verify(
    [binding.origin, binding.history],
    documents,
  );
  const origin = parseReviewedNolOrigin(
    parseCanonical(verified.getBytes(binding.origin.reference)!),
  );
  const rawHistory = parseCanonical(
    verified.getBytes(binding.history.reference)!,
  );
  if (
    origin.reference !== binding.origin.reference ||
    origin.tax_year !== binding.origin_tax_year ||
    origin.taxpayer_ssn !== binding.taxpayer_ssn ||
    origin.spouse_ssn !== binding.spouse_ssn
  ) {
    throw new Error("Form 172 carry origin differs from bound source identity");
  }
  // The calculation strictly parses all history and annual fields, including
  // source references; this additional join binds its envelope to retained bytes.
  if (
    typeof rawHistory !== "object" || rawHistory === null ||
    !("reference" in rawHistory) ||
    rawHistory.reference !== binding.history.reference ||
    !("opening_tax_year" in rawHistory) ||
    rawHistory.opening_tax_year !== binding.opening_tax_year
  ) {
    throw new Error(
      "Form 172 carry history differs from bound source identity",
    );
  }
  const calculation = calculateForm172CarryHistory(origin, rawHistory);
  return {
    ...calculation,
    taxpayerSsn: origin.taxpayer_ssn,
    spouseSsn: origin.spouse_ssn,
    review_package_manifest: verified.manifest,
    reviewPackageBytesVerified: true as const,
    packetAdmissionVerified: false as const,
    issuerAuthenticityVerified: false as const,
    filingReady: false as const,
  };
}

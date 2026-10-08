import { z } from "zod";
import {
  type SourceDocumentBytes,
  VerifiedSourceDocuments,
} from "../../../../../../core/runtime/source-documents.ts";
import { parseReviewedNolOrigin } from "./form172_nol_origin.ts";
import { calculateForm172AmtAnnualLimit } from "./form172_amt_annual_limit.ts";

const ref = z.string().trim().min(1);
const claim = z.object({
  reference: ref,
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
const bindingSchema = z.object({
  regular_origin: claim,
  amt_origin: claim,
  annual: claim,
  origin_tax_year: z.number().int().min(2005).max(2025),
  application_tax_year: z.number().int().min(2013).max(2025),
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  spouse_ssn: z.string().regex(/^\d{9}$/).optional(),
}).strict();

function parsePackage(bytes: Uint8Array): Record<string, unknown> {
  if (bytes.length > 5_000_000) {
    throw new Error("AMT review package exceeds size limit");
  }
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
    .decode(bytes);
  const raw: unknown = JSON.parse(text);
  if (JSON.stringify(raw) !== text) {
    throw new Error("AMT review package needs canonical JSON");
  }
  return z.record(z.unknown()).parse(raw);
}

/** Retained regular origin + independent AMT origin + tentative annual Form6251
 * review. Digests bind the exact arithmetic evidence, not issuer authenticity,
 * prior acceptance, carry availability, final ATNOLD or packet admission. */
export async function stageForm172AmtReviewSource(
  rawBinding: unknown,
  rawDocuments: readonly SourceDocumentBytes[],
) {
  const binding = bindingSchema.parse(rawBinding);
  const documents = rawDocuments.map((d) => ({
    reference: d.reference,
    bytes: new Uint8Array(d.bytes),
  }));
  const verified = await VerifiedSourceDocuments.verify(
    [binding.regular_origin, binding.amt_origin, binding.annual],
    documents,
  );
  const regular = parseReviewedNolOrigin(
    parsePackage(verified.getBytes(binding.regular_origin.reference)!),
  );
  const amt = parsePackage(verified.getBytes(binding.amt_origin.reference)!);
  const annual = parsePackage(verified.getBytes(binding.annual.reference)!);
  if (
    regular.reference !== binding.regular_origin.reference ||
    regular.tax_year !== binding.origin_tax_year ||
    regular.taxpayer_ssn !== binding.taxpayer_ssn ||
    regular.spouse_ssn !== binding.spouse_ssn ||
    amt.reference !== binding.amt_origin.reference ||
    annual.reference !== binding.annual.reference ||
    annual.tax_year !== binding.application_tax_year ||
    annual.taxpayer_ssn !== binding.taxpayer_ssn ||
    annual.spouse_ssn !== binding.spouse_ssn
  ) {
    throw new Error(
      "AMT review packages differ from bound references/year/owners",
    );
  }
  // Complete origin and annual schemas/refinements are enforced by calculation;
  // verified hashes alone never substitute for those source joins.
  const calculation = calculateForm172AmtAnnualLimit(regular, amt, annual);
  return {
    ...calculation,
    taxpayerSsn: binding.taxpayer_ssn,
    spouseSsn: binding.spouse_ssn,
    review_package_manifest: verified.manifest,
    reviewPackageBytesVerified: true as const,
    issuerAuthenticityVerified: false as const,
    amtCarryAvailabilityVerified: false as const,
    acceptedCarryImportVerified: false as const,
    packetAdmissionVerified: false as const,
    filingReady: false as const,
  };
}

import { z } from "zod";
import {
  type SourceDocumentBytes,
  VerifiedSourceDocuments,
} from "../../../core/runtime/source-documents.ts";
import { calculateForm172HistoricalAmtHistory } from "./form172_amt_historical_history.ts";

const bindingSchema = z.object({
  history: z.object({
    reference: z.string().trim().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict(),
  start_tax_year: z.number().int().min(2005).max(2017),
  end_tax_year: z.number().int().min(2005).max(2017),
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  spouse_ssn: z.string().regex(/^\d{9}$/).optional(),
}).strict().refine((v) => v.end_tax_year >= v.start_tax_year, {
  message: "AMT history binding has a reversed year span",
});

/** One canonical package owns every entry/origin/annual/vintage workpaper in
 * the declared historical span. Byte identity and arithmetic continuity do not
 * authenticate the entry carry, accepted returns or elections, or establish
 * complete carry history outside the supported application years.
 */
export async function stageForm172HistoricalAmtHistorySource(
  rawBinding: unknown,
  rawDocuments: readonly SourceDocumentBytes[],
) {
  const binding = bindingSchema.parse(rawBinding);
  // Own all documents before verification first awaits a digest.
  const documents = rawDocuments.map((document) => ({
    reference: document.reference,
    bytes: new Uint8Array(document.bytes),
  }));
  const verified = await VerifiedSourceDocuments.verify(
    [binding.history],
    documents,
  );
  const bytes = verified.getBytes(binding.history.reference)!;
  if (bytes.length > 5_000_000) {
    throw new Error("Historical AMT history package exceeds size limit");
  }
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
    .decode(bytes);
  const raw: unknown = JSON.parse(text);
  if (JSON.stringify(raw) !== text) {
    throw new Error("Historical AMT history needs canonical JSON");
  }
  const history = z.record(z.unknown()).parse(raw);
  if (
    history.reference !== binding.history.reference ||
    history.start_year !== binding.start_tax_year ||
    history.end_year !== binding.end_tax_year ||
    history.taxpayer_ssn !== binding.taxpayer_ssn ||
    history.spouse_ssn !== binding.spouse_ssn
  ) {
    throw new Error(
      "Historical AMT history differs from bound reference/span/owners",
    );
  }
  const calculation = calculateForm172HistoricalAmtHistory(history);
  return {
    ...calculation,
    review_package_manifest: verified.manifest,
    reviewPackageBytesVerified: true as const,
    acceptedCarryImportVerified: false as const,
    electionDocumentAuthenticityVerified: false as const,
    packetAdmissionVerified: false as const,
    filingReady: false as const,
  };
}

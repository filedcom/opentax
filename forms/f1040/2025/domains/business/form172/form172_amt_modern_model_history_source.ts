import { z } from "zod";
import {
  type SourceDocumentBytes,
  VerifiedSourceDocuments,
} from "../../../../../../core/runtime/source-documents.ts";
import { calculateForm172ModernAmtModelHistory } from "./form172_amt_modern_model_history.ts";

const year = z.number().int().min(2018).max(2025);
const bindingSchema = z.object({
  history: z.object({
    reference: z.string().trim().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict(),
  start_tax_year: year,
  end_tax_year: year,
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  spouse_ssn: z.string().regex(/^\d{9}$/).optional(),
}).strict().refine((v) => v.end_tax_year >= v.start_tax_year, {
  message: "Modern AMT model history binding has a reversed span",
});

/** Byte identity for the entire model span. No authenticity, legal coordination,
 * accepted history, carry import or packet admission follows from this hash. */
export async function stageForm172ModernAmtModelHistorySource(
  rawBinding: unknown,
  rawDocuments: readonly SourceDocumentBytes[],
) {
  const binding = bindingSchema.parse(rawBinding);
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
    throw new Error("Modern AMT model history package exceeds size limit");
  }
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
    .decode(bytes);
  const raw: unknown = JSON.parse(text);
  if (JSON.stringify(raw) !== text) {
    throw new Error("Modern AMT model history requires canonical JSON");
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
      "Modern AMT model history differs from bound span or owners",
    );
  }
  const calculation = calculateForm172ModernAmtModelHistory(history);
  return {
    ...calculation,
    review_package_manifest: verified.manifest,
    reviewPackageBytesVerified: true as const,
    acceptedCarryImportVerified: false as const,
    packetAdmissionVerified: false as const,
    filingReady: false as const,
  };
}

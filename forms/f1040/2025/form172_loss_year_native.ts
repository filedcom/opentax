import { z } from "zod";
import {
  type SourceDocumentBytes,
  VerifiedSourceDocuments,
} from "../../../core/runtime/source-documents.ts";
import {
  calculateReviewedLossYear,
  reviewedLossYearSchema,
} from "../nodes/inputs/nol_carryforward/reviewed_loss_year.ts";
import { element, elements } from "../mef/xml.ts";

const ssn = z.string().regex(/^\d{9}$/);
const bindingSchema = z.object({
  reference: z.string().trim().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  tax_year: z.literal(2025),
  taxpayer_ssn: ssn,
  spouse_ssn: ssn.optional(),
}).strict();

// IRS172Type Part I order in the retained TY2025 IRS schema. Required line 21
// is zero on the paper skip branch; the other skipped capital cells stay absent.
export const form172NativePartILineMap = [
  [1, "IncomeAmt"],
  [2, "NBCapitalLossAmt"],
  [3, "NBCapitalGainAmt"],
  [4, "NBCapLossLessGainAmt"],
  [5, "NBCapGainLessLossAmt"],
  [6, "NBDeductionsAmt"],
  [7, "NBIncomeOthThanCapGainAmt"],
  [8, "TotNBCapGainLossIncmAmt"],
  [9, "NBDedLessTotCapGainLossIncmAmt"],
  [10, "TotCapGainLossIncmLessNBDedAmt"],
  [11, "BusinessCapitalLossAmt"],
  [12, "BusinessCapitalGainsAmt"],
  [13, "TotCapGnLssIncmNBDedCapGnAmt"],
  [14, "BusCapLossTotCapGnAmt"],
  [15, "NBCapLossLessGainBusCapLossAmt"],
  [16, "CombNetSchDLossAmt"],
  [17, "Section1202ExclusionAmt"],
  [18, "CombNetSchDLossMns1202ExclAmt"],
  [19, "SmllrCombNetSchDLossOrFSAmt"],
  [20, "DiffCombNetSchDLossMns1202Amt"],
  [21, "DiffSmllrCombNetSchDLossFSAmt"],
  [22, "MnsDiffCmbNetSchDLssMns1202Amt"],
  [23, "NOLDeductionLossOtherYearsAmt"],
  [24, "NetOperatingLossAmt"],
] as const;

/** Canonical review bytes -> reconciled current loss-year arithmetic ->
 * Part I native document. Review bytes are not an accepted return or issuer
 * proof. Historic carry attachments, Part II and packet admission remain open. */
export async function stageForm172LossYearNativeDocument(
  rawBinding: unknown,
  rawDocuments: readonly SourceDocumentBytes[],
) {
  const binding = bindingSchema.parse(rawBinding);
  const documents = rawDocuments.map((d) => ({
    reference: d.reference,
    bytes: new Uint8Array(d.bytes),
  }));
  const verified = await VerifiedSourceDocuments.verify(
    [{ reference: binding.reference, sha256: binding.sha256 }],
    documents,
  );
  const bytes = verified.getBytes(binding.reference)!;
  if (bytes.length > 5_000_000) {
    throw new Error("Form 172 review package is too large");
  }
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
    .decode(bytes);
  const raw: unknown = JSON.parse(text);
  if (JSON.stringify(raw) !== text) {
    throw new Error("Form 172 needs canonical review JSON");
  }
  const source = reviewedLossYearSchema.parse(raw);
  if (
    source.reference !== binding.reference ||
    source.tax_year !== binding.tax_year ||
    source.taxpayer_ssn !== binding.taxpayer_ssn ||
    source.spouse_ssn !== binding.spouse_ssn
  ) {
    throw new Error(
      "Form 172 review package differs from bound current loss-year identity",
    );
  }
  const calculation = calculateReviewedLossYear(source);
  const native_xml = calculation.regularNol > 0
    ? elements(
      "IRS172",
      form172NativePartILineMap.map(([line, tag]) =>
        element(
          tag,
          line === 21 ? calculation.lines[line] ?? 0 : calculation.lines[line],
        )
      ),
    )
    : undefined;
  return {
    ...calculation,
    native_xml,
    reviewed_loss_year: source,
    review_package_manifest: verified.manifest,
    reviewPackageBytesVerified: true as const,
    issuerAuthenticityVerified: false as const,
    packetAdmissionVerified: false as const,
    filingReady: false as const,
  };
}

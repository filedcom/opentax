import { z } from "zod";
import {
  type SourceDocumentBytes,
  VerifiedSourceDocuments,
} from "../../../core/runtime/source-documents.ts";
import {
  calculateForm172HistoricalAmtCap,
  calculateForm172HistoricalAmtDeductionAllocation,
} from "./form172_amt_historical_cap.ts";

const schema = z.object({
  workpaper: z.object({
    reference: z.string().trim().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict(),
  application_tax_year: z.number().int().min(2013).max(2017),
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  spouse_ssn: z.string().regex(/^\d{9}$/).optional(),
}).strict();

/** One canonical retained package owns all independently refigured origin
 * inventories, annual operands and reviewed opening/category assertions.
 * Hash identity does not authenticate elections, prior returns or carry balances. */
async function stageHistoricalAmtSource<
  T extends ReturnType<typeof calculateForm172HistoricalAmtCap>,
>(
  rawBinding: unknown,
  rawDocuments: readonly SourceDocumentBytes[],
  calculate: (raw: unknown) => T,
) {
  const binding = schema.parse(rawBinding);
  const documents = rawDocuments.map((d) => ({
    reference: d.reference,
    bytes: new Uint8Array(d.bytes),
  }));
  const verified = await VerifiedSourceDocuments.verify(
    [binding.workpaper],
    documents,
  );
  const bytes = verified.getBytes(binding.workpaper.reference)!;
  if (bytes.length > 5_000_000) {
    throw new Error("Historical AMT cap package exceeds size limit");
  }
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
    .decode(bytes);
  const raw: unknown = JSON.parse(text);
  if (JSON.stringify(raw) !== text) {
    throw new Error("Historical AMT cap package needs canonical JSON");
  }
  const workpaper = z.record(z.unknown()).parse(raw);
  const annual = z.record(z.unknown()).parse(workpaper.annual_review);
  if (
    workpaper.reference !== binding.workpaper.reference ||
    annual.tax_year !== binding.application_tax_year ||
    annual.taxpayer_ssn !== binding.taxpayer_ssn ||
    annual.spouse_ssn !== binding.spouse_ssn
  ) {
    throw new Error(
      "Historical AMT cap package differs from bound reference/year/owners",
    );
  }
  const calculation = calculate(workpaper);
  return {
    ...calculation,
    taxpayerSsn: binding.taxpayer_ssn,
    spouseSsn: binding.spouse_ssn,
    review_package_manifest: verified.manifest,
    reviewPackageBytesVerified: true as const,
    electionDocumentAuthenticityVerified: false as const,
    acceptedCarryImportVerified: false as const,
    packetAdmissionVerified: false as const,
    filingReady: false as const,
  };
}

export function stageForm172HistoricalAmtCapSource(
  rawBinding: unknown,
  rawDocuments: readonly SourceDocumentBytes[],
) {
  return stageHistoricalAmtSource(
    rawBinding,
    rawDocuments,
    calculateForm172HistoricalAmtCap,
  );
}

/** Byte-bound chronological deduction workpaper. Does not establish modified
 * income absorption, authentic elections, accepted carry or packet admission. */
export function stageForm172HistoricalAmtDeductionAllocationSource(
  rawBinding: unknown,
  rawDocuments: readonly SourceDocumentBytes[],
) {
  return stageHistoricalAmtSource(
    rawBinding,
    rawDocuments,
    calculateForm172HistoricalAmtDeductionAllocation,
  );
}

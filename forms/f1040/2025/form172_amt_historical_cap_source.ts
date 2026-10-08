import { z } from "zod";
import {
  type SourceDocumentBytes,
  VerifiedSourceDocuments,
} from "../../../core/runtime/source-documents.ts";
import {
  calculateForm172HistoricalAmtCap,
  calculateForm172HistoricalAmtDeductionAllocation,
} from "./form172_amt_historical_cap.ts";
import { calculateForm172HistoricalAmtModifiedIncome } from "./form172_amt_modified_income.ts";
import { calculateForm172HistoricalAmtVintageModifiedIncome } from "./form172_amt_vintage_modified_income.ts";
import { calculateForm172HistoricalAmtAbsorption } from "./form172_amt_historical_absorption.ts";

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
  T extends { applicationYear: number; filingReady: false },
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

/** Retain the cap/origin package and paired modified-income operands together.
 * Source-byte identity does not establish the refigures' legal eligibility or
 * the loss absorbed by an intervening year. Caller arrays are owned before the
 * shared verifier first awaits its digest computation.
 */
export function stageForm172HistoricalAmtModifiedIncomeSource(
  rawBinding: unknown,
  rawDocuments: readonly SourceDocumentBytes[],
) {
  return stageHistoricalAmtSource(rawBinding, rawDocuments, (raw) => {
    const { modified_review, ...cap } = z.object({
      modified_review: z.unknown(),
    }).passthrough().parse(raw);
    return calculateForm172HistoricalAmtModifiedIncome(cap, modified_review);
  });
}

/** One retained package binds all origins, annual deduction operands and every
 * vintage's refigure context. Authenticity, absorption and accepted carry are
 * separate gates; byte verification does not open the filing route.
 */
export function stageForm172HistoricalAmtVintageModifiedIncomeSource(
  rawBinding: unknown,
  rawDocuments: readonly SourceDocumentBytes[],
) {
  return stageHistoricalAmtSource(rawBinding, rawDocuments, (raw) => {
    const { vintage_reviews, ...cap } = z.object({
      vintage_reviews: z.unknown(),
    }).passthrough().parse(raw);
    return calculateForm172HistoricalAmtVintageModifiedIncome(
      cap,
      vintage_reviews,
    );
  });
}

/** Byte-bound historical absorption arithmetic remains a reviewed workpaper,
 * not an authenticated prior-return carry or a filing admission token. */
export function stageForm172HistoricalAmtAbsorptionSource(
  rawBinding: unknown,
  rawDocuments: readonly SourceDocumentBytes[],
) {
  return stageHistoricalAmtSource(rawBinding, rawDocuments, (raw) => {
    const { vintage_reviews, ...cap } = z.object({
      vintage_reviews: z.unknown(),
    }).passthrough().parse(raw);
    return calculateForm172HistoricalAmtAbsorption(cap, vintage_reviews);
  });
}

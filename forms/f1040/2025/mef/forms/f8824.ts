import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

// ─── Field Map ────────────────────────────────────────────────────────────────
// Maps Fields keys to IRS XSD element names for IRS8824.
// Element order follows the XSD sequence for Form 8824 (Like-Kind Exchanges).
// Part III covers the gain/loss computation (lines 12–25).

export interface Fields {
  // Line 12: FMV of like-kind property received
  received_fmv?: number | null;
  // Line 13: Adjusted basis of relinquished property
  relinquished_basis?: number | null;
  // Line 15: Cash and liabilities received (boot)
  cash_received?: number | null;
  // Line 16: FMV of other (non-like-kind) property received
  other_property_fmv?: number | null;
  // Line 17: Liabilities assumed by other party
  liabilities_assumed_by_buyer?: number | null;
  // Line 18: Liabilities taxpayer assumed on received property
  liabilities_taxpayer_assumed?: number | null;
  // Line 19: Gain or loss realized
  gain_realized?: number | null;
  // Line 20: Gain recognized (lesser of gain realized or boot)
  gain_recognized?: number | null;
  // Line 21: Deferred gain or loss
  deferred_gain?: number | null;
  // Lines 22–25: Adjusted basis of replacement property received
  basis_replacement?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["received_fmv", "FMVLikeKindPropertyReceivedAmt"],
  ["relinquished_basis", "AdjustedBasisLikeKindPropGivenUpAmt"],
  ["cash_received", "CashAndLiabilityReliefAmt"],
  ["other_property_fmv", "FMVOtherPropertyReceivedAmt"],
  ["liabilities_assumed_by_buyer", "LiabilitiesAssumedByOtherPartyAmt"],
  ["liabilities_taxpayer_assumed", "LiabilitiesYouAssumedAmt"],
  ["gain_realized", "GainOrLossRealizedAmt"],
  ["gain_recognized", "GainRecognizedAmt"],
  ["deferred_gain", "DeferredGainOrLossAmt"],
  ["basis_replacement", "AdjustedBasisReceivedPropertyAmt"],
];

// ─── Builder ──────────────────────────────────────────────────────────────────

function buildIRS8824(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8824", children);
}

export const form8824: MefFormDescriptor<"form8824", Input> = {
  pendingKey: "form8824",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8824.pdf",
  build(fields) {
    return buildIRS8824(fields);
  },
};

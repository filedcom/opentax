import type { Form8824Fields, Form8824Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";
import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

// ─── Field Map ────────────────────────────────────────────────────────────────
// Maps Form8824Fields keys to IRS XSD element names for IRS8824.
// Element order follows the XSD sequence for Form 8824 (Like-Kind Exchanges).
// Part III covers the gain/loss computation (lines 12–25).

const FIELD_MAP: ReadonlyArray<readonly [keyof Form8824Fields, string]> = [
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

function buildIRS8824(fields: Form8824Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8824", children);
}

// ─── MEF Node ─────────────────────────────────────────────────────────────────

class Form8824MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f8824.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS8824(pending.form8824 ?? {});
  }
}

export const form8824 = new Form8824MefNode();

import type { SourceDocumentBytes } from "../../../core/runtime/source-documents.ts";
import { element, elements } from "../mef/xml.ts";
import { stageForm8801SettledReturn } from "./form8801_settled_return.ts";

// TY2025 IRS8801 sequence. Lines 17 and 41 reuse lines 15 and 36 in the
// schema; they have no separate elements. Skipped calculation lines stay absent.
export const form8801NativeLineMap = [
  [1, "NetMinTaxTaxableIncomeLossAmt"],
  [2, "NetMinTaxExclusionItemsAmt"],
  [3, "MinTaxCreditNetOprLossDedAmt"],
  [4, "SumMinTaxCreditLossAndDedAmt"],
  [5, "MinTaxCreditExemptionAmt"],
  [6, "MinTaxCreditPhaseOutAmt"],
  [7, "NetMinTaxCrMinusPhaseOutAmt"],
  [8, "NetMinTaxCrTimesDecimalAmt"],
  [9, "NetMinTaxMinusExemptionAmt"],
  [10, "NetMinTaxLessLossAndDedAmt"],
  [11, "NetMinTaxTimesTaxRateAmt"],
  [12, "MinTaxForeignTaxCrExclItemsAmt"],
  [13, "TentativeMinTaxOnExclItemsAmt"],
  [14, "PYMinTaxApplicableRtnTaxAmt"],
  [15, "NetMinTaxOnExclusionItemsAmt"],
  [16, "PYAlternativeMinimumTaxAmt"],
  [18, "NetAlternativeMinimumTaxAmt"],
  [19, "AMTPriorYearCarryforwardAmt"],
  [20, "QlfyElecVehPYUnallowedCrAmt"],
  [21, "AMTCarryforwardPlusNegativeAmt"],
  [22, "CYRegTaxLiabiMinusAllwblCrAmt"],
  [23, "CYTentativeMinimumTaxAmt"],
  [24, "TentMinTaxMinusRegTaxLiabAmt"],
  [25, "MinAMTCrAmt"],
  [26, "AMTCrCarryforwardToNextYearAmt"],
  [27, "NetMinTaxLessDeductionsAmt"],
  [28, "PYMinTaxApplicableCapGainAmt"],
  [29, "PYUnrecapturedS1250GainAmt"],
  [30, "SmallerPYSchDGainOrWrkshtAmt"],
  [31, "SmallerNetAMTOrGainAmt"],
  [32, "AMTLessSmallerOfTaxOrGainAmt"],
  [33, "NetAdjAMTTxblIncTimesPctAmt"],
  [34, "MaxCapGainsApplicableLimitAmt"],
  [35, "AMTPriorYearApplicableGainAmt"],
  [36, "MaxCapGainMinusApplcblLimitAmt"],
  [37, "SmllrNetMinTaxOrApplcblGainAmt"],
  [38, "SmallerCalculatedNetOrGainAmt"],
  [39, "GainMinusSmallerNetAmt"],
  [40, "FilingThresholdAmt"],
  [42, "ApplcblCapGainsOrSchDWrkshtAmt"],
  [43, "SumThresholdApplcblWrkshtAmt"],
  [44, "FlngThrshldLessThesholdSumAmt"],
  [45, "SmllrAdjNetGainOrTxblIncAmt"],
  [46, "NetAltMinTaxableIncTimesPctAmt"],
  [47, "SumOfSmllrAmt"],
  [48, "ExcessOfSumAmt"],
  [49, "ExcessOfSumTimesPctAmt"],
  [50, "TotalNetAmt"],
  [51, "NetSmallerSchDOrAdjNetGainAmt"],
  [52, "NetSchDOrAdjNetGainTimesPctAmt"],
  [53, "SumOfAltMinTaxPercentagesAmt"],
  [54, "NetAltMinTxblIncTimesFSPctAmt"],
  [55, "TaxOnAlternativeMinimumGainAmt"],
] as const;

/** Re-execute the byte-bound source and final credit settlement before native
 * projection. This document alone does not admit the public filing route or
 * establish the authenticity/acceptance of the reviewed prior facts. */
export async function stageForm8801NativeDocument(
  inputs: Readonly<Record<string, unknown>>,
  binding: unknown,
  documents: readonly SourceDocumentBytes[],
) {
  const result = await stageForm8801SettledReturn(inputs, binding, documents);
  // Line 21 must be positive in the schema. An instruction-level stop does
  // not authorize an empty or invalid attachment.
  const native_xml = result.fileRequired
    ? elements(
      "IRS8801",
      form8801NativeLineMap.map(([line, tag]) =>
        element(tag, result.lines[line])
      ),
    )
    : undefined;
  return { ...result, native_xml, filingReady: false as const };
}

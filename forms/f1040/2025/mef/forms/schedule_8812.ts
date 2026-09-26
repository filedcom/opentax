import { element, elements } from "../../../mef/xml.ts";
import {
  calculateSchedule8812Lines,
  type F8812Input,
  inputSchema,
} from "../../../nodes/inputs/f8812/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

function booleanElement(tag: string, value: boolean): string {
  return element(tag, String(value));
}

export const schedule8812: MefFormDescriptor<"f8812", F8812Input> = {
  pendingKey: "f8812",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040s8.pdf",
  build(rawFields) {
    if (Object.keys(rawFields).length === 0) return "";
    const fields = inputSchema.parse(rawFields);
    const lines = calculateSchedule8812Lines(2025, fields);
    if (!lines || (lines.line14 === 0 && lines.line27 === 0)) return "";
    return elements("IRS1040Schedule8812", [
      element("AdjustedGrossIncomeAmt", lines.line1),
      element("ExcldSect933PuertoRicoIncmAmt", lines.line2a),
      element("ExclusionAndDeductionSumAmt", lines.line2b),
      element("GrossIncomeExclusionAmt", lines.line2c),
      element("AdditionalIncomeAdjAmt", lines.line2d),
      element("ModifiedAGIAmt", lines.line3),
      element("QlfyChildUnderAgeSSNCnt", lines.line4),
      element("QlfyChildUnderAgeSSNLimtAmt", lines.line5),
      element("OtherDependentCnt", lines.line6),
      element("OtherDependentCreditAmt", lines.line7),
      element("InitialCTCODCAmt", lines.line8),
      element("FilingStatusThresholdCd", String(lines.line9)),
      element("ExcessAdjGrossIncomeAmt", lines.line10),
      element("ModifiedAGIPhaseOutAmt", lines.line11),
      booleanElement("CTCODCOverAGILimitInd", true),
      element("CTCODCAfterAGILimitAmt", lines.line12),
      element("ACTCTaxLiabiltyLimitAmt", lines.line13),
      element("CTCODCAmt", lines.line14),
      lines.line17 > 0
        ? elements("ClaimACTCAllFilersGrp", [
          element("ACTCBeforeLimitAmt", lines.line16a),
          element("QlfyChildUnderAgeSSNCnt", lines.line4),
          element("QlfyChildUnderAgeSSNLimtAmt", lines.line16b),
          element("ACTCAfterLimitAmt", lines.line17),
          element("TotalEarnedIncomeAmt", lines.line18a),
          element("NontaxableCombatPayAmt", lines.line18b),
          booleanElement(
            "EarnedIncmMoreThanSpecifiedInd",
            lines.line19 > 0,
          ),
          lines.line19 > 0
            ? element("NetTotalEarnedIncomeAmt", lines.line19)
            : "",
          element("NetEarnedIncomeCalculatedAmt", lines.line20),
          booleanElement("ThreeOrMoreQlfyChildrenInd", lines.line4 >= 3),
          lines.partIIBLines
            ? element("FromW2Amt", lines.partIIBLines.line21)
            : "",
          lines.partIIBLines
            ? element("FromTaxReturnAmt", lines.partIIBLines.line22)
            : "",
          lines.partIIBLines
            ? element("CalcFromW2AndReturnAmt", lines.partIIBLines.line23)
            : "",
          lines.partIIBLines
            ? element("CalcAmtFromRetPlusTaxWhldAmt", lines.partIIBLines.line24)
            : "",
          lines.partIIBLines
            ? element("CalculatedDifferenceAmt", lines.partIIBLines.line25)
            : "",
          lines.partIIBLines
            ? element("LargerCalcIncomeOrDiffAmt", lines.partIIBLines.line26)
            : "",
        ])
        : "",
      element("AdditionalChildTaxCreditAmt", lines.line27),
    ]);
  },
};

import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import { FilingStatus as HeaderFilingStatus } from "../../../mef/header.ts";
import { FilingStatus as NodeFilingStatus } from "../../../nodes/types.ts";
import {
  calculateSchedule8812Lines,
  type F8812Input,
  inputSchema,
} from "../../../nodes/inputs/f8812/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

const HEADER_STATUS: Readonly<Record<NodeFilingStatus, HeaderFilingStatus>> = {
  [NodeFilingStatus.Single]: HeaderFilingStatus.Single,
  [NodeFilingStatus.MFJ]: HeaderFilingStatus.MarriedFilingJointly,
  [NodeFilingStatus.MFS]: HeaderFilingStatus.MarriedFilingSeparately,
  [NodeFilingStatus.HOH]: HeaderFilingStatus.HeadOfHousehold,
  [NodeFilingStatus.QSS]: HeaderFilingStatus.QualifyingSurvivingSpouse,
};

const finalizedForm1040Schema = z.object({
  line11_agi: z.number(),
  line18_total_tax_before_credits: z.number().nonnegative(),
  line19_child_tax_credit: z.number().nonnegative().optional(),
  line28_actc: z.number().nonnegative().optional(),
});

function reconcileReturn(
  lines: NonNullable<ReturnType<typeof calculateSchedule8812Lines>>,
  context?: MefBuildContext,
): void {
  const form1040 = finalizedForm1040Schema.safeParse(context?.pending?.f1040);
  if (!context?.filer || !form1040.success) {
    throw new Error(
      "Schedule 8812 needs finalized Form 1040 AGI, line 18 tax, and filer status",
    );
  }
  if (HEADER_STATUS[lines.filingStatus] !== context.filer.filingStatus) {
    throw new Error(
      "Schedule 8812 filing status differs from the return header",
    );
  }
  if (lines.line1 !== form1040.data.line11_agi) {
    throw new Error(
      "Schedule 8812 AGI differs from finalized Form 1040 line 11a",
    );
  }
  if (lines.line18Tax !== form1040.data.line18_total_tax_before_credits) {
    throw new Error(
      "Schedule 8812 tax limit differs from finalized Form 1040 line 18",
    );
  }
  if (
    (form1040.data.line19_child_tax_credit ?? 0) !== lines.line14 ||
    (form1040.data.line28_actc ?? 0) !== lines.line27
  ) {
    throw new Error(
      "Schedule 8812 credits differ from finalized Form 1040 lines 19 and 28",
    );
  }
}

function booleanElement(tag: string, value: boolean): string {
  return element(tag, String(value));
}

export const schedule8812: MefFormDescriptor<"f8812", F8812Input> = {
  pendingKey: "f8812",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040s8.pdf",
  build(rawFields, context) {
    if (Object.keys(rawFields).length === 0) return "";
    const fields = inputSchema.parse(rawFields);
    const lines = calculateSchedule8812Lines(2025, fields);
    if (!lines || (lines.line14 === 0 && lines.line27 === 0)) return "";
    reconcileReturn(lines, context);
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

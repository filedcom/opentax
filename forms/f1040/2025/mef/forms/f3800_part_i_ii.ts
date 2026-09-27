import { element } from "../../../mef/xml.ts";
import type { Form3800NonpassiveLines } from "../../../nodes/inputs/f3800/calculation.ts";

/** Form 3800 Parts I and II in the element order of TY2025 IRS3800.xsd. */
export function form3800PartIAndIIXml(
  lines: Form3800NonpassiveLines,
): string[] {
  return [
    element("GeneralBusCrFromNnPssvActyAmt", lines.line1),
    lines.line2 > 0 ? element("CrSubjToPassiveActyLmtAmt", lines.line2) : "",
    lines.line3 > 0
      ? element("PssvActyForGenBusCrAllowedAmt", lines.line3)
      : "",
    element("CYCreditsNotAllwAgainstTMTAmt", lines.line6),
    element("RegularTaxBeforeCreditsAmt", lines.line7),
    element("AlternativeMinimumTaxAmt", lines.line8),
    element("AdjustedRegTaxBeforeCreditAmt", lines.line9),
    element("ForeignTaxCreditAmt", lines.line10a),
    element("CertainAllowableCreditsAmt", lines.line10b),
    element("TotalTaxCreditsAmt", lines.line10c),
    element("NetIncomeTaxAmt", lines.line11),
    element("NetRegularTaxAmt", lines.line12),
    element("ExcessNetRegularTaxAmt", lines.line13),
    element("TentativeMinimumTaxAmt", lines.line14),
    element("AdjustedExcessNetRegularTaxAmt", lines.line15),
    element("AdjustedNetIncomeTaxAmt", lines.line16),
    element("SmllrCYNotAllwTMTOrTotAdjAmt", lines.line17),
    lines.line23 > 0 || lines.line24 > 0
      ? element("TentativeMinimunTaxTimesPctAmt", lines.line18)
      : "",
    lines.line23 > 0 || lines.line24 > 0
      ? element("GreaterExcessOrTimesPctAmt", lines.line19)
      : "",
    lines.line23 > 0 || lines.line24 > 0
      ? element("NetIncmTaxLessGreaterExcessAmt", lines.line20)
      : "",
    lines.line23 > 0 || lines.line24 > 0
      ? element("SubSmllrFromNetLessGreaterAmt", lines.line21)
      : "",
    lines.line23 > 0 ? element("GBCFromPssvActyAllPartsAmt", lines.line23) : "",
    lines.line24 > 0 ? element("PassiveActyAllowedForTYAmt", lines.line24) : "",
    lines.line23 > 0 || lines.line24 > 0
      ? element("TotalPassiveActivityCreditAmt", lines.line25)
      : "",
    lines.line23 > 0 || lines.line24 > 0
      ? element("EmpwrZoneAndComEmploymentCrAmt", lines.line26)
      : "",
    element("NetIncomeTaxLessPctExcessAmt", lines.line27),
    element("SumSmllrEmpwrZnEmplmnCrAmt", lines.line28),
    element("NetSmllrAndEmpwrZnEmplmnCrAmt", lines.line29),
    lines.line30 > 0
      ? element("AllwGenBusCrFromNonPssvActyAmt", lines.line30)
      : "",
    lines.line32 > 0
      ? element("GenBusEligSmllBusPssvActyCrAmt", lines.line32)
      : "",
    lines.line33 > 0
      ? element("OtherSpecifiedAllwGenBusCrAmt", lines.line33)
      : "",
    element("TotAllwGenAndEligSmllBusCrAmt", lines.line36),
    element("SmllrGenBusCrOrTotGenEligCrAmt", lines.line37),
    element("CurrentYearCreditAllowedAmt", lines.line38),
  ];
}

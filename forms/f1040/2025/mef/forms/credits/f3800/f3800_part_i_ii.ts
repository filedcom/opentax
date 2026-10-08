import { element } from "../../../../../mef/xml.ts";
import type { Form3800NonpassiveLines } from "../../../../../nodes/inputs/f3800/calculation.ts";
import type { reconcileForm3800CarryforwardLinks } from "./f3800_carryforward_link.ts";

type CarryforwardLink = ReturnType<typeof reconcileForm3800CarryforwardLinks>;

/** Form 3800 Parts I and II in the element order of TY2025 IRS3800.xsd. */
export function form3800PartIAndIIXml(
  lines: Form3800NonpassiveLines,
  carryforward: CarryforwardLink,
): string[] {
  const hasEmpowermentSection = lines.line22 > 0 || lines.line23 > 0 ||
    lines.line24 > 0;
  if (lines.line4 > 0 && carryforward.standardDocumentIds.length === 0) {
    throw new Error("Form 3800 line 4 needs its carryforward computation");
  }
  return [
    element("GeneralBusCrFromNnPssvActyAmt", lines.line1),
    lines.line2 > 0 ? element("CrSubjToPassiveActyLmtAmt", lines.line2) : "",
    lines.line3 > 0
      ? element("PssvActyForGenBusCrAllowedAmt", lines.line3)
      : "",
    lines.line4 > 0
      ? element("CYGeneralBusCrCarryforwardAmt", lines.line4, {
        referenceDocumentId: carryforward.standardDocumentIds.join(" "),
        referenceDocumentName: "CarryforwardGeneralBusinessCr",
        ...(carryforward.standardRevised
          ? { carryforwardChgdOrRevsInd: "X" }
          : {}),
      })
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
    hasEmpowermentSection
      ? element("TentativeMinimunTaxTimesPctAmt", lines.line18)
      : "",
    hasEmpowermentSection
      ? element("GreaterExcessOrTimesPctAmt", lines.line19)
      : "",
    hasEmpowermentSection
      ? element("NetIncmTaxLessGreaterExcessAmt", lines.line20)
      : "",
    hasEmpowermentSection
      ? element("SubSmllrFromNetLessGreaterAmt", lines.line21)
      : "",
    lines.line22 > 0
      ? element("TotEmpwrZoneGenBusCreditsAmt", lines.line22)
      : "",
    lines.line23 > 0 ? element("GBCFromPssvActyAllPartsAmt", lines.line23) : "",
    lines.line24 > 0 ? element("PassiveActyAllowedForTYAmt", lines.line24) : "",
    hasEmpowermentSection
      ? element("TotalPassiveActivityCreditAmt", lines.line25)
      : "",
    hasEmpowermentSection
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
    lines.line34 > 0
      ? element("AllwGenAndEligSmllBusCfwdCrAmt", lines.line34, {
        ...(carryforward.specifiedRevised
          ? { carryforwardChgdOrRevsInd: "X" }
          : {}),
      })
      : "",
    element("TotAllwGenAndEligSmllBusCrAmt", lines.line36),
    element("SmllrGenBusCrOrTotGenEligCrAmt", lines.line37),
    element("CurrentYearCreditAllowedAmt", lines.line38),
  ];
}

import { element, elements } from "../../../mef/xml.ts";
import {
  type F8854Input,
  inputSchema,
  isCoveredExpatriate,
} from "../../../nodes/inputs/f8854/index.ts";
import { calculateSectionDDeferral } from "../../../nodes/inputs/f8854/section-d.ts";

/** IRS8854 Part II Section D in 2025v5.4 XSD order. */
export function buildForm8854SectionD(rawInput: F8854Input): string {
  const input = inputSchema.parse(rawInput);
  if (!isCoveredExpatriate(input)) {
    if (input.section_d.elect_deferral) {
      throw new Error("Only covered expatriates can elect Section D deferral");
    }
    return "";
  }
  if (!input.section_d.elect_deferral) {
    return elements("ExptrtTaxDeferralGrp", [
      element("TaxDeferSect877AbElectionInd", "false"),
    ]);
  }
  if (input.section_c === null) {
    throw new Error("Section D deferral requires Section C property facts");
  }
  const deferral = calculateSectionDDeferral(input.section_c, input.section_d);
  if (!deferral) throw new Error("Section D election calculation is missing");
  return elements("ExptrtTaxDeferralGrp", [
    element("TaxDeferSect877AbElectionInd", "true"),
    element(
      "TotalTaxWithSect877AaAmt",
      input.section_d.hypothetical_return_with_877a.form_1040_line_24_tax,
    ),
    element(
      "TotalTaxWithoutSect877AaAmt",
      input.section_d.hypothetical_return_without_877a.form_1040_line_24_tax,
    ),
    element("TaxEligibleForDeferralAmt", deferral.taxEligibleForDeferral),
  ]);
}

/** Native per-property tax allocation statement for elected assets only. */
export function buildForm8854DeferredPropertyStatement(
  rawInput: F8854Input,
): string {
  const input = inputSchema.parse(rawInput);
  if (!input.section_d.elect_deferral) return "";
  if (!isCoveredExpatriate(input) || input.section_c === null) {
    throw new Error(
      "Section D deferral requires covered expatriate Section C facts",
    );
  }
  const deferral = calculateSectionDDeferral(input.section_c, input.section_d);
  if (!deferral) throw new Error("Section D election calculation is missing");
  return elements(
    "DeferredPropertyTaxElectStmt",
    deferral.properties.filter((row) => row.deferredTax > 0).map((row) =>
      elements("DeferredPropertyTaxElectGrp", [
        element("PropertyDesc", row.description),
        element("GainAfterAllocationExclAmt", row.gainAfterExclusion),
        element("TotalBuiltInGainAmt", row.totalGainAfterExclusion),
        element("TaxEligibleForDeferralAmt", row.taxEligibleForDeferral),
        element("DeferredTaxAmt", row.deferredTax),
      ])
    ),
  );
}

import { element, elements } from "../../../../../mef/xml.ts";
import {
  calculateForm8911PropertyAmounts,
  computePersonalCreditAmounts,
  type F8911Input,
  type F8911Property,
  personalCreditProperties,
} from "../../../../../nodes/inputs/credits/business/f8911/index.ts";
import type { MefFormDescriptor } from "../../../form-descriptor.ts";

type Input = Partial<F8911Input> & Record<string, unknown>;

function propertyDocuments(fields: Input): readonly string[] {
  if (Object.keys(fields).length === 0) return [];
  const amounts = computePersonalCreditAmounts(fields as F8911Input);
  if (!amounts || amounts.allowedCredit === 0) return [];
  return personalCreditProperties(fields as F8911Input).map(
    buildForm8911PropertyXml,
  );
}

/** Property presentation; callers still must reconcile eligibility and filing sources. */
export function buildForm8911PropertyXml(input: F8911Property): string {
  const address = input.property_us_address;
  if (!address) {
    throw new Error("Form 8911 property needs a structured address");
  }
  const credit = calculateForm8911PropertyAmounts(input);
  const business = credit.businessUseFraction > 0;
  const personal = credit.businessUseFraction < 1;
  if (
    Number(credit.businessUseFraction.toFixed(5)) !== credit.businessUseFraction
  ) {
    throw new Error(
      "Form 8911 business percentage exceeds MeF five-decimal ratio precision",
    );
  }
  return elements("IRS8911ScheduleA", [
    element("FacilityDesc", input.property_description),
    elements("FacilityUSAddress", [
      element("AddressLine1Txt", address.line1),
      element("AddressLine2Txt", address.line2),
      element("CityNm", address.city),
      element("StateAbbreviationCd", address.state),
      element("ZIPCd", address.zip),
    ]),
    element("FacilityConstructionStartDt", input.construction_began),
    element("FacilityPlacedInServiceDt", input.placed_in_service),
    element(
      "PlacedInSrvcEligCensusTractInd",
      String(input.eligible_census_tract),
    ),
    element("CensusTractId2015GEOIDNum", input.census_tract_geoid),
    element("CertificationOrPermitNum", input.certification_permit_number),
    element("TotQlfyPropertyCostCreditAmt", credit.cost),
    ...(business
      ? [
        element("BusinessInvestmentUsePct", String(credit.businessUseFraction)),
        element("BusinessInvestmentUseAmt", credit.businessCost),
        element("Section179ExpenseDeductionAmt", credit.section179Deduction),
        element("NetBusinessUsePartAmt", credit.netBusinessCost),
        element("PWARequirementMetInd", String(credit.businessRate === 0.30)),
        element("TotBusinessUsePartAmt", credit.businessCreditBeforeCap),
        element("SmallerTotOrMaxBusUsePartAmt", credit.businessCredit),
      ]
      : []),
    ...(personal
      ? [
        element("PropertyUsedMainHomeInd", String(input.main_home_property)),
        ...(input.main_home_property
          ? [
            element("TotQlfyPropLessBusInvstUseAmt", credit.personalCost),
            element(
              "AdjustedPersonalUsePartAmt",
              credit.personalCreditBeforeCap,
            ),
            element("TotalPersonalUsePartOfCrAmt", credit.personalCredit),
          ]
          : []),
      ]
      : []),
  ]);
}

export const form8911ScheduleA: MefFormDescriptor<"f8911", Input> = {
  pendingKey: "f8911",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8911sa.pdf",
  build(fields) {
    return propertyDocuments(fields)[0] ?? "";
  },
  buildAdditionalDocuments(fields) {
    return propertyDocuments(fields).slice(1);
  },
};

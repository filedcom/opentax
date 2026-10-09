import { reconcileForm8911BusinessFiling } from "./f8911_source.ts";
import { element, elements } from "../../../../../mef/xml.ts";
import {
  calculateForm8911PropertyAmounts,
  computePersonalCreditAmounts,
  type F8911Input,
  type F8911Property,
  personalCreditProperties,
} from "../../../../../nodes/inputs/credits/business/f8911/index.ts";
import type {
  MefBuildContext,
  MefFormDescriptor,
} from "../../../form-descriptor.ts";

type Input = Partial<F8911Input> & Record<string, unknown>;

function propertyDocuments(
  fields: Input,
  context: MefBuildContext = {},
): readonly string[] {
  if (Object.keys(fields).length === 0) return [];
  const raw = fields as F8911Input;
  const business = (raw.properties ?? [raw]).some((p) =>
    (p.business_use_pct ?? 0) > 0
  );
  if (business) {
    if (!context.pending) {
      throw new Error(
        "Form 8911 business credit requires the Form 3800 path and reconciled filing sources",
      );
    }
    reconcileForm8911BusinessFiling(raw, context.pending);
  } else {
    const amounts = computePersonalCreditAmounts(raw);
    if (!amounts || amounts.allowedCredit === 0) return [];
  }
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
  build(fields, context) {
    return propertyDocuments(fields, context)[0] ?? "";
  },
  buildAdditionalDocuments(fields, context) {
    return propertyDocuments(fields, context).slice(1);
  },
};

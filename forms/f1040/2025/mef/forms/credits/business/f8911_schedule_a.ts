import { element, elements } from "../../../../../mef/xml.ts";
import {
  computePersonalCreditAmounts,
  type F8911Input,
  personalCreditProperties,
} from "../../../../../nodes/inputs/credits/business/f8911/index.ts";
import type { MefFormDescriptor } from "../../../form-descriptor.ts";

type Input = Partial<F8911Input> & Record<string, unknown>;

function propertyDocuments(fields: Input): readonly string[] {
  if (Object.keys(fields).length === 0) return [];
  const amounts = computePersonalCreditAmounts(fields as F8911Input);
  if (!amounts || amounts.allowedCredit === 0) return [];
  return personalCreditProperties(fields as F8911Input).map((input) => {
    const address = input.property_us_address!;
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
      element("PlacedInSrvcEligCensusTractInd", "true"),
      element("CensusTractId2015GEOIDNum", input.census_tract_geoid),
      element("CertificationOrPermitNum", input.certification_permit_number),
      element("TotQlfyPropertyCostCreditAmt", input.cost),
      element("PropertyUsedMainHomeInd", "true"),
      element("TotQlfyPropLessBusInvstUseAmt", input.cost),
      element("AdjustedPersonalUsePartAmt", input.cost * 0.30),
      element(
        "TotalPersonalUsePartOfCrAmt",
        Math.min(input.cost * 0.30, 1_000),
      ),
    ]);
  });
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

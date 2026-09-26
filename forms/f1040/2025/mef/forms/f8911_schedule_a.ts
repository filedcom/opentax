import { element, elements } from "../../../mef/xml.ts";
import {
  computePersonalCreditAmounts,
  type F8911Input,
} from "../../../nodes/inputs/f8911/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

type Input = Partial<F8911Input> & Record<string, unknown>;

export const form8911ScheduleA: MefFormDescriptor<"f8911", Input> = {
  pendingKey: "f8911",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8911sa.pdf",
  build(fields) {
    if (Object.keys(fields).length === 0) return "";
    const input = fields as F8911Input;
    const amounts = computePersonalCreditAmounts(input);
    if (!amounts || amounts.allowedCredit === 0) return "";
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
      element("TotQlfyPropertyCostCreditAmt", input.cost),
      element("PropertyUsedMainHomeInd", "true"),
      element("TotQlfyPropLessBusInvstUseAmt", input.cost),
      element("AdjustedPersonalUsePartAmt", input.cost * 0.30),
      element("TotalPersonalUsePartOfCrAmt", amounts.tentativeCredit),
    ]);
  },
};

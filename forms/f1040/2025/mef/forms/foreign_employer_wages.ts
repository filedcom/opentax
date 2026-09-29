import { element, elements } from "../../../mef/xml.ts";
import {
  type PhysicalPresenceFiling,
  physicalPresenceFilingSchema,
} from "../../../nodes/intermediate/forms/form2555/calculation.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

function filingDetails(
  context?: MefBuildContext,
): PhysicalPresenceFiling | null {
  const pending = context?.pending?.form2555;
  if (
    !pending || typeof pending !== "object" || !("filing_details" in pending)
  ) {
    return null;
  }
  return physicalPresenceFilingSchema.parse(pending.filing_details);
}

function foreignAddress(
  tag: string,
  address: PhysicalPresenceFiling["foreign_address"],
): string {
  return elements(tag, [
    element("AddressLine1Txt", address.line1),
    element("AddressLine2Txt", address.line2),
    element("CityNm", address.city),
    element("ProvinceOrStateNm", address.province_or_state),
    element("CountryCd", address.country_code),
    element("ForeignPostalCd", address.postal_code),
  ]);
}

export const fecRecord: MefFormDescriptor<"fec_record", unknown> = {
  pendingKey: "fec_record",
  sourcePendingKeys: ["form2555"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/p4164.pdf",
  build(_fields, context) {
    const filing = filingDetails(context);
    if (!filing) return "";
    const filer = context?.filer;
    if (!filer?.primarySSN || !filer.nameControl || !filer.nameLine1) {
      throw new Error("FEC record needs taxpayer TIN, name, and name control");
    }
    return elements("FECRecord", [
      element("EmployeeTIN", filer.primarySSN.replaceAll("-", "")),
      element("EmployeeNameControlTxt", filer.nameControl),
      element("EmployeeNm", filer.nameLine1),
      foreignAddress("ForeignAddress", filing.foreign_address),
      elements("ForeignEmployerBusinessName", [
        element("BusinessNameLine1Txt", filing.employer_name),
      ]),
      foreignAddress("ForeignEmployerAddress", filing.employer_foreign_address),
      element("ForeignEmployerCompensationAmt", filing.foreign_wages),
    ]);
  },
};

export const wagesNotShownSchedule: MefFormDescriptor<
  "wages_not_shown_schedule",
  unknown
> = {
  pendingKey: "wages_not_shown_schedule",
  sourcePendingKeys: ["form2555"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/p4164.pdf",
  build(_fields, context) {
    const filing = filingDetails(context);
    if (!filing) return "";
    return elements("WagesNotShownSchedule", [
      elements("WagesNotShownSch", [
        element("WagesLiteralCd", "FEC"),
        element("WagesNotShownAmt", filing.foreign_wages),
      ]),
    ]);
  },
};

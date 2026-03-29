import { element, elements } from "./xml.ts";
import type { FilerIdentity } from "./types.ts";

export function buildReturnHeader(
  filer?: FilerIdentity,
  year = 2025,
  returnType = "1040",
): string {
  const returnTypeEl = element("ReturnType", returnType);
  const beginDate = element("TaxPeriodBeginDate", `${year}-01-01`);
  const endDate = element("TaxPeriodEndDate", `${year}-12-31`);

  if (filer === undefined) {
    return elements("ReturnHeader", [returnTypeEl, beginDate, endDate]);
  }

  const usAddress = elements("USAddress", [
    element("AddressLine1Txt", filer.address.line1),
    element("CityNm", filer.address.city),
    element("StateAbbreviationCd", filer.address.state),
    element("ZIPCd", filer.address.zip),
  ]);

  const filerBlock = elements("Filer", [
    element("PrimarySSN", filer.primarySSN),
    element("NameLine1Txt", filer.nameLine1),
    element("PrimaryNameControlTxt", filer.nameControl),
    usAddress,
  ]);

  const filingStatus = element("FilingStatusCd", String(filer.filingStatus));

  return elements("ReturnHeader", [
    returnTypeEl,
    beginDate,
    endDate,
    filerBlock,
    filingStatus,
  ]);
}

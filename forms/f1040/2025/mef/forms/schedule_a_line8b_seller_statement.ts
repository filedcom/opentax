import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import { sellerFinancedLine8b } from "../../schedule_a_line8b_source.ts";

export const scheduleALine8bSellerStatement: MefFormDescriptor<
  "schedule_a_line8b_seller_statement",
  unknown
> = {
  pendingKey: "schedule_a_line8b_seller_statement",
  sourcePendingKeys: ["schedule_a"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040sa--2025.pdf",
  build(_fields, context) {
    const pending = context?.pending;
    const source = pending?.schedule_a;
    const returnFields = pending?.f1040;
    if (
      !source || typeof source !== "object" || Array.isArray(source) ||
      !returnFields || typeof returnFields !== "object" ||
      Array.isArray(returnFields) ||
      (returnFields as Record<string, unknown>).line12e_itemized_deductions ===
        undefined
    ) return "";
    const seller = sellerFinancedLine8b(source as Record<string, unknown>);
    if (!seller) return "";
    return elements("F1098RecpntNmTINAddrStatement", [
      elements("Form1098RecipientNmTINAddrStmt", [
        element("PersonNm", seller.seller_name),
        element(seller.tin_type === "ssn" ? "SSN" : "EIN", seller.seller_tin),
        elements("USAddress", [
          element("AddressLine1Txt", seller.address.line1),
          element("CityNm", seller.address.city),
          element("StateAbbreviationCd", seller.address.state),
          element("ZIPCd", seller.address.zip.replace(/\D/g, "")),
        ]),
      ]),
    ]);
  },
};

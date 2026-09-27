import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm8874,
  inputSchema,
} from "../../../nodes/inputs/f8874/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export function buildForm8874Document(raw: unknown): string {
  const input = inputSchema.parse(raw);
  const lines = calculateForm8874(input);
  return elements("IRS8874", [
    ...lines.rows.map(({ investment, rate, creditAmount }) =>
      elements("CurrentYearCreditInfo", [
        elements("CDEName", [
          element("BusinessNameLine1Txt", investment.cde_name),
        ]),
        elements("USAddress", [
          element("AddressLine1Txt", investment.cde_address.line1),
          element("CityNm", investment.cde_address.city),
          element("StateAbbreviationCd", investment.cde_address.state),
          element("ZIPCd", investment.cde_address.zip),
        ]),
        element("EIN", investment.cde_ein),
        element("InitialInvestmentDt", investment.initial_investment_date),
        element(
          "EquityInvestmentAmt",
          investment.qualified_equity_investment_amount,
        ),
        element("CreditRt", rate),
        element("CreditByRatioAmt", creditAmount),
      ])
    ),
    element("CDETotalCreditAmt", lines.line1),
    element("TotalCreditAmt", lines.line3),
  ]);
}

export const form8874: MefFormDescriptor<"f8874", unknown> = {
  pendingKey: "f8874",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8874.pdf",
  build(raw, context) {
    if (raw === undefined || raw === null) return "";
    const lines = calculateForm8874(inputSchema.parse(raw));
    if (context?.pending) {
      const claim = context.pending.f3800;
      if (
        !claim || typeof claim !== "object" ||
        !("f8874_credit" in claim) ||
        !claim.f8874_credit || typeof claim.f8874_credit !== "object" ||
        !("credit_amount" in claim.f8874_credit) ||
        claim.f8874_credit.credit_amount !== lines.line3
      ) {
        throw new Error("Form 8874 credit does not reconcile to Form 3800");
      }
    }
    if (
      context?.documentIdsByPendingKey &&
      context.documentIdsByPendingKey.f3800?.length !== 1
    ) {
      throw new Error("Form 8874 current-year credit needs attached Form 3800");
    }
    return buildForm8874Document(raw);
  },
};

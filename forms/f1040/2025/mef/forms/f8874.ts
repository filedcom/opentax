import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm8874,
  inputSchema,
} from "../../../nodes/inputs/f8874/index.ts";
import {
  inputSchema as f8582crInputSchema,
  PassiveCreditReportingRoute,
  PassiveCreditSourceOrigin,
} from "../../../nodes/intermediate/forms/form8582cr/index.ts";
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
      const direct = claim && typeof claim === "object" &&
          "f8874_credit" in claim && claim.f8874_credit &&
          typeof claim.f8874_credit === "object" &&
          "credit_amount" in claim.f8874_credit
        ? claim.f8874_credit.credit_amount
        : 0;
      if (direct !== lines.nonpassiveCredit) {
        throw new Error("Form 8874 credit does not reconcile to Form 3800");
      }
      const passiveRows = lines.rows.filter((row) =>
        row.investment.subject_to_passive_activity_limit
      );
      if (passiveRows.length > 0) {
        const passive = f8582crInputSchema.parse(context.pending.form8582cr);
        const sources = passive.credit_sources.filter((source) =>
          source.source_form === "Form 8874" &&
          source.reporting_route ===
            PassiveCreditReportingRoute.Form3800Line3 &&
          source.form3800_credit_line === "1i" &&
          source.source_origin.kind === PassiveCreditSourceOrigin.Self &&
          source.current_year_credit > 0
        );
        if (
          passiveRows.length !== sources.length ||
          passiveRows.some((row) =>
            !sources.some((source) =>
              source.activity_reference ===
                row.investment.passive_activity_reference &&
              source.source_document_reference ===
                row.investment.passive_source_document_reference &&
              source.current_year_credit === row.creditAmount
            )
          )
        ) {
          throw new Error(
            "Form 8874 passive credit does not reconcile to Form 8582-CR",
          );
        }
      }
    }
    if (
      context?.documentIdsByPendingKey &&
      context.documentIdsByPendingKey.f3800?.length !== 1
    ) {
      throw new Error("Form 8874 current-year credit needs attached Form 3800");
    }
    if (
      lines.passiveCredit > 0 && context?.documentIdsByPendingKey &&
      context.documentIdsByPendingKey.form8582cr?.length !== 1
    ) {
      throw new Error(
        "Form 8874 passive credit needs attached Form 8582-CR",
      );
    }
    return buildForm8874Document(raw);
  },
};

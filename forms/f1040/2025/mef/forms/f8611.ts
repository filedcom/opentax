import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm8611,
  type F8611Item,
  inputSchema,
} from "../../../nodes/inputs/f8611/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

function building(item: F8611Item): string {
  const address = item.building_us_address;
  const bond = item.tax_exempt_bond;
  const lines = calculateForm8611(item);
  return elements("IRS8611", [
    elements("BuildingUSAddress", [
      element("AddressLine1Txt", address.line1),
      address.line2 ? element("AddressLine2Txt", address.line2) : "",
      element("CityNm", address.city),
      element("StateAbbreviationCd", address.state),
      element("ZIPCd", address.zip),
    ]),
    element("BIN", item.building_bin),
    element("PlacedInServiceDt", item.placed_in_service_date),
    bond
      ? elements("IssuerName", [
        element("BusinessNameLine1Txt", bond.issuer_name),
      ])
      : "",
    bond ? element("IssueDt", bond.issue_date) : "",
    bond ? element("IssueNm", bond.issue_name) : "",
    bond?.cusip ? element("CUSIPNum", bond.cusip) : "",
    bond?.no_cusip ? element("MissingCUSIPReasonCd", "NONE") : "",
    lines.line1 === undefined
      ? ""
      : element("PYTotalCreditsOnForm8586Amt", lines.line1),
    lines.line2 === undefined
      ? ""
      : element("CreditsIncludedAmt", lines.line2),
    lines.line3 === undefined
      ? ""
      : element("CreditsSubjectToRecaptureAmt", lines.line3),
    lines.line4 === undefined
      ? ""
      : element("CreditRecapturePercentRt", lines.line4.toFixed(3)),
    lines.line5 === undefined
      ? ""
      : element("AcceleratedPortionOfCreditAmt", lines.line5),
    lines.line6 === undefined
      ? ""
      : element("DecreaseInQualifiedBasisPctRt", lines.line6),
    lines.line7 === undefined
      ? ""
      : element("AcceleratedPrtnRecapturedAmt", lines.line7),
    lines.line8 === undefined
      ? ""
      : element("FlowThruEntityRecaptureAmt", lines.line8),
    element("AcceleratedPrtnOfUnsdCreditAmt", lines.line9),
    element("NetRecaptureAmt", lines.line10),
    element(
      "InterestOnRecaptureAmt",
      lines.line11,
      item.calculation.source_type === "pass_through" &&
        item.calculation.section42j5_partnership_interest_included
        ? { section42j5Cd: "SECTION 42(j)(5)" }
        : undefined,
    ),
    element("TotalSubjectToRecaptureAmt", lines.line12),
    element("UnusedCreditRedByAccelPrtnAmt", lines.line13),
    element("RecaptureTaxAmt", lines.line14),
    element("CarryforwardCreditAmt", lines.line15),
  ]);
}

export const form8611: MefFormDescriptor<"f8611", unknown, readonly string[]> = {
  pendingKey: "f8611",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8611.pdf",
  build(raw, context?: MefBuildContext) {
    if (!raw || typeof raw !== "object" || !("f8611s" in raw)) return [];
    const input = inputSchema.parse(raw);
    const total = input.f8611s.reduce(
      (sum, item) => sum + calculateForm8611(item).line14,
      0,
    );
    if (context?.pending && total > 0) {
      const schedule2 = context.pending.schedule2;
      const claimed = schedule2 && typeof schedule2 === "object"
        ? (schedule2 as Record<string, unknown>).line16_lihtc_recapture
        : undefined;
      if (typeof claimed !== "number" || Math.abs(claimed - total) > 0.005) {
        throw new Error(
          "Form 8611 line 14 total differs from Schedule 2 line 16",
        );
      }
    }
    return input.f8611s.map(building);
  },
};

import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm8582CR,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8582cr/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export const form8582cr: MefFormDescriptor<"form8582cr", unknown> = {
  pendingKey: "form8582cr",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8582cr.pdf",
  build(raw) {
    if (!raw || typeof raw !== "object" || !("credit_sources" in raw)) {
      return "";
    }
    const lines = calculateForm8582CR(inputSchema.parse(raw));
    if (lines.partI.line5 === 0) return "";
    const { rental, rehabilitation, housing, other } = lines.partI;
    return elements("IRS8582CR", [
      rental.total > 0
        ? elements("RentalCreditGrp", [
          element("CurrentYearCreditAmt", rental.current),
          element("PriorUnallowedCreditAmt", rental.prior),
          element("TotalCreditAmt", rental.total),
        ])
        : "",
      rehabilitation.total > 0
        ? elements("RehabilitationCreditGrp", [
          element("CurrentYearCreditAmt", rehabilitation.current),
          element("PriorUnallowedCreditAmt", rehabilitation.prior),
          element("TotalCreditAmt", rehabilitation.total),
        ])
        : "",
      housing.total > 0
        ? elements("LowIncomeCreditGrp", [
          element("CurrentYearCreditAmt", housing.current),
          element("PriorUnallowedCreditAmt", housing.prior),
          element("TotalCreditAmt", housing.total),
        ])
        : "",
      other.total > 0
        ? elements("AllPassiveCreditGrp", [
          element("OtherCurrentYearAmt", other.current),
          element("OtherPriorUnallowedAmt", other.prior),
          element("TotalOtherCreditsAmt", other.total),
        ])
        : "",
      element("TotalCreditAmt", lines.partI.line5),
      element("NetPassiveIncomeTaxAmt", lines.partI.line6),
      element("TotalCreditMinusTaxAmt", lines.partI.line7),
      lines.partII
        ? elements("SpecialAllowActiveGrp", [
          element("SmallerAmt", lines.partII.line8),
          element("TotalArcherMSADistributionAmt", lines.partII.line9),
          element("ModifiedAGIAmt", lines.partII.line10),
          element("NetAGIAmt", lines.partII.line11),
          element("PercentNetAGIAmt", lines.partII.line12),
          element("AllowedRentalRealtyLossAmt", lines.partII.line13),
          element("TaxableAmt", lines.partII.line14),
          element("AttributableTaxAmt", lines.partII.line15),
          element("SmallestTaxAmt", lines.partII.line16),
        ])
        : "",
      element("AllowedCreditsAmt", lines.line37),
    ]);
  },
};

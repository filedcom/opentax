import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import { reconcileForm8941DocumentSource } from "./f8941_source.ts";

/** Staged TY2025 IRS8941.xsd order; intentionally absent from the registry. */
export const form8941: MefFormDescriptor<"f8941", unknown> = {
  pendingKey: "f8941",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8941--2025.pdf",
  build(raw, context) {
    if (raw === undefined || raw === null) return "";
    if (!context?.pending) {
      throw new Error("Form 8941 needs its filed Schedule C source");
    }
    const { source, lines } = reconcileForm8941DocumentSource(
      raw,
      context.pending,
      context.filer,
    );
    return elements("IRS8941", [
      element("PersonNm", source.owner_name),
      element("SSN", source.owner_ssn),
      element("SHOPInd", "true"),
      element("SHOPIdentificationNum", source.shop_marketplace_identifier),
      element("EmplmnTaxesReportEmployerEIN", source.employment_ein),
      element("PriorYearSHOPInd", "false"),
      element("SmllEmplrHIPIndivEmpldForCrCnt", lines.line1),
      element("SmllEmplrHIPFTEEmplForTaxYrCnt", lines.line2),
      element("AvgAnnualWagesPdForTxYrAmt", lines.line3),
      element("HIPPaidForEmplEmployedForCrAmt", lines.line4),
      element("SmllEmplrHIPPotentiallyPaidAmt", lines.line5),
      element("SmllEmplrEligibleHIPPaidAmt", lines.line6),
      element("SmllEmplrEligHIPTimesPctAmt", lines.line7),
      element("SmllEmplrHIPFTECreditAmt", lines.line8),
      element("AnnualWgPdLessThanSpecifiedAmt", lines.line9),
      element("TotStPremSbsdyPdOrCrForHIPAmt", lines.line10),
      element("HIPPdLessTotStPremOrCrAmt", lines.line11),
      element("SmallerAnnualWgPdOrHIPPdAmt", lines.line12),
      element("PaidHIPForEmplForPrpsOfCrCnt", lines.line13),
      element("FTEEmplPdHIPForPrpsOfCrCnt", lines.line14),
      element("SumSmllrAmtAndCreditForHIPAmt", lines.line16),
    ]);
  },
};

import type { inputSchema } from "../../../nodes/intermediate/forms/form8995/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import { element, elements } from "../../../mef/xml.ts";
import { assertOneBusiness8995 } from "./f8995-route.ts";

type Input = Partial<ReturnType<typeof inputSchema.parse>> & {
  qbi_deduction?: number | null;
};

export const form8995: MefFormDescriptor<"form8995", Input> = {
  pendingKey: "form8995",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8995--2025.pdf",
  build(fields, context) {
    const deduction = fields.qbi_deduction;
    if (deduction === undefined || deduction === null || deduction === 0) {
      return "";
    }
    if (
      typeof deduction !== "number" || !Number.isFinite(deduction) ||
      deduction < 0
    ) {
      throw new Error("Form 8995 needs a valid nonnegative QBI deduction");
    }
    const { businessName, tin, qbi, lines } = assertOneBusiness8995(
      fields as Record<string, unknown>,
      context?.pending,
    );
    return elements("IRS8995", [
      elements("QualifiedBusinessIncomeDedGrp", [
        elements("TradeOrBusinessName", [
          element("BusinessNameLine1Txt", businessName),
        ]),
        element(tin.kind === "ein" ? "EIN" : "SSN", tin.value),
        element("QlfyBusinessIncomeOrLossAmt", qbi),
      ]),
      element("TotQlfyBusinessIncomeOrLossAmt", lines[2]),
      element("PYQlfyBusinessNetLossCfwdAmt", lines[3]),
      element("TotQualifiedBusinessIncomeAmt", lines[4]),
      element("QBIComponentAmt", lines[5]),
      element("QlfyREITDivPTPIncomeLossAmt", lines[6]),
      element("PYQlfyREITDivPTPLossCfwdAmt", lines[7]),
      element("TotQlfyREITDivPTPIncomeAmt", lines[8]),
      element("REITPTPComponentAmt", lines[9]),
      element("QBIDedBfrIncomeLimitationAmt", lines[10]),
      element("TaxableIncomeBeforeQBIDedAmt", lines[11]),
      element("NetCapitalGainAmt", lines[12]),
      element("AdjustedTaxableIncomeAmt", lines[13]),
      element("IncomeLimitationAmt", lines[14]),
      element("QualifiedBusinessIncomeDedAmt", lines[15]),
      element("TotQlfyBusLossCarryforwardAmt", lines[16]),
      element("TotQlfyREITDivPTPLossCfwdAmt", lines[17]),
    ]);
  },
};

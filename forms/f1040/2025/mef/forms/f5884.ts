import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm5884,
  inputSchema,
} from "../../../nodes/inputs/f5884/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export const form5884: MefFormDescriptor<"f5884", unknown> = {
  pendingKey: "f5884",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f5884.pdf",
  build(raw, context) {
    if (!raw || typeof raw !== "object" || !("f5884s" in raw)) return "";
    const source = inputSchema.parse(raw);
    const lines = calculateForm5884(source);
    if (lines.line4 <= 0) return "";
    if (source.subject_to_passive_activity_limit) {
      throw new Error(
        "Form 5884 passive credit needs Form 8582-CR before Form 3800",
      );
    }
    if (
      context?.documentIdsByPendingKey &&
      context.documentIdsByPendingKey.f3800?.length !== 1
    ) {
      throw new Error("Form 5884 source credit needs attached Form 3800");
    }
    return elements("IRS5884", [
      lines.line1aWages > 0
        ? element("WagesBetween120And399HrsAmt", lines.line1aWages)
        : "",
      lines.line1aCredit > 0
        ? element("TotWagesBetween120And399HrsAmt", lines.line1aCredit)
        : "",
      lines.line1bWages > 0
        ? element("Wages400OrMoreHoursAmt", lines.line1bWages)
        : "",
      lines.line1bCredit > 0
        ? element("Wages400OrMoreHoursCreditAmt", lines.line1bCredit)
        : "",
      lines.line1cWages > 0
        ? element("SecondYearWagesAmt", lines.line1cWages)
        : "",
      lines.line1cCredit > 0
        ? element("TotalSecondYearWagesAmt", lines.line1cCredit)
        : "",
      element("TotalWagesAmt", lines.line2),
      element("TotalCreditsAmt", lines.line4),
    ]);
  },
};

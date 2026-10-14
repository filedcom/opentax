import { element, elements } from "../../../../../mef/xml.ts";
import type { MefFormDescriptor } from "../../../form-descriptor.ts";
import { reconcileForm8844DirectEmployer } from "./f8844_source.ts";

export const form8844: MefFormDescriptor<"f8844", unknown> = {
  pendingKey: "f8844",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8844.pdf",
  build(raw, context) {
    if (!raw || typeof raw !== "object" || !("f8844s" in raw)) return "";
    if (!context?.pending) {
      throw new Error("Form 8844 needs the linked filed return");
    }
    const { lines } = reconcileForm8844DirectEmployer(context.pending);
    if (
      context.documentIdsByPendingKey &&
      context.documentIdsByPendingKey.f3800?.length !== 1
    ) {
      throw new Error("Form 8844 needs one attached Form 3800");
    }
    return elements("IRS8844", [
      element("TotalQualifiedEmpwrZoneWgsAmt", lines.line1),
      element("CurrentYearCreditAmt", lines.line2),
      element("TotalCurrentYearEZRCECreditAmt", lines.line4),
    ]);
  },
};

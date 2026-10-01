import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import { reconcileForm8882DirectEmployer } from "./f8882_source.ts";

/** TY2025 IRS8882.xsd direct-employer projection. */
export const form8882: MefFormDescriptor<"f8882", unknown> = {
  pendingKey: "f8882",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8882.pdf",
  build(raw, context) {
    if (raw === undefined || raw === null) return "";
    if (
      !context?.pending ||
      context.documentIdsByPendingKey?.f3800?.length !== 1
    ) {
      throw new Error("Form 8882 needs one linked Form 3800 and Schedule C");
    }
    const { source, lines } = reconcileForm8882DirectEmployer(
      raw,
      context.pending,
    );
    if (
      !context.filer ||
      source.proprietor_ssn !== context.filer.primarySSN.replaceAll("-", "")
    ) {
      throw new Error("Form 8882 proprietor differs from prepared filer");
    }
    return elements("IRS8882", [
      element("QlfyChldCareFcltyExpendAmt", lines.line1 || undefined),
      element("TwentyFivePctOfFcltyExpendAmt", lines.line2 || undefined),
      element("QualifiedChildCareRscExpendAmt", lines.line3 || undefined),
      element("TenPercentOfResourceExpendAmt", lines.line4 || undefined),
      element("SumOfPassThruEntCostsAndCrAmt", lines.line6),
      element("SmllrOfEntitiesSumOr150000Amt", lines.line7),
    ]);
  },
};

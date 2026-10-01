import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import { reconcileForm8864DocumentSource } from "../../form8864_source.ts";

/** Bounded TY2025 direct producer tags from cached v5.4 IRS8864.xsd. */
export const form8864: MefFormDescriptor<"f8864", unknown> = {
  pendingKey: "f8864",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8864.pdf",
  build(raw, context) {
    if (raw === undefined || raw === null) return "";
    if (
      !context?.pending ||
      context.documentIdsByPendingKey?.f3800?.length !== 1 ||
      context.documentIdsByPendingKey?.form6251?.length !== 1
    ) {
      throw new Error("Form 8864 needs sourced Form 3800 and AMT documents");
    }
    const { lines } = reconcileForm8864DocumentSource(raw, context.pending);
    return elements("IRS8864", [
      lines.line7_gallons
        ? element("QualifiedAgriBioDieselProdQty", lines.line7_gallons)
        : "",
      lines.line7 ? element("QualifiedAgriBioDieselProdAmt", lines.line7) : "",
      lines.line8_gallons
        ? element("QlfyAgriBioDieselProdAfterQty", lines.line8_gallons)
        : "",
      lines.line8 ? element("QlfyAgriBioDieselProdAfterAmt", lines.line8) : "",
      element("TotQlfyAgriBioDieselProdAmt", lines.line9),
      element("BiodieselRnwblAvnFuelCrAmt", lines.line11),
    ]);
  },
};

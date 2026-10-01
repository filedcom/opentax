import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { reconcileForm8941DocumentSource } from "../../mef/forms/f8941_source.ts";

// Inspected on the IRS September 2025 fillable one-page Form 8941.
const page = "topmostSubform[0].Page1[0]";
const text = (domainKey: string, number: number): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}.f1_${number}[0]`,
});

/** Official PDF projection for the bounded direct employer route. */
export const form8941Pdf: PdfFormDescriptor = {
  pendingKey: "f8941",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8941--2025.pdf",
  fields: [
    text("owner_name", 1),
    text("owner_ssn", 2),
    { kind: "checkbox", domainKey: "shop_yes", pdfField: `${page}.c1_1[0]` },
    text("shop_marketplace_identifier", 3),
    text("employment_ein", 4),
    {
      kind: "checkbox",
      domainKey: "prior_year_shop_no",
      pdfField: `${page}.c1_2[1]`,
    },
    ...Array.from(
      { length: 16 },
      (_, index) => text(`line${index + 1}`, index + 5),
    ),
  ],
  projectFields(raw, allPending) {
    const { source, lines } = reconcileForm8941DocumentSource(raw, allPending);
    return {
      ...lines,
      owner_name: source.owner_name,
      owner_ssn: source.owner_ssn,
      shop_yes: true,
      prior_year_shop_no: true,
      shop_marketplace_identifier: source.shop_marketplace_identifier,
      employment_ein: source.employment_ein,
    };
  },
};

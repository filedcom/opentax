import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { filedForm461Schema } from "../../../nodes/intermediate/forms/form461/index.ts";
import { form461 as nativeForm461 } from "../../mef/forms/f461.ts";

// Checked against the December 2025 one-page IRS AcroForm. f1_3 and f1_9
// belong to reserved lines 1 and 7, so tax line numbers are not field numbers.
const page = "topmostSubform[0].Page1[0]";
const text = (domainKey: string, fieldNumber: number): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}.f1_${fieldNumber}[0]`,
  printZero: true,
});

export const form461Pdf: PdfFormDescriptor = {
  pendingKey: "form461",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f461--2025.pdf",
  pageIndices: () => [0],
  instances(raw, filer, allPending) {
    if (!nativeForm461.FIELD_MAP.some(([key]) => key in raw)) return [];
    const fields = filedForm461Schema.parse(raw);
    if (
      !filer?.nameLine1 || !/^\d{9}$/.test(filer.primarySSN.replace(/\D/g, ""))
    ) {
      throw new Error("Form 461 PDF needs filer name and identifying number");
    }
    nativeForm461.build(fields, { pending: allPending });
    return [fields];
  },
  fields: [
    text("line2_business_income_loss", 4),
    text("line3_capital_gain_loss", 5),
    text("line4_other_gain_loss", 6),
    text("line5_rental_income_loss", 7),
    text("line6_net_farm_profit_loss", 8),
    text("line8_other_income_gain_loss", 10),
    text("line9_total_income_loss", 11),
    text("line10_nonbusiness_income_gain", 12),
    text("line11_nonbusiness_deduction_loss", 13),
    text("line12_nonbusiness_total", 14),
    text("line13_adjustment", 15),
    text("line14_adjusted_total", 16),
    text("line15_threshold", 17),
    text("line16_excess_business_loss", 18),
  ],
  filerFields: [text("nameLine1", 1), text("primarySSN", 2)],
};

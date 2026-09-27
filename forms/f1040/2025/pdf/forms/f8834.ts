import { z } from "zod";
import {
  form8834SourceCredit,
  itemSchema,
} from "../../../nodes/inputs/f8834/index.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// October 2024 is the IRS continuous-use revision for tax years 2024 onward.
// The 2024 prior PDF and current PDF have identical SHA-256 content.
const page = "topmostSubform[0].Page1[0]";
const text = (
  domainKey: string,
  number: number,
  printZero = false,
): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}.f1_${number}[0]`,
  printZero,
});
const amount = z.number().finite().nonnegative();
const fieldsSchema = z.object({
  f8834s: z.array(itemSchema).min(1),
  line1_source_credit: amount,
  line2_regular_tax: amount,
  line3a_foreign_tax_credit: amount,
  line3b_other_credits: amount,
  line3c_total_credits: amount,
  line4_net_regular_tax: amount,
  line5_tentative_minimum_tax: amount,
  line6_adjusted_regular_tax: amount,
  line7_allowed_credit: amount,
});

export const form8834Pdf: PdfFormDescriptor = {
  pendingKey: "f8834",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8834--2024.pdf",
  fields: [
    text("line1_source_credit", 3),
    text("line2_regular_tax", 4),
    text("line3a_foreign_tax_credit", 5),
    text("line3b_other_credits", 6),
    text("line3c_total_credits", 7),
    text("line4_net_regular_tax", 8, true),
    text("line5_tentative_minimum_tax", 9),
    text("line6_adjusted_regular_tax", 10, true),
    text("line7_allowed_credit", 11, true),
  ],
  filerFields: [
    text("nameLine1", 1),
    text("primarySSN", 2),
  ],
  pageIndices: () => [0], // The second source page contains instructions only.
  projectFields(raw, allPending) {
    if (!Array.isArray(raw.f8834s) || raw.f8834s.length === 0) return {};
    const fields = fieldsSchema.parse(raw);
    const source = form8834SourceCredit(fields);
    const schedule3 = z.object({
      line6i_qualified_electric_vehicle_credit: amount.optional(),
    }).parse(allPending.schedule3);
    const cents = (value: number) => Math.round(value * 100);
    if (
      cents(source) !== cents(fields.line1_source_credit) ||
      cents(fields.line3c_total_credits) !==
        cents(fields.line3a_foreign_tax_credit + fields.line3b_other_credits) ||
      cents(fields.line4_net_regular_tax) !==
        cents(
          Math.max(0, fields.line2_regular_tax - fields.line3c_total_credits),
        ) ||
      cents(fields.line6_adjusted_regular_tax) !==
        cents(
          Math.max(
            0,
            fields.line4_net_regular_tax - fields.line5_tentative_minimum_tax,
          ),
        ) ||
      cents(fields.line7_allowed_credit) !==
        cents(
          Math.min(
            fields.line1_source_credit,
            fields.line6_adjusted_regular_tax,
          ),
        ) ||
      cents(fields.line7_allowed_credit) !==
        cents(schedule3.line6i_qualified_electric_vehicle_credit ?? 0)
    ) {
      throw new Error("Form 8834 PDF does not reconcile to finalized return");
    }
    return fields;
  },
};

import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { inputSchema } from "../../../nodes/intermediate/forms/form6252/index.ts";
import {
  validateDestinations,
  validateFiledForm6252,
} from "../../mef/forms/f6252.ts";

// Verified against the canonical 2025 Form 6252 AcroForm. The PDF has one
// fillable tax-form page followed by three instruction pages.
const PAGE = "topmostSubform[0].Page1[0].";
const text = (
  domainKey: string,
  fieldNumber: number,
  printZero = false,
): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${PAGE}f1_${fieldNumber}[0]`,
  printZero,
});
const checkbox = (
  domainKey: string,
  group: number,
  choice: number,
  whenValue: string,
): PdfFieldEntry => ({
  kind: "checkboxWhen",
  domainKey,
  pdfField: `${PAGE}c1_${group}[${choice}]`,
  whenValue,
});

const fields: ReadonlyArray<PdfFieldEntry> = [
  text("property_description", 3),
  text("date_acquired_printed", 4),
  text("date_sold_printed", 5),
  checkbox("sold_to_related_party", 1, 0, "true"),
  checkbox("sold_to_related_party", 1, 1, "false"),
  checkbox("selling_price_determinable", 2, 0, "true"),
  checkbox("selling_price_determinable", 2, 1, "false"),
  // Part I: field f1_6 is line 5; line 15 has an extra row of explanation.
  ...Array.from(
    { length: 10 },
    (_, index) => text(`line${index + 5}`, index + 6, true),
  ),
  ...Array.from(
    { length: 4 },
    (_, index) => text(`line${index + 15}`, index + 16, true),
  ),
  // Part II: line 23 is a left-column field, but has the same AcroForm name.
  ...Array.from(
    { length: 8 },
    (_, index) => text(`line${index + 19}`, index + 20, true),
  ),
];

function printedDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${month}/${day}/${year}`;
}

export const form6252Pdf: PdfFormDescriptor = {
  pendingKey: "form6252",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f6252--2025.pdf",
  pageIndices: () => [0],
  instances(fields, filer, allPending) {
    if (!("f6252s" in fields)) return [];
    const { f6252s } = inputSchema.parse(fields);
    if (
      !filer?.nameLine1 || !/^\d{9}$/.test(filer.primarySSN.replace(/\D/g, ""))
    ) {
      throw new Error("Form 6252 PDF needs filer name and identifying number");
    }
    validateDestinations(
      f6252s,
      allPending ? { pending: allPending } : undefined,
    );
    return f6252s.map((item) => {
      const lines = validateFiledForm6252(item);
      const instance: Record<string, unknown> = {
        property_description: item.property_description,
        date_acquired_printed: printedDate(item.date_acquired!),
        date_sold_printed: printedDate(item.date_sold!),
        sold_to_related_party: item.sold_to_related_party,
        selling_price_determinable: item.selling_price_determinable,
      };
      for (let line = 5; line <= 26; line++) {
        instance[`line${line}`] = lines[`line${line}` as keyof typeof lines];
      }
      // The PDF builder rounds numeric fields to whole dollars. Line 19 is a
      // decimal ratio, so render the exact five-decimal MeF ratio as text.
      instance.line19 = lines.line19.toFixed(5);
      return instance;
    });
  },
  fields,
  filerFields: [text("nameLine1", 1), text("primarySSN", 2)],
};

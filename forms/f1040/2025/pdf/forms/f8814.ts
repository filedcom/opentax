import type { Form8814Lines } from "../../../nodes/inputs/f8814/index.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

const base = "topmostSubform[0].Page1[0].";
const text = (domainKey: string, number: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${base}f1_${number}[0]`,
});

const fields: ReadonlyArray<PdfFieldEntry> = [
  text("child_name", "03"),
  text("child_ssn", "04"),
  { kind: "checkbox", domainKey: "multiple_forms", pdfField: `${base}c1_1[0]` },
  text("line1a", "05"),
  text("line1b", "06"),
  text("line2a", "07"),
  text("line2b", "08"),
  text("line3", "09"),
  text("line4", "10"),
  text("line6", "12"),
  text("line7_whole", "13"),
  text("line7_fraction", "14"),
  text("line8_whole", "15"),
  text("line8_fraction", "16"),
  text("line9", "17"),
  text("line10", "18"),
  text("line11", "19"),
  text("line12", "20"),
  text("line14", "22"),
  {
    kind: "checkboxWhen",
    domainKey: "line15_under_1350",
    pdfField: `${base}Line15_ReadOrder[0].c1_2[0]`,
    whenValue: "false",
  },
  {
    kind: "checkboxWhen",
    domainKey: "line15_under_1350",
    pdfField: `${base}Line15_ReadOrder[0].c1_2[1]`,
    whenValue: "true",
  },
  text("line15", "23"),
];

function toPdfFields(
  line: Form8814Lines,
  multiple: boolean,
): Record<string, unknown> {
  const item = line.item;
  const partI = line.line4 > 2_700;
  const proportion = (ratio: number) => {
    const rounded = Math.round(ratio * 100_000);
    return {
      whole: String(Math.floor(rounded / 100_000)),
      fraction: String(rounded % 100_000).padStart(5, "0"),
    };
  };
  const line7Ratio = proportion(line.line7);
  const line8Ratio = proportion(line.line8);
  return {
    child_name: item.child_name,
    child_ssn: item.child_ssn,
    multiple_forms: multiple,
    line1a: item.interest_income,
    line1b: item.tax_exempt_interest,
    line2a: line.line2a,
    line2b: item.qualified_dividends,
    line3: item.capital_gain_distributions,
    line4: line.line4,
    line6: partI ? line.line6 : undefined,
    line7_whole: partI && line.line7 > 0 ? line7Ratio.whole : undefined,
    line7_fraction: partI && line.line7 > 0 ? line7Ratio.fraction : undefined,
    line8_whole: partI && line.line8 > 0 ? line8Ratio.whole : undefined,
    line8_fraction: partI && line.line8 > 0 ? line8Ratio.fraction : undefined,
    line9: partI ? line.line9 : undefined,
    line10: partI ? line.line10 : undefined,
    line11: partI ? line.line11 : undefined,
    line12: partI ? line.line12 : undefined,
    line14: line.line14,
    line15_under_1350: line.line14 < 1_350,
    line15: line.line15,
  };
}

export const form8814Pdf: PdfFormDescriptor = {
  pendingKey: "form8814",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8814--2025.pdf",
  instances(fields) {
    const items = fields.items;
    if (!Array.isArray(items)) return [];
    return (items as Form8814Lines[]).map((line) =>
      toPdfFields(line, items.length > 1)
    );
  },
  fields,
  filerFields: [
    text("nameLine1", "01"),
    text("primarySSN", "02"),
  ],
};

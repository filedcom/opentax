import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// Verified against the 2025 IRS Schedule J AcroForm. Page 1 has the name and
// SSN followed by lines 1-17; page 2 has lines 18-23.
const page1 = "topmostSubform[0].Page1[0]";
const page2 = "topmostSubform[0].Page2[0]";
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
  printZero: true,
});

const fields: ReadonlyArray<PdfFieldEntry> = [
  text("line1", `${page1}.f1_3[0]`),
  text("line2a", `${page1}.f1_4[0]`),
  text("line2b", `${page1}.f1_5[0]`),
  text("line2c", `${page1}.f1_6[0]`),
  text("line3", `${page1}.f1_7[0]`),
  text("line4", `${page1}.f1_8[0]`),
  text("line5", `${page1}.f1_9[0]`),
  text("line6", `${page1}.f1_10[0]`),
  text("line7", `${page1}.f1_11[0]`),
  text("line8", `${page1}.f1_12[0]`),
  text("line9", `${page1}.f1_13[0]`),
  text("line10", `${page1}.f1_14[0]`),
  text("line11", `${page1}.f1_15[0]`),
  text("line12", `${page1}.f1_16[0]`),
  text("line13", `${page1}.f1_17[0]`),
  text("line14", `${page1}.f1_18[0]`),
  text("line15", `${page1}.f1_19[0]`),
  text("line16", `${page1}.f1_20[0]`),
  text("line17", `${page1}.f1_21[0]`),
  text("line18", `${page2}.f2_1[0]`),
  text("line19", `${page2}.f2_2[0]`),
  text("line20", `${page2}.f2_3[0]`),
  text("line21", `${page2}.f2_4[0]`),
  text("line22", `${page2}.f2_5[0]`),
  text("line23", `${page2}.f2_6[0]`),
];

const lineKeys = fields.map(({ domainKey }) => domainKey);

export const scheduleJPdf: PdfFormDescriptor = {
  pendingKey: "schedule_j",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040sj--2025.pdf",
  presenceKey: "line23",
  fields,
  filerFields: [
    { kind: "text", domainKey: "fullName", pdfField: `${page1}.f1_1[0]` },
    { kind: "text", domainKey: "primarySSN", pdfField: `${page1}.f1_2[0]` },
  ],
  projectFields(raw, allPending) {
    // Public source facts alone are not a completed Schedule J. Only the
    // calculator's full set of numbered lines can activate this descriptor.
    if (!lineKeys.some((key) => raw[key] !== undefined)) return {};
    for (const key of lineKeys) {
      if (typeof raw[key] !== "number" || !Number.isFinite(raw[key])) {
        throw new Error(`Schedule J PDF requires calculated ${key}`);
      }
    }
    const form1040 = allPending.f1040;
    if (!form1040 ||
        raw.line1 !== form1040.line15_taxable_income ||
        raw.line23 !== form1040.line16_income_tax) {
      throw new Error(
        "Schedule J PDF needs lines 1 and 23 to match finalized Form 1040 lines 15 and 16",
      );
    }
    return Object.fromEntries(lineKeys.map((key) => [key, raw[key]]));
  },
};

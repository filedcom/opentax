import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { reconcileForm8990Projection } from "../../form8990_projection.ts";
import { buildPending } from "../../mef/pending.ts";

// Canonical AcroForm /Fields and page /Widget positions of the Rev. Dec. 2025
// PDF, Part I only. Page 1 f1_1..5 are identity/foreign-entity header fields,
// not numbered lines. The bounded direct Schedule C route uses Part I only.
const page1 = "topmostSubform[0].Page1[0]";
const page2 = "topmostSubform[0].Page2[0]";
export const PART_I_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["line1", `${page1}.f1_6[0]`],
  ["line2", `${page1}.f1_7[0]`],
  ["line3", `${page1}.f1_8[0]`],
  ["line4", `${page1}.f1_9[0]`],
  ["line5", `${page1}.f1_10[0]`],
  ["line6", `${page1}.f1_11[0]`],
  ["line7", `${page1}.f1_12[0]`],
  ["line8", `${page1}.f1_13[0]`],
  ["line9", `${page1}.f1_14[0]`],
  ["line10", `${page1}.f1_15[0]`],
  ["line11", `${page1}.f1_16[0]`],
  ["line12", `${page1}.f1_17[0]`],
  ["line13", `${page1}.f1_18[0]`],
  ["line14", `${page1}.f1_19[0]`],
  ["line15", `${page1}.f1_20[0]`],
  ["line16", `${page1}.f1_21[0]`],
  ["line17", `${page1}.f1_22[0]`],
  ["line18", `${page1}.f1_23[0]`],
  ["line19", `${page1}.f1_24[0]`],
  ["line20", `${page1}.f1_25[0]`],
  ["line21", `${page1}.f1_26[0]`],
  ["line22", `${page1}.f1_27[0]`],
  ["line23", `${page2}.f2_1[0]`],
  ["line24", `${page2}.f2_2[0]`],
  ["line25", `${page2}.f2_3[0]`],
  ["line26", `${page2}.f2_4[0]`],
  ["line27", `${page2}.f2_5[0]`],
  ["line28", `${page2}.f2_6[0]`],
  ["line29", `${page2}.f2_7[0]`],
  ["line30", `${page2}.f2_8[0]`],
  ["line31", `${page2}.f2_9[0]`],
];
const fields: ReadonlyArray<PdfFieldEntry> = PART_I_FIELD_MAP.map((
  [domainKey, pdfField],
) => ({
  kind: "text",
  domainKey,
  pdfField,
  printZero: domainKey === "line31",
}));

export const form8990Pdf: PdfFormDescriptor = {
  pendingKey: "form8990",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8990--2025.pdf",
  pageIndices: () => [0, 1],
  filerFields: [
    { kind: "text", domainKey: "fullName", pdfField: `${page1}.f1_1[0]` },
    { kind: "text", domainKey: "primarySSN", pdfField: `${page1}.f1_2[0]` },
  ],
  projectFields(fields, allPending) {
    if (Object.keys(fields).length === 0) return fields;
    const projected = reconcileForm8990Projection(
      fields,
      buildPending(allPending),
    );
    return {
      ...projected,
      // Printed 2025 lines 27 and 28 explicitly repeat lines 25 and 4.
      // The MeF XSD has no separate elements for these repeated print lines.
      line27: projected.line25,
      line28: projected.line4,
    };
  },
  includeWhen(fields, allPending) {
    if (Object.keys(fields).length === 0) return false;
    reconcileForm8990Projection(fields, buildPending(allPending ?? {}));
    return true;
  },
  fields,
};

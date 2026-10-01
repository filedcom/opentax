import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { reconcileFiledForm8582CROrdinary } from "../../form8582cr_filed_ordinary.ts";
import { form8582cr as nativeForm8582cr } from "../../mef/forms/f8582cr.ts";
import { FORM3800_PRINTED_PART_V_ROWS } from "./f3800_capacity.ts";

const page1 = "topmostSubform[0].Page1[0]";
const page2 = "topmostSubform[0].Page2[0]";
const lineOrder = [
  "line1a",
  "line1b",
  "line1c",
  "line2a",
  "line2b",
  "line2c",
  "line3a",
  "line3b",
  "line3c",
  "line4a",
  "line4b",
  "line4c",
  "line5",
  "line6",
  "line7",
  "line8",
  "line9",
  "line10",
  "line11",
  "line12",
  "line13",
  "line14",
  "line15",
  "line16",
] as const;
const fields: readonly PdfFieldEntry[] = [
  ...lineOrder.map((domainKey, index) => ({
    kind: "text" as const,
    domainKey,
    pdfField: `${page1}.f1_${index + 3}[0]`,
    printZero: domainKey === "line7",
  })),
  ...Array.from({ length: 21 }, (_, index) => ({
    kind: "text" as const,
    domainKey: `line${index + 17}`,
    pdfField: `${page2}.f2_${index + 1}[0]`,
  })),
];

export const form8582crPdf: PdfFormDescriptor = {
  pendingKey: "form8582cr",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8582cr--2024.pdf",
  fields,
  filerFields: [
    { kind: "text", domainKey: "nameLine1", pdfField: `${page1}.f1_1[0]` },
    { kind: "text", domainKey: "primarySSN", pdfField: `${page1}.f1_2[0]` },
  ],
  includeWhen: (raw) =>
    Array.isArray(raw.credit_sources) && raw.credit_sources.length > 0,
  projectFields(raw, allPending) {
    const { lines, ledger, tax } = reconcileFiledForm8582CROrdinary(
      raw,
      allPending,
    );
    const xml = nativeForm8582cr.build(raw, { pending: allPending });
    if (
      !xml.includes(`<AllowedCreditsAmt>${lines.line37}</AllowedCreditsAmt>`)
    ) {
      throw new Error("Form 8582-CR PDF line 37 differs from native MeF");
    }
    if (
      ledger.rows.length < 1 ||
      ledger.rows.length > FORM3800_PRINTED_PART_V_ROWS ||
      tax.line6 !== lines.partI.line6 ||
      ledger.rows.some((row) => row.source.source_form !== "Form 8874")
    ) {
      throw new Error(
        "Form 8582-CR PDF Worksheet 9 credit and line 6 source do not reconcile",
      );
    }
    return {
      line4a: lines.partI.other.current,
      line4b: lines.partI.other.prior,
      line4c: lines.partI.other.total,
      line5: lines.partI.line5,
      line6: lines.partI.line6,
      line7: lines.partI.line7,
      line37: lines.line37,
    };
  },
};

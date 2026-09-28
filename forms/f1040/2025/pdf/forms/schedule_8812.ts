import { z } from "zod";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  calculateSchedule8812Lines,
  inputSchema,
} from "../../../nodes/inputs/f8812/index.ts";
import { FilingStatus } from "../../../nodes/types.ts";

// Field names inspected on the two-page IRS 2025 Schedule 8812 AcroForm.
// The reserved line 15 field is intentionally never filled.
const page1 = "topmostSubform[0].Page1[0]";
const page2 = "topmostSubform[0].Page2[0]";
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
});

const fields: ReadonlyArray<PdfFieldEntry> = [
  text("line1", `${page1}.f1_3[0]`),
  text("line2a", `${page1}.f1_4[0]`),
  text("line2b", `${page1}.f1_5[0]`),
  text("line2c", `${page1}.f1_6[0]`),
  text("line2d", `${page1}.f1_7[0]`),
  text("line3", `${page1}.f1_8[0]`),
  text("line4", `${page1}.f1_9[0]`),
  text("line5", `${page1}.f1_10[0]`),
  text("line6", `${page1}.Line6ReadOrder[0].f1_11[0]`),
  text("line7", `${page1}.f1_12[0]`),
  text("line8", `${page1}.f1_13[0]`),
  text("line9", `${page1}.f1_14[0]`),
  text("line10", `${page1}.f1_15[0]`),
  text("line11", `${page1}.f1_16[0]`),
  text("line12", `${page1}.f1_17[0]`),
  {
    kind: "checkboxWhen",
    domainKey: "line12_answer",
    pdfField: `${page1}.c1_1[1]`,
    whenValue: "yes",
  },
  {
    kind: "text",
    domainKey: "line13",
    pdfField: `${page1}.f1_18[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line14",
    pdfField: `${page1}.f1_19[0]`,
    printZero: true,
  },
  text("line16a", `${page2}.f2_2[0]`),
  text("line16b_child_count", `${page2}.f2_3[0]`),
  text("line16b", `${page2}.f2_4[0]`),
  text("line17", `${page2}.f2_5[0]`),
  text("line18a", `${page2}.f2_6[0]`),
  text("line18b", `${page2}.f2_7[0]`),
  {
    kind: "checkboxWhen",
    domainKey: "line19_answer",
    pdfField: `${page2}.c2_1[0]`,
    whenValue: "no",
  },
  {
    kind: "checkboxWhen",
    domainKey: "line19_answer",
    pdfField: `${page2}.c2_1[1]`,
    whenValue: "yes",
  },
  text("line19", `${page2}.f2_8[0]`),
  text("line20", `${page2}.f2_9[0]`),
  {
    kind: "checkboxWhen",
    domainKey: "line16b_ge_5100",
    pdfField: `${page2}.c2_2[0]`,
    whenValue: "no",
  },
  {
    kind: "checkboxWhen",
    domainKey: "line16b_ge_5100",
    pdfField: `${page2}.c2_2[1]`,
    whenValue: "yes",
  },
  text("line21", `${page2}.f2_10[0]`),
  text("line22", `${page2}.f2_11[0]`),
  text("line23", `${page2}.f2_12[0]`),
  text("line24", `${page2}.f2_13[0]`),
  text("line25", `${page2}.f2_14[0]`),
  text("line26", `${page2}.f2_15[0]`),
  text("line27", `${page2}.f2_16[0]`),
];

const form1040Schema = z.object({
  filing_status: z.nativeEnum(FilingStatus),
  line11_agi: z.number(),
  line18_total_tax_before_credits: z.number().nonnegative(),
  line19_child_tax_credit: z.number().nonnegative().optional(),
  line28_actc: z.number().nonnegative().optional(),
}).passthrough();

export const schedule8812Pdf: PdfFormDescriptor = {
  pendingKey: "f8812",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040s8--2025.pdf",
  projectFields(raw, allPending) {
    if (Object.keys(raw).length === 0) return {};
    const lines = calculateSchedule8812Lines(2025, inputSchema.parse(raw));
    if (!lines || (lines.line14 === 0 && lines.line27 === 0)) return {};
    const form1040 = form1040Schema.parse(allPending.f1040);
    if (
      lines.filingStatus !== form1040.filing_status ||
      lines.line1 !== form1040.line11_agi ||
      lines.line18Tax !== form1040.line18_total_tax_before_credits ||
      lines.line14 !== (form1040.line19_child_tax_credit ?? 0) ||
      lines.line27 !== (form1040.line28_actc ?? 0)
    ) {
      throw new Error("Schedule 8812 PDF does not reconcile to Form 1040");
    }
    return {
      line1: lines.line1,
      line2a: lines.line2a,
      line2b: lines.line2b,
      line2c: lines.line2c,
      line2d: lines.line2d,
      line3: lines.line3,
      line4: lines.line4,
      line5: lines.line5,
      line6: lines.line6,
      line7: lines.line7,
      line8: lines.line8,
      line9: lines.line9,
      line10: lines.line10,
      line11: lines.line11,
      line12: lines.line12,
      line12_answer: "yes",
      line13: lines.line13,
      line14: lines.line14,
      ...(lines.line17 > 0
        ? {
          line16a: lines.line16a,
          line16b_child_count: lines.line4,
          line16b: lines.line16b,
          line17: lines.line17,
          line18a: lines.line18a,
          line18b: lines.line18b,
          line19_answer: lines.line19 > 0 ? "yes" : "no",
          line19: lines.line19,
          line20: lines.line20,
          line16b_ge_5100: lines.line16b >= 5_100 ? "yes" : "no",
          ...(lines.partIIBLines ?? {}),
          line27: lines.line27,
        }
        : {}),
    };
  },
  fields,
  filerFields: [
    text("fullName", `${page1}.f1_1[0]`),
    text("primarySSN", `${page1}.f1_2[0]`),
  ],
};

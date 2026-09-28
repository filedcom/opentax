import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  calculateScheduleRAge65Single,
  scheduleR,
} from "../../mef/forms/schedule_r.ts";

// Canonical fields inspected on the two-page 2025 IRS Schedule R AcroForm.
const page1 = "topmostSubform[0].Page1[0]";
const page2 = "topmostSubform[0].Page2[0]";
const text = (
  domainKey: string,
  pdfField: string,
): Extract<PdfFieldEntry, { kind: "text" }> => ({
  kind: "text",
  domainKey,
  pdfField,
});

const fields: ReadonlyArray<PdfFieldEntry> = [
  {
    kind: "checkboxWhen",
    domainKey: "box1",
    pdfField: `${page1}.c1_1[0]`,
    whenValue: "yes",
  },
  text("line10", `${page2}.f2_1[0]`),
  text("line12", `${page2}.f2_3[0]`),
  text("line13a", `${page2}.f2_4[0]`),
  { ...text("line13c", `${page2}.f2_6[0]`), printZero: true },
  text("line14", `${page2}.f2_7[0]`),
  text("line15", `${page2}.f2_8[0]`),
  { ...text("line16", `${page2}.f2_9[0]`), printZero: true },
  { ...text("line17", `${page2}.f2_10[0]`), printZero: true },
  { ...text("line18", `${page2}.f2_11[0]`), printZero: true },
  text("line19", `${page2}.f2_12[0]`),
  text("line20", `${page2}.f2_13[0]`),
  text("line21", `${page2}.f2_14[0]`),
  text("line22", `${page2}.f2_15[0]`),
];

export const scheduleRPdf: PdfFormDescriptor = {
  pendingKey: "schedule_r",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040sr--2025.pdf",
  fields,
  projectFields(raw, allPending) {
    if (Object.keys(raw).length === 0) return {};
    if (!scheduleR.build(raw, { pending: allPending })) return {};
    return {
      box1: "yes",
      ...calculateScheduleRAge65Single({ pending: allPending }),
    };
  },
  filerFields: [
    text("fullName", `${page1}.f1_1[0]`),
    text("primarySSN", `${page1}.f1_2[0]`),
  ],
};

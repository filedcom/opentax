import type { PdfFieldEntry, PdfFormDescriptor } from "../../../review-support/form-descriptor.ts";
import { calculateScheduleR, scheduleR } from "../../../../mef/forms/credits/individual/schedule_r.ts";

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
  {
    kind: "checkboxWhen",
    domainKey: "box2",
    pdfField: `${page1}.c1_1[1]`,
    whenValue: "yes",
  },
  {
    kind: "checkboxWhen",
    domainKey: "box3",
    pdfField: `${page1}.Married[0].c1_1[0]`,
    whenValue: "yes",
  },
  {
    kind: "checkboxWhen",
    domainKey: "box4",
    pdfField: `${page1}.Married[0].c1_1[1]`,
    whenValue: "yes",
  },
  {
    kind: "checkboxWhen",
    domainKey: "box5",
    pdfField: `${page1}.Married[0].c1_1[2]`,
    whenValue: "yes",
  },
  {
    kind: "checkboxWhen",
    domainKey: "box6",
    pdfField: `${page1}.Married[0].c1_1[3]`,
    whenValue: "yes",
  },
  {
    kind: "checkboxWhen",
    domainKey: "box7",
    pdfField: `${page1}.Married[0].c1_1[4]`,
    whenValue: "yes",
  },
  {
    kind: "checkboxWhen",
    domainKey: "box8",
    pdfField: `${page1}.MarriedSeparate[0].c1_1[0]`,
    whenValue: "yes",
  },
  {
    kind: "checkboxWhen",
    domainKey: "box9",
    pdfField: `${page1}.MarriedSeparate[0].c1_1[1]`,
    whenValue: "yes",
  },
  {
    kind: "checkboxWhen",
    domainKey: "priorYearStatement",
    pdfField: `${page1}.c1_2[0]`,
    whenValue: "yes",
  },
  text("line10", `${page2}.f2_1[0]`),
  text("line11", `${page2}.f2_2[0]`),
  text("line12", `${page2}.f2_3[0]`),
  text("line13a", `${page2}.f2_4[0]`),
  text("line13b", `${page2}.f2_5[0]`),
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
    const { box, priorYearStatement, lines } = calculateScheduleR({
      pending: allPending,
    });
    return {
      [`box${box}`]: "yes",
      ...(priorYearStatement ? { priorYearStatement: "yes" } : {}),
      ...lines,
    };
  },
  filerFields: [
    text("fullName", `${page1}.f1_1[0]`),
    text("primarySSN", `${page1}.f1_2[0]`),
  ],
};

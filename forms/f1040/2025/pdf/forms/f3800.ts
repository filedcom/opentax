import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  form3800HeaderFields,
  form3800PartIAndIIFields,
  form3800PartIIIFields,
  form3800PartIIILines,
  form3800PartIVFields,
  form3800PartIVLines,
  form3800PartVFields,
  form3800PartVIFields,
} from "./f3800_fields.ts";
import {
  projectForm3800HeaderFields,
  projectForm3800PartIAndIIFields,
  projectForm3800PartIIIFields,
  projectForm3800PartIVFields,
} from "./f3800_print_projection.ts";
import {
  projectForm3800PartVFields,
  projectForm3800PartVIFields,
} from "./f3800_detail_projection.ts";

const checkboxPaths = new Set<string>([
  form3800HeaderFields.camtAndBeatYes,
  form3800HeaderFields.camtAndBeatNo,
  form3800HeaderFields.transferElectionYes,
  form3800HeaderFields.transferElectionNo,
  form3800HeaderFields.line4RevisedCarryforward,
  form3800HeaderFields.line34RevisedCarryforward,
]);
const paths = new Set<string>([
  ...Object.values(form3800HeaderFields),
  ...Object.values(form3800PartIAndIIFields),
  ...form3800PartIIILines.flatMap((line) =>
    Object.values(form3800PartIIIFields(line))
  ),
  ...form3800PartIVLines.flatMap((line) =>
    Object.values(form3800PartIVFields(line))
  ),
  ...Array.from(
    { length: 15 },
    (_, index) => Object.values(form3800PartVFields(index + 1)),
  ).flat(),
  ...Array.from(
    { length: 35 },
    (_, index) => Object.values(form3800PartVIFields(index + 1)),
  ).flat(),
]);
const fields: readonly PdfFieldEntry[] = [...paths].map((path) => ({
  kind: checkboxPaths.has(path) ? "checkbox" : "text",
  domainKey: path,
  pdfField: path,
}));

export const form3800Pdf: PdfFormDescriptor = {
  pendingKey: "f3800",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f3800--2025.pdf",
  fields,
  instances(raw, filer, all, prepared) {
    if (Object.keys(raw).length === 0) return [];
    if (!prepared || !filer || !all?.schedule3) {
      throw new Error(
        "Form 3800 PDF needs the same prepared MeF return, filer, and Schedule 3",
      );
    }
    const line6a = all.schedule3.line6a_total;
    if (typeof line6a !== "number") {
      throw new Error("Form 3800 PDF needs finalized Schedule 3 line 6a");
    }
    const projected = {
      ...projectForm3800HeaderFields(prepared, filer),
      ...projectForm3800PartIAndIIFields(prepared, line6a),
      ...projectForm3800PartIIIFields(prepared),
      ...projectForm3800PartIVFields(prepared),
      ...projectForm3800PartVFields(prepared),
      ...projectForm3800PartVIFields(prepared),
    };
    for (const key of Object.keys(projected)) {
      if (!paths.has(key)) {
        throw new Error(`Form 3800 printable field is not mapped: ${key}`);
      }
    }
    return [projected];
  },
};

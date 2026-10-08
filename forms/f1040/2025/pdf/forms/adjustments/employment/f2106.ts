import type { PdfFormDescriptor } from "../../../review-support/form-descriptor.ts";
import { inputSchema } from "../../../../../nodes/inputs/adjustments/employment/f2106/index.ts";
import {
  projectStagedForm2106Pdf,
  reconcileFileableForm2106Return,
  stagedForm2106PdfFields,
} from "../../../../domains/adjustments/employment/form2106/form2106_staged.ts";

export const form2106Pdf: PdfFormDescriptor = {
  pendingKey: "f2106",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f2106--2025.pdf",
  fields: stagedForm2106PdfFields,
  instances(fields, _filer, allPending) {
    if (!Array.isArray(fields.f2106s) || fields.f2106s.length === 0) return [];
    if (!allPending) {
      throw new Error("Form 2106 PDF needs finalized return source");
    }
    const submitted = inputSchema.parse(fields);
    const pending = inputSchema.parse(allPending.f2106);
    if (JSON.stringify(submitted) !== JSON.stringify(pending)) {
      throw new Error("Form 2106 PDF document differs from job source");
    }
    const { jobs } = reconcileFileableForm2106Return(allPending);
    return jobs.map(({ source }) => projectStagedForm2106Pdf(source));
  },
};

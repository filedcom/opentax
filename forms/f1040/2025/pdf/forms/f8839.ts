import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { inputSchema } from "../../../nodes/intermediate/forms/form8839/index.ts";
import {
  form8839Page1FieldMap,
  projectStagedForm8839Documents,
} from "../../../nodes/intermediate/forms/form8839/staged_documents.ts";
import { parsePublicForm8839Source } from "../../../nodes/intermediate/forms/form8839/public_source.ts";
import { f1040 } from "../../../nodes/outputs/f1040/index.ts";

const checkboxes = new Set([
  "adoptionFinal",
  "noPriorForm",
  "noPhaseout",
  "phaseoutYes",
]);

const fields: PdfFieldEntry[] = Object.entries(form8839Page1FieldMap).map(
  ([domainKey, pdfField]) =>
    checkboxes.has(domainKey)
      ? { kind: "checkbox", domainKey, pdfField }
      : { kind: "text", domainKey, pdfField, printZero: true },
);

export const form8839Pdf: PdfFormDescriptor = {
  pendingKey: "form8839",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8839--2025.pdf",
  fields,
  instances(raw, filer, allPending) {
    const source = inputSchema.parse(raw);
    if ((source.children?.length ?? 0) === 0) return [];
    const route = allPending?.form8839_route as
      | { public_source?: unknown; pre_adoption_sink_input?: unknown }
      | undefined;
    if (!route || !filer || !allPending) {
      throw new Error("Form 8839 PDF needs its reviewed prepared route");
    }
    const publicSource = parsePublicForm8839Source(route.public_source);
    const projected = projectStagedForm8839Documents(
      publicSource.source,
      publicSource.publicSource.reviewed_source,
      f1040.inputSchema.parse(route.pre_adoption_sink_input),
      publicSource.publicSource.magi_review,
      allPending,
      filer,
    );
    return [projected.pdfFields];
  },
};

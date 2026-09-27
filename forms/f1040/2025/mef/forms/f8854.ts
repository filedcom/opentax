import {
  inputSchema,
  isCoveredExpatriate,
} from "../../../nodes/inputs/f8854/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import {
  buildForm8854InitialBundle,
  buildForm8854NativeStatementContents,
} from "./f8854_initial.ts";

export const form8854: MefFormDescriptor<"f8854", unknown> = {
  pendingKey: "f8854",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8854.pdf",
  build(fields) {
    if (Array.isArray(fields) && fields.length === 0) return "";
    const input = inputSchema.parse(fields);
    if (
      isCoveredExpatriate(input) ||
      input.section_c !== null ||
      input.section_d.elect_deferral
    ) {
      throw new Error(
        "Form 8854 covered filing needs reconciled income forms and attachments",
      );
    }
    if (buildForm8854NativeStatementContents(input).length > 0) {
      throw new Error(
        "Form 8854 native statements must be linked before filing",
      );
    }
    return buildForm8854InitialBundle(input, {
      balanceSheet: {},
      sectionC: {},
      binaryAttachments: [],
    }, { form8949: undefined }).formXml;
  },
};

import type { PdfFieldEntry, PdfFormDescriptor } from "../../reviews/execution/form-descriptor.ts";
import { inputSchema } from "../../../../nodes/inputs/f9000/index.ts";
import { buildForm9000, form9000Identity } from "../../../mef/forms/identity/f9000.ts";

const page = "topmostSubform[0].Page1[0]";
const codes = ["00", "01", "02", "03", "04", "05"] as const;

export const form9000Pdf: PdfFormDescriptor = {
  pendingKey: "f9000",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f9000.pdf",
  pageIndices: () => [0],
  fields: [
    { kind: "text", domainKey: "name", pdfField: `${page}.f1_01[0]` },
    { kind: "text", domainKey: "ssn", pdfField: `${page}.f1_02[0]` },
    ...codes.map((code, index): PdfFieldEntry => ({
      kind: "checkboxWhen",
      domainKey: "selected_code",
      pdfField: `${page}.c1_1[${index}]`,
      whenValue: code,
    })),
  ],
  instances(raw, filer) {
    if (Object.keys(raw).length === 0) return [];
    const source = inputSchema.parse(raw);
    buildForm9000(source, { filer });
    return source.requests.map((request) => ({
      ...form9000Identity(request.person, { filer }),
      selected_code: request.alternative_media_code,
    }));
  },
};

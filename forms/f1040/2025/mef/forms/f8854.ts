import {
  assertForm8854FilingScope,
  inputSchema,
} from "../../../nodes/inputs/f8854/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import {
  buildForm8854InitialBundle,
  buildForm8854InitialDocument,
  buildForm8854NativeStatementContents,
  linkForm8854NativeStatementIds,
} from "./f8854_initial.ts";

export const form8854: MefFormDescriptor<"f8854", unknown> = {
  pendingKey: "f8854",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8854.pdf",
  build(fields, context) {
    if (Array.isArray(fields) && fields.length === 0) return "";
    if (context?.pending?.f8854_annual !== undefined) {
      throw new Error(
        "One taxpayer cannot file both initial and annual Form 8854 for 2025",
      );
    }
    const input = inputSchema.parse(fields);
    assertForm8854FilingScope(input);
    const pending = { form8949: context?.pending?.form8949 };
    const contents = buildForm8854NativeStatementContents(input);
    if (!context?.documentIdsByPendingKey) {
      return buildForm8854InitialDocument(
        input,
        {
          balanceSheet: {},
          sectionC: {},
          binaryAttachmentIdsByFileName: {},
        },
        pending,
        "discover",
      );
    }
    const links = linkForm8854NativeStatementIds(
      contents,
      context.documentIdsByPendingKey.f8854_native_statements ?? [],
      context.documentIdsByAttachmentFileName ?? {},
    );
    return buildForm8854InitialBundle(input, links, pending).formXml;
  },
};

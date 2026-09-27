import { inputSchema } from "../../../nodes/inputs/f8854/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import { buildForm8854NativeStatementContents } from "./f8854_initial.ts";

export const form8854NativeStatements: MefFormDescriptor<
  "f8854_native_statements",
  unknown,
  readonly string[]
> = {
  pendingKey: "f8854_native_statements",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8854.pdf",
  build(_fields, context) {
    const raw = context?.pending?.f8854;
    if (raw === undefined) return [];
    const input = inputSchema.parse(raw);
    return buildForm8854NativeStatementContents(input).map((row) => row.xml);
  },
};

import { inputSchema } from "../../../nodes/inputs/f8854/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import { buildForm8854NativeStatementContents } from "./f8854_initial.ts";
import { annualInputSchema } from "../../../nodes/inputs/f8854/annual.ts";
import { buildForm8854AnnualNativeStatements } from "./f8854_annual.ts";

export const form8854NativeStatements: MefFormDescriptor<
  "f8854_native_statements",
  unknown,
  readonly string[]
> = {
  pendingKey: "f8854_native_statements",
  sourcePendingKeys: ["f8854", "f8854_annual"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8854.pdf",
  build(_fields, context) {
    const raw = context?.pending?.f8854;
    const annualRaw = context?.pending?.f8854_annual;
    if (raw !== undefined && annualRaw !== undefined) {
      throw new Error(
        "One taxpayer cannot file both initial and annual Form 8854 for 2025",
      );
    }
    if (raw !== undefined) {
      const input = inputSchema.parse(raw);
      return buildForm8854NativeStatementContents(input).map((row) => row.xml);
    }
    if (annualRaw !== undefined) {
      return buildForm8854AnnualNativeStatements(
        annualInputSchema.parse(annualRaw),
      );
    }
    return [];
  },
};

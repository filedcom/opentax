import { inputSchema } from "../../../nodes/inputs/f8283/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import {
  buildFmvReductionStatement,
  needsFmvReductionStatement,
} from "./f8283.ts";

// ReturnData1040.xsd places FairMarketValueStatement after the vehicle
// statement. Its document ID is linked from Section A column (h).
export const form8283FmvReductionStatement: MefFormDescriptor<
  "form8283_fmv_reduction_statement",
  unknown,
  readonly string[]
> = {
  pendingKey: "form8283_fmv_reduction_statement",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8283--2025.pdf",
  build(_fields, context = {}) {
    const raw = context.pending?.f8283;
    if (raw === undefined) return [];
    const parsed = inputSchema.parse(raw);
    return (parsed.section_a_items ?? []).flatMap((item, index) =>
      needsFmvReductionStatement(item)
        ? [buildFmvReductionStatement(item, index)]
        : []
    );
  },
};

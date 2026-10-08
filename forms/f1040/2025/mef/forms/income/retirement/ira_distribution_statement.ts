import { element, elements } from "../../../../../mef/xml.ts";
import {
  inputSchema as f1099rInputSchema,
  iraDistributionExplanation,
} from "../../../../../nodes/inputs/income/retirement/f1099r/index.ts";
import type { MefFormDescriptor } from "../../../form-descriptor.ts";

/** TY2025 ReturnData1040 permits one statement linked from line 4c(1). */
export const iraDistributionStatement: MefFormDescriptor<
  "ira_distribution_statement",
  unknown
> = {
  pendingKey: "ira_distribution_statement",
  sourcePendingKeys: ["f1099r"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040--2025.pdf",
  build(_fields, context) {
    const raw = context?.pending?.f1099r;
    if (raw === undefined) return "";
    const source = f1099rInputSchema.parse(raw);
    const explanation = iraDistributionExplanation(source.f1099rs);
    return explanation === undefined
      ? ""
      : elements("IRADistributionStatement", [
        element("ExplanationTxt", explanation),
      ]);
  },
};

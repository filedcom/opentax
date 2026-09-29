import {
  calculateForm4835AtRiskNet,
  inputSchema as form4835InputSchema,
} from "../../../nodes/inputs/f4835/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import { buildSimplifiedIRS6198 } from "./f6198.ts";

export const form4835AtRisk: MefFormDescriptor<
  "f4835_at_risk",
  Record<string, unknown>,
  readonly string[]
> = {
  pendingKey: "f4835_at_risk",
  sourcePendingKeys: ["f4835"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f6198.pdf",
  build(_fields, context) {
    const source = context?.pending?.f4835;
    if (source === undefined) return [];
    const { f4835s } = form4835InputSchema.parse(source);
    return f4835s.flatMap((item) => {
      const result = calculateForm4835AtRiskNet(item);
      if (
        result.preliminaryNet >= 0 || item.some_investment_not_at_risk !== true
      ) return [];
      const facts = item.at_risk_simplified;
      if (!facts || result.amountAtRisk === undefined) {
        throw new Error(
          "Form 4835 line 34b requires a completed Form 6198 computation",
        );
      }
      return [buildSimplifiedIRS6198(
        item.activity_name,
        result.preliminaryNet,
        facts,
        result.atRiskNet,
        result.amountAtRisk,
      )];
    });
  },
};

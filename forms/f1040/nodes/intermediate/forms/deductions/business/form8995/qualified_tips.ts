import { z } from "zod";
import {
  inputSchema,
  qualifiedBusinessTipQbiSource,
} from "../../additional/schedule1a/calculation.ts";
const dollars = z.number().int().nonnegative();
export const qualifiedTipQbiSourceSchema = z.object({
  schedule1a_source: inputSchema,
  allocation_method: z.literal("proportional_eligible_tips"),
  total_eligible_tips: dollars,
  tips_deduction: dollars,
  employee_deduction: dollars,
  business_rows: z.array(
    z.object({
      business_reference: z.string().trim().min(1),
      recipient: z.enum(["T", "S"]),
      reported_tips: dollars.positive(),
      net_profit: z.number().int(),
      se_tax_deduction: dollars,
      se_health_deduction: dollars.optional(),
      eligible_tips: dollars,
      qbi_tip_exclusion: dollars,
    }).strict(),
  ).min(1),
}).strict();
export const tipSourceCanonical = (v: unknown) =>
  JSON.stringify(
    v,
    (_k, x) =>
      x && typeof x === "object" && !Array.isArray(x)
        ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]]))
        : x,
  );
export function reviewedQualifiedTipExclusions(raw: unknown) {
  if (raw === undefined) return { source: undefined, rows: [], total: 0 };
  const source = qualifiedTipQbiSourceSchema.parse(raw);
  const expected = qualifiedBusinessTipQbiSource(source.schedule1a_source);
  if (tipSourceCanonical(source) !== tipSourceCanonical(expected)) {
    throw new Error(
      "QBI tip exclusions must derive from the actual eligible business amounts and filed Schedule1A deduction",
    );
  }
  return {
    source,
    rows: source.business_rows,
    total: source.business_rows.reduce((n, r) => n + r.qbi_tip_exclusion, 0),
  };
}

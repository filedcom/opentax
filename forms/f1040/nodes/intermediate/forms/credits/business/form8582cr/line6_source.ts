import { z } from "zod";
import { tsjSchema } from "../../../../../types.ts";

const incomeSourceSchema = z.object({
  activity_id: z.string().trim().min(1).max(64),
  passive_income_source_document_reference: z.string().trim().min(1),
  net_passive_income: z.number().int().positive().safe(),
}).strict();
const taxSides = {
  tax_year: z.literal(2025),
  tax_method: z.literal("ordinary"),
  net_passive_income: z.number().int().positive().safe(),
  taxable_income_including_passive: z.number().int().nonnegative(),
  taxable_income_without_passive: z.number().int().nonnegative(),
  tax_including_passive: z.number().int().nonnegative(),
  tax_without_passive: z.number().int().nonnegative(),
};

/** Legacy single-source review or a complete, owned rental-income inventory. */
export const line6OrdinaryWorksheetSchema = z.union([
  incomeSourceSchema.extend(taxSides).strict(),
  z.object({
    ...taxSides,
    passive_income_sources: z.array(
      z.union([
        incomeSourceSchema.extend({ tsj: tsjSchema }),
        incomeSourceSchema.extend({
          tsj: tsjSchema,
          source_origin: z.object({
            kind: z.enum(["partnership", "s_corporation"]),
            ein: z.string().regex(/^\d{9}$/),
          }).strict(),
        }),
      ]),
    )
      .min(1),
  }).strict(),
]);

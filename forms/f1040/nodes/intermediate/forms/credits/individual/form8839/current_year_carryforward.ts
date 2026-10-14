import { z } from "zod";
import type { Form8839Input, settleForm8839Credit } from "./index.ts";

const dollars = z.number().int().nonnegative().safe();
/** Computed return record; accepted-return evidence is required before reuse. */
export const form8839CurrentCarryforwardSchema = z.object({
  version: z.literal(1),
  status: z.literal("computed_unfiled"),
  origin_tax_year: z.literal(2025),
  first_carry_year: z.literal(2026),
  last_carry_year: z.literal(2030),
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  child_ssn: z.string().regex(/^\d{9}$/),
  decree_document_id: z.string().min(1),
  expense_document_ids: z.array(z.string().min(1)).min(1),
  nonrefundable_credit: dollars,
  used_in_origin_year: dollars,
  carryforward_amount: dollars.positive(),
}).strict();

export function currentYearForm8839Carryforward(
  source: Form8839Input,
  credit: ReturnType<typeof settleForm8839Credit>,
  taxpayerSsn: string,
) {
  const remaining = credit.line14 - credit.line18;
  if (remaining === 0) return undefined;
  const child = source.children?.[0];
  if (source.children?.length !== 1 || !child) {
    throw new Error("Form 8839 carryforward needs one reconciled child");
  }
  return form8839CurrentCarryforwardSchema.parse({
    version: 1,
    status: "computed_unfiled",
    origin_tax_year: 2025,
    first_carry_year: 2026,
    last_carry_year: 2030,
    taxpayer_ssn: taxpayerSsn.replaceAll("-", ""),
    child_ssn: child.ssn?.replaceAll("-", ""),
    decree_document_id: child.final_decree.source_document_id,
    expense_document_ids: child.expenses.map((expense) =>
      expense.source_document_id
    ),
    nonrefundable_credit: credit.line14,
    used_in_origin_year: credit.line18,
    carryforward_amount: remaining,
  });
}

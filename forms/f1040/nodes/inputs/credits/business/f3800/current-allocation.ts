import { z } from "zod";

const money = z.number().finite().nonnegative().refine(
  (value) =>
    Number.isSafeInteger(Math.round(value * 100)) &&
    Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
  "Credit amounts require cent precision",
);
export const currentOrphanAllocationSchema = z.object({
  tax_year: z.literal(2025),
  return_primary_ssn: z.string().regex(/^\d{9}$/),
  review_reference: z.string().trim().min(1),
  complete_current_orphan_drug_inventory_confirmed: z.literal(true),
  sources: z.array(
    z.object({
      source_type: z.enum(["partnership", "s_corporation"]),
      source_ein: z.string().regex(/^\d{9}$/),
      source_document_reference: z.string().trim().min(1),
      credit_amount: money,
      applied_credit: money,
    }).strict(),
  ).min(1),
}).strict();
export type CurrentOrphanAllocation = z.infer<
  typeof currentOrphanAllocationSchema
>;

type Source = {
  source_type: string;
  source_ein: string;
  source_document_reference: string;
  credit_amount: number;
  subject_to_passive_activity_limit: boolean;
};
const key = (
  s: Pick<Source, "source_type" | "source_ein" | "source_document_reference">,
) => JSON.stringify([s.source_type, s.source_ein, s.source_document_reference]);

/** Keyed review records must identify the entire current nonpassive K-1 inventory. */
export function reconcileCurrentOrphanAllocation(
  raw: unknown,
  sources: readonly Source[],
  filing?: { primarySSN: string; appliedCredit: number },
): readonly number[] {
  const review = currentOrphanAllocationSchema.parse(raw);
  const byKey = new Map(review.sources.map((source) => [key(source), source]));
  if (
    sources.length === 0 || review.sources.length !== sources.length ||
    byKey.size !== sources.length ||
    new Set(sources.map(key)).size !== sources.length
  ) {
    throw new Error(
      "Form 3800 allocation review needs the complete distinct K-1 inventory",
    );
  }
  const amounts = sources.map((source) => {
    const record = byKey.get(key(source));
    if (
      !record || source.subject_to_passive_activity_limit ||
      record.credit_amount !== source.credit_amount ||
      record.applied_credit > record.credit_amount
    ) {
      throw new Error(
        "Form 3800 allocation review differs from its current nonpassive K-1 source",
      );
    }
    return record.applied_credit;
  });
  if (
    filing &&
    (review.return_primary_ssn !== filing.primarySSN.replaceAll("-", "") ||
      amounts.reduce((sum, amount) => sum + Math.round(amount * 100), 0) !==
        Math.round(filing.appliedCredit * 100))
  ) {
    throw new Error(
      "Form 3800 allocation review differs from the filer or finalized tax use",
    );
  }
  return amounts;
}

/** Preserve the reviewed public record independently of its Form 3800 projection. */
export function assertCurrentOrphanAllocationSource(
  raw: unknown,
  publicSource: unknown,
): void {
  if (raw === undefined && publicSource === undefined) return;
  const review = currentOrphanAllocationSchema.parse(raw);
  const retained = currentOrphanAllocationSchema.parse(publicSource);
  if (JSON.stringify(review) !== JSON.stringify(retained)) {
    throw new Error(
      "Form 3800 allocation review differs from the retained public record",
    );
  }
}

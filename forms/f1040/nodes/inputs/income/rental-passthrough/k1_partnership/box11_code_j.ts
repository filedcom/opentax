import { z } from "zod";

export const box11CodeJReviewSchema = z.object({
  reported_amount: z.number().int().positive(),
  taxable_amount: z.number().int().nonnegative(),
  prior_year_tax_benefit_reviewed: z.literal(true),
  prior_year_tax_benefit_workpaper_reference: z.string().trim().min(1),
  statement_reference: z.string().trim().min(1),
  recipient_tin: z.string().regex(/^\d{9}$/),
}).strict().refine((value) => value.taxable_amount <= value.reported_amount, {
  message: "K-1 box 11 code J taxable recovery exceeds the reported recovery",
  path: ["taxable_amount"],
});

export const box11CodeJSourceSchema = z.object({
  partnership_name: z.string().trim().min(1),
  partnership_ein: z.string().regex(/^\d{9}$/),
  source_document_reference: z.string().trim().min(1),
  statement_reference: z.string().trim().min(1),
  recipient_tin: z.string().regex(/^\d{9}$/),
  reported_amount: z.number().int().positive(),
  taxable_amount: z.number().int().positive(),
  prior_year_tax_benefit_workpaper_reference: z.string().trim().min(1),
}).strict();

export type Box11CodeJSource = z.infer<typeof box11CodeJSourceSchema>;

type K1Source = {
  partnership_name: string;
  partnership_ein?: string;
  source_document_reference?: string;
  box11_other_income?: number;
  box11_code_j_recovery?: z.infer<typeof box11CodeJReviewSchema>;
};

export function box11CodeJSourceRows(
  items: readonly K1Source[],
): Box11CodeJSource[] {
  const seen = new Set<string>();
  const rows: Box11CodeJSource[] = [];
  for (const item of items) {
    if (item.box11_other_income !== undefined) {
      throw new Error(
        "Untyped partnership K-1 box 11 cannot be routed to Schedule 1; supply a supported code and source facts",
      );
    }
    if (!item.box11_code_j_recovery) continue;
    const review = box11CodeJReviewSchema.parse(item.box11_code_j_recovery);
    if (!item.partnership_ein || !item.source_document_reference) {
      throw new Error(
        "Partnership K-1 box 11 code J needs partnership EIN and source document reference",
      );
    }
    const key = `${item.partnership_ein}:${item.source_document_reference}`;
    if (seen.has(key)) {
      throw new Error("Duplicate partnership K-1 box 11 code J source");
    }
    seen.add(key);
    if (review.taxable_amount === 0) continue;
    rows.push(box11CodeJSourceSchema.parse({
      partnership_name: item.partnership_name,
      partnership_ein: item.partnership_ein,
      source_document_reference: item.source_document_reference,
      statement_reference: review.statement_reference,
      recipient_tin: review.recipient_tin,
      reported_amount: review.reported_amount,
      taxable_amount: review.taxable_amount,
      prior_year_tax_benefit_workpaper_reference:
        review.prior_year_tax_benefit_workpaper_reference,
    }));
  }
  return rows;
}

export function assertBox11CodeJSources(
  pending: Readonly<Record<string, unknown>>,
  allowedRecipientTins: readonly string[],
): void {
  const k1 = pending.k1_partnership as Record<string, unknown> | undefined;
  const schedule1 = pending.schedule1 as Record<string, unknown> | undefined;
  const rawItems = k1?.k1_partnerships;
  if (rawItems !== undefined && !Array.isArray(rawItems)) {
    throw new Error("Partnership K-1 sources must be rows");
  }
  const items = (rawItems ?? []) as K1Source[];
  const expected = box11CodeJSourceRows(items);
  const rawFiled = schedule1?.k1_partnership_box11_code_j_sources;
  if (rawFiled !== undefined && !Array.isArray(rawFiled)) {
    throw new Error("Schedule 1 partnership code J sources must be rows");
  }
  const filed = ((rawFiled ?? []) as unknown[]).map((row) =>
    box11CodeJSourceSchema.parse(row)
  );
  for (const row of expected) {
    if (!allowedRecipientTins.includes(row.recipient_tin)) {
      throw new Error(
        "Partnership K-1 box 11 code J recipient is not the filer or joint spouse",
      );
    }
  }
  const sortRows = (rows: readonly Box11CodeJSource[]) =>
    [...rows].sort((a, b) =>
      `${a.partnership_ein}:${a.source_document_reference}`.localeCompare(
        `${b.partnership_ein}:${b.source_document_reference}`,
      )
    );
  if (JSON.stringify(sortRows(expected)) !== JSON.stringify(sortRows(filed))) {
    throw new Error(
      "Schedule 1 partnership K-1 box 11 code J sources do not match the issued K-1 facts",
    );
  }
}

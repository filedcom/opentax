import { z } from "zod";

export const box11CodeEReviewSchema = z.object({
  reported_amount: z.number().int().positive(),
  debt_reference: z.string().trim().min(1),
  statement_reference: z.string().trim().min(1),
  recipient_tin: z.string().regex(/^\d{9}$/),
  fully_taxable_reviewed: z.literal(true),
  no_section108_exclusion_confirmed: z.literal(true),
  not_reported_on_form1099c_confirmed: z.literal(true),
  taxability_workpaper_reference: z.string().trim().min(1),
}).strict();

export const box11CodeESourceSchema = z.object({
  partnership_name: z.string().trim().min(1),
  partnership_ein: z.string().regex(/^\d{9}$/),
  source_document_reference: z.string().trim().min(1),
  statement_reference: z.string().trim().min(1),
  debt_reference: z.string().trim().min(1),
  recipient_tin: z.string().regex(/^\d{9}$/),
  amount: z.number().int().positive(),
  taxability_workpaper_reference: z.string().trim().min(1),
}).strict();

export type Box11CodeESource = z.infer<typeof box11CodeESourceSchema>;

type K1Source = {
  partnership_name: string;
  partnership_ein?: string;
  source_document_reference?: string;
  box11_code_e_cod?: z.infer<typeof box11CodeEReviewSchema>;
};

export function box11CodeESourceRows(
  items: readonly K1Source[],
): Box11CodeESource[] {
  const seen = new Set<string>();
  return items.flatMap((item) => {
    if (!item.box11_code_e_cod) return [];
    const review = box11CodeEReviewSchema.parse(item.box11_code_e_cod);
    if (!item.partnership_ein || !item.source_document_reference) {
      throw new Error(
        "Partnership K-1 box 11 code E needs partnership EIN and source document reference",
      );
    }
    const key =
      `${item.partnership_ein}:${item.source_document_reference}:${review.debt_reference}`;
    if (seen.has(key)) {
      throw new Error("Duplicate partnership K-1 box 11 code E debt source");
    }
    seen.add(key);
    return [box11CodeESourceSchema.parse({
      partnership_name: item.partnership_name,
      partnership_ein: item.partnership_ein,
      source_document_reference: item.source_document_reference,
      statement_reference: review.statement_reference,
      debt_reference: review.debt_reference,
      recipient_tin: review.recipient_tin,
      amount: review.reported_amount,
      taxability_workpaper_reference: review.taxability_workpaper_reference,
    })];
  });
}

export function assertBox11CodeESources(
  pending: Readonly<Record<string, unknown>>,
  allowedRecipientTins: readonly string[],
): void {
  const k1 = pending.k1_partnership as Record<string, unknown> | undefined;
  const schedule1 = pending.schedule1 as Record<string, unknown> | undefined;
  const rawItems = k1?.k1_partnerships;
  if (rawItems !== undefined && !Array.isArray(rawItems)) {
    throw new Error("Partnership K-1 sources must be rows");
  }
  const expected = box11CodeESourceRows((rawItems ?? []) as K1Source[]);
  const rawFiled = schedule1?.k1_partnership_box11_code_e_sources;
  if (rawFiled !== undefined && !Array.isArray(rawFiled)) {
    throw new Error("Schedule 1 partnership code E sources must be rows");
  }
  const filed = ((rawFiled ?? []) as unknown[]).map((row) =>
    box11CodeESourceSchema.parse(row)
  );
  if (expected.length > 0) {
    const f1099c = pending.f1099c as Record<string, unknown> | undefined;
    if (Array.isArray(f1099c?.f1099cs) && f1099c.f1099cs.length > 0) {
      throw new Error(
        "Partnership K-1 code E with Form 1099-C needs debt-level duplicate reconciliation",
      );
    }
  }
  for (const row of expected) {
    if (!allowedRecipientTins.includes(row.recipient_tin)) {
      throw new Error(
        "Partnership K-1 box 11 code E recipient is not the filer or joint spouse",
      );
    }
  }
  const sortRows = (rows: readonly Box11CodeESource[]) =>
    [...rows].sort((a, b) =>
      `${a.partnership_ein}:${a.source_document_reference}:${a.debt_reference}`
        .localeCompare(
          `${b.partnership_ein}:${b.source_document_reference}:${b.debt_reference}`,
        )
    );
  if (JSON.stringify(sortRows(expected)) !== JSON.stringify(sortRows(filed))) {
    throw new Error(
      "Schedule 1 partnership K-1 box 11 code E sources do not match the issued K-1 facts",
    );
  }
  const amount = expected.reduce((sum, row) => sum + row.amount, 0);
  const printedAmount = schedule1?.line8c_cod_income;
  if (amount > 0 && printedAmount !== amount) {
    throw new Error(
      "Schedule 1 line 8c does not match its partnership code E sources",
    );
  }
}

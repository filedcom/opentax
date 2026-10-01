import { z } from "zod";

export const box11CodeKReviewSchema = z.object({
  reported_winnings: z.number().int().positive(),
  reported_losses: z.literal(0),
  nonbusiness_gambling_confirmed: z.literal(true),
  no_overlap_with_w2g_confirmed: z.literal(true),
  statement_reference: z.string().trim().min(1),
  recipient_tin: z.string().regex(/^\d{9}$/),
  gambling_review_reference: z.string().trim().min(1),
}).strict();

export const box11CodeKSourceSchema = z.object({
  partnership_name: z.string().trim().min(1),
  partnership_ein: z.string().regex(/^\d{9}$/),
  source_document_reference: z.string().trim().min(1),
  statement_reference: z.string().trim().min(1),
  recipient_tin: z.string().regex(/^\d{9}$/),
  winnings: z.number().int().positive(),
  gambling_review_reference: z.string().trim().min(1),
}).strict();

export type Box11CodeKSource = z.infer<typeof box11CodeKSourceSchema>;

type K1Source = {
  partnership_name: string;
  partnership_ein?: string;
  source_document_reference?: string;
  box11_code_k_gambling?: z.infer<typeof box11CodeKReviewSchema>;
};

export function box11CodeKSourceRows(
  items: readonly K1Source[],
): Box11CodeKSource[] {
  const seen = new Set<string>();
  return items.flatMap((item) => {
    if (!item.box11_code_k_gambling) return [];
    const review = box11CodeKReviewSchema.parse(item.box11_code_k_gambling);
    if (!item.partnership_ein || !item.source_document_reference) {
      throw new Error(
        "Partnership K-1 box 11 code K needs partnership EIN and source document reference",
      );
    }
    const key = `${item.partnership_ein}:${item.source_document_reference}`;
    if (seen.has(key)) {
      throw new Error("Duplicate partnership K-1 box 11 code K source");
    }
    seen.add(key);
    return [box11CodeKSourceSchema.parse({
      partnership_name: item.partnership_name,
      partnership_ein: item.partnership_ein,
      source_document_reference: item.source_document_reference,
      statement_reference: review.statement_reference,
      recipient_tin: review.recipient_tin,
      winnings: review.reported_winnings,
      gambling_review_reference: review.gambling_review_reference,
    })];
  });
}

export function assertBox11CodeKSources(
  pending: Readonly<Record<string, unknown>>,
  allowedRecipientTins: readonly string[],
): void {
  const k1 = pending.k1_partnership as Record<string, unknown> | undefined;
  const schedule1 = pending.schedule1 as Record<string, unknown> | undefined;
  const rawItems = k1?.k1_partnerships;
  if (rawItems !== undefined && !Array.isArray(rawItems)) {
    throw new Error("Partnership K-1 sources must be rows");
  }
  const expected = box11CodeKSourceRows((rawItems ?? []) as K1Source[]);
  const rawFiled = schedule1?.k1_partnership_box11_code_k_sources;
  if (rawFiled !== undefined && !Array.isArray(rawFiled)) {
    throw new Error("Schedule 1 partnership code K sources must be rows");
  }
  const filed = ((rawFiled ?? []) as unknown[]).map((row) =>
    box11CodeKSourceSchema.parse(row)
  );
  for (const row of expected) {
    if (!allowedRecipientTins.includes(row.recipient_tin)) {
      throw new Error(
        "Partnership K-1 box 11 code K recipient is not the filer or joint spouse",
      );
    }
  }
  const sortRows = (rows: readonly Box11CodeKSource[]) =>
    [...rows].sort((a, b) =>
      `${a.partnership_ein}:${a.source_document_reference}`.localeCompare(
        `${b.partnership_ein}:${b.source_document_reference}`,
      )
    );
  if (JSON.stringify(sortRows(expected)) !== JSON.stringify(sortRows(filed))) {
    throw new Error(
      "Schedule 1 partnership K-1 box 11 code K sources do not match the issued K-1 facts",
    );
  }
  if (expected.length === 0) return;
  const w2g = pending.w2g as
    | { w2gs?: Array<{ box1_winnings?: number }> }
    | undefined;
  const w2gAmount = (w2g?.w2gs ?? []).reduce(
    (sum, row) => sum + (row.box1_winnings ?? 0),
    0,
  );
  const k1Amount = expected.reduce((sum, row) => sum + row.winnings, 0);
  if (schedule1?.line8b_gambling_winnings !== w2gAmount + k1Amount) {
    throw new Error(
      "Schedule 1 line 8b does not match partnership code K and W-2G sources",
    );
  }
}

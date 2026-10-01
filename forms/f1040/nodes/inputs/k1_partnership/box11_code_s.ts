import { z } from "zod";

export const box11CodeSReviewSchema = z.object({
  short_term_gain_loss: z.number().int(),
  long_term_gain_loss: z.number().int(),
  nonpassive_reviewed: z.literal(true),
  no_special_rate_components_confirmed: z.literal(true),
  statement_reference: z.string().trim().min(1),
  recipient_tin: z.string().regex(/^\d{9}$/),
  character_workpaper_reference: z.string().trim().min(1),
}).strict().refine(
  (review) =>
    review.short_term_gain_loss !== 0 || review.long_term_gain_loss !== 0,
  "Partnership K-1 box 11 code S needs a short- or long-term amount",
);

export const box11CodeSSourceSchema = z.object({
  partnership_name: z.string().trim().min(1),
  partnership_ein: z.string().regex(/^\d{9}$/),
  source_document_reference: z.string().trim().min(1),
  statement_reference: z.string().trim().min(1),
  recipient_tin: z.string().regex(/^\d{9}$/),
  short_term_gain_loss: z.number().int(),
  long_term_gain_loss: z.number().int(),
  character_workpaper_reference: z.string().trim().min(1),
}).strict();

export type Box11CodeSSource = z.infer<typeof box11CodeSSourceSchema>;

type K1Source = {
  partnership_name: string;
  partnership_ein?: string;
  source_document_reference?: string;
  box11_code_s_nonportfolio_capital?: z.infer<typeof box11CodeSReviewSchema>;
};

export function box11CodeSSourceRows(
  items: readonly K1Source[],
): Box11CodeSSource[] {
  const seen = new Set<string>();
  return items.flatMap((item) => {
    if (!item.box11_code_s_nonportfolio_capital) return [];
    const review = box11CodeSReviewSchema.parse(
      item.box11_code_s_nonportfolio_capital,
    );
    if (!item.partnership_ein || !item.source_document_reference) {
      throw new Error(
        "Partnership K-1 box 11 code S needs partnership EIN and source document reference",
      );
    }
    const key = `${item.partnership_ein}:${item.source_document_reference}`;
    if (seen.has(key)) {
      throw new Error("Duplicate partnership K-1 box 11 code S source");
    }
    seen.add(key);
    return [box11CodeSSourceSchema.parse({
      partnership_name: item.partnership_name,
      partnership_ein: item.partnership_ein,
      source_document_reference: item.source_document_reference,
      statement_reference: review.statement_reference,
      recipient_tin: review.recipient_tin,
      short_term_gain_loss: review.short_term_gain_loss,
      long_term_gain_loss: review.long_term_gain_loss,
      character_workpaper_reference: review.character_workpaper_reference,
    })];
  });
}

export function assertBox11CodeSSources(
  pending: Readonly<Record<string, unknown>>,
  allowedRecipientTins: readonly string[],
): void {
  const k1 = pending.k1_partnership as Record<string, unknown> | undefined;
  const scheduleD = pending.schedule_d as Record<string, unknown> | undefined;
  const rawItems = k1?.k1_partnerships;
  if (rawItems !== undefined && !Array.isArray(rawItems)) {
    throw new Error("Partnership K-1 sources must be rows");
  }
  const expected = box11CodeSSourceRows((rawItems ?? []) as K1Source[]);
  const rawFiled = scheduleD?.k1_partnership_box11_code_s_sources;
  if (rawFiled !== undefined && !Array.isArray(rawFiled)) {
    throw new Error("Schedule D partnership code S sources must be rows");
  }
  const filed = ((rawFiled ?? []) as unknown[]).map((row) =>
    box11CodeSSourceSchema.parse(row)
  );
  for (const row of expected) {
    if (!allowedRecipientTins.includes(row.recipient_tin)) {
      throw new Error(
        "Partnership K-1 box 11 code S recipient is not the filer or joint spouse",
      );
    }
  }
  const sortRows = (rows: readonly Box11CodeSSource[]) =>
    [...rows].sort((a, b) =>
      `${a.partnership_ein}:${a.source_document_reference}`.localeCompare(
        `${b.partnership_ein}:${b.source_document_reference}`,
      )
    );
  if (JSON.stringify(sortRows(expected)) !== JSON.stringify(sortRows(filed))) {
    throw new Error(
      "Schedule D partnership K-1 box 11 code S sources do not match the issued K-1 facts",
    );
  }
  if (expected.length === 0) return;
  const items = rawItems as Array<{
    box8_net_st_cap_gain?: number;
    box9a_net_lt_cap_gain?: number;
  }>;
  const st =
    items.reduce((sum, item) => sum + (item.box8_net_st_cap_gain ?? 0), 0) +
    expected.reduce((sum, row) => sum + row.short_term_gain_loss, 0);
  const lt =
    items.reduce((sum, item) => sum + (item.box9a_net_lt_cap_gain ?? 0), 0) +
    expected.reduce((sum, row) => sum + row.long_term_gain_loss, 0);
  if (
    scheduleD?.k1_partnership_line5_source_total !== st ||
    scheduleD?.k1_partnership_line12_source_total !== lt
  ) {
    throw new Error(
      "Schedule D partnership line 5/12 amounts do not match its K-1 sources",
    );
  }
  if (
    pending.k1_trust === undefined && pending.k1_s_corp === undefined &&
    ((scheduleD?.line_5_k1_st ?? 0) !== st ||
      (scheduleD?.line_12_k1_lt ?? 0) !== lt)
  ) {
    throw new Error(
      "Schedule D lines 5/12 do not match the sole partnership K-1 source",
    );
  }
}

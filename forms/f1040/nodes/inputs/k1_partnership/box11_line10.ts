import { z } from "zod";

export const box11Line10ReviewSchema = z.object({
  code: z.enum(["L", "R"]),
  gain_loss: z.number().int().refine((amount) => amount !== 0),
  statement_reference: z.string().trim().min(1),
  recipient_tin: z.string().regex(/^\d{9}$/),
  ordinary_character_reviewed: z.literal(true),
  character_workpaper_reference: z.string().trim().min(1),
}).strict();

export const box11Line10SourceSchema = z.object({
  partnership_name: z.string().trim().min(1),
  partnership_ein: z.string().regex(/^\d{9}$/),
  source_document_reference: z.string().trim().min(1),
  code: z.enum(["L", "R"]),
  gain_loss: z.number().int().refine((amount) => amount !== 0),
  statement_reference: z.string().trim().min(1),
  recipient_tin: z.string().regex(/^\d{9}$/),
  character_workpaper_reference: z.string().trim().min(1),
}).strict();

export type Box11Line10Source = z.infer<typeof box11Line10SourceSchema>;

type K1Source = {
  partnership_name: string;
  partnership_ein?: string;
  source_document_reference?: string;
  box11_line10_ordinary?: Array<z.infer<typeof box11Line10ReviewSchema>>;
};

export function box11Line10SourceRows(
  items: readonly K1Source[],
): Box11Line10Source[] {
  const seen = new Set<string>();
  const rows = items.flatMap((item) => {
    const reviews = item.box11_line10_ordinary ?? [];
    if (reviews.length === 0) return [];
    if (!item.partnership_ein || !item.source_document_reference) {
      throw new Error(
        "Partnership K-1 box 11 code L/R needs partnership EIN and source document reference",
      );
    }
    return reviews.map((raw) => {
      const review = box11Line10ReviewSchema.parse(raw);
      const key =
        `${item.partnership_ein}:${item.source_document_reference}:${review.code}:${review.statement_reference}`;
      if (seen.has(key)) {
        throw new Error("Duplicate partnership K-1 box 11 code L/R source");
      }
      seen.add(key);
      return box11Line10SourceSchema.parse({
        partnership_name: item.partnership_name,
        partnership_ein: item.partnership_ein,
        source_document_reference: item.source_document_reference,
        code: review.code,
        gain_loss: review.gain_loss,
        statement_reference: review.statement_reference,
        recipient_tin: review.recipient_tin,
        character_workpaper_reference: review.character_workpaper_reference,
      });
    });
  });
  return rows;
}

export function assertBox11Line10Sources(
  pending: Readonly<Record<string, unknown>>,
  allowedRecipientTins: readonly string[],
): void {
  const k1 = pending.k1_partnership as Record<string, unknown> | undefined;
  const f4797 = pending.form4797 as Record<string, unknown> | undefined;
  const rawItems = k1?.k1_partnerships;
  if (rawItems !== undefined && !Array.isArray(rawItems)) {
    throw new Error("Partnership K-1 sources must be rows");
  }
  const expected = box11Line10SourceRows((rawItems ?? []) as K1Source[]);
  const rawFiled = f4797?.k1_box11_line10_rows;
  if (rawFiled !== undefined && !Array.isArray(rawFiled)) {
    throw new Error("Form 4797 K-1 line 10 sources must be rows");
  }
  const filed = ((rawFiled ?? []) as unknown[]).map((row) =>
    box11Line10SourceSchema.parse(row)
  );
  for (const row of expected) {
    if (!allowedRecipientTins.includes(row.recipient_tin)) {
      throw new Error(
        "Partnership K-1 box 11 code L/R recipient is not the filer or joint spouse",
      );
    }
  }
  const sortRows = (rows: readonly Box11Line10Source[]) =>
    [...rows].sort((a, b) =>
      `${a.partnership_ein}:${a.source_document_reference}:${a.code}:${a.statement_reference}`
        .localeCompare(
          `${b.partnership_ein}:${b.source_document_reference}:${b.code}:${b.statement_reference}`,
        )
    );
  if (JSON.stringify(sortRows(expected)) !== JSON.stringify(sortRows(filed))) {
    throw new Error(
      "Form 4797 K-1 box 11 code L/R rows do not match the issued K-1 facts",
    );
  }
  if (
    expected.length > 0 && f4797 &&
    Object.keys(f4797).every((key) => key === "k1_box11_line10_rows")
  ) {
    const schedule1 = pending.schedule1 as Record<string, unknown> | undefined;
    const amount = expected.reduce((sum, row) => sum + row.gain_loss, 0);
    if ((schedule1?.line4_other_gains ?? 0) !== amount) {
      throw new Error(
        "Schedule 1 line 4 does not match the sole Form 4797 partnership source",
      );
    }
  }
}

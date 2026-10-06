import { z } from "zod";
import { k1PassiveIncomeSourceSchema } from "../k1_passive_source.ts";
export const currentPassiveLine10SourceSchema = k1PassiveIncomeSourceSchema
  .extend({
    issued_ordinary_statement_record: z.object({
      tax_year: z.literal(2025),
      issuer_ein: z.string().regex(/^\d{9}$/),
      recipient_tin: z.string().regex(/^\d{9}$/),
      issued_k1_reference: z.string().trim().min(1),
      statement_reference: z.string().trim().min(1),
      code: z.enum(["L", "R"]),
      gain: z.number().int().positive(),
      character_workpaper_reference: z.string().trim().min(1),
    }).strict(),
    activities: z.array(
      k1PassiveIncomeSourceSchema.shape.activities.element.extend({
        income_box: z.literal("form4797_line10"),
      }),
    ).length(1),
  }).strict();

const eicActivityReviewSchema = z.object({
  classification: z.enum(["passive", "nonpassive"]),
  activity_statement_reference: z.string().trim().min(1),
  participation_workpaper_reference: z.string().trim().min(1),
  partnership_not_publicly_traded_verified: z.literal(true),
  // A passive loss or an unallowed loss requires a Form 8582 activity ledger.
  no_current_or_prior_unallowed_loss_for_activity_verified: z.literal(true)
    .optional(),
}).strict();

export const box11Line10ReviewSchema = z.object({
  code: z.enum(["L", "R"]),
  gain_loss: z.number().int().refine((amount) => amount !== 0),
  statement_reference: z.string().trim().min(1),
  recipient_tin: z.string().regex(/^\d{9}$/),
  ordinary_character_reviewed: z.literal(true),
  character_workpaper_reference: z.string().trim().min(1),
  eic_activity_review: eicActivityReviewSchema.optional(),
  current_passive_source: currentPassiveLine10SourceSchema.optional(),
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
  eic_activity_review: eicActivityReviewSchema.optional(),
  current_passive_source: currentPassiveLine10SourceSchema.optional(),
}).strict();

export type Box11Line10Source = z.infer<typeof box11Line10SourceSchema>;

type K1Source = {
  partnership_name: string;
  partnership_ein?: string;
  source_document_reference?: string;
  recipient_tin?: string;
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
      if (
        review.current_passive_source &&
        item.recipient_tin !== review.recipient_tin
      ) {
        throw new Error(
          "Current ordinary K1 activity needs matching issued recipient",
        );
      }
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
        ...(review.current_passive_source
          ? { current_passive_source: review.current_passive_source }
          : {}),
        ...(review.eic_activity_review
          ? { eic_activity_review: review.eic_activity_review }
          : {}),
      });
    });
  });
  currentPassiveLine10Activities(rows);
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

/** Issued ordinary gain remains on4797; its actual passive activity is PartV.
 * Negative basis/at-risk/prior claims need separate reviewed sources. */
export function currentPassiveLine10Activities(
  rows: readonly Box11Line10Source[],
) {
  return rows.flatMap((row) => {
    const source = row.current_passive_source;
    if (!source) return [];
    const review = row.eic_activity_review, activity = source.activities[0];
    const issued = source.issued_ordinary_statement_record;
    if (
      issued.issuer_ein !== row.partnership_ein ||
      issued.recipient_tin !== row.recipient_tin ||
      issued.issued_k1_reference !== row.source_document_reference ||
      issued.statement_reference !== row.statement_reference ||
      issued.code !== row.code || issued.gain !== row.gain_loss ||
      issued.character_workpaper_reference !== row.character_workpaper_reference
    ) {
      throw new Error(
        "Current ordinary activity differs from issued ordinary statement/code/character record",
      );
    }
    if (
      row.gain_loss <= 0 || review?.classification !== "passive" ||
      source.issuer_ein !== row.partnership_ein ||
      source.recipient_tin !== row.recipient_tin ||
      source.issued_k1_reference !== row.source_document_reference ||
      source.activity_statement_reference !==
        review.activity_statement_reference ||
      source.participation_workpaper_reference !==
        review.participation_workpaper_reference ||
      source.entity_status_record.issuer_ein !== row.partnership_ein ||
      activity.current_income !== row.gain_loss
    ) {
      throw new Error(
        "Current passive K1 Form4797line10 differs from owned issued activity/entity/amount source",
      );
    }
    return [{
      activity_id: activity.activity_id,
      name: activity.activity_name,
      activity_type: "B" as const,
      property_type: 8,
      reporting_form: "k1_4797_line10" as const,
      current_net: activity.current_income,
      prior_unallowed_operating: 0,
      prior_unallowed_4797_part1: 0,
      prior_unallowed_4797_part2: 0,
      first_year_activity_source: {
        activity_id: activity.activity_id,
        activity_name: activity.activity_name,
        activity_acquired_on: activity.ownership_acquired_on,
        acquisition_document_reference: activity.acquisition_document_reference,
        not_grouped_with_prior_activity: true as const,
      },
    }];
  });
}

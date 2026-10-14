import { z } from "zod";
import type { K1PassiveEicItem } from "./k1_passive_eic.ts";

const reference = z.string().trim().min(1);
const currentDate = z.string().date().refine((date) =>
  date.startsWith("2025-")
);
export const k1PassiveIncomeSourceSchema = z.object({
  tax_year: z.literal(2025),
  issuer_ein: z.string().regex(/^\d{9}$/),
  recipient_tin: z.string().regex(/^\d{9}$/),
  issued_k1_reference: reference,
  activity_statement_reference: reference,
  participation_workpaper_reference: reference,
  entity_status_record: z.object({
    issuer_ein: z.string().regex(/^\d{9}$/),
    tax_year: z.literal(2025),
    publicly_traded_partnership: z.literal(false),
    source_document_reference: reference,
  }).strict(),
  activities: z.array(
    z.object({
      activity_id: reference.max(64),
      activity_name: reference.max(30),
      income_box: z.enum(["box1", "box2", "box3"]),
      current_income: z.number().int().positive(),
      ownership_acquired_on: currentDate,
      acquisition_document_reference: reference,
      not_grouped_with_prior_activity: z.literal(true),
      prior_unallowed_operating: z.literal(0),
      prior_unallowed_4797_part1: z.literal(0),
      prior_unallowed_4797_part2: z.literal(0),
    }).strict(),
  ).min(1),
}).strict();

export interface PassiveK1Item extends K1PassiveEicItem {
  partnership_ein?: string;
  corporation_ein?: string;
  recipient_tin?: string;
  source_document_reference?: string;
  passive_income_source?: z.infer<typeof k1PassiveIncomeSourceSchema>;
}
const boxes = [
  ["box1", "box1_ordinary_business"],
  ["box2", "box2_rental_re"],
  ["box3", "box3_other_rental"],
] as const;

/** Current non-PTP income only. Prior PAL and negative K-1 boxes need their own
 * basis/at-risk/history route; a current acquisition cannot authenticate history. */
export function passiveK1Activities(
  items: readonly PassiveK1Item[],
  kind: "k1_partnership" | "k1_s_corp",
  requireSource = false,
) {
  return items.flatMap((item) => {
    const review = item.eic_passive_activity_review;
    const relevant = boxes.filter(([box, amount]) =>
      review?.[box] === "passive" && (item[amount] ?? 0) > 0
    );
    if (!relevant.length) {
      if (item.passive_income_source) {
        throw new Error(
          "K-1 passive source has no matching positive passive box",
        );
      }
      return [];
    }
    const ein = item.partnership_ein ?? item.corporation_ein;
    const recipient = item.recipient_tin ?? review?.recipient_tin;
    if (
      !ein || !recipient || !item.source_document_reference ||
      review?.recipient_tin !== recipient ||
      (kind === "k1_partnership" &&
        review.partnership_not_publicly_traded_verified !== true)
    ) {
      throw new Error(
        "K-1 PAL income needs matching owned non-PTP classification",
      );
    }
    const source = item.passive_income_source;
    if (requireSource && (!source || !item.recipient_tin)) {
      throw new Error(
        "K-1 PAL income needs retained current activity/acquisition/status sources",
      );
    }
    if (source) {
      if (
        source.issuer_ein !== ein ||
        source.recipient_tin !== item.recipient_tin ||
        source.issued_k1_reference !== item.source_document_reference ||
        source.activity_statement_reference !==
          review.activity_statement_reference ||
        source.participation_workpaper_reference !==
          review.participation_workpaper_reference ||
        source.entity_status_record.issuer_ein !== ein ||
        source.activities.some((row) =>
          !relevant.some(([box]) => box === row.income_box)
        ) ||
        new Set(source.activities.map((row) => row.activity_id)).size !==
          source.activities.length ||
        relevant.some(([box, amount]) =>
          source.activities.filter((row) => row.income_box === box)
            .reduce((sum, row) => sum + row.current_income, 0) !== item[amount]
        )
      ) {
        throw new Error(
          "K-1 PAL income inventory conflicts with its issued K-1/activity records",
        );
      }
    }
    const rows = source?.activities ?? relevant.map(([box, amount]) => ({
      activity_id: `${
        kind === "k1_partnership" ? "P" : "S"
      }:${ein}:${recipient}:${box}`,
      activity_name: `${
        kind === "k1_partnership" ? "Partnership" : "S corporation"
      } ${box}`,
      income_box: box,
      current_income: item[amount]!,
    }));
    return rows.map((row) => ({
      activity_id: row.activity_id,
      name: row.activity_name,
      activity_type: "B" as const,
      property_type: 8,
      reporting_form: kind,
      current_net: row.current_income,
      prior_unallowed_operating: 0,
      prior_unallowed_4797_part1: 0,
      prior_unallowed_4797_part2: 0,
      ...("ownership_acquired_on" in row &&
          "acquisition_document_reference" in row
        ? {
          first_year_activity_source: {
            activity_id: row.activity_id,
            activity_name: row.activity_name,
            activity_acquired_on: row.ownership_acquired_on as string,
            acquisition_document_reference: row
              .acquisition_document_reference as string,
            not_grouped_with_prior_activity: true as const,
          },
        }
        : {}),
    }));
  });
}

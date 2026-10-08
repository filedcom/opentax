import { z } from "zod";
import { assertPriorYear8582Evidence, inputSchema } from "./index.ts";

const positiveDollarSchema = z.number().refine(
  (value) => Number.isSafeInteger(value) && value > 0,
  "Form 8582 filed loss must be a positive safe whole-dollar amount",
);

const filedRowSchema = z.object({
  reporting_form: z.enum([
    "schedule_e",
    "form4835",
    "form4797_part1",
    "form4797_part2",
  ]),
  filed_unallowed_loss: positiveDollarSchema,
}).strict();

/** Reviewed transcription of a filed 2024 Form 8582, not proof of IRS acceptance. */
export const filed2024Form8582RecordSchema = z.object({
  tax_year: z.literal(2024),
  accepted_return_reference: z.string().trim().min(1),
  source_document_reference: z.string().trim().min(1),
  activities: z.array(
    z.object({
      activity_id: z.string().trim().min(1).max(64),
      filed_part_vii_column_c: positiveDollarSchema,
      reporting_part: z.enum(["viii", "ix"]),
      rows: z.array(filedRowSchema).min(1).max(3),
    }).strict().superRefine((activity, context) => {
      if (
        (activity.reporting_part === "viii" && activity.rows.length !== 1) ||
        (activity.reporting_part === "ix" && activity.rows.length < 2) ||
        new Set(activity.rows.map((row) => row.reporting_form)).size !==
          activity.rows.length ||
        activity.rows.reduce(
            (sum, row) => sum + row.filed_unallowed_loss,
            0,
          ) !==
          activity.filed_part_vii_column_c
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Form 8582 filed Part VIII/IX rows must reconcile to Part VII column (c)",
        });
      }
    }),
  ).min(1),
}).strict().superRefine((record, context) => {
  if (
    new Set(record.activities.map((activity) => activity.activity_id)).size !==
      record.activities.length
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Form 8582 filed activity IDs must be unique",
    });
  }
});

export type Filed2024Form8582Record = z.infer<
  typeof filed2024Form8582RecordSchema
>;

/**
 * Import is evidence reconciliation only. The 2025 input must already contain
 * the explicit prior balances and source fields; neither amounts nor activity
 * identity are inferred from this separately retained filed-year record.
 */
export function reconcileFiled2024Form8582Record(
  rawRecord: unknown,
  raw2025Input: unknown,
): Filed2024Form8582Record {
  const record = filed2024Form8582RecordSchema.parse(rawRecord);
  const input = inputSchema.parse(raw2025Input);
  assertPriorYear8582Evidence(input);
  const activityIds = (input.activities ?? []).map((activity) =>
    activity.activity_id
  );
  if (new Set(activityIds).size !== activityIds.length) {
    throw new Error(
      "Form 8582 2025 activity IDs must be unique for prior-year import",
    );
  }
  const priorActivities = (input.activities ?? []).filter((activity) =>
    activity.prior_unallowed_operating +
        activity.prior_unallowed_4797_part1 +
        activity.prior_unallowed_4797_part2 > 0
  );
  const priorTotal = priorActivities.reduce(
    (sum, activity) =>
      sum + activity.prior_unallowed_operating +
      activity.prior_unallowed_4797_part1 +
      activity.prior_unallowed_4797_part2,
    0,
  );
  if (
    priorActivities.length !== record.activities.length ||
    priorTotal !== input.prior_unallowed
  ) {
    throw new Error(
      "Form 8582 filed 2024 and 2025 prior-loss activity sets differ; review dispositions and missing carryovers",
    );
  }
  for (const activity of priorActivities) {
    const filed = record.activities.find((row) =>
      row.activity_id === activity.activity_id
    );
    const source = activity.prior_year_8582_source;
    if (
      !filed || !source ||
      source.source_document_reference !== record.source_document_reference ||
      source.filed_part_vii_column_c !== filed.filed_part_vii_column_c
    ) {
      throw new Error(
        "Form 8582 filed 2024 source, activity ID, or Part VII balance does not match 2025",
      );
    }
    const expectedRows = [
      {
        reporting_form: activity.reporting_form,
        amount: activity.prior_unallowed_operating,
      },
      {
        reporting_form: "form4797_part1",
        amount: activity.prior_unallowed_4797_part1,
      },
      {
        reporting_form: "form4797_part2",
        amount: activity.prior_unallowed_4797_part2,
      },
    ].filter((row) => row.amount > 0);
    const filedPartVIII = source.filed_part_viii_row;
    if (
      expectedRows.length !== filed.rows.length ||
      filed.rows.some((row) =>
        !expectedRows.some((expected) =>
          expected.reporting_form === row.reporting_form &&
          expected.amount === row.filed_unallowed_loss
        )
      ) ||
      (filed.reporting_part === "ix" &&
        (activity.reporting_form !== "schedule_e" ||
          source.filed_part_viii_row !== undefined ||
          source.filed_part_ix_rows?.length !== filed.rows.length ||
          filed.rows.some((row) =>
            !source.filed_part_ix_rows?.some((sourceRow) =>
              sourceRow.reporting_form === row.reporting_form &&
              sourceRow.filed_unallowed_loss === row.filed_unallowed_loss
            )
          ))) ||
      (filed.reporting_part === "viii" &&
        (source.filed_part_ix_rows !== undefined ||
          (filed.rows[0].reporting_form.startsWith("form4797_")
            ? filedPartVIII?.reporting_form !==
                filed.rows[0].reporting_form ||
              filedPartVIII?.filed_unallowed_loss !==
                filed.rows[0].filed_unallowed_loss
            : filedPartVIII !== undefined)))
    ) {
      throw new Error(
        "Form 8582 filed 2024 Part VIII/IX reporting character does not match 2025 prior losses",
      );
    }
  }
  return record;
}

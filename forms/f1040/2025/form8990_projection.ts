import { z } from "zod";
import {
  form8990LinesSchema,
  publicInputSchema,
} from "../nodes/intermediate/forms/form8990/index.ts";
import {
  type BoundedForm8990TwoPassResult,
  runBoundedForm8990TwoPass,
} from "../nodes/intermediate/forms/form8990/run-two-pass.ts";
import { buildPending } from "./mef/pending.ts";

const sourceRecordsSchema = z.object({
  returnInputs: z.object({
    general: z.object({}).passthrough(),
    schedule_c: z.array(z.object({}).passthrough()).length(1),
  }).strict(),
  form8990: publicInputSchema,
}).strict();

export const form8990WorkpaperSchema = z.object({
  status: z.literal("unfiled-workpaper"),
  sourceTaxYear: z.literal(2025),
  targetTaxYear: z.literal(2026),
  businessReference: z.string().min(1),
  sourceLine31: z.number().int().nonnegative(),
  targetLine2: z.number().int().nonnegative(),
  prior2024Form8990Reference: z.string().min(1),
}).strict();

const projectionSchema = form8990LinesSchema.extend({
  sourceRecords: sourceRecordsSchema,
  nextYearCarryforward: form8990WorkpaperSchema,
}).strict();

export type Form8990Projection = z.infer<typeof projectionSchema>;
export type Form8990Workpaper = z.infer<typeof form8990WorkpaperSchema>;

function plainWorkpaper(result: BoundedForm8990TwoPassResult) {
  const record = result.unfiledNextYearCarryforward;
  return {
    status: record.status,
    sourceTaxYear: record.sourceTaxYear,
    targetTaxYear: record.targetTaxYear,
    businessReference: record.businessReference,
    sourceLine31: record.sourceLine31,
    targetLine2: record.targetLine2,
    prior2024Form8990Reference: record.prior2024Form8990Reference,
  } as const;
}

function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(
        ([key, nested]) => [key, ordered(nested)],
      ),
    );
  }
  return value;
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(ordered(a)) === JSON.stringify(ordered(b));
}

/** An inspectable source-to-calculation record, not a user input shape. */
export function projectForm8990ForExport(
  sourceRecords: unknown,
  result: BoundedForm8990TwoPassResult,
): Form8990Projection {
  const sources = sourceRecordsSchema.parse(sourceRecords);
  return projectionSchema.parse({
    ...result.calculatedForm8990Node.fields,
    sourceRecords: sources,
    nextYearCarryforward: plainWorkpaper(result),
  });
}

/** Re-run the bounded return and compare every final pending document. */
export function reconcileForm8990Projection(
  raw: unknown,
  allPending: Readonly<Record<string, unknown>>,
): Form8990Projection {
  const projected = projectionSchema.parse(raw);
  const source = projected.sourceRecords;
  const result = runBoundedForm8990TwoPass({
    returnInputs: source.returnInputs,
    receipts: source.form8990.receipts,
    interestExpenseRecords: source.form8990.interestExpenseRecords,
    priorFiledScheduleCs: source.form8990.priorFiledScheduleCs,
    priorFiledForm8990: source.form8990.priorFiledForm8990,
  });
  const expected = projectForm8990ForExport(source, result);
  if (!same(projected, expected)) {
    throw new Error(
      "Form 8990 projected lines or carryforward changed after finalization",
    );
  }
  const expectedPending = buildPending(
    result.internalProjectedPending,
  ) as Record<
    string,
    unknown
  >;
  const actualKeys = Object.keys(allPending).filter((key) =>
    key !== "form8990" && allPending[key] !== undefined
  ).sort();
  const expectedKeys = Object.keys(expectedPending).filter((key) =>
    key !== "form8990" && expectedPending[key] !== undefined
  ).sort();
  if (!same(actualKeys, expectedKeys)) {
    throw new Error(
      "Form 8990 final return document set differs from two-pass calculation",
    );
  }
  for (const key of expectedKeys) {
    if (
      !same(
        allPending[key],
        expectedPending[key],
      )
    ) {
      throw new Error(
        `Form 8990 final ${key} differs from two-pass calculation`,
      );
    }
  }
  return projected;
}

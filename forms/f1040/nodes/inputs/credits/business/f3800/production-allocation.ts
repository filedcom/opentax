import { z } from "zod";

const money = z.number().finite().nonnegative().refine(
  (value) =>
    Number.isSafeInteger(Math.round(value * 100)) &&
    Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
  "Credit amounts require cent precision",
);
const coordinate = z.number().finite().refine(
  (value) => Number.isInteger(value * 1_000_000),
  "Facility coordinates require six-decimal precision",
);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const currentProductionAllocationSchema = z.object({
  tax_year: z.literal(2025),
  return_primary_ssn: z.string().regex(/^\d{9}$/),
  review_reference: z.string().trim().min(1),
  complete_current_production_inventory_confirmed: z.literal(true),
  facilities: z.array(
    z.object({
      facility_description: z.string().trim().min(1),
      facility_us_address: z.object({
        line1: z.string().min(1),
        line2: z.string().optional(),
        city: z.string().min(1),
        state: z.string().length(2),
        zip: z.string().regex(/^\d{5}(?:\d{4})?$/),
      }).strict(),
      facility_latitude: coordinate.pipe(z.number().min(-90).max(90)),
      facility_longitude: coordinate.pipe(z.number().min(-180).max(180)),
      energy_type: z.string().min(1),
      facility_placed_in_service_date: date,
      production_period_start_date: date,
      production_period_end_date: date,
      form3800_line: z.enum(["1f", "4e"]),
      credit_amount: money,
      applied_credit: money.refine(
        Number.isInteger,
        "Reviewed facility tax use requires whole filing dollars",
      ),
    }).strict(),
  ).min(1),
}).strict();
export type CurrentProductionAllocation = z.infer<
  typeof currentProductionAllocationSchema
>;

type Source = {
  facility_description?: string;
  facility_us_address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
  };
  facility_latitude?: number;
  facility_longitude?: number;
  energy_type: string;
  facility_placed_in_service_date: string;
  production_period_start_date: string;
  production_period_end_date: string;
  form3800_line: "1f" | "4e";
  credit_amount: number;
  transfer_out_amount: number;
  subject_to_passive_activity_limit: boolean;
};
const key = (
  source: Pick<
    Source,
    | "facility_latitude"
    | "facility_longitude"
    | "facility_us_address"
    | "facility_placed_in_service_date"
  >,
) =>
  JSON.stringify([
    source.facility_us_address?.line1,
    source.facility_us_address?.line2,
    source.facility_us_address?.city,
    source.facility_us_address?.state,
    source.facility_us_address?.zip,
    source.facility_latitude,
    source.facility_longitude,
    source.facility_placed_in_service_date,
  ]);

/** Bind a complete reviewed inventory to actual facilities, independently of order. */
export function reconcileCurrentProductionAllocation(
  raw: unknown,
  sources: readonly Source[],
  filing: {
    primarySSN: string;
    appliedByLine: Readonly<Record<"1f" | "4e", number>>;
  },
): readonly number[] {
  const review = currentProductionAllocationSchema.parse(raw);
  const byKey = new Map(
    review.facilities.map((source) => [key(source), source]),
  );
  if (
    !sources.length || review.facilities.length !== sources.length ||
    byKey.size !== sources.length ||
    new Set(sources.map(key)).size !== sources.length
  ) {
    throw new Error(
      "Form 3800 production allocation needs the complete distinct facility inventory",
    );
  }
  const amounts = sources.map((source) => {
    const record = byKey.get(key(source));
    if (
      !record || source.subject_to_passive_activity_limit ||
      source.transfer_out_amount !== 0 ||
      record.applied_credit > record.credit_amount ||
      record.credit_amount !== source.credit_amount ||
      record.facility_description !== source.facility_description ||
      record.energy_type !== source.energy_type ||
      record.facility_placed_in_service_date !==
        source.facility_placed_in_service_date ||
      record.production_period_start_date !==
        source.production_period_start_date ||
      record.production_period_end_date !== source.production_period_end_date ||
      record.form3800_line !== source.form3800_line
    ) {
      throw new Error(
        "Form 3800 production allocation differs from its nonpassive facility source",
      );
    }
    return record.applied_credit;
  });
  if (
    review.return_primary_ssn !== filing.primarySSN.replaceAll("-", "") ||
    (["1f", "4e"] as const).some((line) =>
      sources.reduce(
        (sum, source, index) =>
          sum +
          (source.form3800_line === line
            ? Math.round(amounts[index] * 100)
            : 0),
        0,
      ) !== Math.round(filing.appliedByLine[line] * 100)
    )
  ) {
    throw new Error(
      "Form 3800 production allocation differs from the filer or finalized tax use",
    );
  }
  return amounts;
}

export function assertCurrentProductionAllocationSource(
  raw: unknown,
  publicSource: unknown,
): void {
  if (raw === undefined && publicSource === undefined) return;
  const review = currentProductionAllocationSchema.parse(raw);
  const retained = currentProductionAllocationSchema.parse(publicSource);
  if (JSON.stringify(review) !== JSON.stringify(retained)) {
    throw new Error(
      "Form 3800 production allocation differs from the retained public record",
    );
  }
}

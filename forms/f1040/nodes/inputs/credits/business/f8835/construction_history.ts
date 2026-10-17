import { z } from "zod";

const reference = z.string().trim().min(1);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
});
const cents = z.number().int().positive().max(Number.MAX_SAFE_INTEGER / 100);
export const constructionBeginningSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("physical_work"),
    record_reference: reference,
    work_began_on: date,
    work_description: reference,
    significant_integral_physical_work_verified: z.literal(true),
    excludes_preliminary_and_inventory_work_verified: z.literal(true),
    performer: z.enum(["taxpayer", "contractor"]),
    binding_contract_reference: reference.optional(),
    binding_contract_signed_on: date.optional(),
    enforceable_contract_reviewed: z.literal(true).optional(),
  }).strict(),
  z.object({
    method: z.literal("five_percent"),
    complete_final_cost_inventory_verified: z.literal(true),
    paid_or_incurred_tax_timing_reviewed: z.literal(true),
    final_total_cost_cents: cents,
    costs: z.array(
      z.object({
        record_reference: reference,
        paid_or_incurred_on: date,
        eligible_cost_cents: cents,
        included_in_depreciable_basis_verified: z.literal(true),
      }).strict(),
    ).min(1),
  }).strict(),
]);
export const constructionContinuitySchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("safe_harbor"), review_reference: reference })
    .strict(),
  z.object({
    method: z.enum(["continuous_construction", "continuous_efforts"]),
    review_reference: reference,
    complete_history_reviewed: z.literal(true),
    history: z.array(
      z.object({
        period_start: date,
        period_end: date,
        record_reference: reference,
        activity_description: reference,
        supporting_record_references: z.array(reference).min(1),
        continuity_requirement_for_period_reviewed: z.literal(true),
      }).strict(),
    ).min(1),
  }).strict(),
]);

export const constructionHistorySchema = z.object({
  beginning: constructionBeginningSchema,
  continuity: constructionContinuitySchema,
  earliest_qualifying_start_verified: z.literal(true),
}).strict();

/** Ordinary continuity periods, including Notice 2021-41's extensions. */
export function form8835ContinuityDeadline(start: string): string {
  const year = Number(start.slice(0, 4));
  const years = year >= 2016 && year <= 2019 ? 6 : year === 2020 ? 5 : 4;
  return `${Math.max(2016, year + years)}-12-31`;
}

export function assertForm8835ConstructionHistory(
  source: z.infer<typeof constructionHistorySchema> & {
    construction_began_on: string;
    placed_in_service_on: string;
  },
  recordReferences: readonly string[] = [],
) {
  if (source.construction_began_on > source.placed_in_service_on) {
    throw new Error("Form 8835 construction must begin before service");
  }
  const refs = [...recordReferences, source.continuity.review_reference];
  const start = source.beginning;
  if (start.method === "physical_work") {
    refs.push(start.record_reference);
    if (
      start.work_began_on !== source.construction_began_on ||
      (start.performer === "contractor" && (!start.binding_contract_reference ||
        !start.binding_contract_signed_on ||
        !start.enforceable_contract_reviewed ||
        start.binding_contract_signed_on >= start.work_began_on))
    ) {
      throw new Error(
        "Form 8835 physical work needs dated significant work and an earlier binding contractor agreement",
      );
    }
    if (start.binding_contract_reference) {
      refs.push(start.binding_contract_reference);
    }
  } else {
    const costs = [...start.costs].sort((a, b) =>
      a.paid_or_incurred_on.localeCompare(b.paid_or_incurred_on)
    );
    let total = 0n;
    let began: string | undefined;
    for (const c of costs) {
      refs.push(c.record_reference);
      if (c.paid_or_incurred_on > source.placed_in_service_on) {
        throw new Error(
          "Form 8835 final construction cost occurs after placed-in-service review",
        );
      }
      total += BigInt(c.eligible_cost_cents);
      if (!began && total * 20n >= BigInt(start.final_total_cost_cents)) {
        began = c.paid_or_incurred_on;
      }
    }
    if (
      total !== BigInt(start.final_total_cost_cents) ||
      began !== source.construction_began_on
    ) {
      throw new Error(
        "Form 8835 five-percent costs, final basis or first qualifying date do not reconcile",
      );
    }
  }
  const review = source.continuity;
  if (review.method === "safe_harbor") {
    if (
      source.placed_in_service_on >
        form8835ContinuityDeadline(source.construction_began_on)
    ) {
      throw new Error(
        "Form 8835 continuity safe harbor expired; reviewed continuous construction or efforts required",
      );
    }
  } else {
    const history = [...review.history].sort((a, b) =>
      a.period_start.localeCompare(b.period_start)
    );
    let next = source.construction_began_on;
    for (const h of history) {
      refs.push(h.record_reference, ...h.supporting_record_references);
      if (
        h.period_start !== next || h.period_end < h.period_start ||
        h.period_end > source.placed_in_service_on
      ) {
        throw new Error(
          "Form 8835 continuity history has a gap, overlap or invalid period",
        );
      }
      next = new Date(Date.parse(`${h.period_end}T00:00:00Z`) + 86400000)
        .toISOString().slice(0, 10);
    }
    if (history.at(-1)!.period_end !== source.placed_in_service_on) {
      throw new Error(
        "Form 8835 continuity history does not reach placed-in-service date",
      );
    }
  }
  if (new Set(refs).size !== refs.length) {
    throw new Error(
      "Form 8835 construction records must have distinct references",
    );
  }
}

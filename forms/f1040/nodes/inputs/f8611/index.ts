import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8611 — Recapture of Low-Income Housing Credit (IRC §42(j))
// Filed when a building that received LIHTC is disposed of or no longer meets
// credit requirements before the end of the 15-year recapture period.
// Recaptured credit routes to Schedule 2 line 10.

// ─── TY2025 Constants (IRC §42(j)) ───────────────────────────────────────────

const RECAPTURE_PERIOD_YEARS = 15; // 15-year recapture period (IRC §42(j)(2)(A))
const DEFAULT_APPLICABLE_FRACTION = 1.0; // Default: 100% low-income units

// ─── Enum — Recapture Event Types ─────────────────────────────────────────────

export enum RecaptureEventType {
  // Building (or interest therein) disposed of (IRC §42(j)(1)(A))
  DISPOSITION = "DISPOSITION",
  // Qualified basis decreased (IRC §42(j)(1)(B))
  REDUCED_QUALIFIED_BASIS = "REDUCED_QUALIFIED_BASIS",
  // Building no longer qualifies as low-income (IRC §42(j)(1)(C))
  NONCOMPLIANCE = "NONCOMPLIANCE",
}

// ─── Per-item schema ──────────────────────────────────────────────────────────

// One entry per building
export const itemSchema = z.object({
  // Total LIHTC originally claimed for this building in the credit year (Form 8611 line 1)
  original_credit_amount: z.number().nonnegative(),
  // Tax year in which the credit was first claimed for this building
  year_credit_first_claimed: z.number().int(),
  // Tax year in which the recapture event occurred (current year)
  year_of_recapture_event: z.number().int(),
  // Type of event triggering recapture (IRC §42(j)(1))
  recapture_event_type: z.nativeEnum(RecaptureEventType),
  // Fraction of units in the building that are low-income (0–1); defaults to 1.0
  applicable_fraction: z.number().nonnegative().max(1).optional(),
  // Sum of recapture amounts paid in all prior tax years for this building (IRC §42(j)(5)(A))
  prior_recapture_amounts: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  f8611s: z.array(itemSchema).min(1),
});

type F8611Item = z.infer<typeof itemSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function validateYears(item: F8611Item): void {
  if (item.year_of_recapture_event < item.year_credit_first_claimed) {
    throw new Error(
      `year_of_recapture_event (${item.year_of_recapture_event}) cannot be before year_credit_first_claimed (${item.year_credit_first_claimed}) (IRC §42(j))`,
    );
  }
}

function yearsHeld(item: F8611Item): number {
  return item.year_of_recapture_event - item.year_credit_first_claimed;
}

function recaptureFraction(years: number): number {
  if (years >= RECAPTURE_PERIOD_YEARS) return 0;
  return (RECAPTURE_PERIOD_YEARS - years) / RECAPTURE_PERIOD_YEARS;
}

function grossRecapture(item: F8611Item): number {
  const fraction = recaptureFraction(yearsHeld(item));
  if (fraction === 0) return 0;
  const appFraction = item.applicable_fraction ?? DEFAULT_APPLICABLE_FRACTION;
  return item.original_credit_amount * appFraction * fraction;
}

function itemRecapture(item: F8611Item): number {
  const gross = grossRecapture(item);
  if (gross === 0) return 0;
  const prior = item.prior_recapture_amounts ?? 0;
  return Math.max(0, gross - prior);
}

function totalRecapture(items: F8611Item[]): number {
  return items.reduce((sum, item) => sum + itemRecapture(item), 0);
}

function buildOutputs(recapture: number): NodeOutput[] {
  if (recapture <= 0) return [];
  return [{ nodeType: schedule2.nodeType, fields: { line10_lihtc_recapture: recapture } }];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class F8611Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8611";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2]);

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    for (const item of input.f8611s) {
      validateYears(item);
    }
    const recapture = totalRecapture(input.f8611s);
    return { outputs: buildOutputs(recapture) };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const f8611 = new F8611Node();

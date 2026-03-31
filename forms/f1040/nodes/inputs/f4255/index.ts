import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 4255 — Recapture of Investment Credit (IRC §50(a))
// Filed when property on which an investment credit was claimed is disposed of
// or ceases to qualify before the end of the 5-year recapture period.
// Recapture amount routes to Schedule 2, Line 17a.

// TY2025 — §50(a)(1) recapture percentages
const RECAPTURE_PERCENTAGES: Record<number, number> = {
  1: 1.00,
  2: 0.80,
  3: 0.60,
  4: 0.40,
  5: 0.20,
};

export enum RecaptureReason {
  Disposed = "disposed",
  CeasedToQualify = "ceased_to_qualify",
  Converted = "converted",
  Destroyed = "destroyed",
}

export const itemSchema = z.object({
  // Form 4255 column (a) — description of property
  description: z.string().optional(),
  // Form 4255 column (b) — date placed in service (ISO YYYY-MM-DD)
  date_placed_in_service: z.string().optional(),
  // Original investment credit claimed on this property
  original_credit_amount: z.number().nonnegative(),
  // Year of recapture (1–5): determines the recapture percentage under §50(a)(1)
  year_of_recapture: z.number().int().min(1).max(5),
  // Why the property ceased to qualify
  recapture_reason: z.nativeEnum(RecaptureReason).optional(),
  // Override computed recapture amount (taxpayer-provided or from prior-year carryover)
  recapture_amount_override: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  properties: z.array(itemSchema).min(1),
});

type F4255Item = z.infer<typeof itemSchema>;
type F4255Items = F4255Item[];

// ── Per-item recapture ────────────────────────────────────────────────────────

function recapturePercentage(year: number): number {
  return RECAPTURE_PERCENTAGES[year] ?? 0;
}

function propertyRecapture(item: F4255Item): number {
  if (item.recapture_amount_override !== undefined) {
    return item.recapture_amount_override;
  }
  return item.original_credit_amount * recapturePercentage(item.year_of_recapture);
}

// ── Aggregation ───────────────────────────────────────────────────────────────

function totalRecapture(properties: F4255Items): number {
  return properties.reduce((sum, item) => sum + propertyRecapture(item), 0);
}

// ── Output ────────────────────────────────────────────────────────────────────

function buildOutputs(total: number): NodeOutput[] {
  if (total <= 0) return [];
  return [{ nodeType: schedule2.nodeType, fields: { line17a_investment_credit_recapture: total } }];
}

// ── Node class ────────────────────────────────────────────────────────────────

class F4255Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f4255";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2]);
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f4255.pdf";

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    const total = totalRecapture(input.properties);
    return { outputs: buildOutputs(total) };
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const f4255 = new F4255Node();

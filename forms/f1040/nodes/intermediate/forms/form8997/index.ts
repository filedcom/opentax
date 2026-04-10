import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule_d } from "../../aggregation/schedule_d/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

// ─── Form 8997 — QOF Investment Statement (IRC §1400Z-2) ──────────────────────
//
// Tracks Qualified Opportunity Fund (QOF) investments across their lifecycle:
//   Part I:   QOF investments held at beginning of tax year
//   Part II:  QOF investments made during the current year (new deferrals)
//   Part III: Current-year inclusion events (recognition triggers)
//   Part IV:  QOF investments held at end of tax year
//
// Key rules:
//   - Deferred gain is recognized (inclusion event) when the QOF investment is
//     sold or otherwise disposed of (IRC §1400Z-2(b)).
//   - If held 10+ years at disposition: gain on the QOF investment itself
//     (appreciation above the deferred gain basis) may be excluded from income
//     (IRC §1400Z-2(c)).
//   - All recognized QOF inclusion amounts are long-term capital gain regardless
//     of the holding period of the underlying asset.

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const itemSchema = z.object({
  // QOF EIN for identification (from Part I / Part IV reporting)
  qof_ein: z.string().optional(),

  // Original deferred gain invested into this QOF
  // This is the gain that was excluded in the year of investment and is
  // now potentially coming back into income on an inclusion event.
  deferred_gain: z.number().nonnegative(),

  // Date of QOF investment (ISO 8601, e.g. "2023-07-15")
  investment_date: z.string(),

  // Amount of deferred gain recognized this year due to an inclusion event
  // IRC §1400Z-2(b): recognized when QOF investment is sold, disposed of,
  // gifted, or otherwise triggers inclusion (e.g. death).
  // Cannot exceed deferred_gain.
  inclusion_amount: z.number().nonnegative().optional(),

  // Whether the QOF investment was held 10+ years at the time of disposition
  // IRC §1400Z-2(c): if true, gain on the QOF investment itself (above basis)
  // may be excluded; only the original deferred_gain (or inclusion_amount) flows
  // to Schedule D as LTCG.
  held_10_years: z.boolean().optional(),

  // Fair market value of QOF investment at end of year (for Part IV reporting)
  fmv_end_of_year: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  investments: z.array(itemSchema).min(1),
});

type QofItem = z.infer<typeof itemSchema>;

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

// Recognized LTCG for a single QOF investment on an inclusion event.
// IRC §1400Z-2(b): the included amount equals the lesser of inclusion_amount
// and deferred_gain (cannot exceed original deferred gain).
// When held_10_years is true, only the original deferred gain (or the
// explicit inclusion_amount, whichever is specified) is included — any
// appreciation above the deferred basis is excluded per IRC §1400Z-2(c).
function recognizedGain(item: QofItem): number {
  const inclusion = item.inclusion_amount ?? 0;
  if (inclusion <= 0) return 0;
  // Cap at original deferred_gain to prevent over-inclusion
  return Math.min(inclusion, item.deferred_gain);
}

function hasInclusionEvent(item: QofItem): boolean {
  return (item.inclusion_amount ?? 0) > 0;
}

function buildItemOutputs(item: QofItem) {
  if (!hasInclusionEvent(item)) return [];

  const gain = recognizedGain(item);
  if (gain <= 0) return [];

  // QOF inclusion amounts always route as long-term capital gain (Line 11 —
  // same line used for undistributed LT gains and gains from other forms).
  return [output(schedule_d, { line_11_form2439: gain })];
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class Form8997Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8997";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_d]);

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    return { outputs: input.investments.flatMap(buildItemOutputs) };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form8997 = new Form8997Node();

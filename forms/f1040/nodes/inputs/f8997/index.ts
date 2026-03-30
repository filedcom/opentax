import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule_d } from "../../intermediate/schedule_d/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ─── Schemas ─────────────────────────────────────────────────────────────────

// Schema for a single QOF investment entry in Part I or Part IV (year-start / year-end holdings)
const holdingItemSchema = z.object({
  description: z.string(),
  qof_ein: z.string().optional(),
  date_acquired: z.string(),
  short_term_deferred_gain: z.number().nonnegative(),
  long_term_deferred_gain: z.number().nonnegative(),
});

// Schema for a single QOF investment entry in Part II (new investments / new deferrals)
const newInvestmentItemSchema = z.object({
  description: z.string(),
  qof_ein: z.string().optional(),
  date_acquired: z.string(),
  short_term_deferred_gain: z.number().nonnegative(),
  long_term_deferred_gain: z.number().nonnegative(),
});

// Schema for a single QOF investment entry in Part III (inclusion events / dispositions)
const inclusionItemSchema = z.object({
  description: z.string(),
  qof_ein: z.string().optional(),
  date_acquired: z.string(),
  date_of_inclusion: z.string(),
  short_term_gain_included: z.number().nonnegative(),
  long_term_gain_included: z.number().nonnegative(),
  // 10-year FMV exclusion election (IRC §1400Z-2(c))
  elected_fmv_exclusion: z.boolean().optional(),
  excluded_gain: z.number().nonnegative().optional(),
});

// Form 8997 — Initial and Annual Statement of Qualified Opportunity Fund (QOF) Investments
//
// Disclosure and tracking form filed by any taxpayer who holds a QOF investment during
// the tax year. Most years this form produces no tax output — it is purely informational.
// When an inclusion event occurs (Part III), the recognized deferred gain routes to
// Schedule D as a capital gain transaction with adjustment code "Q".
//
// TY2025 note: The December 31, 2026 hard deferral deadline means all remaining deferred
// gains will become includible on TY2026 returns; TY2025 filers are still in the deferral
// window for pre-2026 investments.

export const inputSchema = z.object({
  // Part I — QOF investments held at the beginning of the year (Jan 1)
  part_i: z.array(holdingItemSchema).optional(),

  // Part II — QOF investments made during the year (new deferrals)
  part_ii: z.array(newInvestmentItemSchema).optional(),

  // Part III — QOF investments disposed of / inclusion events during the year
  part_iii: z.array(inclusionItemSchema).optional(),

  // Part IV — QOF investments held at the end of the year (Dec 31)
  part_iv: z.array(holdingItemSchema).optional(),
});

// ─── Type aliases ─────────────────────────────────────────────────────────────

type F8997Input = z.infer<typeof inputSchema>;
type InclusionItem = z.infer<typeof inclusionItemSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Build a schedule_d transaction output for a single included gain amount.
// The gain character (ST vs LT) is determined by the caller.
function buildGainOutput(
  item: InclusionItem,
  gainAmount: number,
  isLongTerm: boolean,
): NodeOutput {
  return {
    nodeType: schedule_d.nodeType,
    fields: {
      transaction: {
        part: isLongTerm ? ("D" as const) : ("A" as const),
        description: `QOF inclusion event: ${item.description}`,
        date_acquired: item.date_acquired,
        date_sold: item.date_of_inclusion,
        proceeds: gainAmount,
        cost_basis: 0,
        adjustment_codes: "Q",
        gain_loss: gainAmount,
        is_long_term: isLongTerm,
      },
    },
  };
}

// Produce NodeOutputs for a single Part III inclusion item.
// Returns 0, 1, or 2 outputs depending on which gain types are non-zero.
function inclusionOutputs(item: InclusionItem): NodeOutput[] {
  const outputs: NodeOutput[] = [];

  if (item.long_term_gain_included > 0) {
    outputs.push(buildGainOutput(item, item.long_term_gain_included, true));
  }

  if (item.short_term_gain_included > 0) {
    outputs.push(buildGainOutput(item, item.short_term_gain_included, false));
  }

  return outputs;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class F8997Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8997";
  readonly inputSchema = inputSchema;
  // Only Part III (inclusion events) produces downstream tax outputs.
  readonly outputNodes = new OutputNodes([schedule_d]);

  compute(_ctx: NodeContext, rawInput: F8997Input): NodeResult {
    const parsed = inputSchema.parse(rawInput);

    // Parts I, II, IV are purely tracking — no tax computation outputs.
    // Only Part III inclusion events produce recognized gain.
    const outputs = (parsed.part_iii ?? []).flatMap(inclusionOutputs);

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const f8997 = new F8997Node();

import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Alimony Received Input Node
//
// Handles alimony received under divorce or separation instruments executed
// before January 1, 2019. Such amounts are taxable to the recipient under
// IRC §71 (pre-TCJA rules apply based on instrument date).
//
// Amounts reported on Schedule 1, Line 2a.
// Post-2018 instruments and express later exclusions yield no taxable income.

// ─── Schema ───────────────────────────────────────────────────────────────────

export const itemSchema = z.object({
  // Identifies one original agreement when several payments are retained.
  agreement_reference: z.string().trim().min(1),
  // Alimony amount received during the tax year
  amount: z.number().nonnegative(),
  // Date of the divorce or separation agreement (ISO date YYYY-MM-DD)
  // Must be before 2019-01-01 for pre-TCJA taxability
  divorce_agreement_date: z.string().date(),
  // A pre-2019 agreement can cease to be taxable when a later modification
  // expressly applies the post-2018 alimony treatment.
  post_2018_modification_excludes_alimony: z.boolean(),
  // Retained payer identity; the recipient supplies their SSN to the payer.
  payer_ssn: z.string().optional(),
});

export const inputSchema = z.object({
  alimony_receiveds: z.array(itemSchema),
});

type AlimonyItems = z.infer<typeof itemSchema>[];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Only pre-2019 instrument dates without an express later exclusion are taxable.
function isTaxable(item: z.infer<typeof itemSchema>): boolean {
  return item.divorce_agreement_date < "2019-01-01" &&
    !item.post_2018_modification_excludes_alimony;
}

function totalTaxableAlimony(items: AlimonyItems): number {
  return items
    .filter(isTaxable)
    .reduce((sum, item) => sum + item.amount, 0);
}

export function taxableAlimonyReceived(
  raw: unknown,
): { amount: number; agreementMonth: string } | undefined {
  const items = inputSchema.parse(raw).alimony_receiveds.filter(isTaxable)
    .filter((item) => item.amount > 0);
  if (items.length === 0) return undefined;
  const agreements = new Set(items.map((item) => item.agreement_reference));
  const months = new Set(
    items.map((item) => item.divorce_agreement_date.slice(0, 7)),
  );
  if (agreements.size !== 1 || months.size !== 1) {
    throw new Error(
      "Multiple taxable alimony agreements need the Schedule 1 line 2b statement",
    );
  }
  return {
    amount: totalTaxableAlimony(items),
    agreementMonth: [...months][0],
  };
}

export function assertTaxableAlimonySchedule1(
  filedAmount: unknown,
  source: unknown,
): ReturnType<typeof taxableAlimonyReceived> {
  if (source === undefined) {
    if (typeof filedAmount === "number" && filedAmount > 0) {
      throw new Error(
        "Schedule 1 line 2a needs dated alimony agreement source",
      );
    }
    return undefined;
  }
  const taxable = taxableAlimonyReceived(source);
  if ((taxable?.amount ?? 0) !== (filedAmount ?? 0)) {
    throw new Error("Schedule 1 line 2a differs from taxable alimony sources");
  }
  return taxable;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class AlimonyReceivedNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "alimony_received";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, agi_aggregator]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const input = inputSchema.parse(rawInput);
    const taxable = taxableAlimonyReceived(input)?.amount ?? 0;

    if (taxable <= 0) {
      return { outputs: [] };
    }

    return {
      outputs: [
        this.outputNodes.output(schedule1, {
          line2a_alimony_received: taxable,
        }),
        this.outputNodes.output(agi_aggregator, {
          line2a_alimony_received: taxable,
        }),
      ],
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const alimony_received = new AlimonyReceivedNode();

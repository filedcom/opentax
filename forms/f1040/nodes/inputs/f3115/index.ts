import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { scheduleC } from "../schedule_c/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 3115 establishes a method change and its section 481(a) adjustment.
// The affected business schedule, not Form 3115 itself, reports the amount.
// This source currently supports a business-linked Schedule C adjustment.

export enum FilingType {
  Automatic = "automatic",
  AdvanceConsent = "advance_consent",
}

export const itemSchema = z.object({
  designated_change_number: z.string().min(1),
  filing_type: z.nativeEnum(FilingType),
  section_481_adjustment: z.number().int().finite().optional(),
  // An explicit period must match the ordinary rule below. Special periods
  // require their own reviewed source evidence and are not inferred here.
  spread_period: z.number().int().min(1).optional(),
  year_of_change: z.number().int().optional(),
  reporting_schedule: z.literal("schedule_c").optional(),
  business_reference: z.string().trim().min(1).optional(),
  // Form 3115 line 28 permits this election for a positive adjustment under
  // $50,000. The election applies in the year of change only.
  one_year_positive_election_verified: z.literal(true).optional(),
  accounting_method_before: z.string().optional(),
  accounting_method_proposed: z.string().optional(),
});

export const inputSchema = z.object({
  f3115s: z.array(itemSchema).min(1),
});

type F3115Item = z.infer<typeof itemSchema>;

function currentYearAdjustment(item: F3115Item, taxYear: number): number {
  const amount = item.section_481_adjustment ?? 0;
  if (amount === 0) return 0;
  if (
    item.reporting_schedule !== "schedule_c" ||
    item.business_reference === undefined ||
    item.year_of_change === undefined
  ) {
    throw new Error(
      "Form 3115 nonzero section 481(a) adjustment needs a Schedule C business reference and year of change",
    );
  }
  if (item.year_of_change > taxYear) {
    throw new Error("Form 3115 year of change cannot follow the tax year");
  }
  if (amount < 0) {
    if (item.spread_period !== undefined && item.spread_period !== 1) {
      throw new Error(
        "Form 3115 negative section 481(a) adjustment needs a reviewed special-period path",
      );
    }
    if (item.one_year_positive_election_verified) {
      throw new Error(
        "Form 3115 positive election cannot apply to a negative adjustment",
      );
    }
    return item.year_of_change === taxYear ? amount : 0;
  }

  if (item.one_year_positive_election_verified) {
    if (
      amount >= 50_000 ||
      (item.spread_period !== undefined && item.spread_period !== 1)
    ) {
      throw new Error(
        "Form 3115 one-year positive election needs an adjustment under $50,000 and a one-year period",
      );
    }
    return item.year_of_change === taxYear ? amount : 0;
  }
  if (item.spread_period !== undefined && item.spread_period !== 4) {
    throw new Error(
      "Form 3115 positive special adjustment period needs a reviewed source path",
    );
  }
  const installmentYear = taxYear - item.year_of_change;
  if (installmentYear < 0 || installmentYear >= 4) return 0;
  const wholeDollarInstallment = Math.floor(amount / 4);
  return installmentYear === 3
    ? amount - 3 * wholeDollarInstallment
    : wholeDollarInstallment;
}

export function currentYearSection481aAdjustments(
  raw: unknown,
  taxYear: number,
): Array<{
  business_reference: string;
  designated_change_number: string;
  year_of_change: number;
  amount: number;
}> {
  const items = inputSchema.parse(raw).f3115s;
  if (
    items.length > 1 &&
    items.some((item) => item.one_year_positive_election_verified)
  ) {
    throw new Error(
      "Form 3115 one-year positive election with multiple method changes needs a reviewed combined adjustment",
    );
  }
  return items.flatMap((item) => {
    const amount = currentYearAdjustment(item, taxYear);
    return amount === 0 ? [] : [{
      business_reference: item.business_reference!,
      designated_change_number: item.designated_change_number,
      year_of_change: item.year_of_change!,
      amount,
    }];
  });
}

export function assertCurrentYearSection481aMatches(
  rawForm3115: unknown,
  projected: ReadonlyArray<{
    business_reference: string;
    designated_change_number: string;
    year_of_change: number;
    amount: number;
  }>,
  taxYear: number,
): void {
  const key = (row: typeof projected[number]) =>
    `${row.business_reference}\u0000${row.designated_change_number}\u0000${row.year_of_change}\u0000${row.amount}`;
  const fromSource = currentYearSection481aAdjustments(rawForm3115, taxYear)
    .map(key).sort();
  const fromScheduleC = projected.map(key).sort();
  if (JSON.stringify(fromSource) !== JSON.stringify(fromScheduleC)) {
    throw new Error(
      "Schedule C section 481(a) adjustments differ from Form 3115 source",
    );
  }
}

function buildOutputs(items: F3115Item[], taxYear: number): NodeOutput[] {
  const adjustments = currentYearSection481aAdjustments(
    { f3115s: items },
    taxYear,
  );
  if (adjustments.length === 0) return [];
  return [{
    nodeType: scheduleC.nodeType,
    fields: { section481a_adjustments: adjustments },
  }];
}

class F3115Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f3115";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([scheduleC]);

  compute(ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    return { outputs: buildOutputs(input.f3115s, ctx.taxYear) };
  }
}

export const f3115 = new F3115Node();

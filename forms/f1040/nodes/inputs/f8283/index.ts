import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { scheduleA as schedule_a } from "../schedule_a/index.ts";

// Method used to determine FMV
export enum FMVMethod {
  Appraisal = "appraisal",
  ThriftShopValue = "thrift_shop_value",
  CatalogValue = "catalog_value",
  ComparableSales = "comparable_sales",
  Formula = "formula",
  Other = "other",
}

// Section A — items ≤$5,000 each (or ≤$10,000 for closely held stock)
const sectionAItemSchema = z.object({
  property_description: z.string().optional(),
  date_acquired: z.string().optional(),       // ISO date YYYY-MM-DD
  date_contributed: z.string().optional(),    // ISO date YYYY-MM-DD
  fmv: z.number().nonnegative().optional(),
  fmv_method: z.nativeEnum(FMVMethod).optional(),
  cost_or_adjusted_basis: z.number().nonnegative().optional(),
  // Vehicles — need Form 1098-C acknowledgment
  is_vehicle: z.boolean().optional(),
  vehicle_1098c_received: z.boolean().optional(),
  // Clothing/household — must be in good used condition or better
  is_clothing_household: z.boolean().optional(),
});

// Section B — items >$5,000 each (requires qualified appraisal)
const sectionBItemSchema = z.object({
  property_description: z.string().optional(),
  date_acquired: z.string().optional(),
  date_contributed: z.string().optional(),
  fmv: z.number().nonnegative().optional(),
  cost_or_adjusted_basis: z.number().nonnegative().optional(),
  appraiser_name: z.string().optional(),
  appraisal_date: z.string().optional(),
  // Capital gain property — may be limited to cost basis
  is_capital_gain_property: z.boolean().optional(),
});

// Singleton — one Form 8283 per return covering all noncash contributions
export const inputSchema = z.object({
  section_a_items: z.array(sectionAItemSchema).optional(),
  section_b_items: z.array(sectionBItemSchema).optional(),
});

type SectionAItem = z.infer<typeof sectionAItemSchema>;
type SectionBItem = z.infer<typeof sectionBItemSchema>;
type F8283Input = z.infer<typeof inputSchema>;

// For capital gain property in Section B, deduction limited to cost basis
function sectionBFMV(item: SectionBItem): number {
  if (item.is_capital_gain_property === true && item.cost_or_adjusted_basis !== undefined) {
    return Math.min(item.fmv ?? 0, item.cost_or_adjusted_basis);
  }
  return item.fmv ?? 0;
}

function totalSectionAContributions(items: SectionAItem[]): number {
  return items.reduce((sum, item) => sum + (item.fmv ?? 0), 0);
}

function totalSectionBContributions(items: SectionBItem[]): number {
  return items.reduce((sum, item) => sum + sectionBFMV(item), 0);
}

function scheduleAOutput(input: F8283Input): NodeOutput[] {
  const sectionA = totalSectionAContributions(input.section_a_items ?? []);
  const sectionB = totalSectionBContributions(input.section_b_items ?? []);
  const total = sectionA + sectionB;
  if (total === 0) return [];
  return [output(schedule_a, { line_12_noncash_contributions: total })];
}

class F8283Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8283";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_a]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);

    const outputs: NodeOutput[] = [
      ...scheduleAOutput(parsed),
    ];

    return { outputs };
  }
}

export const f8283 = new F8283Node();

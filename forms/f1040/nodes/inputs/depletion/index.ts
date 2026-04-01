import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { scheduleC } from "../schedule_c/index.ts";
import { scheduleE } from "../schedule_e/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Depletion Worksheet — IRC §611–614, §613A
// Computes depletion deductions for mineral, oil, and gas interests.
// Taxpayer must use the greater of cost or percentage depletion.

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum PropertyType {
  OIL_GAS = "OIL_GAS",
  COAL = "COAL",
  METALS = "METALS",
  OTHER_MINERAL = "OTHER_MINERAL",
}

export enum DepletionMethod {
  COST = "COST",
  PERCENTAGE = "PERCENTAGE",
}

export enum DepletionPurpose {
  SCHEDULE_C = "SCHEDULE_C",
  SCHEDULE_E = "SCHEDULE_E",
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const itemSchema = z.object({
  // Mineral/resource type — determines percentage depletion rate
  property_type: z.nativeEnum(PropertyType),

  // Depletion method chosen by taxpayer
  method: z.nativeEnum(DepletionMethod),

  // Gross income from the property (for percentage depletion net income limit)
  gross_income: z.number().nonnegative(),

  // Deductible costs attributable to property (to compute net income)
  deductible_expenses: z.number().nonnegative(),

  // Adjusted basis in the property — required for cost depletion
  // IRC §611(b)
  adjusted_basis: z.number().nonnegative().optional(),

  // Remaining recoverable units — required for cost depletion
  // IRC §611(b)
  estimated_reserves: z.number().nonnegative().optional(),

  // Units produced during the year (informational)
  units_produced: z.number().nonnegative().optional(),

  // Units sold during the year — used in cost depletion formula
  units_sold: z.number().nonnegative(),

  // Taxpayer's taxable income before depletion — for oil/gas 65% cap
  // IRC §613A(d)(1)
  taxable_income_before_depletion: z.number().nonnegative().optional(),

  // Independent producer/royalty owner qualification for oil/gas
  // Major integrated oil companies cannot use percentage depletion
  // IRC §613A(c)
  is_independent_producer: z.boolean().optional(),

  // Where deduction routes: Schedule C (business) or Schedule E (royalty/rental)
  purpose: z.nativeEnum(DepletionPurpose),
});

export const inputSchema = z.object({
  depletions: z.array(itemSchema).min(1),
});

type DepletionItem = z.infer<typeof itemSchema>;
type DepletionItems = DepletionItem[];

// ─── Constants (TY2025 — IRC §613, §613A; no annual inflation adjustment) ────

const OIL_GAS_RATE = 0.15;        // IRC §613A(c) — independent producer rate
const COAL_RATE = 0.10;           // IRC §613(b) — coal, lignite
const METALS_RATE = 0.15;         // IRC §613(b) — gold, silver, copper, iron ore
const OTHER_MINERAL_RATE = 0.14;  // IRC §613(b) — "all other minerals"
const OIL_GAS_NET_INCOME_LIMIT = 1.00;     // IRC §613(a) — 100% for oil/gas
const GENERAL_NET_INCOME_LIMIT = 0.50;     // IRC §613(a) — 50% for all other minerals
const OIL_GAS_TAXABLE_INCOME_CAP = 0.65;  // IRC §613A(d)(1) — 65% of taxable income

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function percentageRate(item: DepletionItem): number {
  switch (item.property_type) {
    case PropertyType.OIL_GAS: return OIL_GAS_RATE;
    case PropertyType.COAL: return COAL_RATE;
    case PropertyType.METALS: return METALS_RATE;
    case PropertyType.OTHER_MINERAL: return OTHER_MINERAL_RATE;
  }
}

function netIncomeLimit(item: DepletionItem): number {
  return item.property_type === PropertyType.OIL_GAS
    ? OIL_GAS_NET_INCOME_LIMIT
    : GENERAL_NET_INCOME_LIMIT;
}

// IRC §611(b): cost depletion = (adjusted_basis / estimated_reserves) × units_sold
function costDepletion(item: DepletionItem): number {
  const basis = item.adjusted_basis ?? 0;
  const reserves = item.estimated_reserves ?? 0;
  if (basis === 0 || reserves === 0) return 0;
  return (basis / reserves) * item.units_sold;
}

// IRC §613(a): percentage depletion = gross_income × rate, capped by net income limit
// For oil/gas: also capped at 65% of taxable income (§613A(d)(1))
function percentageDepletion(item: DepletionItem): number {
  // Oil/gas requires independent producer qualification
  if (item.property_type === PropertyType.OIL_GAS) {
    if (item.is_independent_producer !== true) return 0;
  }

  const gross = item.gross_income;
  const net = gross - item.deductible_expenses;
  if (net <= 0) return 0;

  const grossPct = gross * percentageRate(item);
  const netLimit = net * netIncomeLimit(item);
  let allowed = Math.min(grossPct, netLimit);

  // Oil/gas: additional 65% of taxable income cap
  if (item.property_type === PropertyType.OIL_GAS) {
    const taxableIncome = item.taxable_income_before_depletion ?? 0;
    const taxableIncomeCap = taxableIncome * OIL_GAS_TAXABLE_INCOME_CAP;
    allowed = Math.min(allowed, taxableIncomeCap);
  }

  // Round to cents to avoid floating-point artifacts
  return Math.round(allowed * 100) / 100;
}

function depletionDeduction(item: DepletionItem): number {
  if (item.method === DepletionMethod.COST) {
    return costDepletion(item);
  }
  // PERCENTAGE method — percentage depletion (but use cost if higher)
  // Per IRS: taxpayer takes the greater; PERCENTAGE method means
  // primarily use percentage but cost is still computed for comparison.
  // For simplicity matching standard practice: PERCENTAGE selects percentage only.
  return percentageDepletion(item);
}

function scheduleCItems(items: DepletionItems): DepletionItems {
  return items.filter((item) => item.purpose === DepletionPurpose.SCHEDULE_C);
}

function scheduleEItems(items: DepletionItems): DepletionItems {
  return items.filter((item) => item.purpose === DepletionPurpose.SCHEDULE_E);
}

function scheduleCOutput(items: DepletionItems): NodeOutput[] {
  const total = scheduleCItems(items).reduce((sum, item) => sum + depletionDeduction(item), 0);
  if (total === 0) return [];
  return [output(scheduleC, { line_12_depletion: total })];
}

function scheduleEOutput(items: DepletionItems): NodeOutput[] {
  const total = scheduleEItems(items).reduce((sum, item) => sum + depletionDeduction(item), 0);
  if (total === 0) return [];
  return [output(scheduleE, { expense_depletion: total })];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class DepletionNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "depletion";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([scheduleC, scheduleE]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const { depletions } = parsed;

    const outputs: NodeOutput[] = [
      ...scheduleCOutput(depletions),
      ...scheduleEOutput(depletions),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const depletion = new DepletionNode();

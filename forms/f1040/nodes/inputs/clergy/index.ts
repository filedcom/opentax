import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule_se } from "../../intermediate/forms/schedule_se/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 — Clergy/ministerial income treatment under IRC §107, §1402(a)(8), §1402(c)(4)
// Ministers are employees for income tax but self-employed for SE tax on ministerial services.
// Housing allowance is excluded from gross income (IRC §107) but included in SE base (IRC §1402(a)(8)).
// Form 4361 approval exempts the minister from SE tax on ministerial earnings permanently.
// IRS Pub 517 (Social Security and Other Information for Members of the Clergy)

export const itemSchema = z.object({
  // Wages received from the church as an employee minister (W-2 Box 1)
  ministerial_wages: z.number().nonnegative().optional(),
  // Amount officially designated by church as housing allowance before year start (IRC §107(2))
  housing_allowance_designated: z.number().nonnegative().optional(),
  // Actual amounts paid for housing during the year (rent, mortgage, utilities, repairs)
  actual_housing_expenses: z.number().nonnegative().optional(),
  // Fair market rental value of the home including furnishings and utilities (IRC §107(2) limit)
  fair_market_rental_value: z.number().nonnegative().optional(),
  // FMV of church-provided housing (parsonage) — excluded under IRC §107(1)
  parsonage_value: z.number().nonnegative().optional(),
  // Form 4361 approved — exempts minister from SE tax on ministerial earnings (IRC §1402(e))
  has_4361_exemption: z.boolean().optional(),
  // Minister must be ordained, licensed, or commissioned to qualify for §107 and dual-status SE
  is_ordained_minister: z.boolean().optional(),
});

export const inputSchema = z.object({
  clergys: z.array(itemSchema).min(1),
});

type ClergyItem = z.infer<typeof itemSchema>;
type ClergyItems = ClergyItem[];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function ordainedItems(items: ClergyItems): ClergyItems {
  return items.filter((item) => item.is_ordained_minister === true);
}

// Housing allowance exclusion: min(designated, actual, fmrv) per IRC §107(2)
function housingAllowanceExclusion(item: ClergyItem): number {
  const designated = item.housing_allowance_designated ?? 0;
  const actual = item.actual_housing_expenses ?? 0;
  const fmrv = item.fair_market_rental_value ?? 0;
  if (designated === 0 || actual === 0 || fmrv === 0) return 0;
  return Math.min(designated, actual, fmrv);
}

// Parsonage exclusion: FMV of provided housing per IRC §107(1)
function parsonageExclusion(item: ClergyItem): number {
  return item.parsonage_value ?? 0;
}

// Total housing exclusion for one minister (parsonage + cash allowance)
function totalHousingExclusion(item: ClergyItem): number {
  return housingAllowanceExclusion(item) + parsonageExclusion(item);
}

// SE base per minister: wages + designated housing allowance (parsonage NOT included — IRC §1402(a)(8))
function seBase(item: ClergyItem): number {
  return (item.ministerial_wages ?? 0) + (item.housing_allowance_designated ?? 0);
}

// SE base for items that owe SE tax (ordained, no 4361)
function taxableSeBase(item: ClergyItem): number {
  if (item.has_4361_exemption === true) return 0;
  return seBase(item);
}

function totalSeBase(items: ClergyItems): number {
  return ordainedItems(items).reduce(
    (sum, item) => sum + taxableSeBase(item),
    0,
  );
}

function totalHousingExclusionAll(items: ClergyItems): number {
  return ordainedItems(items).reduce(
    (sum, item) => sum + totalHousingExclusion(item),
    0,
  );
}

function scheduleSeOutput(items: ClergyItems): NodeOutput[] {
  const base = totalSeBase(items);
  if (base === 0) return [];
  return [output(schedule_se, { net_profit_schedule_c: base })];
}

function schedule1Output(items: ClergyItems): NodeOutput[] {
  const exclusion = totalHousingExclusionAll(items);
  if (exclusion === 0) return [];
  // Negative amount — the exclusion reduces taxable income reported on Schedule 1 line 8z
  return [output(schedule1, { line8z_other_income: -exclusion })];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class ClergyNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "clergy";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_se, schedule1]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const { clergys } = parsed;

    const outputs: NodeOutput[] = [
      ...scheduleSeOutput(clergys),
      ...schedule1Output(clergys),
    ];

    return { outputs };
  }
}

export const clergy = new ClergyNode();

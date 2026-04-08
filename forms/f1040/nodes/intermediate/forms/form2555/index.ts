import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";
import { schedule_se } from "../schedule_se/index.ts";
import { income_tax_calculation } from "../../worksheets/income_tax_calculation/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { FEIE_LIMIT_2025, FEIE_HOUSING_BASE_2025 } from "../../../config/2025.ts";

// ─── Constants — TY2025 ───────────────────────────────────────────────────────

// IRC §911(b)(2)(D)(i); Rev. Proc. 2024-40 — TY2025 FEIE limit
const FEIE_LIMIT = FEIE_LIMIT_2025;

// IRC §911(c)(1)(B) — housing base amount: 16% of FEIE limit
const HOUSING_BASE = FEIE_HOUSING_BASE_2025;

// IRC §911(d)(1)(B) — physical presence test: 330 full days
const PHYSICAL_PRESENCE_DAYS = 330;

// Calendar days in a standard tax year — denominator for proration
const DAYS_IN_YEAR = 365;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Foreign wages / salary earned abroad (Form 2555, Part VII line 27)
  foreign_wages: z.number().nonnegative().optional(),

  // Self-employment income earned abroad (Form 2555, Part VII line 28)
  // IRC §911(b)(1)(B) — excluded from income tax but still subject to SE tax
  foreign_self_employment_income: z.number().nonnegative().optional(),

  // Days present in a foreign country during the relevant 12-month period.
  // Physical presence test requires ≥ 330 full days (IRC §911(d)(1)(B)).
  days_in_foreign_country: z.number().int().nonnegative().optional(),

  // Bona fide residence test: taxpayer was a bona fide resident of a foreign
  // country for the full tax year (IRC §911(d)(1)(A)).
  bona_fide_resident: z.boolean().optional(),

  // Number of qualifying days in the tax year (IRC §911(b)(2)(A) proration).
  // Used to prorate the FEIE limit when the taxpayer qualifies for only part
  // of the year (e.g., moved abroad mid-year).
  //   - Bona fide residents: omit or set to 365 (full year).
  //   - Physical presence test: typically equals days_in_foreign_country
  //     (but can be provided separately when the qualifying period spans
  //     a different 12-month window than the tax year).
  // Defaults to 365 when not provided.
  qualifying_days: z.number().int().min(1).max(365).optional(),

  // Foreign housing expenses paid by the taxpayer (Form 2555 Part VIII line 30).
  // IRC §911(c)(2).
  foreign_housing_expenses: z.number().nonnegative().optional(),

  // Foreign housing exclusion provided by employer (W-2 or equivalent).
  // Reported on Form 2555 line 44.
  employer_housing_exclusion: z.number().nonnegative().optional(),
});

type Form2555Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function qualifies(input: Form2555Input): boolean {
  const physicalPresence = (input.days_in_foreign_country ?? 0) >= PHYSICAL_PRESENCE_DAYS;
  const bfr = input.bona_fide_resident === true;
  return physicalPresence || bfr;
}

function totalForeignEarnedIncome(input: Form2555Input): number {
  return (input.foreign_wages ?? 0) + (input.foreign_self_employment_income ?? 0);
}

// Prorate FEIE limit per IRC §911(b)(2)(A): limit × (qualifying_days / 365).
// Bona fide residents default to 365 qualifying days (full year).
// Prorate FEIE limit and round to nearest dollar (IRS rounding rule).
function proratedFeieLimit(input: Form2555Input): number {
  const days = input.qualifying_days ?? DAYS_IN_YEAR;
  return Math.round(FEIE_LIMIT * (days / DAYS_IN_YEAR));
}

// FEIE: lesser of foreign earned income or prorated annual limit.
function earnedIncomeExclusion(income: number, limit: number): number {
  return Math.min(income, limit);
}

// Housing exclusion / deduction (IRC §911(c)).
function housingAmount(input: Form2555Input): number {
  const employer = input.employer_housing_exclusion ?? 0;
  const taxpayerExpenses = input.foreign_housing_expenses ?? 0;
  const taxpayerExclusion = Math.max(0, taxpayerExpenses - HOUSING_BASE);
  return employer + taxpayerExclusion;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form2555Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form2555";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule1,
    agi_aggregator,
    schedule_se,
    income_tax_calculation,
  ]);

  compute(_ctx: NodeContext, rawInput: Form2555Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const income = totalForeignEarnedIncome(input);
    const hasHousingActivity =
      (input.employer_housing_exclusion ?? 0) > 0 ||
      (input.foreign_housing_expenses ?? 0) > 0;

    if (income === 0 && !hasHousingActivity) {
      return { outputs: [] };
    }

    if (!qualifies(input)) {
      return { outputs: [] };
    }

    const outputs: NodeOutput[] = [];

    // FEIE — prorated by qualifying days per IRC §911(b)(2)(A)
    const feieLimit = proratedFeieLimit(input);
    const exclusion = earnedIncomeExclusion(income, feieLimit);
    if (exclusion > 0) {
      outputs.push(output(schedule1, { line8d_foreign_earned_income_exclusion: exclusion }));
      outputs.push(output(agi_aggregator, { line8d_foreign_earned_income_exclusion: exclusion }));
    }

    // Housing deduction — IRC §911(a)(2), (c)
    const housing = housingAmount(input);
    if (housing > 0) {
      outputs.push(output(schedule1, { line8d_foreign_housing_deduction: housing }));
      outputs.push(output(agi_aggregator, { line8d_foreign_housing_deduction: housing }));
    }

    // SE tax preservation — IRC §1401 applies to foreign SE income regardless of FEIE.
    // Excluded foreign SE income must still trigger Schedule SE (row 17 fix).
    const seIncome = input.foreign_self_employment_income ?? 0;
    if (seIncome > 0) {
      outputs.push(output(schedule_se, { net_profit_schedule_c: seIncome }));
    }

    // §911(f) stacking rule — excluded income is taxed at the "bottom" of the brackets,
    // pushing non-excluded income into higher brackets.
    // Emit total exclusion to income_tax_calculation so it can apply the floor.
    // IRC §911(f); Form 2555 Instructions "Tax on Income Not Excluded".
    const totalExclusion = exclusion + housing;
    if (totalExclusion > 0) {
      outputs.push(output(income_tax_calculation, { foreign_earned_income_exclusion: totalExclusion }));
    }

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form2555 = new Form2555Node();

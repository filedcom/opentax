import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { FEIE_LIMIT_2025, FEIE_HOUSING_BASE_2025 } from "../../../config/2025.ts";

// ─── Constants — TY2025 ───────────────────────────────────────────────────────

// IRC §911(b)(2)(D)(i); Rev. Proc. 2024-40 — TY2025 FEIE limit
const FEIE_LIMIT = FEIE_LIMIT_2025;

// IRC §911(c)(1)(B) — housing base amount: 16% of FEIE limit
const HOUSING_BASE = FEIE_HOUSING_BASE_2025;

// IRC §911(c)(1) — physical presence test: 330 full days in any 12-month period
const PHYSICAL_PRESENCE_DAYS = 330;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Foreign wages / salary earned abroad (Form 2555, Part VII line 27)
  // IRC §911(b)(1)
  foreign_wages: z.number().nonnegative().optional(),

  // Self-employment income earned abroad (Form 2555, Part VII line 28)
  // IRC §911(b)(1)(B)
  foreign_self_employment_income: z.number().nonnegative().optional(),

  // Days present in a foreign country during the relevant 12-month period.
  // Physical presence test requires ≥ 330 full days (IRC §911(d)(1)(B)).
  days_in_foreign_country: z.number().int().nonnegative().optional(),

  // Bona fide residence test: taxpayer has been a bona fide resident of a
  // foreign country for the full tax year (IRC §911(d)(1)(A)).
  bona_fide_resident: z.boolean().optional(),

  // Foreign housing expenses paid by the taxpayer (Form 2555 Part VIII line 30).
  // IRC §911(c)(2). Employer-provided housing is handled separately.
  foreign_housing_expenses: z.number().nonnegative().optional(),

  // Foreign housing exclusion provided by employer (W-2 or equivalent).
  // Reported on Form 2555 line 44.
  employer_housing_exclusion: z.number().nonnegative().optional(),
});

type Form2555Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Returns true when the taxpayer qualifies under either the physical presence
// test (≥ 330 days) or the bona fide residence test (full-year resident).
function qualifies(input: Form2555Input): boolean {
  const physicalPresence =
    (input.days_in_foreign_country ?? 0) >= PHYSICAL_PRESENCE_DAYS;
  const bfr = input.bona_fide_resident === true;
  return physicalPresence || bfr;
}

// Total foreign earned income (wages + self-employment) before exclusion.
// IRC §911(b)(1)
function totalForeignEarnedIncome(input: Form2555Input): number {
  return (input.foreign_wages ?? 0) + (input.foreign_self_employment_income ?? 0);
}

// FEIE amount: lesser of foreign earned income or $130,000 TY2025 limit.
// IRC §911(b)(2)(A)
function earnedIncomeExclusion(income: number): number {
  return Math.min(income, FEIE_LIMIT);
}

// Housing exclusion / deduction (IRC §911(c)):
// - Employer-provided portion → excluded as-is (Form 2555 line 44).
// - Taxpayer-paid housing → excluded to the extent costs exceed the base amount
//   (16% of FEIE limit). Only the excess above the base is excludable.
//   IRC §911(c)(1)(B): housing exclusion = housing_expenses − base_amount (floor 0).
// Returns the total housing deduction amount (Schedule 1 line 8d housing).
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
  readonly outputNodes = new OutputNodes([schedule1, agi_aggregator]);

  compute(_ctx: NodeContext, rawInput: Form2555Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    // No foreign income or qualification test not met → no outputs
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

    // FEIE — routes to Schedule 1 line 8d as a negative adjustment (reduces income).
    // IRC §911(a)(1); Form 2555 line 45 → Schedule 1 line 8d.
    const exclusion = earnedIncomeExclusion(income);
    if (exclusion > 0) {
      outputs.push(
        output(schedule1, { line8d_foreign_earned_income_exclusion: exclusion }),
      );
      outputs.push(
        output(agi_aggregator, { line8d_foreign_earned_income_exclusion: exclusion }),
      );
    }

    // Housing deduction — routes to Schedule 1 line 8d housing field.
    // IRC §911(a)(2), (c); Form 2555 line 50 → Schedule 1 line 8d (housing).
    const housing = housingAmount(input);
    if (housing > 0) {
      outputs.push(
        output(schedule1, { line8d_foreign_housing_deduction: housing }),
      );
      outputs.push(
        output(agi_aggregator, { line8d_foreign_housing_deduction: housing }),
      );
    }

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form2555 = new Form2555Node();

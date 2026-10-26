import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../../../outputs/general/return-assembly/schedule1/index.ts";
import { agi_aggregator } from "../../../../intermediate/aggregation/general/return-assembly/agi_aggregator/index.ts";
import { form8995 } from "../../../../intermediate/forms/deductions/business/form8995/index.ts";
import { form7206 } from "../../../../intermediate/forms/adjustments/health/form7206/index.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../../config/index.ts";
import type { F1040Config } from "../../../../config/index.ts";
import { ownedSepSourceSchema } from "./owned-source.ts";

// Self-employed retirement plan deduction (IRC §404(a)(8), §408(k), §408(p),
// §401(k)), Schedule 1 Part II line 16. Deferral limits come from
// `retirementLimits` by age band (49: base, 59: age-50 catch-up, 63: SECURE
// 2.0 §109 age 60-63 catch-up): Notice 2024-80 for 2025, Notice 2025-67 for
// 2026.

// ── Enums ─────────────────────────────────────────────────────────────────────

export enum PlanType {
  SEP = "SEP",
  SIMPLE = "SIMPLE",
  SOLO_401K = "SOLO_401K",
}

// ── Schemas ───────────────────────────────────────────────────────────────────

export const itemSchema = z.object({
  plan_type: z.nativeEnum(PlanType),
  // SEP-IRA fields
  net_self_employment_compensation: z.number().nonnegative().optional().describe(
    "For SOLO_401K: this proprietor's Schedule C/F profit less the deductible part of ordinary SE tax, before owner retirement contributions; required for a positive contribution",
  ),
  sep_contribution: z.number().nonnegative().optional(),
  // SIMPLE IRA fields
  simple_employee_contribution: z.number().nonnegative().optional(),
  simple_employer_contribution: z.number().nonnegative().optional(),
  age_50_or_over: z.boolean().optional(),
  // SECURE 2.0 §109: age 60-63 super catch-up (higher limit than standard age 50+ catch-up)
  age_60_to_63: z.boolean().optional(),
  // Solo 401(k) fields
  solo401k_employee_deferral: z.number().nonnegative().optional(),
  solo401k_employer_contribution: z.number().nonnegative().optional(),
  other_plan_employee_deferrals: z.number().nonnegative().optional().describe(
    "This proprietor's elective deferrals to other employers' plans sharing the annual 402(g) limit; omitted means none, and excludes the spouse's deferrals",
  ),
});

export const inputSchema = z.object({
  sep_retirements: z.array(itemSchema).min(1).optional(),
  owned_sep_plans: ownedSepSourceSchema.optional(),
}).refine((v) => Boolean(v.sep_retirements) !== Boolean(v.owned_sep_plans), {
  message:
    "SEP needs either legacy plan items or actual owned plan records, without mixing",
});

type SepRetirementItem = z.infer<typeof itemSchema>;
type SepRetirementItems = SepRetirementItem[];

// ── Pure helpers ──────────────────────────────────────────────────────────────

function sepDeduction(
  item: SepRetirementItem,
  sepMax: number,
  sepRate: number,
): number {
  const contribution = item.sep_contribution ?? 0;
  if (contribution === 0) return 0;
  if (item.net_self_employment_compensation == null) {
    return Math.min(contribution, sepMax);
  }
  const seLimit = item.net_self_employment_compensation * sepRate;
  return Math.min(contribution, seLimit, sepMax);
}

function simpleDeduction(
  item: SepRetirementItem,
  limits: F1040Config["retirementLimits"],
): number {
  // SECURE 2.0 §109: age 60-63 receives the super catch-up limit
  // Standard age 50+ (and 64+) receives the regular catch-up limit
  const employeeLimit = item.age_60_to_63 === true
    ? limits.simple[63]
    : item.age_50_or_over === true
    ? limits.simple[59]
    : limits.simple[49];
  const employee = Math.min(
    item.simple_employee_contribution ?? 0,
    employeeLimit,
  );
  const employer = item.simple_employer_contribution ?? 0;
  return employee + employer;
}

function solo401kDeduction(
  item: SepRetirementItem,
  sepMax: number,
  limits: F1040Config["retirementLimits"],
): number {
  const employee = item.solo401k_employee_deferral ?? 0;
  const employer = item.solo401k_employer_contribution ?? 0;
  if (employee + employer === 0) return 0;
  const earnings = item.net_self_employment_compensation;
  if (earnings === undefined) {
    throw new Error(
      "Solo 401(k) deduction needs this proprietor's net_self_employment_compensation (business profit less deductible ordinary half-SE tax, before retirement contributions)",
    );
  }
  const otherDeferrals = item.other_plan_employee_deferrals ?? 0;
  const annualDeferralLimit = limits["401k"][49];
  // Pub. 560, Limit on Elective Deferrals: age makes a participant eligible
  // for catch-ups; it does not make ordinary base-limit contributions catch-ups.
  // Additional deferrals still need separate plan/age coordination that this
  // legacy input does not provide.
  if ((item.age_50_or_over === true || item.age_60_to_63 === true) &&
    employee + otherDeferrals > annualDeferralLimit + 0.005) {
    throw new Error(
      "Solo 401(k) catch-up elective deferrals need a separate reviewed worksheet; this calculation supports ordinary base-limit contributions at any age",
    );
  }
  if (otherDeferrals > annualDeferralLimit) {
    throw new Error(
      "Other-plan employee deferrals already exceed this proprietor's annual limit; resolve that excess before deducting solo 401(k) contributions",
    );
  }
  const employeeLimit = Math.min(
    Math.max(0, annualDeferralLimit - otherDeferrals),
    earnings,
  );
  if (employee > employeeLimit + 0.005) {
    throw new Error(
      `Solo 401(k) employee deferral exceeds the proprietor's remaining annual/earned-income limit of $${employeeLimit.toFixed(2)}`,
    );
  }

  // Pub. 560, chapter 5, Deduction Worksheet steps 3-15. This bounded
  // ordinary-contribution path assumes the maximum 25% employer plan rate (20% reduced
  // self-employed rate). Steps 10 and 12 also limit employer contributions
  // after allowable elective deferrals. Only actual, allowable contributions
  // are deductible: an excess is rejected, not silently treated as corrected.
  const employerLimit = Math.max(0, Math.min(
    earnings * 0.20,
    sepMax - employee,
    (earnings - employee) / 2,
  ));
  if (employer > employerLimit + 0.005) {
    throw new Error(
      `Solo 401(k) employer contribution exceeds the self-employed earnings/annual-additions limit of $${employerLimit.toFixed(2)}; review the plan's contribution rate and correct the excess`,
    );
  }
  return employee + employer;
}

function planDeduction(item: SepRetirementItem, cfg: F1040Config): number {
  if (item.plan_type === PlanType.SEP) {
    return sepDeduction(item, cfg.sepMaxContribution, cfg.sepContributionRate);
  }
  if (item.plan_type === PlanType.SIMPLE) {
    return simpleDeduction(item, cfg.retirementLimits);
  }
  return solo401kDeduction(item, cfg.sepMaxContribution, cfg.retirementLimits);
}

export function validatedRetirementDeduction(
  items: SepRetirementItems,
  cfg: F1040Config,
): number {
  if (
    items.length > 1 && items.some((item) =>
      item.plan_type === PlanType.SOLO_401K &&
      (item.solo401k_employee_deferral ?? 0) +
          (item.solo401k_employer_contribution ?? 0) > 0
    )
  ) {
    throw new Error(
      "Legacy solo 401(k) deduction needs one proprietor plan; multiple plan records need reviewed owner and annual-additions coordination",
    );
  }
  return items.reduce((sum, item) => sum + planDeduction(item, cfg), 0);
}

function schedule1Output(
  items: SepRetirementItems,
  cfg: F1040Config,
): NodeOutput[] {
  const deduction = validatedRetirementDeduction(items, cfg);
  if (deduction === 0) return [];
  return [output(schedule1, { line16_sep_simple: deduction })];
}

function agiOutput(
  items: SepRetirementItems,
  cfg: F1040Config,
): NodeOutput[] {
  const deduction = validatedRetirementDeduction(items, cfg);
  if (deduction === 0) return [];
  return [output(agi_aggregator, { line16_sep_simple: deduction })];
}

// This deduction is attributable to the trade or business, so it reduces QBI.
// i8995, Determining Your Qualified Business Income: the items to consider include
// "contributions to qualified retirement plans".
function form8995Output(
  items: SepRetirementItems,
  cfg: F1040Config,
): NodeOutput[] {
  const deduction = validatedRetirementDeduction(items, cfg);
  if (deduction === 0) return [];
  return [output(form8995, { retirement_plan_deduction: deduction })];
}

// ── Node class ────────────────────────────────────────────────────────────────

class SepRetirementNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "sep_retirement";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule1,
    agi_aggregator,
    form8995,
    form7206,
  ]);

  compute(ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const parsed = inputSchema.parse(input);
    if (parsed.owned_sep_plans) {
      if (ctx.taxYear !== 2025) {
        throw new Error("Owned SEP source currently needs TY2025");
      }
      return {
        outputs: [
          output(form7206, { owned_sep_plans: parsed.owned_sep_plans }),
        ],
      };
    }
    const items = parsed.sep_retirements!;
    const outputs: NodeOutput[] = [
      output(form7206, {
        schedule1_line16_source: validatedRetirementDeduction(items, cfg),
      }),
      ...schedule1Output(items, cfg),
      ...agiOutput(items, cfg),
      ...form8995Output(items, cfg),
    ];
    return { outputs };
  }
}

export const sep_retirement = new SepRetirementNode();

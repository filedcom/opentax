import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output, type AtLeastOne } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule2 } from "../../intermediate/schedule2/index.ts";
import { form5329 } from "../../intermediate/form5329/index.ts";

// ─── Constants — TY2025 ───────────────────────────────────────────────────────

// IRC §223(b)(2)(A) — self-only HDHP annual contribution limit
const SELF_ONLY_LIMIT = 4300;
// IRC §223(b)(2)(B) — family HDHP annual contribution limit
const FAMILY_LIMIT = 8550;
// IRC §223(b)(3) — catch-up contribution for taxpayers age 55+
const CATCHUP_LIMIT = 1000;
// IRC §223(f)(4)(A) — additional tax rate on non-qualified HSA distributions
const NON_QUALIFIED_PENALTY_RATE = 0.20;

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum CoverageType {
  SelfOnly = "self_only",
  Family = "family",
}

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // ── Coverage (determines contribution limit) ─────────────────────────────
  // Type of HDHP coverage for the year
  coverage_type: z.nativeEnum(CoverageType),

  // ── Part I: Contributions ────────────────────────────────────────────────
  // Line 2: Taxpayer's own HSA contributions (not through payroll)
  taxpayer_hsa_contributions: z.number().nonnegative().optional(),
  // Line 9: Employer contributions to HSA (from W-2 Box 12 Code W)
  // IRC §106(d); routed here from the w2 node
  employer_hsa_contributions: z.number().nonnegative().optional(),
  // Whether the taxpayer is age 55 or older (enables $1,000 catch-up)
  // IRC §223(b)(3)
  age_55_or_older: z.boolean().optional(),

  // ── Part II: Distributions ───────────────────────────────────────────────
  // Line 14a: Total HSA distributions received during the year (1099-SA box 1)
  hsa_distributions: z.number().nonnegative().optional(),
  // Line 15: Qualified medical expenses paid from HSA (unreimbursed)
  // IRC §213(d)
  qualified_medical_expenses: z.number().nonnegative().optional(),
  // Whether an exception to the 20% penalty applies (death, disability, Medicare enrollment)
  // IRC §223(f)(4)(B)–(D)
  distribution_exception: z.boolean().optional(),
});

type Form8889Input = z.infer<typeof inputSchema>;

// ─── Pure Helper Functions ────────────────────────────────────────────────────

// Annual contribution limit based on coverage type and age
// IRC §223(b)(2)–(3)
function annualLimit(input: Form8889Input): number {
  const base = input.coverage_type === CoverageType.Family ? FAMILY_LIMIT : SELF_ONLY_LIMIT;
  return input.age_55_or_older === true ? base + CATCHUP_LIMIT : base;
}

// Part I, Line 13: Deductible amount of taxpayer HSA contributions
// = min(taxpayer_contributions, limit - employer_contributions)
// IRC §223(a)
function deductibleContributions(input: Form8889Input): number {
  const taxpayer = input.taxpayer_hsa_contributions ?? 0;
  if (taxpayer <= 0) return 0;
  const employer = input.employer_hsa_contributions ?? 0;
  const remainingLimit = Math.max(0, annualLimit(input) - employer);
  return Math.min(taxpayer, remainingLimit);
}

// Part I: Total contributions (taxpayer + employer) for excess calculation
function totalContributions(input: Form8889Input): number {
  return (input.taxpayer_hsa_contributions ?? 0) + (input.employer_hsa_contributions ?? 0);
}

// Part I: Excess contributions = max(0, total - limit)
// IRC §4973(a)(2)
function excessContributions(input: Form8889Input): number {
  return Math.max(0, totalContributions(input) - annualLimit(input));
}

// Part II: Taxable (non-qualified) distributions
// = max(0, total_distributions - qualified_expenses)
// IRC §223(f)(2)
function taxableDistributions(input: Form8889Input): number {
  const total = input.hsa_distributions ?? 0;
  if (total <= 0) return 0;
  const qualified = input.qualified_medical_expenses ?? 0;
  return Math.max(0, total - qualified);
}

// Part II, Line 20: 20% additional tax on non-qualified distributions
// Only applies when no exception flag is set
// IRC §223(f)(4)(A)
function nonQualifiedPenalty(input: Form8889Input, taxable: number): number {
  if (taxable <= 0) return 0;
  if (input.distribution_exception === true) return 0;
  return taxable * NON_QUALIFIED_PENALTY_RATE;
}

// Merged Schedule 1 output — deduction (line 13) and taxable distribution income (line 8z)
// are emitted as a single output to avoid duplicate nodeType entries
function schedule1Output(deductible: number, taxable: number): NodeOutput[] {
  const input: Partial<z.infer<typeof schedule1["inputSchema"]>> = {};
  if (deductible > 0) input.line13_hsa_deduction = deductible;
  if (taxable > 0) input.line8z_other = taxable;
  if (Object.keys(input).length === 0) return [];
  return [output(schedule1, input as AtLeastOne<z.infer<typeof schedule1["inputSchema"]>>)];
}

// Excess contribution output → Form 5329 Part VII
function excessOutput(excess: number): NodeOutput[] {
  if (excess <= 0) return [];
  return [output(form5329, { excess_hsa: excess })];
}

// 20% penalty output → Schedule 2 line 17b
function penaltyOutput(penalty: number): NodeOutput[] {
  if (penalty <= 0) return [];
  return [output(schedule2, { line17b_hsa_penalty: penalty })];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form8889Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8889";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, schedule2, form5329]);

  compute(rawInput: Form8889Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const deductible = deductibleContributions(input);
    const excess = excessContributions(input);
    const taxable = taxableDistributions(input);
    const penalty = nonQualifiedPenalty(input, taxable);

    const outputs: NodeOutput[] = [
      ...schedule1Output(deductible, taxable),
      ...excessOutput(excess),
      ...penaltyOutput(penalty),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8889 = new Form8889Node();

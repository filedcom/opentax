import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ─── Input Schema ─────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Part I — Nondeductible Traditional IRA Contributions
  // Line 1: nondeductible contributions made this year
  nondeductible_contributions: z.number().nonnegative(),

  // Line 2: prior-year carry-forward basis (from prior Form 8606, line 14)
  prior_basis: z.number().nonnegative().optional(),

  // Line 6: FMV of all traditional IRAs as of December 31, 2025
  year_end_ira_value: z.number().nonnegative(),

  // Line 7: total traditional IRA distributions received this year
  // (excluding conversions and rollovers — routed from f1099r)
  traditional_distributions: z.number().nonnegative().optional(),

  // Line 8: amount converted from traditional IRA to Roth IRA
  // (routed from f1099r via rollover_code=C)
  roth_conversion: z.number().nonnegative().optional(),

  // Part III — Distributions From Roth IRAs
  // Line 19: total Roth IRA distributions received this year
  // (routed from f1099r via exclude_8606_roth=true)
  roth_distribution: z.number().nonnegative().optional(),

  // Line 22: cumulative basis in regular Roth IRA contributions (carry-forward)
  roth_basis_contributions: z.number().nonnegative().optional(),

  // Line 24: cumulative basis in Roth IRA conversions and QRP rollovers (carry-forward)
  roth_basis_conversions: z.number().nonnegative().optional(),
});

type Form8606Input = z.infer<typeof inputSchema>;

// ─── Part I Helpers ───────────────────────────────────────────────────────────

// Line 3: total traditional IRA basis
function totalBasis(input: Form8606Input): number {
  return input.nondeductible_contributions + (input.prior_basis ?? 0);
}

// Line 9: denominator for basis ratio
// = year_end_value + traditional_distributions + roth_conversion
function basisRatioDenominator(input: Form8606Input): number {
  return (
    input.year_end_ira_value +
    (input.traditional_distributions ?? 0) +
    (input.roth_conversion ?? 0)
  );
}

// Line 10: nontaxable portion of distributions + conversions combined
function nontaxableTotal(basis: number, denominator: number, distributed: number): number {
  if (denominator <= 0) return 0;
  // Ratio × total distributed; capped at total basis
  const ratio = Math.min(1, basis / denominator);
  return ratio * distributed;
}

// Line 11: nontaxable portion allocable to Roth conversions only
function nontaxableConversions(
  nontaxableAmt: number,
  distributions: number,
  conversions: number,
): number {
  const total = distributions + conversions;
  if (total <= 0) return 0;
  return nontaxableAmt * (conversions / total);
}

// Line 12: nontaxable portion allocable to traditional distributions only
function nontaxableDistributions(nontaxableAmt: number, nontaxableConv: number): number {
  return nontaxableAmt - nontaxableConv;
}

// Line 13: taxable traditional IRA distributions
function taxableTraditional(distributions: number, nontaxableDist: number): number {
  return Math.max(0, distributions - nontaxableDist);
}

// Line 18: taxable Roth conversion (Part II)
function taxableConversion(conversions: number, nontaxableConv: number): number {
  return Math.max(0, conversions - nontaxableConv);
}

// ─── Part I Computation ───────────────────────────────────────────────────────

type PartIResult = {
  readonly taxableTraditionalDist: number;
  readonly taxableConversionAmt: number;
};

function computePartI(input: Form8606Input): PartIResult {
  const distributions = input.traditional_distributions ?? 0;
  const conversions = input.roth_conversion ?? 0;
  const totalDistributed = distributions + conversions;

  // No distributions or conversions — Part I produces nothing
  if (totalDistributed <= 0) {
    return { taxableTraditionalDist: 0, taxableConversionAmt: conversions };
  }

  const basis = totalBasis(input);

  // No basis — all distributions are fully taxable
  if (basis <= 0) {
    return {
      taxableTraditionalDist: distributions,
      taxableConversionAmt: conversions,
    };
  }

  const denominator = basisRatioDenominator(input);
  const nontaxableAmt = nontaxableTotal(basis, denominator, totalDistributed);
  const nontaxableConv = nontaxableConversions(nontaxableAmt, distributions, conversions);
  const nontaxableDist = nontaxableDistributions(nontaxableAmt, nontaxableConv);

  return {
    taxableTraditionalDist: taxableTraditional(distributions, nontaxableDist),
    taxableConversionAmt: taxableConversion(conversions, nontaxableConv),
  };
}

// ─── Part III Computation ─────────────────────────────────────────────────────

// Taxable Roth IRA distributions = gross - total Roth basis (contributions + conversions)
// Simplified: does not implement homebuyer exception or 5-year rule tracking
function computePartIII(input: Form8606Input): number {
  const distribution = input.roth_distribution ?? 0;
  if (distribution <= 0) return 0;

  const basisContributions = input.roth_basis_contributions ?? 0;
  const basisConversions = input.roth_basis_conversions ?? 0;
  const totalRothBasis = basisContributions + basisConversions;

  return Math.max(0, distribution - totalRothBasis);
}

// ─── f1040 Output Builder ─────────────────────────────────────────────────────

function buildF1040Output(
  taxableTraditionalDist: number,
  taxableConversionAmt: number,
  taxableRoth: number,
): NodeOutput | null {
  const totalTaxable = taxableTraditionalDist + taxableConversionAmt + taxableRoth;
  if (totalTaxable <= 0) return null;

  return output(f1040, { line4b_ira_taxable: totalTaxable });
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class Form8606Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8606";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(_ctx: NodeContext, rawInput: Form8606Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const { taxableTraditionalDist, taxableConversionAmt } = computePartI(input);
    const taxableRoth = computePartIII(input);

    const f1040Output = buildF1040Output(
      taxableTraditionalDist,
      taxableConversionAmt,
      taxableRoth,
    );

    const outputs: NodeOutput[] = [];
    if (f1040Output !== null) {
      outputs.push(f1040Output);
    }

    return { outputs };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form8606 = new Form8606Node();

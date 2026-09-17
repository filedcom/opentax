import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";
import { FilingStatus } from "../../../types.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // IRA contributions (traditional + Roth) per person
  ira_contributions_taxpayer: z.number().nonnegative().optional(),
  ira_contributions_spouse: z.number().nonnegative().optional(),
  // Elective deferrals (401k/403b/457b) from W-2 Box 12 D/E/G
  // W-2 node sends a combined `elective_deferrals` field; per-person fields take precedence.
  elective_deferrals: z.number().nonnegative().optional(),
  elective_deferrals_taxpayer: z.number().nonnegative().optional(),
  elective_deferrals_spouse: z.number().nonnegative().optional(),
  // Disqualifying distributions received in the test period
  distributions_taxpayer: z.number().nonnegative().optional(),
  distributions_spouse: z.number().nonnegative().optional(),
  // AGI and filing status for credit rate determination
  agi: z.number().nonnegative().optional(),
  filing_status: z.nativeEnum(FilingStatus).optional(),
  // Tax liability for the nonrefundable credit limit (optional; uncapped if absent)
  income_tax_liability: z.number().nonnegative().optional(),
});

type Form8880Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Returns the credit rate (as a decimal) based on AGI and filing status.
// Returns 0 if AGI exceeds the upper limit for the filing status.
function creditRate(
  agi: number,
  status: FilingStatus,
  agiSingle: { rate50: number; rate20: number; rate10: number },
  agiHoh: { rate50: number; rate20: number; rate10: number },
  agiMfj: { rate50: number; rate20: number; rate10: number },
): number {
  if (status === FilingStatus.MFJ || status === FilingStatus.QSS) {
    if (agi <= agiMfj.rate50) return 0.50;
    if (agi <= agiMfj.rate20) return 0.20;
    if (agi <= agiMfj.rate10) return 0.10;
    return 0;
  }
  if (status === FilingStatus.HOH) {
    if (agi <= agiHoh.rate50) return 0.50;
    if (agi <= agiHoh.rate20) return 0.20;
    if (agi <= agiHoh.rate10) return 0.10;
    return 0;
  }
  // Single, MFS
  if (agi <= agiSingle.rate50) return 0.50;
  if (agi <= agiSingle.rate20) return 0.20;
  if (agi <= agiSingle.rate10) return 0.10;
  return 0;
}

// Returns eligible contribution for one person after distributions and cap.
// Line 3 = max(Line 1 - Line 2, 0); Line 4 = min(Line 3, contributionCap).
function eligibleContribution(contributions: number, distributions: number, contributionCap: number): number {
  const line3 = Math.max(0, contributions - distributions);
  return Math.min(line3, contributionCap);
}

// Determines taxpayer elective deferrals.
// `elective_deferrals_taxpayer` takes precedence over the combined `elective_deferrals` field.
// When only `elective_deferrals` is present (from W-2 node), treat as taxpayer-only.
function taxpayerDeferrals(input: Form8880Input): number {
  if (input.elective_deferrals_taxpayer !== undefined) {
    return input.elective_deferrals_taxpayer;
  }
  return input.elective_deferrals ?? 0;
}

// Returns spouse elective deferrals.
function spouseDeferrals(input: Form8880Input): number {
  return input.elective_deferrals_spouse ?? 0;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form8880Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8880";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(ctx: NodeContext, input: Form8880Input): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const parsed = inputSchema.parse(input);

    const agi = parsed.agi ?? 0;
    const status = parsed.filing_status ?? FilingStatus.Single;
    const rate = creditRate(agi, status, cfg.saversCreditAgiSingle, cfg.saversCreditAgiHoh, cfg.saversCreditAgiMfj);

    if (rate === 0) {
      return { outputs: [] };
    }

    // Part I — per-person eligible contributions
    const tContributions = (parsed.ira_contributions_taxpayer ?? 0) + taxpayerDeferrals(parsed);
    const tEligible = eligibleContribution(tContributions, parsed.distributions_taxpayer ?? 0, cfg.saversCreditContributionCap);

    const sContributions = (parsed.ira_contributions_spouse ?? 0) + spouseDeferrals(parsed);
    const sEligible = eligibleContribution(sContributions, parsed.distributions_spouse ?? 0, cfg.saversCreditContributionCap);

    // Part II — credit computation
    const totalEligible = tEligible + sEligible; // Line 7
    if (totalEligible === 0) {
      return { outputs: [] };
    }

    const rawCredit = totalEligible * rate; // Line 8

    // Line 9/10 — limit by tax liability if provided
    const credit = parsed.income_tax_liability !== undefined
      ? Math.min(rawCredit, parsed.income_tax_liability)
      : rawCredit;

    if (credit <= 0) {
      return { outputs: [] };
    }

    const outputs: NodeOutput[] = [
      this.outputNodes.output(schedule3, { line4_retirement_savings_credit: credit }),
    ];

    // ── Self-emit Form 8880 line values for the PDF builder ──────────────────
    // Only reached when a nonzero credit exists — ineligible returns (rate 0,
    // no eligible contributions) emit nothing, which keeps the form out of the
    // PDF entirely. Line 9 is a decimal rate and must print as a string (the
    // builder rounds numeric values to whole dollars).
    const printFields: Record<string, number | string> = {
      print_line1a_ira: parsed.ira_contributions_taxpayer ?? 0,
      print_line2a_deferrals: taxpayerDeferrals(parsed),
      print_line3a_total: tContributions,
      print_line4a_distributions: parsed.distributions_taxpayer ?? 0,
      print_line5a: Math.max(0, tContributions - (parsed.distributions_taxpayer ?? 0)),
      print_line6a_eligible: tEligible,
      print_line7_total_eligible: totalEligible,
      print_line8_agi: agi,
      print_line9_rate: rate.toFixed(1),
      print_line10_raw_credit: rawCredit,
      print_line12_credit: credit,
    };
    if (parsed.income_tax_liability !== undefined) {
      printFields.print_line11_tax_liability = parsed.income_tax_liability;
    }
    if (sEligible > 0 || (parsed.ira_contributions_spouse ?? 0) > 0 || spouseDeferrals(parsed) > 0) {
      printFields.print_line1b_ira = parsed.ira_contributions_spouse ?? 0;
      printFields.print_line2b_deferrals = spouseDeferrals(parsed);
      printFields.print_line3b_total = sContributions;
      printFields.print_line4b_distributions = parsed.distributions_spouse ?? 0;
      printFields.print_line5b = Math.max(0, sContributions - (parsed.distributions_spouse ?? 0));
      printFields.print_line6b_eligible = sEligible;
    }
    outputs.push({ nodeType: this.nodeType, fields: printFields });

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8880 = new Form8880Node();

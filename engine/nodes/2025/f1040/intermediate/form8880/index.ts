import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";
import { FilingStatus } from "../../types.ts";

// TY2025 constants — IRC §25B; Rev Proc 2024-40
const CONTRIBUTION_CAP = 2000;

// AGI thresholds (inclusive upper bound for each rate tier) by filing status group.
// Single/MFS/QSS thresholds:
const AGI_50_SINGLE = 23000;
const AGI_20_SINGLE = 25000;
const AGI_10_SINGLE = 38250;
// HOH thresholds:
const AGI_50_HOH = 34500;
const AGI_20_HOH = 37500;
const AGI_10_HOH = 57375;
// MFJ thresholds:
const AGI_50_MFJ = 46000;
const AGI_20_MFJ = 50000;
const AGI_10_MFJ = 76500;

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
function creditRate(agi: number, status: FilingStatus): number {
  if (status === FilingStatus.MFJ) {
    if (agi <= AGI_50_MFJ) return 0.50;
    if (agi <= AGI_20_MFJ) return 0.20;
    if (agi <= AGI_10_MFJ) return 0.10;
    return 0;
  }
  if (status === FilingStatus.HOH) {
    if (agi <= AGI_50_HOH) return 0.50;
    if (agi <= AGI_20_HOH) return 0.20;
    if (agi <= AGI_10_HOH) return 0.10;
    return 0;
  }
  // Single, MFS, QSS
  if (agi <= AGI_50_SINGLE) return 0.50;
  if (agi <= AGI_20_SINGLE) return 0.20;
  if (agi <= AGI_10_SINGLE) return 0.10;
  return 0;
}

// Returns eligible contribution for one person after distributions and cap.
// Line 3 = max(Line 1 - Line 2, 0); Line 4 = min(Line 3, CONTRIBUTION_CAP).
function eligibleContribution(contributions: number, distributions: number): number {
  const line3 = Math.max(0, contributions - distributions);
  return Math.min(line3, CONTRIBUTION_CAP);
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

  compute(input: Form8880Input): NodeResult {
    const parsed = inputSchema.parse(input);

    const agi = parsed.agi ?? 0;
    const status = parsed.filing_status ?? FilingStatus.Single;
    const rate = creditRate(agi, status);

    if (rate === 0) {
      return { outputs: [] };
    }

    // Part I — per-person eligible contributions
    const tContributions = (parsed.ira_contributions_taxpayer ?? 0) + taxpayerDeferrals(parsed);
    const tEligible = eligibleContribution(tContributions, parsed.distributions_taxpayer ?? 0);

    const sContributions = (parsed.ira_contributions_spouse ?? 0) + spouseDeferrals(parsed);
    const sEligible = eligibleContribution(sContributions, parsed.distributions_spouse ?? 0);

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

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8880 = new Form8880Node();

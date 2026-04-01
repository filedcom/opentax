import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 — Form 8621: Information Return by a Shareholder of a PFIC or QEF
// US shareholders of Passive Foreign Investment Companies (PFICs) file annually.
// IRC §§1291–1298. Three taxation regimes:
// 1. Excess Distribution (default) — IRC §1291: special tax + interest charge on
//    distributions exceeding 125% of prior 3-year average.
// 2. Mark-to-Market (MTM) — IRC §1296: annual gain/loss recognition on FMV changes.
// 3. QEF (Qualified Electing Fund) — IRC §1293: annual inclusion of ordinary income
//    and net capital gain from PFIC.
//
// TY2025 highest marginal rate: 37% (Rev. Proc. 2024-40, §3.01)

const HIGHEST_RATE_2025 = 0.37;

export enum PficRegime {
  EXCESS_DISTRIBUTION = "EXCESS_DISTRIBUTION",
  MTM = "MTM",
  QEF = "QEF",
}

// Per-item schema — each Form 8621 covers one PFIC/QEF holding
export const itemSchema = z.object({
  // Legal name of the PFIC or QEF
  company_name: z.string(),
  // EIN of PFIC or internal reference (optional)
  company_ein_or_ref: z.string().optional(),
  // Country where PFIC/QEF is incorporated (Form 8621 line A)
  country_of_incorporation: z.string(),
  // Taxation regime elected for this PFIC (Form 8621 Parts II/III/IV)
  regime: z.nativeEnum(PficRegime),
  // Number of shares owned at year end (Form 8621 Part I line 1a)
  shares_owned: z.number().nonnegative(),
  // Fair market value of shares at end of tax year (Form 8621 Part I line 1b)
  fmv_at_year_end: z.number().nonnegative(),
  // Total distributions received during year (Form 8621 Part II line 6; IRC §1291)
  total_distributions: z.number().nonnegative().optional(),
  // Excess distribution amount: amount exceeding 125% of prior 3-year average (Form 8621 Part II line 15)
  excess_distribution_amount: z.number().nonnegative().optional(),
  // QEF: pro-rata share of ordinary income (Form 8621 Part III line 6a; IRC §1293(a)(1)(A))
  qef_ordinary_income: z.number().nonnegative().optional(),
  // QEF: pro-rata share of net capital gain (Form 8621 Part III line 6b; IRC §1293(a)(1)(B))
  qef_capital_gain: z.number().nonnegative().optional(),
  // MTM: mark-to-market gain or (loss) for year (Form 8621 Part IV line 9; IRC §1296(a))
  mtm_gain_loss: z.number().optional(),
});

export const inputSchema = z.object({
  f8621s: z.array(itemSchema).min(1),
});

type F8621Item = z.infer<typeof itemSchema>;
type F8621Items = F8621Item[];

// Excess distribution items
function excessDistributionItems(items: F8621Items): F8621Items {
  return items.filter((item) => item.regime === PficRegime.EXCESS_DISTRIBUTION);
}

// MTM items
function mtmItems(items: F8621Items): F8621Items {
  return items.filter((item) => item.regime === PficRegime.MTM);
}

// QEF items
function qefItems(items: F8621Items): F8621Items {
  return items.filter((item) => item.regime === PficRegime.QEF);
}

// Excess distribution: tax at highest rate on excess amount (simplified §1291 computation)
// Full §1291 requires per-year allocation and interest charge — user completes on form.
function totalExcessDistributionTax(items: F8621Items): number {
  return excessDistributionItems(items).reduce(
    (sum, item) => sum + (item.excess_distribution_amount ?? 0) * HIGHEST_RATE_2025,
    0,
  );
}

// MTM: total gain/loss across all MTM items
function totalMtmGainLoss(items: F8621Items): number {
  return mtmItems(items).reduce(
    (sum, item) => sum + (item.mtm_gain_loss ?? 0),
    0,
  );
}

// QEF: total ordinary income + capital gain across all QEF items
function totalQefIncome(items: F8621Items): number {
  return qefItems(items).reduce(
    (sum, item) => sum + (item.qef_ordinary_income ?? 0) + (item.qef_capital_gain ?? 0),
    0,
  );
}

// Total schedule1 income: MTM gain/loss + QEF income
function totalSchedule1Income(items: F8621Items): number {
  return totalMtmGainLoss(items) + totalQefIncome(items);
}

function schedule2OutputNodes(items: F8621Items): NodeOutput[] {
  const tax = totalExcessDistributionTax(items);
  if (tax === 0) return [];
  return [output(schedule2, { line17z_other_additional_taxes: tax })];
}

function schedule1OutputNodes(items: F8621Items): NodeOutput[] {
  const income = totalSchedule1Income(items);
  if (income === 0) return [];
  return [output(schedule1, { line8z_other: income })];
}

class F8621Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8621";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, schedule2]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const { f8621s } = parsed;

    return {
      outputs: [
        ...schedule2OutputNodes(f8621s),
        ...schedule1OutputNodes(f8621s),
      ],
    };
  }
}

export const f8621 = new F8621Node();

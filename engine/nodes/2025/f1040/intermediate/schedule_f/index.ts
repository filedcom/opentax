import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { FilingStatus, filingStatusSchema } from "../../types.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule_se } from "../schedule_se/index.ts";
import { form8995 } from "../form8995/index.ts";
import { form8582 } from "../form8582/index.ts";
import { form6198 } from "../form6198/index.ts";
import { form461 } from "../form461/index.ts";

// ── TY2025 Constants ──────────────────────────────────────────────────────────

// IRC §1402(b) — minimum net farm profit to owe SE tax
const SE_TAX_THRESHOLD = 400;

// Pub. 225 ch. 5 — conservation expenses limited to 25% of gross farm income
const CONSERVATION_LIMIT_PCT = 0.25;

// IRC §461(l); Rev. Proc. 2024-40 — excess business loss thresholds
const EBL_THRESHOLD_SINGLE = 313_000;
const EBL_THRESHOLD_MFJ = 626_000;

// ── Schemas ───────────────────────────────────────────────────────────────────

export const itemSchema = z.object({
  // Header / identification
  line_b_agricultural_activity_code: z.string(),
  line_c_farm_name: z.string().optional(),
  line_d_ein: z.string().optional(),
  line_e_material_participation: z.boolean(),
  line_f_made_1099_payments: z.boolean().optional(),
  accounting_method: z.enum(["cash", "accrual"]),

  // Part I — Farm Income (Cash Method)
  line1_sales_livestock_resale: z.number().nonnegative(),
  line2_cost_livestock_resale: z.number().nonnegative().optional(),
  line3a_cooperative_distributions: z.number().nonnegative().optional(),
  line3b_cooperative_distributions_taxable: z.number().nonnegative().optional(),
  line4a_ag_program_payments: z.number().nonnegative().optional(),
  line4b_ag_program_payments_taxable: z.number().nonnegative().optional(),
  line5a_ccc_loans_election: z.number().nonnegative().optional(),
  line5b_ccc_loans_forfeited: z.number().nonnegative().optional(),
  line5c_ccc_loans_forfeited_basis: z.number().nonnegative().optional(),
  line6a_crop_insurance: z.number().nonnegative().optional(),
  line6b_crop_insurance_taxable: z.number().nonnegative().optional(),
  line6d_crop_insurance_deferred: z.number().nonnegative().optional(),
  line7_custom_hire_income: z.number().nonnegative().optional(),
  line8_other_income: z.number().optional(),  // can be negative (bartering adjustments etc.)

  // Part II — Farm Expenses (Cash Method)
  line10_car_truck: z.number().nonnegative().optional(),
  line11_chemicals: z.number().nonnegative().optional(),
  line12_conservation: z.number().nonnegative().optional(),   // capped at 25% of gross
  line13_custom_hire: z.number().nonnegative().optional(),
  line14_depreciation: z.number().nonnegative().optional(),
  line15_employee_benefits: z.number().nonnegative().optional(),
  line16_feed: z.number().nonnegative().optional(),
  line17_fertilizers: z.number().nonnegative().optional(),
  line18_freight: z.number().nonnegative().optional(),
  line19_gasoline: z.number().nonnegative().optional(),
  line20_insurance: z.number().nonnegative().optional(),
  line21a_interest_mortgage: z.number().nonnegative().optional(),
  line21b_interest_other: z.number().nonnegative().optional(),
  line22_labor_hired: z.number().nonnegative().optional(),
  line23_pension_plans: z.number().nonnegative().optional(),
  line24a_rent_vehicles: z.number().nonnegative().optional(),
  line24b_rent_land: z.number().nonnegative().optional(),
  line25_repairs: z.number().nonnegative().optional(),
  line26_seeds: z.number().nonnegative().optional(),
  line27_storage: z.number().nonnegative().optional(),
  line28_supplies: z.number().nonnegative().optional(),
  line29_taxes: z.number().nonnegative().optional(),
  line30_utilities: z.number().nonnegative().optional(),
  line31_vet: z.number().nonnegative().optional(),
  line32e_other_expenses: z.number().nonnegative().optional(),  // total of 32a–32e

  // At-risk election (line 36)
  line36_at_risk: z.enum(["a", "b"]).optional(),
});

export const inputSchema = z.object({
  schedule_fs: z.array(itemSchema),
  filing_status: filingStatusSchema.optional(),
});

type ScheduleFItem = z.infer<typeof itemSchema>;

// ── Pure helpers ──────────────────────────────────────────────────────────────

// Line 9: Gross farm income
// = (line 1 − line 2) + line 3b + line 4b + line 5a + (line 5b − line 5c) +
//   line 6b + line 6d + line 7 + line 8
function computeGrossIncome(item: ScheduleFItem): number {
  const livestockProfit = item.line1_sales_livestock_resale - (item.line2_cost_livestock_resale ?? 0);
  const cccLoans = (item.line5b_ccc_loans_forfeited ?? 0) - (item.line5c_ccc_loans_forfeited_basis ?? 0);
  return livestockProfit +
    (item.line3b_cooperative_distributions_taxable ?? 0) +
    (item.line4b_ag_program_payments_taxable ?? 0) +
    (item.line5a_ccc_loans_election ?? 0) +
    cccLoans +
    (item.line6b_crop_insurance_taxable ?? 0) +
    (item.line6d_crop_insurance_deferred ?? 0) +
    (item.line7_custom_hire_income ?? 0) +
    (item.line8_other_income ?? 0);
}

// Conservation expense: capped at 25% of gross farm income (Pub. 225 ch. 5)
function conservationDeduction(item: ScheduleFItem, grossIncome: number): number {
  const raw = item.line12_conservation ?? 0;
  const limit = Math.max(0, grossIncome) * CONSERVATION_LIMIT_PCT;
  return Math.min(raw, limit);
}

// Line 33: Total expenses (with conservation limit applied)
function computeTotalExpenses(item: ScheduleFItem, grossIncome: number): number {
  return (item.line10_car_truck ?? 0) +
    (item.line11_chemicals ?? 0) +
    conservationDeduction(item, grossIncome) +
    (item.line13_custom_hire ?? 0) +
    (item.line14_depreciation ?? 0) +
    (item.line15_employee_benefits ?? 0) +
    (item.line16_feed ?? 0) +
    (item.line17_fertilizers ?? 0) +
    (item.line18_freight ?? 0) +
    (item.line19_gasoline ?? 0) +
    (item.line20_insurance ?? 0) +
    (item.line21a_interest_mortgage ?? 0) +
    (item.line21b_interest_other ?? 0) +
    (item.line22_labor_hired ?? 0) +
    (item.line23_pension_plans ?? 0) +
    (item.line24a_rent_vehicles ?? 0) +
    (item.line24b_rent_land ?? 0) +
    (item.line25_repairs ?? 0) +
    (item.line26_seeds ?? 0) +
    (item.line27_storage ?? 0) +
    (item.line28_supplies ?? 0) +
    (item.line29_taxes ?? 0) +
    (item.line30_utilities ?? 0) +
    (item.line31_vet ?? 0) +
    (item.line32e_other_expenses ?? 0);
}

// Line 34: Net profit (or loss)
function computeNetProfit(item: ScheduleFItem): number {
  const grossIncome = computeGrossIncome(item);
  const totalExpenses = computeTotalExpenses(item, grossIncome);
  return grossIncome - totalExpenses;
}

// Per-item routing outputs (SE, QBI, passive, at-risk)
function perItemOutputs(item: ScheduleFItem, netProfit: number): NodeOutput[] {
  const outputs: NodeOutput[] = [];

  // Schedule SE (line 1a): only when net profit >= $400
  if (netProfit >= SE_TAX_THRESHOLD) {
    outputs.push({ nodeType: schedule_se.nodeType, fields: { net_profit_schedule_f: netProfit } });
  }

  // Form 8995 (QBI): only when net profit > 0
  if (netProfit > 0) {
    outputs.push({ nodeType: form8995.nodeType, fields: { qbi_from_schedule_f: netProfit } });
  }

  // Form 8582 (passive): only when material participation = false
  if (item.line_e_material_participation === false) {
    outputs.push({ nodeType: form8582.nodeType, fields: { passive_schedule_f: netProfit } });
  }

  // Form 6198 (at-risk): only when net loss and "some investment not at risk" (box 36b)
  if (netProfit < 0 && item.line36_at_risk === "b") {
    outputs.push({ nodeType: form6198.nodeType, fields: { schedule_f_loss: netProfit } });
  }

  return outputs;
}

// EBL threshold based on filing status
function eblThreshold(filingStatus: FilingStatus | undefined): number {
  return filingStatus === FilingStatus.MFJ ? EBL_THRESHOLD_MFJ : EBL_THRESHOLD_SINGLE;
}

// ── Node class ────────────────────────────────────────────────────────────────

class ScheduleFNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_f";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule1,
    schedule_se,
    form8995,
    form8582,
    form6198,
    form461,
  ]);

  compute(rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);

    if (input.schedule_fs.length === 0) {
      return { outputs: [] };
    }

    const netProfits = input.schedule_fs.map(computeNetProfit);
    const totalNetProfit = netProfits.reduce((sum, p) => sum + p, 0);

    // Only emit outputs when there is actual activity (non-zero result)
    const hasActivity = netProfits.some((p) => p !== 0) ||
      input.schedule_fs.some((item) => computeGrossIncome(item) !== 0);

    if (!hasActivity) {
      return { outputs: [] };
    }

    const outputs: NodeOutput[] = [];

    // Schedule 1 line 6: aggregate net farm profit/loss (always when there is activity)
    outputs.push({ nodeType: schedule1.nodeType, fields: { line6_schedule_f: totalNetProfit } });

    // Per-item downstream routing
    for (let i = 0; i < input.schedule_fs.length; i++) {
      outputs.push(...perItemOutputs(input.schedule_fs[i], netProfits[i]));
    }

    // Excess business loss — Form 461 (IRC §461(l))
    if (totalNetProfit < 0) {
      const loss = Math.abs(totalNetProfit);
      const threshold = eblThreshold(input.filing_status);
      if (loss > threshold) {
        outputs.push({
          nodeType: form461.nodeType,
          fields: { excess_business_loss: loss - threshold },
        });
      }
    }

    return { outputs };
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const schedule_f = new ScheduleFNode();

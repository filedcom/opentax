import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { filingStatusSchema } from "../../../types.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";
import { schedule_se } from "../schedule_se/index.ts";
import { form8995 } from "../form8995/index.ts";
import { form8582 } from "../form8582/index.ts";
import {
  type AtRiskNet,
  calculateSimplifiedAtRiskLoss,
  simplifiedAtRiskSchema,
} from "../form6198/simplified.ts";
import { form461 } from "../form461/index.ts";
import { schedule_j_calculation } from "../schedule_j/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import {
  cccLoanDetailSchema,
  cropInsuranceDeferralSchema,
  validateCccLoanElection,
  validateCropInsuranceDeferral,
} from "../farm_elections.ts";

// ── TY2025 Constants ──────────────────────────────────────────────────────────

// IRC §1402(b) — minimum net farm profit to owe SE tax
const SE_TAX_THRESHOLD = 400;

// Pub. 225 ch. 5 — conservation expenses limited to 25% of gross farm income
const CONSERVATION_LIMIT_PCT = 0.25;

// ── Schemas ───────────────────────────────────────────────────────────────────

const accrualIncomeSchema = z.object({
  line37_sales_products: z.number().nonnegative(),
  line38a_cooperative_distributions: z.number().nonnegative().optional(),
  line38b_cooperative_distributions_taxable: z.number().nonnegative()
    .optional(),
  line39a_ag_program_payments: z.number().nonnegative().optional(),
  line39b_ag_program_payments_taxable: z.number().nonnegative().optional(),
  line40a_ccc_loans_election: z.number().nonnegative().optional(),
  line40a_ccc_loan_details: z.array(cccLoanDetailSchema).min(1).optional(),
  line40b_ccc_loans_forfeited: z.number().nonnegative().optional(),
  line40c_ccc_loans_forfeited_taxable: z.number().nonnegative().optional(),
  line41_crop_insurance: z.number().nonnegative().optional(),
  line42_custom_hire_income: z.number().nonnegative().optional(),
  line43_other_income: z.number().optional(),
  line45_beginning_inventory: z.number().nonnegative(),
  line46_products_purchased: z.number().nonnegative(),
  line48_ending_inventory: z.number().nonnegative(),
  inventory_method: z.enum(["cost", "unit_livestock_price", "farm_price"]),
}).strict();

const cashIncomeKeys = [
  "line1_sales_livestock_resale",
  "line1b_cost_livestock_resale",
  "line2_sales_products_raised",
  "line3a_cooperative_distributions",
  "line3b_cooperative_distributions_taxable",
  "line4a_ag_program_payments",
  "line4b_ag_program_payments_taxable",
  "line5a_ccc_loans_election",
  "line5a_ccc_loan_details",
  "line5b_ccc_loans_forfeited",
  "line5c_ccc_loans_forfeited_taxable",
  "line6a_crop_insurance",
  "line6b_crop_insurance_taxable",
  "line6c_defer_crop_insurance",
  "line6c_crop_insurance_deferral_details",
  "line6d_crop_insurance_deferred",
  "line7_custom_hire_income",
  "line8_other_income",
] as const;

export const itemSchema = z.object({
  // Header / identification
  farm_id: z.string().min(1).optional(),
  line_a_principal_crop_activity: z.string().min(1),
  line_b_agricultural_activity_code: z.enum([
    "111100",
    "111210",
    "111300",
    "111400",
    "111900",
    "112111",
    "112112",
    "112120",
    "112210",
    "112300",
    "112400",
    "112510",
    "112900",
    "113000",
    "113110",
    "113210",
    "113310",
  ]),
  line_c_farm_name: z.string().optional(),
  line_d_ein: z.string().optional(),
  qbi_no_other_adjustments_confirmed: z.boolean().optional(),
  line_e_material_participation: z.boolean(),
  line_f_made_1099_payments: z.boolean().optional(),
  line_f_filed_1099s: z.boolean().optional(),
  accounting_method: z.enum(["cash", "accrual"]),

  // Part I — Farm Income (Cash Method)
  line1_sales_livestock_resale: z.number().nonnegative().optional(),
  line1b_cost_livestock_resale: z.number().nonnegative().optional(),
  line2_sales_products_raised: z.number().nonnegative().optional(),
  line3a_cooperative_distributions: z.number().nonnegative().optional(),
  line3b_cooperative_distributions_taxable: z.number().nonnegative().optional(),
  line4a_ag_program_payments: z.number().nonnegative().optional(),
  line4b_ag_program_payments_taxable: z.number().nonnegative().optional(),
  line5a_ccc_loans_election: z.number().nonnegative().optional(),
  line5a_ccc_loan_details: z.array(cccLoanDetailSchema).min(1).optional(),
  ccc_loan_election_in_effect: z.boolean().optional(),
  line5b_ccc_loans_forfeited: z.number().nonnegative().optional(),
  line5c_ccc_loans_forfeited_taxable: z.number().nonnegative().optional(),
  line6a_crop_insurance: z.number().nonnegative().optional(),
  line6b_crop_insurance_taxable: z.number().nonnegative().optional(),
  line6c_defer_crop_insurance: z.boolean().optional(),
  line6c_crop_insurance_deferral_details: cropInsuranceDeferralSchema
    .optional(),
  line6d_crop_insurance_deferred: z.number().nonnegative().optional(),
  line7_custom_hire_income: z.number().nonnegative().optional(),
  line8_other_income: z.number().optional(), // can be negative (bartering adjustments etc.)

  // Part III — Farm Income (Accrual Method)
  part_iii: accrualIncomeSchema.optional(),

  // Part II — Farm Expenses (Cash and Accrual Methods)
  line10_car_truck: z.number().nonnegative().optional(),
  line11_chemicals: z.number().nonnegative().optional(),
  line12_conservation: z.number().nonnegative().optional(), // capped at 25% of gross
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
  // Gross labor before work-opportunity and other employment-credit reductions.
  line22_labor_hired: z.number().nonnegative().optional(),
  line22_other_employment_credits: z.number().nonnegative().optional(),
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
  line32_other_expenses: z.array(
    z.object({
      description: z.string().min(1),
      amount: z.number().nonnegative(),
    }).strict(),
  ).optional(),

  // At-risk election (line 36)
  line36_at_risk: z.enum(["a", "b"]).optional(),
  at_risk_simplified: simplifiedAtRiskSchema.optional(),
}).strict().superRefine((item, ctx) => {
  if (item.accounting_method === "cash") {
    if (item.line1_sales_livestock_resale === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Cash-method Schedule F requires line 1a",
      });
    }
    if (item.part_iii !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Cash-method Schedule F cannot use Part III",
      });
    }
  } else {
    if (item.part_iii === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Accrual-method Schedule F requires Part III",
      });
    }
    if (cashIncomeKeys.some((key) => item[key] !== undefined)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Accrual-method Schedule F cannot use cash-method income lines",
      });
    }
  }
});

export const farmSourceSchema = z.object({
  farm_id: z.string().min(1),
  kind: z.enum([
    "1099g_agriculture",
    "1099g_ccc_market_gain",
    "1099m_crop_insurance",
    "1099nec_farm_income",
    "1099patr_cooperative",
    "auto_expense",
  ]),
  amount: z.number().nonnegative(),
  taxable_amount: z.number().nonnegative().optional(),
  deferred: z.boolean().optional(),
}).strict().superRefine((source, ctx) => {
  if (source.kind === "1099patr_cooperative") {
    if (
      source.taxable_amount === undefined ||
      source.taxable_amount > source.amount
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "1099-PATR farm source requires a verified taxable amount no greater than gross",
      });
    }
  } else if (source.taxable_amount !== undefined) {
    ctx.addIssue({
      code: "custom",
      message: "Taxable amount is only allowed for 1099-PATR farm sources",
    });
  }
});

export type FarmSource = z.infer<typeof farmSourceSchema>;

export const inputSchema = z.object({
  schedule_fs: z.array(itemSchema),
  farm_optional_method_elected: z.boolean().optional(),
  filing_status: filingStatusSchema.optional(),
  farm_sources: z.array(farmSourceSchema).optional(),
  wotc_wage_reductions: z.array(
    z.object({
      farm_id: z.string().min(1),
      credit_amount: z.number().nonnegative(),
    }).strict(),
  ).optional(),
}).strict();

export type ScheduleFItem = z.infer<typeof itemSchema>;

export function laborLessEmploymentCredits(
  item: ScheduleFItem,
  wotcReduction = 0,
): number {
  const gross = item.line22_labor_hired ?? 0;
  const credits = (item.line22_other_employment_credits ?? 0) + wotcReduction;
  if (credits < 0 || credits > gross) {
    throw new Error("Schedule F employment credits exceed gross labor hired");
  }
  return gross - credits;
}

export function wotcReductionsByFarm(
  input: Pick<
    z.infer<typeof inputSchema>,
    "schedule_fs" | "wotc_wage_reductions"
  >,
): Map<string, number> {
  const farms = new Map<string, ScheduleFItem>();
  for (const item of input.schedule_fs) {
    if (!item.farm_id) continue;
    if (farms.has(item.farm_id)) {
      throw new Error("Schedule F farm ID is duplicated");
    }
    farms.set(item.farm_id, item);
  }
  const reductions = new Map<string, number>();
  for (const entry of input.wotc_wage_reductions ?? []) {
    const farm = farms.get(entry.farm_id);
    if (!farm) {
      throw new Error("Form 5884 references an unknown Schedule F farm");
    }
    reductions.set(
      entry.farm_id,
      (reductions.get(entry.farm_id) ?? 0) + entry.credit_amount,
    );
    laborLessEmploymentCredits(farm, reductions.get(entry.farm_id));
  }
  return reductions;
}

export function reconcileFarmSources(
  input: z.infer<typeof inputSchema>,
): void {
  const sources = input.farm_sources ?? [];
  if (sources.length === 0) return;
  const farms = new Map<string, ScheduleFItem>();
  for (const item of input.schedule_fs) {
    if (!item.farm_id) {
      throw new Error(
        "Schedule F farm_id is required when source documents are routed to farms",
      );
    }
    if (farms.has(item.farm_id)) {
      throw new Error(`Schedule F farm_id ${item.farm_id} is duplicated`);
    }
    farms.set(item.farm_id, item);
  }
  const totals = new Map<
    string,
    Record<FarmSource["kind"], number> & {
      patrTaxable: number;
    }
  >();
  for (const source of sources) {
    if (!farms.has(source.farm_id)) {
      throw new Error(
        `Schedule F source references unknown farm_id ${source.farm_id}`,
      );
    }
    const current = totals.get(source.farm_id) ?? {
      "1099g_agriculture": 0,
      "1099g_ccc_market_gain": 0,
      "1099m_crop_insurance": 0,
      "1099nec_farm_income": 0,
      "1099patr_cooperative": 0,
      auto_expense: 0,
      patrTaxable: 0,
    };
    current[source.kind] += source.amount;
    if (source.kind === "1099patr_cooperative") {
      current.patrTaxable += source.taxable_amount ?? 0;
    }
    totals.set(source.farm_id, current);
  }
  for (const [farmId, source] of totals) {
    const farm = farms.get(farmId);
    if (!farm) {
      throw new Error(`Schedule F source references unknown farm_id ${farmId}`);
    }
    const accrual = farm.part_iii;
    const checks = farm.accounting_method === "cash"
      ? [
        [
          "line 3a",
          farm.line3a_cooperative_distributions ?? 0,
          source["1099patr_cooperative"],
        ],
        [
          "line 3b",
          farm.line3b_cooperative_distributions_taxable ?? 0,
          source.patrTaxable,
        ],
        [
          "line 4a",
          farm.line4a_ag_program_payments ?? 0,
          source["1099g_agriculture"] + source["1099g_ccc_market_gain"],
        ],
        [
          "line 6a",
          farm.line6a_crop_insurance ?? 0,
          source["1099m_crop_insurance"],
        ],
        ["line 8", farm.line8_other_income ?? 0, source["1099nec_farm_income"]],
        ["line 10", farm.line10_car_truck ?? 0, source.auto_expense],
      ] as const
      : [
        [
          "line 38a",
          accrual?.line38a_cooperative_distributions ?? 0,
          source["1099patr_cooperative"],
        ],
        [
          "line 38b",
          accrual?.line38b_cooperative_distributions_taxable ?? 0,
          source.patrTaxable,
        ],
        [
          "line 39a",
          accrual?.line39a_ag_program_payments ?? 0,
          source["1099g_agriculture"] + source["1099g_ccc_market_gain"],
        ],
        [
          "line 41",
          accrual?.line41_crop_insurance ?? 0,
          source["1099m_crop_insurance"],
        ],
        [
          "line 43",
          accrual?.line43_other_income ?? 0,
          source["1099nec_farm_income"],
        ],
        ["line 10", farm.line10_car_truck ?? 0, source.auto_expense],
      ] as const;
    for (const [line, reported, sourced] of checks) {
      if (reported < sourced) {
        throw new Error(
          `Schedule F farm ${farmId} ${line} is less than its routed source total`,
        );
      }
    }
    const marketGain = source["1099g_ccc_market_gain"];
    if (marketGain > 0) {
      if (farm.ccc_loan_election_in_effect === undefined) {
        throw new Error(
          `Schedule F farm ${farmId} needs CCC loan election status for market gain`,
        );
      }
      const taxableProgramPayments = farm.accounting_method === "cash"
        ? farm.line4b_ag_program_payments_taxable ?? 0
        : accrual?.line39b_ag_program_payments_taxable ?? 0;
      const grossProgramPayments = farm.accounting_method === "cash"
        ? farm.line4a_ag_program_payments ?? 0
        : accrual?.line39a_ag_program_payments ?? 0;
      const taxableLine = farm.accounting_method === "cash"
        ? "line 4b"
        : "line 39b";
      if (
        farm.ccc_loan_election_in_effect === false &&
        taxableProgramPayments < marketGain
      ) {
        throw new Error(
          `Schedule F farm ${farmId} ${taxableLine} omits taxable CCC market gain`,
        );
      }
      if (
        farm.ccc_loan_election_in_effect === true &&
        taxableProgramPayments >
          grossProgramPayments - marketGain
      ) {
        throw new Error(
          `Schedule F farm ${farmId} ${taxableLine} includes nontaxable CCC market gain`,
        );
      }
    }
  }
  for (const source of sources) {
    if (source.deferred === true) {
      const farm = farms.get(source.farm_id);
      if (farm?.line6c_defer_crop_insurance !== true) {
        throw new Error(
          `Schedule F farm ${source.farm_id} has deferred crop insurance without line 6c election`,
        );
      }
    }
  }
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

// Line 9: Gross farm income
// = line 1c + line 2 + line 3b + line 4b + line 5a + line 5c +
//   line 6b + line 6d + line 7 + line 8
export function computeGrossIncome(item: ScheduleFItem): number {
  if (item.accounting_method === "accrual") {
    return computeAccrualIncome(item).grossIncome;
  }
  validateCccLoanElection(
    item.line5a_ccc_loans_election,
    item.line5a_ccc_loan_details,
    "Schedule F line 5a",
  );
  if (
    (item.line5a_ccc_loans_election ?? 0) > 0 &&
    item.ccc_loan_election_in_effect === false
  ) {
    throw new Error("Schedule F line 5a contradicts CCC loan election status");
  }
  validateCropInsuranceDeferral(
    item.line6a_crop_insurance,
    item.line6b_crop_insurance_taxable,
    item.line6c_defer_crop_insurance,
    item.line6c_crop_insurance_deferral_details,
    "Schedule F line 6c",
  );
  if (
    item.line6c_defer_crop_insurance !== true &&
    (item.line6a_crop_insurance ?? 0) > 0 &&
    item.line6b_crop_insurance_taxable !== item.line6a_crop_insurance
  ) {
    throw new Error(
      "Schedule F line 6b needs taxable proceeds or a deferral election",
    );
  }
  const livestockProfit = (item.line1_sales_livestock_resale ?? 0) -
    (item.line1b_cost_livestock_resale ?? 0);
  return livestockProfit +
    (item.line2_sales_products_raised ?? 0) +
    (item.line3b_cooperative_distributions_taxable ?? 0) +
    (item.line4b_ag_program_payments_taxable ?? 0) +
    (item.line5a_ccc_loans_election ?? 0) +
    (item.line5c_ccc_loans_forfeited_taxable ?? 0) +
    (item.line6b_crop_insurance_taxable ?? 0) +
    (item.line6d_crop_insurance_deferred ?? 0) +
    (item.line7_custom_hire_income ?? 0) +
    (item.line8_other_income ?? 0);
}

export function computeAccrualIncome(item: ScheduleFItem): {
  totalIncome: number;
  beginningInventoryPlusPurchases: number;
  costOfProductsSold: number;
  grossIncome: number;
} {
  if (item.accounting_method !== "accrual" || !item.part_iii) {
    throw new Error("Schedule F accrual income requires Part III facts");
  }
  const part = item.part_iii;
  validateCccLoanElection(
    part.line40a_ccc_loans_election,
    part.line40a_ccc_loan_details,
    "Schedule F line 40a",
  );
  if (
    (part.line40a_ccc_loans_election ?? 0) > 0 &&
    item.ccc_loan_election_in_effect === false
  ) {
    throw new Error("Schedule F line 40a contradicts CCC loan election status");
  }
  const totalIncome = part.line37_sales_products +
    (part.line38b_cooperative_distributions_taxable ?? 0) +
    (part.line39b_ag_program_payments_taxable ?? 0) +
    (part.line40a_ccc_loans_election ?? 0) +
    (part.line40c_ccc_loans_forfeited_taxable ?? 0) +
    (part.line41_crop_insurance ?? 0) +
    (part.line42_custom_hire_income ?? 0) +
    (part.line43_other_income ?? 0);
  if (totalIncome < 0) {
    throw new Error("Schedule F Part III line 44 cannot be negative");
  }
  const beginningInventoryPlusPurchases = part.line45_beginning_inventory +
    part.line46_products_purchased;
  const inventoryGrowth = part.line48_ending_inventory -
    beginningInventoryPlusPurchases;
  const addInventoryGrowth = inventoryGrowth > 0 &&
    part.inventory_method !== "cost";
  const costOfProductsSold = addInventoryGrowth
    ? inventoryGrowth
    : -inventoryGrowth;
  return {
    totalIncome,
    beginningInventoryPlusPurchases,
    costOfProductsSold,
    grossIncome: addInventoryGrowth
      ? totalIncome + costOfProductsSold
      : totalIncome - costOfProductsSold,
  };
}

// Conservation expense: capped at 25% of gross farm income (Pub. 225 ch. 5)
export function conservationDeduction(
  item: ScheduleFItem,
  grossIncome: number,
): number {
  const raw = item.line12_conservation ?? 0;
  const limit = Math.max(0, grossIncome) * CONSERVATION_LIMIT_PCT;
  return Math.min(raw, limit);
}

// Line 33: Total expenses (with conservation limit applied)
export function computeTotalExpenses(
  item: ScheduleFItem,
  grossIncome: number,
  wotcReduction = 0,
): number {
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
    laborLessEmploymentCredits(item, wotcReduction) +
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
    (item.line32_other_expenses ?? []).reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );
}

// Line 34: Net profit (or loss)
export function computeNetProfit(
  item: ScheduleFItem,
  wotcReduction = 0,
): number {
  const grossIncome = computeGrossIncome(item);
  const totalExpenses = computeTotalExpenses(item, grossIncome, wotcReduction);
  return grossIncome - totalExpenses;
}

export function calculateScheduleFAtRiskNet(
  item: ScheduleFItem,
  wotcReduction = 0,
): AtRiskNet {
  const preliminaryNet = computeNetProfit(item, wotcReduction);
  if (item.at_risk_simplified && item.line36_at_risk !== "b") {
    throw new Error("Schedule F Form 6198 facts require line 36b");
  }
  if (item.line36_at_risk !== "b" || preliminaryNet >= 0) {
    if (item.at_risk_simplified) {
      throw new Error("Schedule F Form 6198 facts require a current-year loss");
    }
    return { preliminaryNet, atRiskNet: preliminaryNet, suspended: 0 };
  }
  if (!item.at_risk_simplified) {
    throw new Error(
      "Schedule F line 36b requires Form 6198 simplified-computation facts",
    );
  }
  return calculateSimplifiedAtRiskLoss(preliminaryNet, item.at_risk_simplified);
}

// Per-item routing outputs (SE, QBI, passive, at-risk)
function perItemOutputs(
  item: ScheduleFItem,
  netProfit: number,
  farmOptionalMethodElected: boolean,
): NodeOutput[] {
  const outputs: NodeOutput[] = [];

  // Schedule SE Part I line 1a is replaced by Part II line 15 when elected.
  if (!farmOptionalMethodElected && netProfit >= SE_TAX_THRESHOLD) {
    outputs.push(output(schedule_se, { net_profit_schedule_f: netProfit }));
  }

  // Form 8995 (QBI): only when net profit > 0
  if (netProfit > 0) {
    outputs.push(output(form8995, {
      qbi_from_schedule_f: netProfit,
      schedule_f_qbi_businesses: [{
        business_reference: item.farm_id,
        business_name: item.line_c_farm_name,
        ein: item.line_d_ein?.replace(/\D/g, ""),
        qbi: netProfit,
        no_other_adjustments_confirmed:
          item.qbi_no_other_adjustments_confirmed === true,
        source_schedule_f: item,
      }],
    }));
  }

  // Form 8582 (passive): only when material participation = false
  if (item.line_e_material_participation === false) {
    outputs.push(output(form8582, { passive_schedule_f: netProfit }));
  }

  return outputs;
}

// ── Node class ────────────────────────────────────────────────────────────────

class ScheduleFNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_f";
  readonly inputSchema = inputSchema;
  get outputNodes() {
    return new OutputNodes([
      schedule1,
      agi_aggregator,
      schedule_se,
      form8995,
      form8582,
      form461,
      schedule_j_calculation,
    ]);
  }

  compute(ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);
    reconcileFarmSources(input);

    if (input.schedule_fs.length === 0) {
      return { outputs: [] };
    }

    const reductions = wotcReductionsByFarm(input);
    const atRisk = input.schedule_fs.map((item) =>
      calculateScheduleFAtRiskNet(
        item,
        reductions.get(item.farm_id ?? "") ?? 0,
      )
    );
    const netProfits = atRisk.map((result) => result.atRiskNet);
    const propertyNet = netProfits.reduce((sum, p) => sum + p, 0);
    const totalNetProfit = propertyNet;

    // Only emit outputs when there is actual activity (non-zero result)
    const hasActivity = atRisk.some((result) => result.preliminaryNet !== 0) ||
      input.schedule_fs.some((item) => computeGrossIncome(item) !== 0);

    if (!hasActivity) {
      return { outputs: [] };
    }

    const outputs: NodeOutput[] = [];

    // Schedule 1 line 6: aggregate net farm profit/loss (always when there is activity)
    outputs.push(
      this.outputNodes.output(schedule1, { line6_schedule_f: totalNetProfit }),
    );
    outputs.push(
      this.outputNodes.output(agi_aggregator, {
        line6_schedule_f: totalNetProfit,
      }),
    );
    outputs.push(this.outputNodes.output(schedule_j_calculation, {
      farm_net_profit: totalNetProfit,
    }));

    // Per-item downstream routing
    for (let i = 0; i < input.schedule_fs.length; i++) {
      outputs.push(...perItemOutputs(
        input.schedule_fs[i],
        netProfits[i],
        input.farm_optional_method_elected === true,
      ));
    }

    if (input.farm_optional_method_elected === true) {
      // 2025 Schedule SE Part II footnotes: gross farm income comes from
      // Schedule F line 9, and net farm profit from line 34, before the
      // subsequent at-risk limitation. One election covers all Schedule Fs.
      const grossFarmIncome = input.schedule_fs.reduce(
        (sum, item) => sum + computeGrossIncome(item),
        0,
      );
      const line34NetFarmProfit = atRisk.reduce(
        (sum, result) => sum + result.preliminaryNet,
        0,
      );
      outputs.push(this.outputNodes.output(schedule_se, {
        farm_optional_method_elected: true,
        gross_farm_income: Math.max(0, grossFarmIncome),
        net_profit_schedule_f: line34NetFarmProfit,
      }));
    }

    // Form 461 line 6 uses signed Schedule 1 line 6 after at-risk limits.
    // The return-wide threshold is applied by Form 461, not per farm.
    outputs.push(this.outputNodes.output(form461, {
      line6_schedule_f: totalNetProfit,
      passive_loss_unresolved: input.schedule_fs.some((item, index) =>
        item.line_e_material_participation === false && netProfits[index] < 0
      ),
    }));

    return {
      outputs,
      carryforwards: Object.fromEntries(
        atRisk.flatMap((result, index) =>
          result.suspended > 0
            ? [[`schedule_f_at_risk_suspended_${index + 1}`, result.suspended]]
            : []
        ),
      ),
    };
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const schedule_f = new ScheduleFNode();

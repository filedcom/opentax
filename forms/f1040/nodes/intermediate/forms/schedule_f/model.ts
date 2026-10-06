import {
  calculateCharitableNaturalResource,
  charitableNaturalResourceSourceSchema,
} from "../../../inputs/f8283/natural-resource-source.ts";
import { itemSchema as scheduleCItemSchema } from "../../../inputs/schedule_c/model.ts";
import { z } from "zod";
import { inputSchema as patronReviewSchema } from "../../../inputs/qbi_patron/schema.ts";
import { filingStatusSchema } from "../../../types.ts";
import {
  type AtRiskNet,
  calculateSimplifiedAtRiskLoss,
  simplifiedAtRiskSchema,
} from "../form6198/simplified.ts";
import {
  cccLoanDetailSchema,
  cropInsuranceDeferralSchema,
  validateCccLoanElection,
  validateCropInsuranceDeferral,
} from "../farm_elections.ts";
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
  donated_natural_resource_property_source:
    charitableNaturalResourceSourceSchema.optional(),
  // Header / identification
  farm_id: z.string().min(1).optional(),
  proprietor_recipient: z.enum(["T", "S"]).optional(),
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
  shop_employee_w2_records: z.array(
    z.object({
      employee_reference: z.string().trim().min(1),
      employee_ssn: z.string().regex(/^\d{9}$/),
      employer_ein: z.string().regex(/^\d{9}$/),
      payroll_record_reference: z.string().trim().min(1),
      social_security_medicare_wages: z.number().int().positive(),
      hours_of_service: z.number().int().positive(),
    }).strict(),
  ).min(1).max(24).optional(),
  qbi_se_tax_allocation_review: scheduleCItemSchema.shape
    .qbi_se_tax_allocation_review.optional(),
  qbi_wotc_filing_review: scheduleCItemSchema.shape.qbi_wotc_filing_review
    .unwrap().extend({
      employee_w2_records: z.array(
        scheduleCItemSchema.shape.qbi_wotc_filing_review.unwrap().shape
          .employee_w2_records.element.extend({
            box1_wages: z.number().positive(),
            box5_wages: z.number().positive(),
            box3_social_security_wages: z.number().positive(),
            agricultural_labor_duties_source_reference: z.string().trim().min(
              1,
            ),
            more_than_half_each_pay_period_agricultural_labor_confirmed: z
              .literal(true),
            social_security_medicare_wages_confirmed: z.literal(true),
            employee_ssn: z.string().regex(/^\d{9}$/),
            employer_ein: z.string().regex(/^\d{9}$/),
            swa_certification_reference: z.string().trim().min(1),
            payroll_record_references: z.array(z.string().trim().min(1)).min(1),
          }),
      ).min(1),
      principal_income_from_farming_confirmed: z.literal(true),
      farming_activity_source_reference: z.string().trim().min(1),
      farm_ownership_source_reference: z.string().trim().min(1),
      no_joint_venture_or_partnership_confirmed: z.literal(true),
      no_other_qualified_group_employee_payroll_confirmed: z.literal(true),
    }).strict().optional(),
  qbi_no_other_adjustments_confirmed: z.boolean().optional(),
  qbi_w2_wages: z.number().finite().nonnegative().optional(),
  qbi_unadjusted_basis: z.number().finite().nonnegative().optional(),
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
      description: z.string().trim().min(1),
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
    "1099g_crop_disaster_current_taxable",
    "1099g_ccc_market_gain",
    "1099m_crop_insurance",
    "1099m_box3_other_income",
    "1099nec_farm_income",
    "1099patr_cooperative",
    "auto_expense",
  ]),
  amount: z.number().nonnegative(),
  payer_name: z.string().trim().min(1).optional(),
  payer_tin: z.string().regex(/^\d{9}$/).optional(),
  recipient_tin: z.string().regex(/^\d{9}$/).optional(),
  source_document_reference: z.string().trim().min(1).optional(),
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
  if (
    (source.kind === "1099m_box3_other_income" ||
      source.kind === "1099nec_farm_income" ||
      source.kind === "1099g_agriculture" ||
      source.kind === "1099g_crop_disaster_current_taxable" ||
      source.kind === "1099g_ccc_market_gain") &&
    (!source.payer_name || !source.payer_tin || !source.recipient_tin)
  ) {
    ctx.addIssue({
      code: "custom",
      message: "1099 farm source needs payer and recipient identity",
    });
  }
  if (
    (source.kind === "1099g_agriculture" ||
      source.kind === "1099g_crop_disaster_current_taxable" ||
      source.kind === "1099g_ccc_market_gain") &&
    !source.source_document_reference
  ) {
    ctx.addIssue({
      code: "custom",
      message: "1099-G farm source needs an issued-copy reference",
    });
  }
});

export type FarmSource = z.infer<typeof farmSourceSchema>;

export const inputSchema = z.object({
  owner_filing_status: z.literal("mfj").optional(),
  patron_filing_review: patronReviewSchema.optional(),
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
  form8941_premium_reductions: z.array(
    z.object({
      farm_id: z.string().min(1),
      credit_amount: z.number().int().positive(),
    }).strict(),
  ).optional(),
}).strict();

export type ScheduleFItem = z.infer<typeof itemSchema>;

/** Preserve gross paid benefits in source; file line 15 net of full credit. */
export function projectScheduleFItems(
  input: z.infer<typeof inputSchema>,
): ScheduleFItem[] {
  const reductions = input.form8941_premium_reductions ?? [];
  const seen = new Set<string>();
  for (const entry of reductions) {
    if (
      seen.has(entry.farm_id) ||
      input.schedule_fs.filter((item) => item.farm_id === entry.farm_id)
          .length !== 1
    ) {
      throw new Error(
        "Form8941 premium reduction needs one distinct Schedule F farm",
      );
    }
    seen.add(entry.farm_id);
  }
  return input.schedule_fs.map((rawItem) => {
    const item = rawItem.donated_natural_resource_property_source
      ? itemSchema.parse({
        ...rawItem,
        line12_conservation: naturalResourceConservation(
          rawItem,
          computeGrossIncome(rawItem),
        ),
      })
      : rawItem;
    const reduction = reductions.find((entry) =>
      entry.farm_id === item.farm_id
    );
    if (!reduction) return item;
    const gross = item.line15_employee_benefits ?? 0;
    if (reduction.credit_amount > gross) {
      throw new Error(
        "Form8941 premium credit exceeds gross farm employee benefits",
      );
    }
    return {
      ...item,
      line15_employee_benefits: gross - reduction.credit_amount,
    };
  });
}

export function assertScheduleF1099Answers(item: ScheduleFItem): void {
  if (
    typeof item.line_f_made_1099_payments !== "boolean" ||
    (item.line_f_made_1099_payments &&
      typeof item.line_f_filed_1099s !== "boolean") ||
    (!item.line_f_made_1099_payments &&
      item.line_f_filed_1099s !== undefined)
  ) {
    throw new Error("Schedule F needs required Forms 1099 answers");
  }
}

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
    const farm = farms.get(source.farm_id);
    if (!farm) {
      throw new Error(
        `Schedule F source references unknown farm_id ${source.farm_id}`,
      );
    }
    if (
      (source.kind === "1099m_box3_other_income" ||
        source.kind === "1099nec_farm_income" ||
        source.kind === "1099g_agriculture" ||
        source.kind === "1099g_crop_disaster_current_taxable" ||
        source.kind === "1099g_ccc_market_gain") &&
      !farm.proprietor_recipient
    ) {
      throw new Error(
        "1099 farm source needs a named Schedule F proprietor",
      );
    }
    const current = totals.get(source.farm_id) ?? {
      "1099g_agriculture": 0,
      "1099g_crop_disaster_current_taxable": 0,
      "1099g_ccc_market_gain": 0,
      "1099m_crop_insurance": 0,
      "1099m_box3_other_income": 0,
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
          source["1099m_crop_insurance"] +
          source["1099g_crop_disaster_current_taxable"],
        ],
        [
          "line 8",
          farm.line8_other_income ?? 0,
          source["1099nec_farm_income"] + source["1099m_box3_other_income"],
        ],
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
          source["1099m_crop_insurance"] +
          source["1099g_crop_disaster_current_taxable"],
        ],
        [
          "line 43",
          accrual?.line43_other_income ?? 0,
          source["1099nec_farm_income"] + source["1099m_box3_other_income"],
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
    if (
      source["1099g_crop_disaster_current_taxable"] > 0 &&
      farm.line6c_defer_crop_insurance === true
    ) {
      throw new Error(
        `Schedule F farm ${farmId} cannot defer a reviewed current-year-taxable crop disaster payment`,
      );
    }
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
  if (item.donated_natural_resource_property_source) {
    return naturalResourceConservation(item, grossIncome);
  }
  const raw = item.line12_conservation ?? 0;
  const limit = Math.max(0, grossIncome) * CONSERVATION_LIMIT_PCT;
  return Math.min(raw, limit);
}

/** Owned annual175 invoices and carry derive the filed current deduction. */
export function naturalResourceConservation(
  item: ScheduleFItem,
  grossIncome: number,
) {
  const raw = item.donated_natural_resource_property_source!;
  const calc = calculateCharitableNaturalResource(raw);
  const current = raw.annual_records.at(-1)!;
  if (
    raw.kind !== "farmland_1252" || item.accounting_method !== "cash" ||
    item.farm_id !== raw.business_reference ||
    (item.proprietor_recipient ?? "T") !== raw.proprietor_recipient ||
    grossIncome !== current.gross_property_income ||
    (item.line2_sales_products_raised ?? 0) !== grossIncome ||
    current.other_deductible_property_expenses !== 0 ||
    (item.line12_conservation !== undefined &&
      item.line12_conservation !== calc.current_year.deduction) ||
    Object.entries(item).some(([key, value]) =>
      /^line\d/.test(key) && typeof value === "number" && value !== 0 &&
      !["line2_sales_products_raised", "line12_conservation"].includes(key)
    )
  ) {
    throw new Error(
      "Owned175 current farm receipts/conservation/owner differ from actual source account",
    );
  }
  return calc.current_year.deduction;
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

/** The printed 2025 Schedule F requires line 36a or 36b for a loss. */
export function assertScheduleFLossAtRiskAnswer(
  item: ScheduleFItem,
  wotcReduction = 0,
): void {
  if (computeNetProfit(item, wotcReduction) < 0 && !item.line36_at_risk) {
    throw new Error("Schedule F loss requires a line 36 at-risk answer");
  }
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

import { z } from "zod";
import {
  type AtRiskNet,
  calculateSimplifiedAtRiskLoss,
  simplifiedAtRiskSchema,
} from "../../intermediate/forms/form6198/simplified.ts";
import { TS } from "../../types.ts";

const MEALS_STANDARD_PCT = 0.50; // Standard business meals
const MEALS_DOT_PCT = 0.80; // DOT hours-of-service workers
const MEALS_WAGES_PCT = 1.00; // Meals treated as employee wages
const HOME_OFFICE_SIMPLIFIED_RATE = 5.00; // $5.00 per sq ft (simplified method)
const HOME_OFFICE_MAX_SQ_FT = 300; // 300 sq ft maximum

// ── Schemas ─────────────────────────────────────────────────────────────────

const otherExpenseSchema = z.object({
  description: z.string(),
  amount: z.number().nonnegative(),
});

export const itemSchema = z.object({
  // Header / identification
  line_a_principal_business: z.string(),
  line_b_business_code: z.string(),
  line_c_business_name: z.string().optional(),
  business_reference: z.string().trim().min(1).optional(),
  // The bounded Form 8829 route checks taxpayer ownership separately.
  proprietor_recipient: z.nativeEnum(TS).optional(),
  line_d_ein: z.string().optional(),
  line_e_business_address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().length(2),
    zip: z.string().regex(/^\d{5}(?:-\d{4})?$/),
  }).optional(),
  line_f_accounting_method: z.enum(["cash", "accrual", "other"]),
  line_g_material_participation: z.boolean(),
  line_h_new_business: z.boolean().optional(),
  line_i_made_1099_payments: z.boolean().optional(),
  line_j_filed_1099s: z.boolean().optional(),

  // Drake-specific special treatment flags
  statutory_employee: z.boolean().optional(),
  exempt_notary: z.boolean().optional(),
  paper_route: z.boolean().optional(),
  professional_gambler: z.boolean().optional(),
  clergy_schedule_c: z.boolean().optional(),
  disposed_of_business: z.boolean().optional(),
  multi_form_code: z.string().optional(),
  llc_number: z.number().int().min(1).max(999).optional(),
  // A positive interest deduction needs an affirmative section 163(j)
  // determination. An absent flag is not evidence of an exemption.
  subject_to_163j: z.never().optional(),
  section163j_small_business_exemption: z.object({
    prior_three_year_gross_receipts: z.tuple([
      z.number().int().finite().nonnegative(),
      z.number().int().finite().nonnegative(),
      z.number().int().finite().nonnegative(),
    ]),
    business_existed_for_all_three_prior_tax_years_verified: z.literal(true),
    all_required_aggregated_receipts_included_verified: z.literal(true),
    not_a_tax_shelter_verified: z.literal(true),
  }).strict().optional(),

  // Section 199A information used when taxable income exceeds the QBI threshold.
  qbi_specified_service: z.boolean().optional(),
  qbi_w2_wages: z.number().nonnegative().optional(),
  qbi_unadjusted_basis: z.number().nonnegative().optional(),
  // Required for the bounded Form 8995-A Schedule C path: the Schedule C net
  // amount has no separately attributable section 199A adjustments.
  qbi_no_other_adjustments_confirmed: z.boolean().optional(),

  // Part I: Income
  line_1_gross_receipts: z.number().nonnegative(),
  line_2_returns_allowances: z.number().nonnegative().optional(),
  line_6_other_income: z.number().optional(), // can be negative (recapture)

  // Part II: Expenses
  line_8_advertising: z.number().nonnegative().optional(),
  line_9_car_truck_expenses: z.number().nonnegative().optional(),
  line_10_commissions_fees: z.number().nonnegative().optional(),
  line_11_contract_labor: z.number().nonnegative().optional(),
  line_12_depletion: z.number().nonnegative().optional(),
  // Reviewed property-level AMT depletion refigure for Form 6251 line 2d.
  // Schedule C line 12 is the regular-tax total; the AMT total is separate.
  amt_depletion_worksheet: z.object({
    source_reference: z.string().trim().min(1),
    all_property_income_and_basis_limits_applied_verified: z.literal(true),
    no_at_risk_or_basis_limitation_verified: z.literal(true),
    properties: z.array(
      z.object({
        property_reference: z.string().trim().min(1),
        regular_allowed_depletion: z.number().int().finite().nonnegative(),
        amt_allowed_depletion: z.number().int().finite().nonnegative(),
      }).strict(),
    ).min(1),
  }).strict().optional(),
  line_13_depreciation: z.number().nonnegative().optional(),
  line_14_employee_benefits: z.number().nonnegative().optional(),
  line_15_insurance: z.number().nonnegative().optional(),
  line_16a_interest_mortgage: z.number().nonnegative().optional(),
  line_16b_interest_other: z.number().nonnegative().optional(),
  line_17_professional_services: z.number().nonnegative().optional(),
  line_18_office_expense: z.number().nonnegative().optional(),
  line_19_pension_plans: z.number().nonnegative().optional(),
  line_20a_rent_vehicles: z.number().nonnegative().optional(),
  line_20b_rent_other: z.number().nonnegative().optional(),
  line_21_repairs: z.number().nonnegative().optional(),
  line_22_supplies: z.number().nonnegative().optional(),
  line_23_taxes_licenses: z.number().nonnegative().optional(),
  line_24a_travel: z.number().nonnegative().optional(),
  line_24b_meals: z.number().nonnegative().optional(),
  meals_dot_worker: z.boolean().optional(), // DOT hours-of-service → 80% meals
  meals_as_wages: z.boolean().optional(), // Meals treated as wages → 100%
  line_25_utilities: z.number().nonnegative().optional(),
  // Gross payroll before the Form 5884 and other employment-credit reductions.
  line_26_wages: z.number().nonnegative().optional(),
  line_26_other_employment_credits: z.number().nonnegative().optional(),
  line_27a_energy_efficient: z.number().nonnegative().optional(),
  line_27b_other_expenses: z.number().nonnegative().optional(),
  line_30_home_office: z.number().nonnegative().optional(), // pre-computed dollar amount
  home_office_sq_ft: z.number().nonnegative().optional(), // simplified method sq ft input
  home_office_method: z.enum(["simplified", "actual"]).optional(),
  line_32_at_risk: z.enum(["a", "b"]).optional(),
  at_risk_simplified: simplifiedAtRiskSchema.optional(),

  // Part III: Cost of Goods Sold
  line_33_inventory_method: z.enum(["cost", "lcm", "other"]).optional(),
  line_34_inventory_change: z.boolean().optional(),
  line_35_cogs_beginning_inventory: z.number().nonnegative().optional(),
  line_36_purchases: z.number().nonnegative().optional(),
  line_37_cost_of_labor: z.number().nonnegative().optional(),
  line_38_materials_supplies_cogs: z.number().nonnegative().optional(),
  line_39_other_cogs: z.number().nonnegative().optional(),
  line_41_cogs_ending_inventory: z.number().nonnegative().optional(),

  // Part IV: Vehicle information (informational — substantiation only)
  line_43_date_in_service: z.string().optional(),
  line_44a_total_miles: z.number().int().nonnegative().optional(),
  line_44b_business_miles: z.number().int().nonnegative().optional(),
  line_44c_commuting_miles: z.number().int().nonnegative().optional(),
  line_44d_other_miles: z.number().int().nonnegative().optional(),
  line_45_personal_use: z.boolean().optional(),
  line_46_another_vehicle: z.boolean().optional(),
  line_47a_evidence: z.boolean().optional(),
  line_47b_written_evidence: z.boolean().optional(),

  // Part V: Other Expenses detail
  part_v_other_expenses: z.array(otherExpenseSchema).optional(),
});

export const inputSchema = z.object({
  schedule_cs: z.array(itemSchema),
  section481a_adjustments: z.array(
    z.object({
      business_reference: z.string().trim().min(1),
      designated_change_number: z.string().trim().min(1),
      year_of_change: z.number().int().min(1900).max(2025),
      amount: z.number().int().finite(),
    }).strict(),
  ).optional(),
  qbi_no_prior_loss_or_suspended_loss_confirmed: z.literal(true).optional(),
  qbi_not_patron_of_specified_cooperative_confirmed: z.literal(true).optional(),
  form8829_line30: z.object({
    business_reference: z.string().trim().min(1),
    home_identifier: z.string().trim().min(1),
    recipient: z.nativeEnum(TS),
    schedule_c_line29_tentative_profit: z.number().int().finite(),
    line36: z.number().int().positive(),
  }).strict().optional(),
  wotc_wage_reductions: z.array(z.object({
    business_reference: z.string().trim().min(1),
    credit_amount: z.number().nonnegative(),
  })).optional(),
  filing_status: z.string().optional(),
  // Line 30 — Home office deduction (from Form 8829 line 35)
  // IRC §280A; Form 8829 line 35 → Schedule C line 30
  line_30_home_office: z.number().nonnegative().optional(),
  // Line 1 — Gross receipts or sales (from 1099-MISC, 1099-NEC, etc.)
  // Passthrough from upstream nodes routing to Schedule C
  line1_gross_receipts: z.number().nonnegative().optional(),
  // Statutory employee wages (from W-2 Box 13)
  // IRC §3121(d)(3); W-2 box 13 statutory employee checkbox
  statutory_wages: z.number().nonnegative().optional(),
  // Federal withholding from statutory employee W-2 Box 2
  withholding: z.number().nonnegative().optional(),
  // Mortgage interest from 1098 Box 1 routed to Schedule C (business use)
  line16a_interest_mortgage: z.number().nonnegative().optional(),
  // Car and truck expenses from auto_expense worksheet (AUTO screen)
  // Passes to supplement line_9_car_truck_expenses in schedule_c items
  line_9_car_truck_expenses: z.number().nonnegative().optional(),
  // Depletion deduction from the depletion worksheet (DEPL screen)
  // Routes depletion node output into Schedule C line 12
  line_12_depletion: z.number().nonnegative().optional(),
});

export type ScheduleCItem = z.infer<typeof itemSchema>;

/** Apply Form 3115's business-bound current-year adjustment before all tax calculations and projections. */
export function projectSection481aScheduleCItems(
  input: z.infer<typeof inputSchema>,
): ScheduleCItem[] {
  const adjustments = input.section481a_adjustments ?? [];
  if (adjustments.length === 0) return input.schedule_cs;
  const businessCounts = new Map<string, number>();
  for (const item of input.schedule_cs) {
    if (item.business_reference) {
      businessCounts.set(
        item.business_reference,
        (businessCounts.get(item.business_reference) ?? 0) + 1,
      );
    }
  }
  const sourceKeys = new Set<string>();
  for (const entry of adjustments) {
    if (businessCounts.get(entry.business_reference) !== 1) {
      throw new Error(
        "Form 3115 adjustment needs exactly one matching Schedule C business reference",
      );
    }
    const sourceKey =
      `${entry.business_reference}:${entry.designated_change_number}:${entry.year_of_change}`;
    if (sourceKeys.has(sourceKey)) {
      throw new Error("Form 3115 adjustment source is duplicated");
    }
    sourceKeys.add(sourceKey);
  }
  return input.schedule_cs.map((item) => {
    const sourced = adjustments.filter((entry) =>
      entry.business_reference === item.business_reference
    );
    if (sourced.length === 0) return item;
    const positive = sourced.filter((entry) => entry.amount > 0).reduce(
      (sum, entry) => sum + entry.amount,
      0,
    );
    const negative = sourced.filter((entry) => entry.amount < 0);
    if (positive > 0 && item.line_6_other_income !== undefined) {
      throw new Error(
        "Form 3115 positive adjustment needs Schedule C line 6 free of an unverified duplicate",
      );
    }
    if (
      negative.length > 0 &&
      ((item.line_27b_other_expenses ?? 0) > 0 ||
        (item.part_v_other_expenses ?? []).some((entry) =>
          /(?:section\s*481|form\s*3115)/i.test(entry.description)
        ))
    ) {
      throw new Error(
        "Form 3115 negative adjustment needs Schedule C Part V free of an unverified duplicate",
      );
    }
    return {
      ...item,
      ...(positive > 0 ? { line_6_other_income: positive } : {}),
      ...(negative.length > 0
        ? {
          part_v_other_expenses: [
            ...(item.part_v_other_expenses ?? []),
            ...negative.map((entry) => ({
              description:
                `Form 3115 Sec. 481(a), DCN ${entry.designated_change_number}`,
              amount: -entry.amount,
            })),
          ],
        }
        : {}),
    };
  });
}

export function projectScheduleCItems(
  input: z.infer<typeof inputSchema>,
): ScheduleCItem[] {
  return projectForm8829ScheduleCItems({
    ...input,
    schedule_cs: projectSection481aScheduleCItems(input),
  });
}

export function projectForm8829ScheduleCItems(
  input: z.infer<typeof inputSchema>,
): ScheduleCItem[] {
  const claim = input.form8829_line30;
  if (!claim) return input.schedule_cs;
  if (
    input.schedule_cs.length !== 1 ||
    (input.line_30_home_office ?? 0) > 0 ||
    (input.wotc_wage_reductions?.length ?? 0) > 0 ||
    (input.line1_gross_receipts ?? 0) > 0 ||
    (input.statutory_wages ?? 0) > 0 ||
    (input.line16a_interest_mortgage ?? 0) > 0 ||
    (input.line_9_car_truck_expenses ?? 0) > 0 ||
    (input.line_12_depletion ?? 0) > 0
  ) {
    throw new Error(
      "Form 8829 Schedule C projection needs one unadjusted business and no top-level home-office deduction",
    );
  }
  const item = input.schedule_cs[0];
  if (
    item.business_reference !== claim.business_reference ||
    claim.recipient !== TS.T ||
    item.proprietor_recipient !== TS.T ||
    (item.line_30_home_office ?? 0) > 0 ||
    item.home_office_method === "simplified" ||
    item.home_office_sq_ft !== undefined ||
    (item.line_15_insurance ?? 0) > 0 ||
    (item.line_20b_rent_other ?? 0) > 0 ||
    (item.line_21_repairs ?? 0) > 0 ||
    (item.line_25_utilities ?? 0) > 0 ||
    (item.line_27b_other_expenses ?? 0) > 0 ||
    (item.part_v_other_expenses?.length ?? 0) > 0 ||
    computeGrossIncome(item) - computeTotalExpenses(item) !==
      claim.schedule_c_line29_tentative_profit
  ) {
    throw new Error(
      "Form 8829 Schedule C projection needs matching business, line 29, and no duplicated home expenses",
    );
  }
  return [{ ...item, line_30_home_office: claim.line36 }];
}

export function assertScheduleCInterestExempt(
  item: ScheduleCItem,
  threshold: number,
): void {
  itemSchema.parse(item);
  const interest = (item.line_16a_interest_mortgage ?? 0) +
    (item.line_16b_interest_other ?? 0);
  if (interest === 0) return;
  const exemption = item.section163j_small_business_exemption;
  if (!exemption) {
    throw new Error(
      "Schedule C interest needs documented section 163(j) exemption; Form 8990 ATI is not yet reconciled",
    );
  }
  const receipts = exemption.prior_three_year_gross_receipts;
  const average = (receipts[0] + receipts[1] + receipts[2]) / 3;
  if (average > threshold) {
    throw new Error(
      "Schedule C interest exceeds section 163(j) small-business gross-receipts threshold",
    );
  }
}

// ── Pure helpers ────────────────────────────────────────────────────────────

export function computeCOGS(item: ScheduleCItem): number {
  const line40 = (item.line_35_cogs_beginning_inventory ?? 0) +
    (item.line_36_purchases ?? 0) +
    (item.line_37_cost_of_labor ?? 0) +
    (item.line_38_materials_supplies_cogs ?? 0) +
    (item.line_39_other_cogs ?? 0);
  return line40 - (item.line_41_cogs_ending_inventory ?? 0);
}

export function computeGrossIncome(item: ScheduleCItem): number {
  const netSales = item.line_1_gross_receipts -
    (item.line_2_returns_allowances ?? 0);
  const grossProfit = netSales - computeCOGS(item);
  return grossProfit + (item.line_6_other_income ?? 0);
}

export function mealsDeductiblePct(item: ScheduleCItem): number {
  if (item.meals_as_wages === true) return MEALS_WAGES_PCT;
  if (item.meals_dot_worker === true) return MEALS_DOT_PCT;
  return MEALS_STANDARD_PCT;
}

export function homeOfficeDeduction(
  item: ScheduleCItem,
  tentativeProfit: number,
): number {
  let deduction: number;
  if (
    item.home_office_method === "simplified" &&
    item.home_office_sq_ft !== undefined
  ) {
    const cappedSqFt = Math.min(item.home_office_sq_ft, HOME_OFFICE_MAX_SQ_FT);
    deduction = cappedSqFt * HOME_OFFICE_SIMPLIFIED_RATE;
  } else {
    deduction = item.line_30_home_office ?? 0;
  }
  // Gross income limitation: deduction cannot exceed tentative profit (Line 29)
  return Math.min(deduction, Math.max(0, tentativeProfit));
}

export function wagesLessEmploymentCredits(
  item: ScheduleCItem,
  wotcReduction = 0,
): number {
  const gross = item.line_26_wages ?? 0;
  const credits = (item.line_26_other_employment_credits ?? 0) +
    wotcReduction;
  if (credits < 0 || credits > gross) {
    throw new Error("Schedule C employment credits exceed gross wages");
  }
  return gross - credits;
}

export function wotcReductionsByBusiness(
  input: {
    schedule_cs: readonly ScheduleCItem[];
    wotc_wage_reductions?: readonly {
      business_reference: string;
      credit_amount: number;
    }[];
  },
): Map<string, number> {
  const businesses = new Map<string, ScheduleCItem>();
  for (const item of input.schedule_cs) {
    if (!item.business_reference) continue;
    if (businesses.has(item.business_reference)) {
      throw new Error("Schedule C business reference is duplicated");
    }
    businesses.set(item.business_reference, item);
  }
  const reductions = new Map<string, number>();
  for (const entry of input.wotc_wage_reductions ?? []) {
    const business = businesses.get(entry.business_reference);
    if (!business) {
      throw new Error("Form 5884 references an unknown Schedule C business");
    }
    reductions.set(
      entry.business_reference,
      (reductions.get(entry.business_reference) ?? 0) + entry.credit_amount,
    );
    wagesLessEmploymentCredits(
      business,
      reductions.get(entry.business_reference),
    );
  }
  return reductions;
}

export function computeTotalExpenses(
  item: ScheduleCItem,
  wotcReduction = 0,
): number {
  const mealsDeductible = (item.line_24b_meals ?? 0) * mealsDeductiblePct(item);
  const partVTotal = (item.part_v_other_expenses ?? []).reduce(
    (sum, e) => sum + e.amount,
    0,
  );
  return (item.line_8_advertising ?? 0) +
    (item.line_9_car_truck_expenses ?? 0) +
    (item.line_10_commissions_fees ?? 0) +
    (item.line_11_contract_labor ?? 0) +
    (item.line_12_depletion ?? 0) +
    (item.line_13_depreciation ?? 0) +
    (item.line_14_employee_benefits ?? 0) +
    (item.line_15_insurance ?? 0) +
    (item.line_16a_interest_mortgage ?? 0) +
    (item.line_16b_interest_other ?? 0) +
    (item.line_17_professional_services ?? 0) +
    (item.line_18_office_expense ?? 0) +
    (item.line_19_pension_plans ?? 0) +
    (item.line_20a_rent_vehicles ?? 0) +
    (item.line_20b_rent_other ?? 0) +
    (item.line_21_repairs ?? 0) +
    (item.line_22_supplies ?? 0) +
    (item.line_23_taxes_licenses ?? 0) +
    (item.line_24a_travel ?? 0) +
    mealsDeductible +
    (item.line_25_utilities ?? 0) +
    wagesLessEmploymentCredits(item, wotcReduction) +
    (item.line_27a_energy_efficient ?? 0) +
    (item.line_27b_other_expenses ?? 0) +
    partVTotal;
}

export function computeNetProfit(
  item: ScheduleCItem,
  wotcReduction = 0,
): number {
  const grossIncome = computeGrossIncome(item);
  const totalExpenses = computeTotalExpenses(item, wotcReduction);
  const tentativeProfit = grossIncome - totalExpenses; // Line 29
  const homeOffice = homeOfficeDeduction(item, tentativeProfit);
  const rawProfit = tentativeProfit - homeOffice; // Line 31
  // Professional gamblers cannot report a net loss (IRC §165(d))
  return item.professional_gambler === true
    ? Math.max(0, rawProfit)
    : rawProfit;
}

export function isSeExempt(item: ScheduleCItem): boolean {
  return item.statutory_employee === true ||
    item.exempt_notary === true ||
    item.paper_route === true;
}

export function calculateScheduleCAtRiskNet(
  item: ScheduleCItem,
  wotcReduction = 0,
): AtRiskNet {
  const preliminaryNet = computeNetProfit(item, wotcReduction);
  if (item.at_risk_simplified && item.line_32_at_risk !== "b") {
    throw new Error("Schedule C Form 6198 facts require line 32b");
  }
  if (item.line_32_at_risk !== "b" || preliminaryNet >= 0) {
    if (item.at_risk_simplified) {
      throw new Error("Schedule C Form 6198 facts require a current-year loss");
    }
    return { preliminaryNet, atRiskNet: preliminaryNet, suspended: 0 };
  }
  if (!item.at_risk_simplified) {
    throw new Error(
      "Schedule C line 32b requires Form 6198 simplified-computation facts",
    );
  }
  return calculateSimplifiedAtRiskLoss(preliminaryNet, item.at_risk_simplified);
}

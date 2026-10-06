import { inputSchema as patronReviewSchema } from "../qbi_patron/schema.ts";
import { itemSchema as patrItemSchema } from "../f1099patr/schema.ts";
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
  schedule_j_fishing_evidence: z.object({
    business_reference: z.string().trim().min(1),
    catch_sales_record_reference: z.string().trim().min(1),
    harvested_fish_entered_commerce_verified: z.literal(true),
    scientific_research_vessel: z.literal(false),
  }).strict().optional(),
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
  // Reviewed employer W-2 copies for the single-business WOTC filing route.
  // qbi_w2_wages is the allocable amount AFTER the section 280C reduction.
  qbi_wotc_filing_review: z.object({
    employee_w2_records: z.array(
      z.object({
        employee_reference: z.string().trim().min(1),
        source_document_reference: z.string().trim().min(1),
        box1_wages: z.number().int().positive(),
        box5_wages: z.number().int().positive(),
        ssa_filing_record_reference: z.string().trim().min(1),
        filed_within_60_days_of_due_date_confirmed: z.literal(true),
      }).strict(),
    ).min(1),
    all_business_payroll_included_confirmed: z.literal(true),
    no_other_business_or_aggregation_confirmed: z.literal(true),
    no_ptp_or_loss_carryforward_confirmed: z.literal(true),
    qualified_dividends_zero_confirmed: z.literal(true),
    no_qualified_property_confirmed: z.literal(true),
    review_reference: z.string().trim().min(1),
    reviewed_by: z.string().trim().min(1),
    reviewed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).strict().optional(),
  // Reviewed payroll and classification for one owner-operated SSTB.
  qbi_sstb_filing_review: z.object({
    mfs_filing_review: z.object({
      domicile_state: z.literal("CO"),
      full_year_colorado_domicile_confirmed: z.literal(true),
      domicile_record_reference: z.string().trim().min(1),
      spouse_ssn: z.string().regex(/^\d{9}$/),
      spouse_deduction_record_reference: z.string().trim().min(1),
      spouse_does_not_itemize_confirmed: z.literal(true),
    }).strict().optional(),
    owner_ssn: z.string().regex(/^\d{9}$/),
    classification_source_reference: z.string().trim().min(1),
    business_activity_description: z.string().trim().min(1),
    accounting_sstb_confirmed: z.literal(true),
    employee_w2_records: z.array(
      z.object({
        employee_ssn: z.string().regex(/^\d{9}$/),
        employer_ein: z.string().regex(/^\d{9}$/),
        source_document_reference: z.string().trim().min(1),
        box1_wages: z.number().int().positive(),
        box5_wages: z.number().int().positive(),
        ssa_filing_record_reference: z.string().trim().min(1),
        filed_within_60_days_of_due_date_confirmed: z.literal(true),
      }).strict(),
    ),
    no_business_employees_review: z.object({
      payroll_and_expense_ledger_reference: z.string().trim().min(1),
      sole_proprietor_only_workforce_confirmed: z.literal(true),
      no_employee_w2_or_business_payroll_confirmed: z.literal(true),
    }).strict().optional(),
    all_business_payroll_included_confirmed: z.literal(true),
    no_other_business_or_aggregation_confirmed: z.literal(true),
    no_ptp_or_loss_carryforward_confirmed: z.literal(true),
    qualified_dividends_zero_confirmed: z.literal(true),
    no_qualified_property_confirmed: z.literal(true),
    no_adjustments_beyond_filed_half_se_tax_confirmed: z.literal(true),
    review_reference: z.string().trim().min(1),
    reviewed_by: z.string().trim().min(1),
    reviewed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((date) => {
      const parsed = new Date(`${date}T00:00:00Z`);
      return Number.isFinite(parsed.valueOf()) &&
        parsed.toISOString().slice(0, 10) === date && date >= "2025-12-31";
    }, "Expected a real post-year-end review date"),
  }).strict().superRefine((review, ctx) => {
    if (
      (review.employee_w2_records.length === 0) !==
        (review.no_business_employees_review !== undefined)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Zero payroll needs its reviewed owner-only workforce ledger; employee payroll cannot also claim no employees",
      });
    }
  }).optional(),
  // Required for the bounded Form 8995-A Schedule C path: the Schedule C net
  // amount has no separately attributable section 199A adjustments.
  qbi_no_other_adjustments_confirmed: z.boolean().optional(),
  // Reviewed allocation of the combined Schedule SE deduction across businesses.
  qbi_se_tax_allocation_review: z.object({
    deduction_amount: z.number().finite().nonnegative(),
    allocation_method: z.literal(
      "positive_profit_proportion_with_cent_residual",
    ),
    reasonable_for_business_facts_confirmed: z.literal(true),
    consistently_applied_and_books_agree_confirmed: z.literal(true),
    all_businesses_included_confirmed: z.literal(true),
    no_aggregation_confirmed: z.literal(true),
    workpaper_reference: z.string().min(1),
    reviewed_by: z.string().min(1),
    reviewed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).strict().optional(),

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
  home_total_sq_ft: z.number().int().positive().max(999_999).optional(),
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
  // One current-year mining expense deducted in Part V and amortized over
  // ten years for AMT. Earlier vintages and property-loss limits need their
  // own basis workpapers.
  amt_mining_cost_workpaper: z.object({
    property_reference: z.string().trim().min(1),
    reviewed_workpaper_reference: z.string().trim().min(1),
    expense_description: z.string().trim().min(1),
    paid_or_incurred_date: z.string().regex(/^2025-\d{2}-\d{2}$/),
    mining_exploration_or_development_verified: z.literal(true),
    regular_ten_year_writeoff_not_elected: z.literal(true),
    no_unamortized_property_loss: z.literal(true),
  }).strict().optional(),
  // One first-year, uncompleted non-home long-term contract excepted from
  // percentage-of-completion for regular tax but refigured for AMT.
  amt_long_term_contract_workpaper: z.object({
    contract_reference: z.string().trim().min(1),
    signed_contract_reference: z.string().trim().min(1),
    cost_records_reference: z.string().trim().min(1),
    cost_estimate_review_reference: z.string().trim().min(1),
    fixed_contract_price: z.number().int().finite().positive(),
    amt_allocable_costs_incurred_2025: z.number().int().finite().positive(),
    amt_estimated_total_allocable_costs: z.number().int().finite().positive(),
    began_in_2025: z.literal(true),
    uncompleted_at_2025_year_end: z.literal(true),
    non_home_construction_contract_verified: z.literal(true),
    regular_section_460_e_1_exception_verified: z.literal(true),
    regular_receipts_and_costs_deferred_verified: z.literal(true),
    amt_cost_allocation_reviewed: z.literal(true),
  }).strict().optional(),
});

export const inputSchema = z.object({
  schedule_cs: z.array(itemSchema),
  patron_filing_review: patronReviewSchema.optional(),
  patron_distribution_sources: z.array(patrItemSchema).optional(),
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
  form8941_premium_reductions: z.array(
    z.object({
      business_reference: z.string().trim().min(1),
      credit_amount: z.number().int().finite().positive(),
    }).strict(),
  ).optional(),
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
  f1099m_receipt_sources: z.array(
    z.object({
      business_reference: z.string().trim().min(1),
      payer_tin: z.string().regex(/^\d{9}$/),
      recipient_tin: z.string().regex(/^\d{9}$/),
      box: z.enum([
        "box1_rents",
        "box2_royalties",
        "box3_other_income",
        "box5_fishing_boat",
        "box6_medical_payments",
        "box11_fish_purchased",
      ]),
      amount: z.number().positive(),
    }).strict(),
  ).optional(),
  f1099nec_receipt_sources: z.array(
    z.object({
      business_reference: z.string().trim().min(1),
      payer_name: z.string().trim().min(1),
      payer_tin: z.string().regex(/^\d{9}$/),
      recipient_tin: z.string().regex(/^\d{9}$/),
      amount: z.number().positive(),
    }).strict(),
  ).optional(),
  f1099k_receipt_sources: z.array(
    z.object({
      business_reference: z.string().trim().min(1),
      pse_name: z.string().trim().min(1),
      pse_tin: z.string().regex(/^\d{9}$/),
      recipient_tin: z.string().regex(/^\d{9}$/),
      box1a_gross_payments: z.number().positive(),
      personal_item_sales_gross: z.number().int().positive().optional(),
      reported_error_gross: z.number().int().positive().optional(),
      amount: z.number().positive(),
      customer_refunds_review: z.array(
        z.object({
          original_payment_transaction_id: z.string().trim().min(1),
          refund_transaction_id: z.string().trim().min(1),
          amount: z.number().int().positive(),
          refund_record_reference: z.string().trim().min(1),
          issued_in_2025: z.literal(true),
          same_business_sale: z.literal(true),
          not_claimed_elsewhere: z.literal(true),
        }).strict(),
      ).min(1).optional(),
      processor_fees_review: z.object({
        amount: z.number().int().positive(),
        fee_record_reference: z.string().trim().min(1),
        for_service_payments_only: z.literal(true),
        not_capitalized_or_deducted_elsewhere: z.literal(true),
      }).strict().optional(),
      not_included_in_schedule_c_receipts: z.number().nonnegative(),
      allocation_reference: z.string().trim().min(1),
      no_overlap_with_other_1099s: z.literal(true),
      overlap_review_reference: z.string().trim().min(1),
      duplicate_1099_review: z.object({
        source_form: z.enum(["1099nec", "1099misc"]),
        payer_tin: z.string().regex(/^\d{9}$/),
        amount: z.number().int().positive(),
        transaction_review_reference: z.string().trim().min(1),
      }).strict().optional(),
    }).strict(),
  ).optional(),
  attorney_fee_sources: z.array(
    z.object({
      business_reference: z.string().trim().min(1),
      payer_tin: z.string().regex(/^\d{9}$/),
      recipient_tin: z.string().regex(/^\d{9}$/),
      amount: z.number().positive(),
      allocation_review_reference: z.string().trim().min(1),
    }).strict(),
  ).optional(),
  // Statutory employee wages (from W-2 Box 13)
  // IRC §3121(d)(3); W-2 box 13 statutory employee checkbox
  statutory_wages: z.number().nonnegative().optional(),
  statutory_w2_sources: z.array(
    z.object({
      business_reference: z.string().trim().min(1),
      employer_ein: z.string().regex(/^\d{9}$/),
      employee_ssn: z.string().regex(/^\d{9}$/),
      source_document_reference: z.string().trim().min(1),
      amount: z.number().positive(),
    }).strict(),
  ).optional(),
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

/** Keep conditional Schedule C answers consistent across calculation, MeF, and PDF. */
export function assertScheduleCConditionalAnswers(item: ScheduleCItem): void {
  if (
    item.line_j_filed_1099s !== undefined &&
    item.line_i_made_1099_payments !== true
  ) {
    throw new Error(
      "Schedule C line J applies only when line I is yes",
    );
  }
  if (
    item.line_47b_written_evidence !== undefined &&
    item.line_47a_evidence !== true
  ) {
    throw new Error(
      "Schedule C line 47b applies only when line 47a is yes",
    );
  }
}

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
  const items = projectSection481aScheduleCItems(input);
  const reductions = input.form8941_premium_reductions ?? [];
  const seen = new Set<string>();
  for (const reduction of reductions) {
    if (
      seen.has(reduction.business_reference) ||
      items.filter((item) =>
          item.business_reference === reduction.business_reference
        ).length !== 1
    ) {
      throw new Error(
        "Form8941 premium reduction needs one distinct ScheduleC business",
      );
    }
    seen.add(reduction.business_reference);
  }
  const reducedItems = items.map((item) => {
    const reduction = reductions.find((entry) =>
      entry.business_reference === item.business_reference
    );
    if (!reduction) return item;
    if (reduction.credit_amount > (item.line_14_employee_benefits ?? 0)) {
      throw new Error(
        "Form8941 premium credit exceeds gross employee benefit expense",
      );
    }
    // IRC280C(h): credit determined under45R(a), before section38 tax use.
    return {
      ...item,
      line_14_employee_benefits: (item.line_14_employee_benefits ?? 0) -
        reduction.credit_amount,
    };
  });
  // The full premium reduction increases tentative profit before the home-office limit.
  return projectForm8829ScheduleCItems({ ...input, schedule_cs: reducedItems });
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
    item.home_total_sq_ft !== undefined ||
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
  if (
    item.home_office_method !== "simplified" &&
    (item.home_office_sq_ft !== undefined ||
      item.home_total_sq_ft !== undefined)
  ) {
    throw new Error(
      "Schedule C home-office square footage requires the simplified method",
    );
  }
  let deduction: number;
  if (item.home_office_method === "simplified") {
    const businessSqFt = item.home_office_sq_ft;
    if (
      item.home_total_sq_ft === undefined ||
      typeof businessSqFt !== "number" ||
      !Number.isSafeInteger(businessSqFt) ||
      businessSqFt <= 0 ||
      businessSqFt > item.home_total_sq_ft ||
      businessSqFt > 999_999 ||
      item.line_30_home_office !== undefined
    ) {
      throw new Error(
        "Schedule C simplified home office needs consistent total and business square footage",
      );
    }
    const cappedSqFt = Math.min(businessSqFt, HOME_OFFICE_MAX_SQ_FT);
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

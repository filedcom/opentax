import { patronFiledBusinessLines } from "../../nodes/inputs/qbi_patron/calculation.ts";
import type { PdfReviewFixture } from "./review-fixtures.ts";
import { scheduleSELines } from "../../nodes/intermediate/forms/schedule_se/calculation.ts";
import { CONFIG_BY_YEAR } from "../../nodes/config/index.ts";

/** Synthetic issued-copy and books facts; no taxpayer authorization is implied. */
export function patronFixture(
  base: PdfReviewFixture,
  kind: "farm" | "c-health" | "income-cap" = "farm",
): PdfReviewFixture {
  const capped = kind === "income-cap";
  const farm = kind !== "c-health";
  const payroll = capped ? 10000.50 : 100000.50;
  const distributions = capped ? 500000.49 : farm ? 200000.49 : 300000.49;

  const coop = {
    payer_name: "Example Specified Cooperative",
    payer_tin: "234567890",
    recipient_tin: "111223333",
    account_number: "SYNTHETIC-PATR-2025",
    source_document_reference: "Synthetic issued 2025 PATR current copy",
    trade_or_business: true,
    box13_specified_cooperative: true,
    box1_patronage_dividends: Math.floor(distributions * 50) / 100,
    box3_per_unit_retain:
      Math.round((distributions - Math.floor(distributions * 50) / 100) * 100) /
      100,
    box6_section199ag_deduction: capped ? 45000 : 10000.49,
    box7_qualified_payments: distributions,
    box8_section199aa_qualified_items: distributions,
    distribution_treatment: farm
      ? {
        kind: "farm",
        farm_id: "PATR-FARM",
        verified_taxable_amount: distributions,
      }
      : {
        kind: "schedule_c",
        business_reference: "PATR-C",
        verified_taxable_amount: distributions,
      },
  };
  const general: Record<string, unknown> = {
    ...(base.inputs.general as Record<string, unknown>),
    qbi_no_prior_loss_or_suspended_loss_confirmed: true,
  };
  delete general.qbi_not_patron_of_specified_cooperative_confirmed;
  const business = farm
    ? {
      farm_id: "PATR-FARM",
      proprietor_recipient: "T",
      line_a_principal_crop_activity: "GRAIN FARMING",
      line_b_agricultural_activity_code: "111100",
      line_c_farm_name: "Example Patron Farm",
      line_d_ein: "123456789",
      line_e_material_participation: true,
      accounting_method: "cash",
      line_f_made_1099_payments: false,
      line1_sales_livestock_resale: 0,
      line2_sales_products_raised: capped ? 0 : 300000,
      line3a_cooperative_distributions: distributions,
      line3b_cooperative_distributions_taxable: distributions,
      line22_labor_hired: payroll,
      ...(capped ? { line16_feed: 440000 - .50 } : {}),
      ccc_loan_election_in_effect: false,
      qbi_w2_wages: payroll,
      qbi_unadjusted_basis: 0,
    }
    : {
      line_a_principal_business: "Agricultural supply",
      line_b_business_code: "424910",
      line_c_business_name: "Example Patron Supply",
      business_reference: "PATR-C",
      proprietor_recipient: "T",
      line_d_ein: "123456789",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      line_1_gross_receipts: 200000,
      line_6_other_income: distributions,
      line_26_wages: payroll,
      line_18_office_expense: 50000,
      qbi_specified_service: false,
      qbi_w2_wages: payroll,
      qbi_unadjusted_basis: 0,
    };
  const profit =
    patronFiledBusinessLines(farm ? "schedule_f" : "schedule_c", business)
      .profit;
  const se = scheduleSELines({
    [farm ? "net_profit_schedule_f" : "net_profit_schedule_c"]: profit,
  }, CONFIG_BY_YEAR[2025].ssWageBase)!.line13;
  return {
    id: `single-form8995a-patron-${kind}`,
    filer: base.filer,
    inputs: {
      general,
      ...(farm
        ? { schedule_f: { schedule_fs: [business] } }
        : { schedule_c: [business] }),
      f1099patr: [coop],
      qbi_patron: {
        business: farm
          ? { kind: "schedule_f", farm_id: "PATR-FARM" }
          : { kind: "schedule_c", business_reference: "PATR-C" },
        source_1099patr: coop,
        allocation_method: "qualified_receipts_proportion",
        reasonable_for_business_facts_confirmed: true,
        consistently_applied_and_books_agree_confirmed: true,
        all_qualified_payments_in_business_gross_income_confirmed: true,
        employee_w2_records: [{
          employee_reference: "SYNTHETIC-WORKER",
          source_document_reference:
            "Synthetic issued employer W2 payroll copy",
          box1_wages: payroll,
          eligible_199a_wages: payroll,
          ssa_filing_record_reference: "Synthetic SSA timely filing receipt",
          filed_within_60_days_of_due_date_confirmed: true,
        }],
        payroll_source_reference: "Synthetic business payroll ledger",
        w2_payroll_timely_filed_and_eligible_confirmed: true,
        all_business_wages_included_confirmed: true,
        no_other_business_or_aggregation_confirmed: true,
        no_other_qbi_adjustments_confirmed: true,
        allocation_worksheet_reference:
          "Synthetic consistently applied receipts allocation workpaper",
        reviewed_by: "Synthetic reviewer",
        reviewed_on: "2026-03-01",
        box6_written_notice_review: {
          notice_reference: "Synthetic written cooperative 199Ag designation",
          recipient_tin: "111223333",
          designated_199ag_amount: coop.box6_section199ag_deduction,
          reviewed_by: "Synthetic reviewer",
          reviewed_on: "2026-03-01",
          recipient_and_amount_match_confirmed: true,
        },
      },
      ...(!farm
        ? {
          form7206: {
            marketplace_ptc_premium_overlap: false,
            single_schedule_c_plan: {
              business_reference: "PATR-C",
              plan_identifier: "SYNTHETIC-PATR-HEALTH",
              recipient: "T",
              taxpayer_identity: { name: "Alex Example", ssn: "111223333" },
              premium_months: Array.from(
                { length: 12 },
                (_, i) => ({
                  month: i + 1,
                  paid_premium: 500,
                  policy_source_reference:
                    "Synthetic business-owned health policy",
                  payment_source_reference: `Synthetic premium receipt ${
                    i + 1
                  }`,
                  covered_person: "taxpayer",
                  eligible_for_subsidized_employer_plan: false,
                  employer_plan_review_reference:
                    "Synthetic no employer plan review",
                  marketplace_policy: false,
                  long_term_care_policy: false,
                  public_safety_officer_excluded_amount: 0,
                }),
              ),
              schedule_c_line31_net_profit: profit,
              schedule1_line15_se_tax_deduction: se,
              schedule1_line16_retirement_deduction: 0,
              plan_established_under_business: true,
              sole_positive_business_verified: true,
              no_form2555: true,
              no_schedule_se_optional_method: true,
              no_other_earned_income: true,
            },
          },
        }
        : {}),
    },
    expectedPdfForms: [
      "f1040",
      farm ? "schedule_f" : "schedule_c",
      "schedule1",
      "schedule_se",
      "schedule2",
      "form8995a",
      "form8995a_schedule_d",
      ...(!capped ? ["form8959", "form8960"] : []),
      ...(!farm ? ["form7206"] : []),
    ],
    reviewFocus: [
      "Actual PATR distributions are included once in the owned business",
      "Retained cents and attributable SE/health reductions feed reviewed qualified-payment QBI and wages",
      "Parent line14 joins ScheduleD line6; written notice line38 respects remaining taxable income; final1040 deduction and tax reconcile",
    ],
  };
}

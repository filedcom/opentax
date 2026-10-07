import { extractFilerIdentity } from "../../mef/filer.ts";
import type { PdfReviewFixture } from "./review-fixtures.ts";

/** Reviewed synthetic expense/payment records; no external authentication asserted. */
export function form8826InterpreterInputs(receipts = 80_000) {
  return {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Retailer",
      taxpayer_ssn: "111223333",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Example Way",
      address_city: "Albany",
      address_state: "NY",
      address_zip: "12207",
      digital_assets: false,
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    schedule_c: [{
      business_reference: "Access-Retail-2025",
      proprietor_recipient: "T",
      line_a_principal_business: "Retail sales",
      line_b_business_code: "459990",
      line_c_business_name: "Alex Accessible Retail",
      line_d_ein: "123456789",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_32_at_risk: "a",
      line_i_made_1099_payments: true,
      line_j_filed_1099s: true,
      qbi_no_other_adjustments_confirmed: true,
      line_1_gross_receipts: receipts,
      line_27b_other_expenses: 2625,
    }],
    f8826: {
      eligible_expenditures: 5000,
      prior_year_gross_receipts: 500000,
      prior_year_full_time_employee_count: 0,
      subject_to_passive_activity_limit: false,
      self_source_evidence: {
        business_reference: "Access-Retail-2025",
        prior_year_gross_receipts_source_reference:
          "Access-2024-receipts-ledger",
        prior_year_gross_receipts: 500000,
        prior_year_full_time_employee_count_source_reference:
          "Access-2024-worker-roster",
        prior_year_full_time_employee_count: 0,
        no_predecessor_or_common_control_confirmed: true as const,
        interpreter_expenditures: [{
          expense_record_reference: "Access-2025-interpreter-expense",
          invoice_reference: "Access-2025-interpreter-invoice",
          payment_reference: "Access-2025-interpreter-bank-payment",
          paid_or_incurred_on: "2025-06-01",
          amount: 5000,
          hearing_impaired_service_confirmed: true as const,
          ada_compliance_confirmed: true as const,
          reasonable_and_necessary_confirmed: true as const,
        }],
        schedule_c_line27b: {
          amount_before_credit_reduction: 5000,
          credit_reduction_amount: 2375,
          amount_after_credit_reduction: 2625,
          not_deducted_elsewhere_confirmed: true as const,
          not_capitalized_or_used_for_other_credit_confirmed: true as const,
        },
      },
    },
  };
}

export function form8826InterpreterReviewFixture(
  use: "full" | "partial" | "zero" = "full",
): PdfReviewFixture {
  const inputs = form8826InterpreterInputs(
    { full: 80000, partial: 22000, zero: 6000 }[use],
  );
  return {
    id: `single-disabled-access-interpreter-${use}`,
    inputs,
    filer: extractFilerIdentity(inputs.general)!,
    expectedPdfForms: [
      "f1040",
      "schedule1",
      "schedule2",
      ...(use === "zero" ? [] : ["schedule3"]),
      "schedule_c",
      "schedule_se",
      "form8995",
      "form6251",
      "f3800",
      "f8826",
    ],
    reviewFocus: [
      "Actual interpreter invoice/payment and prior-year small-business records join credit2375",
      "Full credit reduces gross expense5000 to filed2625 before profit, SE, QBI and1040",
      "One official8826 filing page and complete3800 source detail reconcile to Schedule3 and1040",
    ],
  };
}

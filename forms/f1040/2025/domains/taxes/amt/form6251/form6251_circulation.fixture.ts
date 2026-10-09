import { form6251Form4952Fixture } from "./form6251_4952.fixture.ts";
import { ExpenditureType } from "../../../../../nodes/inputs/deductions/business/f59e/index.ts";

export function circulationInputs(
  regular: number,
  amt: number,
  elected = false,
) {
  const base = form6251Form4952Fixture();
  return {
    general: {
      ...base.general,
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    w2: [{
      ...base.w2[0],
      employer_address_line1: "10 Payroll Way",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
    }],
    f3921: base.f3921,
    schedule_c: [{
      business_reference: "periodical-2025",
      line_a_principal_business: "Periodical publishing",
      line_b_business_code: "513120",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      line_1_gross_receipts: regular,
      qbi_no_other_adjustments_confirmed: true,
      part_v_other_expenses: [{
        description: "Circulation costs",
        amount: regular,
      }],
    }],
    f59e: [{
      expenditure_type: ExpenditureType.Circulation,
      amortization_period_start: "2025-01-01",
      original_amount: 30000,
      remaining_unamortized: 20000,
      regular_tax_deduction: regular,
      amt_deduction: amt,
      regular_three_year_writeoff_elected: elected,
      circulation_reviewed_workpaper_reference:
        "reviewed circulation deductions",
      circulation_no_unamortized_property_loss: true,
      circulation_schedule_c_expense: {
        business_reference: "periodical-2025",
        expense_description: "Circulation costs",
        owner_tin: "123456789",
      },
    }],
  };
}

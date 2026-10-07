import { assertEquals } from "@std/assert";
import { f1040_2025 } from "../index.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
export function spouseMedicareInputs(wages = 50000, excludedMonths = 0): any {
  const inputs: any = {
    general: {
      filing_status: "mfj",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "111223333",
      taxpayer_dob: "1985-06-15",
      spouse_first_name: "Casey",
      spouse_last_name: "Example",
      spouse_ssn: "222334444",
      spouse_dob: "1986-05-01",
      address_line1: "1 Example Way",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
      taxpayer_can_be_claimed_as_dependent: false,
      spouse_can_be_claimed_as_dependent: false,
      do_not_claim_eic: true,
      eic_tax_residency_review: {
        status: "all_year_resident",
        taxpayer_status_record_reference: "2025-Alex-issued-residence-review",
        spouse_status_record_reference: "2025-Casey-issued-residence-review",
      },
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    schedule_c: [{
      business_reference: "BIZ",
      proprietor_recipient: "S",
      line_a_principal_business: "Photography",
      line_b_business_code: "541920",
      line_c_business_name: "Casey Photography",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      line_32_at_risk: "a",
      qbi_no_other_adjustments_confirmed: true,
      line_1_gross_receipts: 5000,
    }],
    f1099nec: [{
      payer_name: "Owned Photography Client",
      payer_tin: "981234567",
      recipient_ssn: "222334444",
      account_number: "CASEY-BIZ-2025",
      source_document_reference: "2025-Casey-issued-client-1099NEC",
      box1_nec: 5000,
      for_routing: "schedule_c",
      schedule_c_business_reference: "BIZ",
    }],
  };
  if (wages) {
    inputs.w2 = [{
      employee_ssn: "111223333",
      employer_name: "Alex Reviewed Employer",
      employer_ein: "12-3456789",
      employer_address_line1: "20 Employer Way",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      source_document_reference: "2025-Alex-issued-employer-W2",
      box1_wages: wages,
      box2_fed_withheld: 5000,
      box3_ss_wages: wages,
      box4_ss_withheld: wages * .062,
      box5_medicare_wages: wages,
      box6_medicare_withheld: wages * .0145,
      box13_statutory_employee: false,
    }];
  }
  // Derive the plan's income-limit operand from the actual owned public return.
  const own = f1040_2025.executeReturn(structuredClone(inputs));
  assertEquals(own.diagnostics, []);
  inputs.form7206 = {
    single_schedule_c_plan: {
      business_reference: "BIZ",
      plan_identifier: "CASEY-MEDICARE-B-2025",
      recipient: "S",
      taxpayer_identity: { name: "Alex Example", ssn: "111223333" },
      spouse_identity: { name: "Casey Example", ssn: "222334444" },
      premium_months: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        paid_premium: 185,
        policy_source_reference:
          "2025-Casey-issued-Medicare-B-disability-entitlement-and-premium-statement",
        payment_source_reference: `2025-Casey-owned-Medicare-payment-${i + 1}`,
        covered_person: "spouse",
        eligible_for_subsidized_employer_plan: i < excludedMonths,
        employer_plan_review_reference:
          `2025-Alex-Casey-complete-employer-eligibility-review-${i + 1}`,
        marketplace_policy: false,
        long_term_care_policy: false,
        public_safety_officer_excluded_amount: 0,
      })),
      schedule_c_line31_net_profit: own.pending.schedule1.line3_schedule_c,
      schedule1_line15_se_tax_deduction:
        own.pending.schedule1.line15_se_deduction,
      schedule1_line16_retirement_deduction: 0,
      plan_established_under_business: true,
      sole_positive_business_verified: true,
      no_form2555: true,
      no_schedule_se_optional_method: true,
      no_other_earned_income: true,
    },
    marketplace_ptc_premium_overlap: false,
  };
  return inputs;
}
export function spouseMedicareFamily(wages = 50000, excludedMonths = 0): any {
  const inputs = spouseMedicareInputs(wages, excludedMonths),
    r = f1040_2025.executeReturn(inputs);
  assertEquals(r.diagnostics, []);
  return {
    inputs,
    pending: r.pending,
    filer: extractFilerIdentity(r.pending.f1040),
  };
}

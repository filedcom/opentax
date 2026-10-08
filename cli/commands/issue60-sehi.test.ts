import { assertEquals } from "@std/assert";
import { schedule_se } from "../../forms/f1040/nodes/intermediate/forms/taxes/self-employment/schedule_se/index.ts";
import { formAddCommand } from "./form.ts";
import { createReturnCommand, getReturnCommand } from "./return.ts";

Deno.test("CLI accepts spouse-owned Medicare premiums through Form 7206 and computes Schedule 1 line 17", async () => {
  const baseDir = await Deno.makeTempDir();
  try {
    const { returnId } = await createReturnCommand({ year: 2025, baseDir });
    const add = (nodeType: string, data: Record<string, unknown>) =>
      formAddCommand({
        returnId,
        nodeType,
        dataJson: JSON.stringify(data),
        baseDir,
      });
    await add("general", {
      filing_status: "mfj",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1985-06-15",
      spouse_first_name: "Casey",
      spouse_last_name: "Example",
      spouse_ssn: "222-33-4444",
      spouse_dob: "1986-05-01",
      address_line1: "1 Example Way",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
      taxpayer_can_be_claimed_as_dependent: false,
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    });
    await add("schedule_c", {
      business_reference: "BIZ",
      proprietor_recipient: "S",
      line_a_principal_business: "Photography",
      line_b_business_code: "541920",
      line_c_business_name: "Casey Photography",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      qbi_no_other_adjustments_confirmed: true,
      line_1_gross_receipts: 5_000,
    });
    const seDeduction = schedule_se.compute(
      { taxYear: 2025, formType: "f1040" },
      { net_profit_schedule_c: 5_000 },
    ).outputs.find((row) => row.nodeType === "schedule1")?.fields
      .line15_se_deduction;
    if (typeof seDeduction !== "number") {
      throw new Error("Schedule SE deduction is required for this fixture");
    }
    await add("form7206", {
      single_schedule_c_plan: {
        business_reference: "BIZ",
        plan_identifier: "CASEY-MEDICARE-B-2025",
        recipient: "S",
        taxpayer_identity: { name: "Alex Example", ssn: "111223333" },
        spouse_identity: { name: "Casey Example", ssn: "222334444" },
        premium_months: Array.from({ length: 12 }, (_, index) => ({
          month: index + 1,
          paid_premium: 185,
          policy_source_reference: "2025 Casey Medicare Part B statement",
          payment_source_reference: `2025 Casey payment ${index + 1}`,
          covered_person: "spouse",
          eligible_for_subsidized_employer_plan: false,
          employer_plan_review_reference: "2025 employer eligibility review",
          marketplace_policy: false,
          long_term_care_policy: false,
          public_safety_officer_excluded_amount: 0,
        })),
        schedule_c_line31_net_profit: 5_000,
        schedule1_line15_se_tax_deduction: seDeduction,
        schedule1_line16_retirement_deduction: 0,
        plan_established_under_business: true,
        sole_positive_business_verified: true,
        no_form2555: true,
        no_schedule_se_optional_method: true,
        no_other_earned_income: true,
      },
      marketplace_ptc_premium_overlap: false,
    });

    const result = await getReturnCommand({ returnId, baseDir });
    assertEquals(result.warnings.filter((message) =>
      message.includes("EXECUTOR_NODE_FAILURE")
    ), []);
    assertEquals(result.forms.includes("form7206"), true);
    assertEquals(result.lines.line10_adjustments, seDeduction + 2_220);
  } finally {
    await Deno.remove(baseDir, { recursive: true });
  }
});

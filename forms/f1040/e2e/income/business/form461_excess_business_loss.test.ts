import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../../2025/registry.ts";
import { FilingStatus } from "../../../nodes/types.ts";

const ctx = { taxYear: 2025, formType: "f1040" };
const plan = buildExecutionPlan(registry);

// Synthetic joint return: Schedule C loss 700,000 and wages 50,000. 2025
// Instructions for Form 461: wages are not business income (line 2 only),
// line 15 joint threshold 626,000, line 16 excess business loss 74,000,
// added back on Schedule 1 line 8p and treated as an NOL carryforward.
test("Form 461: a Schedule C loss over the joint threshold limits the loss", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.MFJ,
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Payer",
      taxpayer_ssn: "111-22-3333",
      spouse_first_name: "Test",
      spouse_last_name: "Spouse",
      spouse_ssn: "111-22-4444",
      form461_scope_review: {
        only_schedule_c_and_f_business_items: true,
        other_part_i_lines_zero: true,
        part_ii_adjustments_zero: true,
        post_at_risk_and_passive_limits_confirmed: true,
        line2_schedule_c_amount: -700_000,
        line6_schedule_f_amount: 0,
        source_document_refs: ["synthetic C/F-only Form 461 review"],
      },
    },
    w2: [{
      employee_ssn: "111-22-3333",
      employer_ein: "12-3456789",
      employer_name: "Example Employer",
      source_document_reference: "synthetic-w2",
      box1_wages: 50_000,
      box2_fed_withheld: 4_000,
      box3_ss_wages: 50_000,
      box4_ss_withheld: 3_100,
      box5_medicare_wages: 50_000,
      box6_medicare_withheld: 725,
      box12_entries: [],
    }],
    schedule_c: [{
      business_reference: "consulting",
      proprietor_recipient: "T",
      line_a_principal_business: "CONSULTING",
      line_b_business_code: "541600",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      line_1_gross_receipts: 100_000,
      line_17_professional_services: 800_000,
    }],
  }, ctx);

  // The net QBI loss carryforward route (Form 8995) is handled separately;
  // Form 461 itself must not fail.
  assertEquals(
    result.diagnostics.filter((d) => d.nodeType !== "form8995"),
    [],
  );
  assertEquals(result.pending.form461?.line16_excess_business_loss, -74_000);
  assertEquals(result.pending.form461?.line15_threshold, 626_000);
  assertEquals(result.pending.schedule1?.line8p_excess_business_loss, 74_000);
  assertEquals(result.carryforwards.excess_business_loss_nol_origin, 74_000);
});

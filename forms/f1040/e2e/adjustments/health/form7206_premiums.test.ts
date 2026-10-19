import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../../2025/registry.ts";
import { FilingStatus } from "../../../nodes/types.ts";

const ctx = { taxYear: 2025, formType: "f1040" };
const plan = buildExecutionPlan(registry);

// Synthetic single return: Schedule C net profit 80,000; premiums 12,000 with
// no employer-plan-eligible months. 2025 Form 7206: line 4 = 80,000; SE tax
// 80,000 x 92.35% x 15.3% = 11,304 (rounded), deduction 5,652 (line 7);
// line 10 = 74,348 >= 12,000, so line 14 = 12,000 on Schedule 1 line 17.
test("Form 7206: premiums are limited by the return's own Schedule C earnings", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Payer",
    },
    schedule_c: [{
      business_reference: "design",
      proprietor_recipient: "T",
      line_a_principal_business: "DESIGN",
      line_b_business_code: "541400",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      line_1_gross_receipts: 80_000,
    }],
    self_employed_health_insurance: {
      items: [{ premiums_paid: 12_000 }],
      marketplace_ptc_premium_overlap: false,
    },
  }, ctx);

  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form7206?.line7, 5_652);
  assertEquals(result.pending.form7206?.line14, 12_000);
  assertEquals(result.pending.schedule1?.line17_se_health_insurance, 12_000);
});

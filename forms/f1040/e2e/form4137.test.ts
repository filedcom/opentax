import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";

const plan = buildExecutionPlan(registry);
const ctx = { taxYear: 2025, formType: "f1040" };

Deno.test("W-2 allocated tips are reconciled to Form 4137 and actual tip income enters AGI once", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Sam",
      taxpayer_last_name: "Tipper",
      taxpayer_ssn: "123-45-6789",
    },
    w2: [{
      employer_name: "CAFE",
      employer_ein: "123456789",
      box1_wages: 30_000,
      box2_fed_withheld: 2_000,
      box3_ss_wages: 30_000,
      box7_ss_tips: 2_000,
      box8_allocated_tips: 1_000,
    }],
    form4137: {
      forms: [{
        recipient: "taxpayer",
        employers: [{
          name: "CAFE",
          ein: "123456789",
          tips_received: 5_000,
          tips_reported: 2_000,
        }],
      }],
    },
  }, ctx);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4137?.w2_tip_sources, [{
    recipient: "taxpayer",
    allocated_tips: 1_000,
    ss_wages_and_tips: 32_000,
  }]);
  assertEquals(result.pending.f1040?.line1c_unreported_tips, 3_000);
  assertEquals(result.pending.f1040?.line11_agi, 33_000);
  assertEquals(result.pending.schedule2?.line5_unreported_tip_tax, 230);
});

Deno.test("W-2 allocated tips without Form 4137 employer records fail calculation", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Sam",
      taxpayer_last_name: "Tipper",
      taxpayer_ssn: "123-45-6789",
    },
    w2: [{
      box1_wages: 30_000,
      box2_fed_withheld: 2_000,
      box3_ss_wages: 30_000,
      box8_allocated_tips: 1_000,
    }],
  }, ctx);
  assertEquals(
    result.diagnostics.some((entry) =>
      entry.nodeType === "form4137" &&
      entry.message.includes("need employer tip records")
    ),
    true,
  );
});

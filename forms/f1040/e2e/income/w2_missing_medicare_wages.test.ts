import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { execute } from "../../../../core/runtime/executor.ts";
import { registry } from "../../2025/registry.ts";
import { FilingStatus } from "../../nodes/types.ts";

const ctx = { taxYear: 2025, formType: "f1040" };
const plan = buildExecutionPlan(registry);

// Synthetic substitute W-2 built from a final pay stub: boxes 1, 2, 4 and 6
// but no box 3 or 5. Form 1040 lines 1a and 25a come from boxes 1 and 2 (2025
// Form 1040 instructions); only Form 8959 needs the Medicare wage base.
test("W-2 with box 6 but no box 5 keeps wages and withholding with a warning", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Payer",
    },
    w2: [{
      box1_wages: 113_698,
      box2_fed_withheld: 20_306,
      box4_ss_withheld: 7_429,
      box6_medicare_withheld: 1_737,
      box12_entries: [],
    }],
  }, ctx);

  assertEquals(result.diagnostics, []);
  assertEquals(result.warnings?.length, 1);
  const form1040 = result.pending.f1040 ?? {};
  assertEquals(form1040.line1z_total_wages, 113_698);
  assertEquals(form1040.line25a_w2_withheld, 20_306);
  assertEquals(form1040.line25d_total_withholding, 20_306);
});

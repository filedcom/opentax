import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { execute } from "../../../../core/runtime/executor.ts";
import { registry } from "../../2025/registry.ts";
import { FilingStatus } from "../../nodes/types.ts";

const ctx = { taxYear: 2025, formType: "f1040" };
const plan = buildExecutionPlan(registry);

// Synthetic W-2: box 1 60,000 includes a 10,000 nongovernmental section 457
// distribution also shown in box 11. 2025 Instructions for Form 1040, line
// 1a, and Schedule 1 line 8t: the distribution goes on line 8t, not line 1a;
// total income is unchanged.
test("W-2 box 11 NQDC distribution moves from line 1a to Schedule 1 line 8t", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Payer",
    },
    w2: [{
      box1_wages: 60_000,
      box2_fed_withheld: 6_000,
      box3_ss_wages: 50_000,
      box4_ss_withheld: 3_100,
      box5_medicare_wages: 50_000,
      box6_medicare_withheld: 725,
      box11_nonqual_plans: 10_000,
      box11_nqdc_distribution: 10_000,
      box12_entries: [],
    }],
  }, ctx);

  assertEquals(result.diagnostics, []);
  const form1040 = result.pending.f1040 ?? {};
  assertEquals(form1040.line1z_total_wages, 50_000);
  assertEquals(result.pending.schedule1?.line8t_nqdc_distribution, 10_000);
  assertEquals(form1040.line9_total_income, 60_000);
});

import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { execute } from "../../../../core/runtime/executor.ts";
import { registry } from "../../2025/registry.ts";
import { FilingStatus } from "../../nodes/types.ts";

const ctx = { taxYear: 2025, formType: "f1040" };
const plan = buildExecutionPlan(registry);

// Synthetic joint return: the spouse (born 1971, age 54 at the end of 2025)
// defers 31,000 under code D = 23,500 + 7,500 catch-up (IRC §414(v)), which
// is within the limit, so Form 1040 line 1h has no excess and the W-2 wages
// and withholding are kept.
test("W-2 code D at the catch-up limit keeps the W-2 on a joint return", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.MFJ,
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Payer",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1969-05-01",
      spouse_first_name: "Test",
      spouse_last_name: "Spouse",
      spouse_ssn: "111-22-4444",
      spouse_dob: "1971-05-01",
    },
    w2: [{
      employee_ssn: "111-22-4444",
      employer_ein: "12-3456789",
      box1_wages: 46_386,
      box2_fed_withheld: 4_000,
      box3_ss_wages: 77_386,
      box4_ss_withheld: 4_797.93,
      box5_medicare_wages: 77_386,
      box6_medicare_withheld: 1_122.10,
      box13_retirement_plan: true,
      box12_entries: [{ code: "D", amount: 31_000 }],
    }],
  }, ctx);

  assertEquals(result.diagnostics, []);
  const form1040 = result.pending.f1040 ?? {};
  assertEquals(form1040.line1z_total_wages, 46_386);
  assertEquals(form1040.line25d_total_withholding, 4_000);
  assertEquals(form1040.line1h_other_earned, undefined);
});

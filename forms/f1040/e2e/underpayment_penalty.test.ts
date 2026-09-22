import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { FilingStatus } from "../nodes/types.ts";

const ctx = { taxYear: 2025, formType: "f1040" };
const plan = buildExecutionPlan(registry);

Deno.test("Form 2210: computes the regular-method penalty and adds it to amount owed", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Payer",
    },
    w2: [{
      box1_wages: 200_000,
      box2_fed_withheld: 0,
      box3_ss_wages: 176_100,
      box4_ss_withheld: 10_918.2,
      box5_medicare_wages: 200_000,
      box6_medicare_withheld: 2_900,
      box12_entries: [],
    }],
    f2210: {
      withholding: 0,
      prior_year_tax: 30_000,
      prior_year_agi: 180_000,
    },
  }, ctx);

  const form1040 = result.pending.f1040 ?? {};
  assertEquals(form1040.line24_total_tax, 37_067);
  assertEquals(form1040.line38_underpayment_penalty, 1_536);
  assertEquals(form1040.line37_amount_owed, 38_603);
});

Deno.test("Form 2210: explicit penalty is reported and added to amount owed", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Payer",
    },
    w2: [{
      box1_wages: 100_000,
      box2_fed_withheld: 10_000,
      box3_ss_wages: 100_000,
      box4_ss_withheld: 6_200,
      box5_medicare_wages: 100_000,
      box6_medicare_withheld: 1_450,
      box12_entries: [],
    }],
    f2210: { underpayment_penalty: 250 },
  }, ctx);

  const form1040 = result.pending.f1040 ?? {};
  assertEquals(form1040.line38_underpayment_penalty, 250);
  assertEquals(
    form1040.line37_amount_owed,
    Math.max(0, Math.round(form1040.line24_total_tax as number) - 10_000) + 250,
  );
});

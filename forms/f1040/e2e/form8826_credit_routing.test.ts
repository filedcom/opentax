import { assertEquals, assertMatch } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "../2025/registry.ts";
import { FilingStatus } from "../nodes/types.ts";

const plan = buildExecutionPlan(registry);

Deno.test("Form 8826 credit reaches Form 3800 but cannot bypass its tax limit", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
    },
    f8826: {
      eligible_expenditures: 5_000,
      prior_year_gross_receipts: 500_000,
      prior_year_full_time_employee_count: 20,
      subject_to_passive_activity_limit: false,
    },
  }, { taxYear: 2025, formType: "f1040" });

  assertEquals(result.pending.f3800?.f8826_credit_entries, [{
    credit_amount: 2_375,
    subject_to_passive_activity_limit: false,
  }]);
  assertEquals(
    result.pending.schedule3?.line6a_general_business_credit,
    undefined,
  );
  assertEquals(result.pending.f1040?.line20_nonrefundable_credits ?? 0, 0);
  const form3800Failure = result.diagnostics.find((diagnostic) =>
    diagnostic.nodeType === "f3800"
  );
  assertMatch(form3800Failure?.message ?? "", /tax-liability limitation/);
});

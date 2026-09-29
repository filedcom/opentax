import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { FilingStatus } from "../nodes/types.ts";

const plan = buildExecutionPlan(registry);
const general = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Taxpayer",
  taxpayer_ssn: "123-45-6789",
  taxpayer_dob: "1985-06-15",
};

Deno.test("E2E: ordinary Form 1040 line 16 uses the TY2025 Tax Table", () => {
  const result = execute(plan, registry, {
    general,
    w2: [{ box1_wages: 40_750, box2_fed_withheld: 0 }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line15_taxable_income, 25_000);
  // IRS row $25,000-$25,050, Single column.
  assertEquals(result.pending.f1040?.line16_income_tax, 2_765);
});

Deno.test("E2E: qualified dividends use the Tax Table on worksheet line 22", () => {
  const result = execute(plan, registry, {
    general,
    w2: [{ box1_wages: 40_750, box2_fed_withheld: 0 }],
    f1099div: [{
      payerName: "Broker",
      isNominee: false,
      box11: false,
      box1a: 5_000,
      box1b: 5_000,
    }],
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line3a_qualified_dividends, 5_000);
  assertEquals(result.pending.f1040?.line15_taxable_income, 30_000);
  // $5,000 qualified dividends use 0%; ordinary $25,000 uses the Tax Table.
  assertEquals(result.pending.f1040?.line16_income_tax, 2_765);
});

import { assertEquals } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "../2025/registry.ts";

const plan = buildExecutionPlan(registry);

function finalNumber(value: unknown): number | undefined {
  const resolved = Array.isArray(value) ? value.at(-1) : value;
  return typeof resolved === "number" ? resolved : undefined;
}

Deno.test("Schedule 1-A: DOB-derived senior deduction matches issue #36 reproduction", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: "single",
      taxpayer_dob: "1955-06-01",
      taxpayer_ssn: "111-22-3333",
    },
    w2: [{
      box1_wages: 50_000,
      box2_fed_withheld: 5_000,
      box3_ss_wages: 50_000,
      box4_ss_withheld: 3_100,
      box5_medicare_wages: 50_000,
      box6_medicare_withheld: 725,
    }],
  }, { taxYear: 2025, formType: "f1040" });

  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1a?.taxpayer_age_65_or_older, true);
  assertEquals(result.pending.f1040?.line13b_additional_deductions, 6_000);
  assertEquals(
    finalNumber(result.pending.f1040?.line15_taxable_income),
    26_250,
  );
});

Deno.test("Schedule 1-A: overtime and vehicle interest flow from public input to taxable income", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: "single",
      taxpayer_dob: "1985-06-01",
      taxpayer_ssn: "111-22-3333",
    },
    w2: [{
      box1_wages: 80_000,
      box2_fed_withheld: 8_000,
    }],
    schedule1a: {
      taxpayer_qualified_overtime_compensation: 5_000,
      vehicle_loans: [{
        vin: "1HGCM82633A004352",
        qualified_interest_paid: 2_000,
      }],
    },
  }, { taxYear: 2025, formType: "f1040" });

  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line13b_additional_deductions, 7_000);
  assertEquals(
    finalNumber(result.pending.f1040?.line15_taxable_income),
    57_250,
  );
});

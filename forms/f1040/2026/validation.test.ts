import { assertEquals } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { createReturnContext } from "../../../core/validation/context.ts";
import { evaluateRules } from "../../../core/validation/engine.ts";
import { FilingStatus } from "../nodes/types.ts";
import { registry } from "./registry.ts";
import {
  CALCULATION_FIELD_REGISTRY_2026,
  CALCULATION_RULES_2026,
} from "./validation.ts";

const filer = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Ada",
  taxpayer_last_name: "Rivera",
  taxpayer_ssn: "111223333",
  taxpayer_dob: "1990-07-12",
  taxpayer_tin_issued_by_due_date: true,
  taxpayer_ssn_valid_for_employment: true,
  taxpayer_ssn_issued_before_due_date: true,
  taxpayer_citizen_national_or_work_authorized: true,
  digital_assets: false,
  address_line1: "10 Main St",
  address_city: "Boston",
  address_state: "MA",
  address_zip: "02108",
};

function report(pending: Record<string, Record<string, unknown>>) {
  const ctx = createReturnContext(pending, {
    primarySSN: filer.taxpayer_ssn,
    filingStatus: 1,
  }, CALCULATION_FIELD_REGISTRY_2026);
  return evaluateRules(CALCULATION_RULES_2026, ctx);
}

Deno.test("TY2026 local rules reconcile a calculated wages and interest return", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    w2: [{ box1_wages: 80_000, box2_fed_withheld: 10_000 }],
    f1099int: [{ payer_name: "Test Bank", box1: 2_000 }],
    schedule_b: { foreign_account: false, foreign_trust: false },
  }, { taxYear: 2026, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(report(result.pending).entries, []);
  const broken = {
    ...result.pending,
    f1040: { ...result.pending.f1040, line25d_total_withholding: 1 },
  };
  assertEquals(
    report(broken).entries.some((entry) =>
      entry.ruleNumber === "F1040-2026-LOCAL-05"
    ),
    true,
  );
});

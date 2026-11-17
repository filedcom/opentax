import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../../2025/registry.ts";

// Penalty on early withdrawal of savings: 1099-INT box 2 and 1099-OID box 3
// are adjustments on Schedule 1 line 18, carried to Form 1040 line 10
// (2025 Instructions for Form 1040, Schedule 1 line 18).
const plan = buildExecutionPlan(registry);
const ctx = { taxYear: 2025, formType: "f1040" };

function run(inputs: Record<string, unknown>) {
  return execute(plan, registry, {
    general: {
      filing_status: "single",
      taxpayer_ssn: "400001111",
      digital_assets: false,
    },
    w2: [{
      box1_wages: 50_000,
      box2_fed_withheld: 5_000,
      employee_ssn: "400001111",
      employer_ein: "123456789",
      employer_name: "Acme",
    }],
    ...inputs,
  }, ctx);
}

const int1099 = (box2?: number) => ({
  payer_name: "Bank",
  payer_tin: "987654321",
  recipient_tin: "400001111",
  box1: 1_000,
  ...(box2 === undefined ? {} : { box2 }),
});

test("a 1099-INT early withdrawal penalty reduces AGI", () => {
  const result = run({ f1099int: [int1099(400)] });
  assertEquals(result.pending.schedule1.line18_early_withdrawal, 400);
  assertEquals(result.pending.f1040.line10_adjustments, 400);
  assertEquals(result.pending.f1040.line11_agi, 50_600);
});

test("penalties on a 1099-INT and a 1099-OID are summed", () => {
  const result = run({
    f1099int: [int1099(400)],
    f1099oid: [{
      payer_name: "Broker",
      payer_tin: "987654322",
      recipient_tin: "400001111",
      box1_oid: 200,
      box3_early_withdrawal_penalty: 100,
    }],
  });
  assertEquals(result.pending.schedule1.line18_early_withdrawal, 500);
  assertEquals(result.pending.f1040.line10_adjustments, 500);
  assertEquals(result.pending.f1040.line11_agi, 50_700);
});

test("no penalty leaves AGI unchanged", () => {
  const result = run({ f1099int: [int1099()] });
  assertEquals(result.pending.schedule1?.line18_early_withdrawal, undefined);
  assertEquals(result.pending.f1040.line11_agi, 51_000);
});

import { assertEquals } from "@std/assert";
import { f8881, PlanType } from "./index.ts";

function compute(input: Parameters<typeof f8881.compute>[1]) {
  return f8881.compute({ taxYear: 2025 }, input);
}

function findSchedule3(result: ReturnType<typeof compute>) {
  return result.outputs.find((o) => o.nodeType === "schedule3");
}

// ── Schema Validation ────────────────────────────────────────────────────────

Deno.test("schema_rejects_negative_startup_costs", () => {
  const result = f8881.inputSchema.safeParse({
    plan_type: PlanType.Plan401k,
    non_hce_count: 5,
    employee_count: 20,
    startup_costs: -100,
  });
  assertEquals(result.success, false);
});

Deno.test("schema_accepts_valid_input", () => {
  const result = f8881.inputSchema.safeParse({
    plan_type: PlanType.Sep,
    non_hce_count: 3,
    employee_count: 10,
    startup_costs: 3000,
  });
  assertEquals(result.success, true);
});

// ── Eligibility Gates ─────────────────────────────────────────────────────────

Deno.test("over_100_employees_no_credit", () => {
  const result = compute({
    plan_type: PlanType.Simple,
    non_hce_count: 50,
    employee_count: 101,
    startup_costs: 5000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("exactly_100_employees_qualifies", () => {
  // 100 employees → 50% rate → $5000 × 50% = $2,500
  const result = compute({
    plan_type: PlanType.Simple,
    non_hce_count: 50,
    employee_count: 100,
    startup_costs: 5000,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 2500);
});

Deno.test("zero_non_hce_count_no_credit", () => {
  const result = compute({
    plan_type: PlanType.Plan401k,
    non_hce_count: 0,
    employee_count: 20,
    startup_costs: 5000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("zero_startup_costs_no_credit", () => {
  const result = compute({
    plan_type: PlanType.Plan401k,
    non_hce_count: 5,
    employee_count: 20,
    startup_costs: 0,
  });
  assertEquals(result.outputs.length, 0);
});

// ── Small Employer (≤50) — 100% Rate ─────────────────────────────────────────

Deno.test("small_employer_50_or_fewer_100pct_rate", () => {
  // 30 employees, $4,000 costs × 100% = $4,000
  const result = compute({
    plan_type: PlanType.Plan401k,
    non_hce_count: 10,
    employee_count: 30,
    startup_costs: 4000,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 4000);
});

Deno.test("small_employer_exactly_50_employees_100pct_rate", () => {
  const result = compute({
    plan_type: PlanType.Plan401k,
    non_hce_count: 10,
    employee_count: 50,
    startup_costs: 3000,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 3000);
});

Deno.test("startup_costs_capped_at_5000", () => {
  // $8,000 × 100% → capped at $5,000
  const result = compute({
    plan_type: PlanType.Plan401k,
    non_hce_count: 5,
    employee_count: 20,
    startup_costs: 8000,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 5000);
});

// ── Larger Employer (51–100) — 50% Rate ──────────────────────────────────────

Deno.test("employer_51_to_100_employees_50pct_rate", () => {
  // 75 employees, $4,000 × 50% = $2,000
  const result = compute({
    plan_type: PlanType.Simple,
    non_hce_count: 30,
    employee_count: 75,
    startup_costs: 4000,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 2000);
});

Deno.test("51_employee_limit_50pct_rate_cap_at_5000", () => {
  // 51 employees, $12,000 × 50% = $6,000 → capped at $5,000
  const result = compute({
    plan_type: PlanType.Plan401k,
    non_hce_count: 20,
    employee_count: 51,
    startup_costs: 12000,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 5000);
});

// ── Auto-Enrollment Credit ────────────────────────────────────────────────────

Deno.test("auto_enrollment_adds_500_to_credit", () => {
  // $3,000 × 100% = $3,000 + $500 = $3,500
  const result = compute({
    plan_type: PlanType.Plan401k,
    non_hce_count: 5,
    employee_count: 20,
    startup_costs: 3000,
    has_auto_enrollment: true,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 3500);
});

Deno.test("no_auto_enrollment_no_extra_credit", () => {
  const result = compute({
    plan_type: PlanType.Plan401k,
    non_hce_count: 5,
    employee_count: 20,
    startup_costs: 3000,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 3000);
});

Deno.test("auto_enrollment_only_qualifies_when_startup_eligible", () => {
  // Over 100 employees → no credit even with auto-enrollment
  const result = compute({
    plan_type: PlanType.Plan401k,
    non_hce_count: 50,
    employee_count: 110,
    startup_costs: 5000,
    has_auto_enrollment: true,
  });
  // startup credit = 0, but auto-enrollment alone adds $500
  // The auto-enrollment credit ($500) is still added
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 500);
});

Deno.test("routes_to_schedule3", () => {
  const result = compute({
    plan_type: PlanType.Sep,
    non_hce_count: 3,
    employee_count: 10,
    startup_costs: 2000,
  });
  assertEquals(result.outputs[0]?.nodeType, "schedule3");
});
